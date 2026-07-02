import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import { ESTADO_ASIENTO_CONTABLE } from "../../utils/estados.constants.js";

/**
 * Servicio de integración contable para Préstamos Bancarios
 * Genera asientos contables automáticos para:
 * - Desembolso de préstamo
 * - Pago de cuota (capital + interés)
 */

/**
 * Genera asiento contable para desembolso de préstamo
 * @param {Object} prestamo - Datos del préstamo
 * @param {Object} tx - Transacción de Prisma
 * @param {BigInt} creadoPor - ID del usuario
 * @returns {Promise<Object>} - Asiento contable creado
 */
async function generarAsientoDesembolso(prestamo, tx, creadoPor) {
  try {
    // ✅ NUEVO DISEÑO 1:N: Permite múltiples asientos por préstamo
    // No se valida asiento existente

    // ✅ BUSCAR SUBMÓDULO DINÁMICAMENTE
    const submodulo = await tx.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "PrestamoBancario",
        activo: true,
      },
    });

    if (!submodulo) {
      throw new ValidationError(
        'Submódulo "PrestamoBancario" no encontrado en el sistema.',
      );
    }

    // Obtener período contable activo
    const periodoActivo = await periodoContableService.obtenerPeriodoActivo(
      prestamo.empresaId,
    );
    if (!periodoActivo) {
      console.warn(
        `No hay período contable activo para empresa ${prestamo.empresaId}. No se generará asiento.`,
      );
      return null;
    }

    // Obtener estado PENDIENTE (76)
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (76) no encontrado.");
    }

    // Obtener cuentas contables necesarias
    // Cuenta 45: Obligaciones Financieras (HABER - aumenta pasivo)
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "45" },
        activo: true,
      },
    });

    // Cuenta 10: Efectivo (DEBE - aumenta activo)
    const cuentaEfectivo = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "10" },
        activo: true,
      },
    });

    if (!cuentaPrestamo || !cuentaEfectivo) {
      console.warn(
        "No se encontraron todas las cuentas necesarias. No se generará asiento.",
      );
      return null;
    }

    // Generar correlativo
    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodoActivo.id,
      },
      orderBy: { correlativo: "desc" },
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

    const montoDesembolso = Number(prestamo.montoDesembolsado);

    // Crear asiento contable
    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodoActivo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: prestamo.fechaDesembolso,
        glosa: `Desembolso de préstamo ${prestamo.numeroPrestamo} - ${prestamo.banco?.nombre || "Banco"}`,
        tipoLibro: "FISCAL",
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: submodulo.id,
        procesoOrigenId: prestamo.id,
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE),
        totalDebe: montoDesembolso,
        totalHaber: montoDesembolso,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor,
      },
    });

    // Crear detalles del asiento
    const detalles = [
      {
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaEfectivo.id,
        glosa: `Desembolso préstamo ${prestamo.numeroPrestamo}`,
        debe: montoDesembolso,
        haber: 0,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaPrestamo.id,
        glosa: `Desembolso préstamo ${prestamo.numeroPrestamo}`,
        debe: 0,
        haber: montoDesembolso,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor,
      },
    ];

    await Promise.all(
      detalles.map((detalle) =>
        tx.detalleAsientoContable.create({ data: detalle }),
      ),
    );
    return asiento;
  } catch (err) {
    console.error("Error al generar asiento contable para desembolso:", err);
    throw err;
  }
}

/**
 * Genera asiento contable para pago de cuota
 * @param {Object} cuota - Datos de la cuota
 * @param {Object} prestamo - Datos del préstamo
 * @param {Object} tx - Transacción de Prisma
 * @param {BigInt} creadoPor - ID del usuario
 * @returns {Promise<Object>} - Asiento contable creado
 */
async function generarAsientoPagoCuota(cuota, prestamo, tx, creadoPor) {
  try {
    // ✅ NUEVO DISEÑO 1:N: Permite múltiples asientos por cuota
    // No se valida asiento existente

    // ✅ BUSCAR SUBMÓDULO DINÁMICAMENTE
    const submodulo = await tx.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "CuotaPrestamo",
        activo: true,
      },
    });

    if (!submodulo) {
      throw new ValidationError(
        'Submódulo "CuotaPrestamo" no encontrado en el sistema.',
      );
    }

    // Obtener período contable activo
    const periodoActivo = await periodoContableService.obtenerPeriodoActivo(
      prestamo.empresaId,
    );
    if (!periodoActivo) {
      console.warn(
        `No hay período contable activo para empresa ${prestamo.empresaId}. No se generará asiento.`,
      );
      return null;
    }

    // Obtener estado PENDIENTE (76)
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (76) no encontrado.");
    }

    // Obtener cuentas contables necesarias
    // Cuenta 45: Obligaciones Financieras (DEBE - disminuye pasivo por capital)
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "45" },
        activo: true,
      },
    });

    // Cuenta 67: Gastos Financieros (DEBE - gasto por interés)
    const cuentaInteres = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "67" },
        activo: true,
      },
    });

    // Cuenta 10: Efectivo (HABER - disminuye activo)
    const cuentaEfectivo = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "10" },
        activo: true,
      },
    });

    if (!cuentaPrestamo || !cuentaInteres || !cuentaEfectivo) {
      console.warn(
        "No se encontraron todas las cuentas necesarias. No se generará asiento.",
      );
      return null;
    }

    // Generar correlativo
    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodoActivo.id,
      },
      orderBy: { correlativo: "desc" },
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

    const montoCapital = Number(cuota.montoCapital);
    const montoInteres = Number(cuota.montoInteres);
    const montoTotal = montoCapital + montoInteres;

    // Crear asiento contable
    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodoActivo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: cuota.fechaPago || new Date(),
        glosa: `Pago cuota ${cuota.numeroCuota} préstamo ${prestamo.numeroPrestamo}`,
        tipoLibro: "FISCAL",
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: submodulo.id,
        procesoOrigenId: cuota.id,
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE),
        totalDebe: montoTotal,
        totalHaber: montoTotal,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor,
      },
    });

    // Crear detalles del asiento
    const detalles = [
      {
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaPrestamo.id,
        glosa: `Capital cuota ${cuota.numeroCuota}`,
        debe: montoCapital,
        haber: 0,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaInteres.id,
        glosa: `Interés cuota ${cuota.numeroCuota}`,
        debe: montoInteres,
        haber: 0,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 3,
        planCuentaId: cuentaEfectivo.id,
        glosa: `Pago cuota ${cuota.numeroCuota}`,
        debe: 0,
        haber: montoTotal,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor,
      },
    ];

    await Promise.all(
      detalles.map((detalle) =>
        tx.detalleAsientoContable.create({ data: detalle }),
      ),
    );

    return asiento;
  } catch (err) {
    console.error("Error al generar asiento contable para pago de cuota:", err);
    throw err;
  }
}

export default {
  generarAsientoDesembolso,
  generarAsientoPagoCuota,
};