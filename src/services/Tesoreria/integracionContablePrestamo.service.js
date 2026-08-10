import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import { ESTADO_ASIENTO_CONTABLE } from "../../utils/estados.constants.js";
import { SUBMODULO_ORIGEN } from "../../utils/submodulos.constants.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";

/**
 * Servicio de integración contable para Préstamos Bancarios
 * Genera asientos contables automáticos para:
 * - Desembolso de préstamo
 * - Pago de cuota (capital + interés)
 */
/**
 * Convierte monto a soles si el préstamo está en dólares
 */
const convertirMontoASoles = (monto, prestamo) => {
  const MONEDA_USD_ID = 2;
  if (Number(prestamo.monedaId) === MONEDA_USD_ID) {
    const montoConvertido = Number(monto) * Number(prestamo.tipoCambioAplicado);
    return Math.round(montoConvertido * 100) / 100;
  }
  return Math.round(Number(monto) * 100) / 100;
};
/**
 * Genera asiento contable para desembolso de préstamo
 * @param {Object} prestamo - Datos del préstamo
 * @param {Object} tx - Transacción de Prisma
 * @param {Number} creadoPor - ID del usuario
 * @returns {Promise<Object>} - Asiento contable creado
 */
async function generarAsientoPrestamoNuevo(prestamo, tx, creadoPor) {
  try {
    const fechaAsiento = prestamo.fechaContable || prestamo.fechaDesembolso;
    const periodo = await periodoContableService.obtenerPeriodoPorFecha(prestamo.empresaId, fechaAsiento);
    if (!periodo) {
      console.warn(`No hay período contable para la fecha ${fechaAsiento} en empresa ${prestamo.empresaId}. No se generará asiento.`);
      return null;
    }
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (76) no encontrado.");
    }
    // Determinar cuenta según moneda (1=MN, 2=ME)
    const codigoPrestamo = Number(prestamo.monedaId) === 1 ? "451101" : "451102";
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: codigoPrestamo, activo: true },
    });
    // Obtener cuenta contable de la cuenta corriente
    let cuentaCorriente = null;
    if (prestamo.cuentaCorrienteId) {
      cuentaCorriente = await tx.cuentaCorriente.findUnique({
        where: { id: prestamo.cuentaCorrienteId },
        include: { cuentaContable: true },
      });
    }

    // Cuenta 373101: Intereses No Devengados
    const cuentaInteresesNoDev = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: "373101", activo: true },
    });

    if (!cuentaPrestamo || !cuentaInteresesNoDev) {
      console.warn("No se encontraron todas las cuentas necesarias. No se generará asiento.");
      return null;
    }

    if (!cuentaCorriente?.cuentaContable) {
      console.warn("La cuenta corriente no tiene cuenta contable vinculada. No se generará asiento.");
      return null;
    }

    // Calcular total de intereses del cronograma
    const cuotas = await tx.cuotaPrestamo.findMany({
      where: { prestamoBancarioId: prestamo.id },
    });
    const totalIntereses = cuotas.reduce((sum, c) => sum + Number(c.montoInteres), 0);

    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: { empresaId: prestamo.empresaId, periodoContableId: periodo.id },
      orderBy: { correlativo: "desc" },
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

    const montoDesembolso = Number(prestamo.montoDesembolsado);
    const montoNeto = montoDesembolso - totalIntereses;

    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: prestamo.fechaContable || prestamo.fechaDesembolso,
        glosa: `Desembolso de préstamo ${prestamo.numeroPrestamo} - ${prestamo.banco?.nombre || "Banco"}`,
        tipoLibro: "FISCAL",
        tipoLibroId: TIPO_LIBRO.DIARIO,
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenId: Number(prestamo.id),
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE),
        totalDebe: montoDesembolso,
        totalHaber: montoDesembolso,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        esSaldoInicial: prestamo.esSaldoInicial || false,
        esGerencial: false,
        creadoPor,
        prestamos: {
          connect: { id: Number(prestamo.id) }
        },
      },
    });
    const MONEDA_SOLES_ID = 1;

    const detalles = [
      {
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaCorriente.cuentaContable.id,
        glosa: `Desembolso Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
        debe: convertirMontoASoles(montoNeto, prestamo),
        haber: 0,
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: montoNeto,
        haberMonedaExtranjera: 0,
        submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenLineaId: Number(prestamo.id),
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaInteresesNoDev.id,
        glosa: `Intereses no devengados Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
        debe: convertirMontoASoles(totalIntereses, prestamo),
        haber: 0,
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: totalIntereses,
        haberMonedaExtranjera: 0,
        submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenLineaId: Number(prestamo.id),
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 3,
        planCuentaId: cuentaPrestamo.id,
        glosa: `Desembolso Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
        debe: 0,
        haber: convertirMontoASoles(montoDesembolso, prestamo),
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: 0,
        haberMonedaExtranjera: montoDesembolso,
        submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenLineaId: Number(prestamo.id),
        creadoPor,
      },
    ];

    await Promise.all(
      detalles.map((detalle) =>
        tx.detalleAsientoContable.create({ data: detalle }),
      ),
    );

    return await tx.asientoContable.findUnique({
      where: { id: asiento.id },
      include: {
        detalles: {
          include: {
            planCuenta: true,
            moneda: true,
          },
        },
        empresa: true,
        periodoContable: true,
        moneda: true,
        estado: true,
      },
    });

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
 * @param {Number} creadoPor - ID del usuario
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

    const fechaAsiento = cuota.fechaPago || new Date();
    const periodo = await periodoContableService.obtenerPeriodoPorFecha(prestamo.empresaId, fechaAsiento);
    if (!periodo) {
      console.warn(`No hay período contable para la fecha ${fechaAsiento} en empresa ${prestamo.empresaId}. No se generará asiento.`);
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
        periodoContableId: periodo.id,
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
        periodoContableId: periodo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: cuota.fechaPago || new Date(),
        glosa: `Pago cuota ${cuota.numeroCuota} préstamo ${prestamo.numeroPrestamo}`,
        tipoLibro: "FISCAL",
        tipoLibroId: TIPO_LIBRO.DIARIO,
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
    const MONEDA_SOLES_ID = 1;
    const detalles = [
      {
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaPrestamo.id,
        glosa: `Capital cuota ${cuota.numeroCuota}`,
        debe: convertirMontoASoles(montoCapital, prestamo),
        haber: 0,
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: montoCapital,
        haberMonedaExtranjera: 0,
        submoduloOrigenLineaId: submodulo.id,
        procesoOrigenLineaId: cuota.id,
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaInteres.id,
        glosa: `Interés cuota ${cuota.numeroCuota}`,
        debe: convertirMontoASoles(montoInteres, prestamo),
        haber: 0,
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: montoInteres,
        haberMonedaExtranjera: 0,
        submoduloOrigenLineaId: submodulo.id,
        procesoOrigenLineaId: cuota.id,
        creadoPor,
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 3,
        planCuentaId: cuentaEfectivo.id,
        glosa: `Pago cuota ${cuota.numeroCuota}`,
        debe: 0,
        haber: convertirMontoASoles(montoTotal, prestamo),
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: prestamo.tipoCambioAplicado,
        debeMonedaExtranjera: 0,
        haberMonedaExtranjera: montoTotal,
        submoduloOrigenLineaId: submodulo.id,
        procesoOrigenLineaId: cuota.id,
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


/**
 * Genera asiento de saldo inicial de préstamo
 * DEBE: 591101 (Utilidades Acumuladas) = Capital
 * HABER: 451101/451102 (Instituciones Financieras) = Capital
 */
async function generarAsientoSaldoInicial(prestamo, tx, creadoPor) {
  try {
    const fechaAsiento = prestamo.fechaContable || prestamo.fechaDesembolso;
    const periodo = await periodoContableService.obtenerPeriodoPorFecha(prestamo.empresaId, fechaAsiento);
    if (!periodo) {
      console.warn(`No hay período contable para la fecha ${fechaAsiento} en empresa ${prestamo.empresaId}. No se generará asiento.`);
      return null;
    }
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });
    if (!estadoPendiente) throw new ValidationError("Estado PENDIENTE no encontrado");
    const codigoPrestamo = Number(prestamo.monedaId) === 1 ? "451101" : "451102";
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: codigoPrestamo, activo: true },
    });
    const cuentaUtilidades = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: "591101", activo: true },
    });
    if (!cuentaPrestamo || !cuentaUtilidades) {
      return null;
    }
    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodo.id,
      },
      orderBy: { correlativo: "desc" },
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;
    const montoCapital = Number(prestamo.saldoCapital);
    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: prestamo.fechaContable || prestamo.fechaDesembolso,
        glosa: `Saldo Inicial préstamo ${prestamo.numeroPrestamo} - ${prestamo.banco?.nombre || "Banco"}`,
        tipoLibro: "FISCAL",
        tipoLibroId: TIPO_LIBRO.DIARIO,
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
        procesoOrigenId: Number(prestamo.id),
        estadoId: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE),
        totalDebe: montoCapital,
        totalHaber: montoCapital,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        esSaldoInicial: prestamo.esSaldoInicial || false,
        creadoPor,
        prestamos: {
          connect: { id: Number(prestamo.id) }
        },
      },
    });
    // Convertir montos a SOLES para los detalles
    const MONEDA_SOLES_ID = 1;
    const montoCapitalSoles = convertirMontoASoles(montoCapital, prestamo);

    await Promise.all([
      tx.detalleAsientoContable.create({
        data: {
          asientoContableId: asiento.id,
          numeroLinea: 1,
          planCuentaId: cuentaUtilidades.id,
          glosa: `Saldo Inicial Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
          debe: montoCapitalSoles,
          haber: 0,
          monedaId: MONEDA_SOLES_ID,
          tipoCambio: prestamo.tipoCambioAplicado,
          debeMonedaExtranjera: montoCapital,
          haberMonedaExtranjera: 0,
          submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
          procesoOrigenLineaId: Number(prestamo.id),
          creadoPor,
        },
      }),
      tx.detalleAsientoContable.create({
        data: {
          asientoContableId: asiento.id,
          numeroLinea: 2,
          planCuentaId: cuentaPrestamo.id,
          glosa: `Saldo Inicial Prestamo ${prestamo.cuentaCorriente.empresa.razonSocial} - ${prestamo.cuentaCorriente.banco.nombre} - ${prestamo.cuentaCorriente.numeroCuenta} - ${prestamo.cuentaCorriente.moneda.codigoSunat}${prestamo.cuentaCorriente.descripcion ? ' - ' + prestamo.cuentaCorriente.descripcion : ''}`,
          debe: 0,
          haber: montoCapitalSoles,
          monedaId: MONEDA_SOLES_ID,
          tipoCambio: prestamo.tipoCambioAplicado,
          debeMonedaExtranjera: 0,
          haberMonedaExtranjera: montoCapital,
          submoduloOrigenLineaId: SUBMODULO_ORIGEN.PRESTAMO_BANCARIO,
          procesoOrigenLineaId: Number(prestamo.id),
          creadoPor,
        },
      }),
    ]);

    return await tx.asientoContable.findUnique({
      where: { id: asiento.id },
      include: {
        detalles: {
          include: {
            planCuenta: true,
            moneda: true,
          },
        },
        empresa: true,
        periodoContable: true,
        moneda: true,
        estado: true,
      },
    });
  } catch (err) {
    console.error("❌ [generarAsientoSaldoInicial] ERROR:", {
      mensaje: err.message,
      stack: err.stack,
      prestamoId: prestamo?.id
    });
    throw err;
  }
}



export default {
  generarAsientoPrestamoNuevo,
  generarAsientoPagoCuota,
  generarAsientoSaldoInicial
};