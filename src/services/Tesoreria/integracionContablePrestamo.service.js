import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';

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
    // Validar que el préstamo no tenga ya un asiento
    if (prestamo.asientoContableId) {
      console.warn(`Préstamo ${prestamo.id} ya tiene asiento contable. No se generará otro.`);
      return null;
    }

    // Obtener período contable activo
    const periodoActivo = await periodoContableService.obtenerPeriodoActivo(prestamo.empresaId);
    if (!periodoActivo) {
      console.warn(`No hay período contable activo para empresa ${prestamo.empresaId}. No se generará asiento.`);
      return null;
    }

    // Obtener estado PENDIENTE (76)
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: BigInt(76) }
    });
    if (!estadoPendiente) {
      throw new ValidationError('Estado PENDIENTE (76) no encontrado.');
    }

    // Obtener cuentas contables necesarias
    // Cuenta 45: Obligaciones Financieras (HABER - aumenta pasivo)
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        codigoCuenta: { startsWith: '45' }
      }
    });

    if (!cuentaPrestamo) {
      console.warn('No se encontró cuenta de Obligaciones Financieras (45). No se generará asiento.');
      return null;
    }

    // Cuenta 10: Efectivo y Equivalentes (DEBE - aumenta activo)
    const cuentaEfectivo = await tx.planCuentasContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        codigoCuenta: { startsWith: '10' }
      }
    });

    if (!cuentaEfectivo) {
      console.warn('No se encontró cuenta de Efectivo (10). No se generará asiento.');
      return null;
    }

    // Generar correlativo
    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodoActivo.id
      },
      orderBy: { correlativo: 'desc' }
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, '0')}`;

    const montoDesembolso = Number(prestamo.montoDesembolsado);

    // Crear asiento contable
    const asiento = await tx.asientoContable.create({
      data: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodoActivo.id,
        numeroAsiento,
        correlativo,
        fechaAsiento: prestamo.fechaDesembolso,
        glosa: `Desembolso de préstamo ${prestamo.numeroPrestamo} - ${prestamo.banco?.nombre || 'Banco'}`,
        tipoLibro: 'FISCAL',
        origenAsiento: 'AUTOMATICO',
        submoduloOrigenId: null,
        procesoOrigenId: prestamo.id,
        estadoId: BigInt(76),
        totalDebe: montoDesembolso,
        totalHaber: montoDesembolso,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor
      }
    });

    // Crear detalles del asiento
    const detalles = [
      {
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaEfectivo.id,
        codigoCuenta: cuentaEfectivo.codigoCuenta,
        nombreCuenta: cuentaEfectivo.nombreCuenta,
        glosa: `Desembolso préstamo ${prestamo.numeroPrestamo}`,
        debe: montoDesembolso,
        haber: 0,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaPrestamo.id,
        codigoCuenta: cuentaPrestamo.codigoCuenta,
        nombreCuenta: cuentaPrestamo.nombreCuenta,
        glosa: `Desembolso préstamo ${prestamo.numeroPrestamo}`,
        debe: 0,
        haber: montoDesembolso,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor
      }
    ];

    await Promise.all(
      detalles.map(detalle => tx.detalleAsientoContable.create({ data: detalle }))
    );

    // Vincular asiento al préstamo
    await tx.prestamoBancario.update({
      where: { id: prestamo.id },
      data: { asientoContableId: asiento.id }
    });

    return asiento;
  } catch (err) {
    console.error('Error al generar asiento contable para desembolso:', err);
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
    // Validar que la cuota no tenga ya un asiento
    if (cuota.asientoContableId) {
      console.warn(`Cuota ${cuota.id} ya tiene asiento contable. No se generará otro.`);
      return null;
    }

    // Obtener período contable activo
    const periodoActivo = await periodoContableService.obtenerPeriodoActivo(prestamo.empresaId);
    if (!periodoActivo) {
      console.warn(`No hay período contable activo para empresa ${prestamo.empresaId}. No se generará asiento.`);
      return null;
    }

    // Obtener estado PENDIENTE (76)
    const estadoPendiente = await tx.estadoMultiFuncion.findUnique({
      where: { id: BigInt(76) }
    });
    if (!estadoPendiente) {
      throw new ValidationError('Estado PENDIENTE (76) no encontrado.');
    }

    // Obtener cuentas contables necesarias
    // Cuenta 45: Obligaciones Financieras (DEBE - disminuye pasivo por capital)
    const cuentaPrestamo = await tx.planCuentasContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        codigoCuenta: { startsWith: '45' }
      }
    });

    // Cuenta 67: Gastos Financieros (DEBE - gasto por interés)
    const cuentaInteres = await tx.planCuentasContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        codigoCuenta: { startsWith: '67' }
      }
    });

    // Cuenta 10: Efectivo (HABER - disminuye activo)
    const cuentaEfectivo = await tx.planCuentasContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        codigoCuenta: { startsWith: '10' }
      }
    });

    if (!cuentaPrestamo || !cuentaInteres || !cuentaEfectivo) {
      console.warn('No se encontraron todas las cuentas necesarias. No se generará asiento.');
      return null;
    }

    // Generar correlativo
    const ultimoAsiento = await tx.asientoContable.findFirst({
      where: {
        empresaId: prestamo.empresaId,
        periodoContableId: periodoActivo.id
      },
      orderBy: { correlativo: 'desc' }
    });
    const correlativo = (ultimoAsiento?.correlativo || 0) + 1;
    const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, '0')}`;

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
        tipoLibro: 'FISCAL',
        origenAsiento: 'AUTOMATICO',
        submoduloOrigenId: null,
        procesoOrigenId: cuota.id,
        estadoId: BigInt(76),
        totalDebe: montoTotal,
        totalHaber: montoTotal,
        diferencia: 0,
        estaCuadrado: true,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor
      }
    });

    // Crear detalles del asiento
    const detalles = [
      {
        asientoContableId: asiento.id,
        numeroLinea: 1,
        planCuentaId: cuentaPrestamo.id,
        codigoCuenta: cuentaPrestamo.codigoCuenta,
        nombreCuenta: cuentaPrestamo.nombreCuenta,
        glosa: `Capital cuota ${cuota.numeroCuota}`,
        debe: montoCapital,
        haber: 0,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 2,
        planCuentaId: cuentaInteres.id,
        codigoCuenta: cuentaInteres.codigoCuenta,
        nombreCuenta: cuentaInteres.nombreCuenta,
        glosa: `Interés cuota ${cuota.numeroCuota}`,
        debe: montoInteres,
        haber: 0,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor
      },
      {
        asientoContableId: asiento.id,
        numeroLinea: 3,
        planCuentaId: cuentaEfectivo.id,
        codigoCuenta: cuentaEfectivo.codigoCuenta,
        nombreCuenta: cuentaEfectivo.nombreCuenta,
        glosa: `Pago cuota ${cuota.numeroCuota}`,
        debe: 0,
        haber: montoTotal,
        monedaId: prestamo.monedaId,
        tipoCambio: prestamo.tipoCambioAplicado,
        creadoPor
      }
    ];

    await Promise.all(
      detalles.map(detalle => tx.detalleAsientoContable.create({ data: detalle }))
    );

    // Vincular asiento a la cuota
    await tx.cuotaPrestamo.update({
      where: { id: cuota.id },
      data: { asientoContableId: asiento.id }
    });

    return asiento;
  } catch (err) {
    console.error('Error al generar asiento contable para pago de cuota:', err);
    throw err;
  }
}

export default {
  generarAsientoDesembolso,
  generarAsientoPagoCuota
};