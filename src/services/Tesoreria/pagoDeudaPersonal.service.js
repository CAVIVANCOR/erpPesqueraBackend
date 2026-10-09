import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
/**
 * ════════════════════════════════════════════════════════════
 * SERVICIO PROFESIONAL: PAGO DE DEUDAS AL PERSONAL
 * ════════════════════════════════════════════════════════════
 * 
 * Gestiona pagos a trabajadores con integración completa:
 * - Creación de registros de pago
 * - Generación automática de MovimientoCaja
 * - Actualización de saldos y estados
 * - Transacciones atómicas
 * - Validaciones de negocio
 * 
 * Documentado en español.
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - ESTADOS DEUDAS CON EL PERSONAL
// ════════════════════════════════════════════════════════════

const TIPO_PROVIENE_DEUDAS_PERSONAL = 26; 

const ESTADOS_DEUDA = {
  PENDIENTE: 114,      // DANGER
  PAGO_PARCIAL: 115,   // WARNING
  PAGADO: 116,         // SUCCESS
  VENCIDO: 117,        // DANGER
  ANULADO: 118,        // SECONDARY
  CANJEADO: 119        // CONTRAST
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - TIPOS DE MOVIMIENTO CAJA
// ════════════════════════════════════════════════════════════

const CATEGORIA_REMUNERACIONES = 21; // REMUNERACIONES (DEUDAS CON EL PERSONAL)
const CATEGORIA_IMPUESTOS = 24;      // IMPUESTOS (DEUDAS TRIBUTARIAS)

const TIPOS_MOVIMIENTO_REMUNERACIONES = {
  SUELDOS: 149,
  SALARIOS: 150,
  COMISIONES: 151,
  PRESTAMOS: 152,
  ADELANTOS: 153,
  INDEMNIZACIONES_CTS: 154,
  VACACIONES: 155,
  GRATIFICACIONES: 156,
  LIQUIDACIONES: 157
};

const TIPOS_MOVIMIENTO_IMPUESTOS = {
  SUNAT: 165,
  MUNICIPIOS: 166,
  RENTA_ALQUILERES: 167
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - ESTADOS MOVIMIENTOS CAJA
// ════════════════════════════════════════════════════════════

const TIPO_PROVIENE_MOVIMIENTOS_CAJA = 6;

const ESTADOS_MOVIMIENTO_CAJA = {
  PENDIENTE: 20,           // SECONDARY
  VALIDADO: 21,            // SUCCESS
  ASIENTO_GENERADO: 22     // INFO
};

// ════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════

/**
 * Validar datos de pago básico (CRUD)
 */
async function validarPagoDeudaPersonal(data) {
  if (data.deudaConPersonalId) {
    const deuda = await prisma.deudaConPersonal.findUnique({ 
      where: { id: data.deudaConPersonalId } 
    });
    if (!deuda) {
      throw new ValidationError('La deuda referenciada no existe.');
    }
  }

  if (data.medioPagoId) {
    const medioPago = await prisma.medioPago.findUnique({ 
      where: { id: data.medioPagoId } 
    });
    if (!medioPago) {
      throw new ValidationError('El medio de pago referenciado no existe.');
    }
  }

  if (data.montoPago !== undefined && data.montoPago <= 0) {
    throw new ValidationError('El monto del pago debe ser mayor a cero.');
  }

  if (data.deudaConPersonalId && data.montoPago) {
    const deuda = await prisma.deudaConPersonal.findUnique({ 
      where: { id: data.deudaConPersonalId } 
    });
    if (deuda && Number(data.montoPago) > Number(deuda.saldoPendiente)) {
      throw new ValidationError('El monto del pago no puede ser mayor al saldo pendiente de la deuda.');
    }
  }
}

/**
 * Calcular nuevo estado de la deuda según el saldo
 */
function calcularNuevoEstadoDeuda(saldoPendiente) {
  if (Number(saldoPendiente) === 0) {
    return ESTADOS_DEUDA.PAGADO;
  } else if (Number(saldoPendiente) > 0) {
    return ESTADOS_DEUDA.PAGO_PARCIAL;
  }
  return ESTADOS_DEUDA.PENDIENTE;
}

/**
 * Obtener descripción del estado por ID
 */
function obtenerDescripcionEstado(estadoId) {
  const mapaEstados = {
    [ESTADOS_DEUDA.PENDIENTE]: 'PENDIENTE',
    [ESTADOS_DEUDA.PAGO_PARCIAL]: 'PAGO PARCIAL',
    [ESTADOS_DEUDA.PAGADO]: 'PAGADO',
    [ESTADOS_DEUDA.VENCIDO]: 'VENCIDO',
    [ESTADOS_DEUDA.ANULADO]: 'ANULADO',
    [ESTADOS_DEUDA.CANJEADO]: 'CANJEADO'
  };
  return mapaEstados[estadoId] || 'DESCONOCIDO';
}

// ════════════════════════════════════════════════════════════
// FUNCIONES CRUD BÁSICAS
// ════════════════════════════════════════════════════════════

/**
 * Listar todos los pagos de deuda personal
 */
const listar = async () => {
  try {
    return await prisma.pagoDeudaPersonal.findMany({
      include: {
        deudaConPersonal: {
          include: {
            personal: true,
            empresa: true,
            tipoDeuda: true,
            moneda: true
          }
        },
        medioPago: true,
        movimientoCaja: {
          include: {
            tipoMovimiento: true,
            moneda: true,
            estadoMovimientoCaja: true
          }
        },
        periodoContable: true
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos', err.message);
    }
    throw err;
  }
};

/**
 * Obtener pago por ID
 */
const obtenerPorId = async (id) => {
  try {
    const pago = await prisma.pagoDeudaPersonal.findUnique({
      where: { id },
      include: {
        deudaConPersonal: {
          include: {
            personal: true,
            empresa: true,
            tipoDeuda: true,
            moneda: true
          }
        },
        medioPago: true,
        movimientoCaja: {
          include: {
            tipoMovimiento: true,
            moneda: true,
            estadoMovimientoCaja: true
          }
        },
        periodoContable: true
      }
    });
    
    if (!pago) {
      throw new NotFoundError('Pago de deuda personal no encontrado');
    }
    
    return pago;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener pago', err.message);
    }
    throw err;
  }
};

/**
 * Crear pago básico (CRUD simple)
 */
const crear = async (data) => {
  try {
    if (!data.deudaConPersonalId || !data.fechaPago || !data.montoPago) {
      throw new ValidationError('Faltan campos obligatorios: deudaConPersonalId, fechaPago, montoPago');
    }

    await validarPagoDeudaPersonal(data);

    const pagoData = {
      ...data,
      medioPagoId: data.medioPagoId || null,
      numeroOperacion: data.numeroOperacion || null,
      movimientoCajaId: data.movimientoCajaId || null,
      observaciones: data.observaciones || null,
      creadoPor: data.creadoPor || null
    };

    // Transacción: Crear pago y actualizar deuda
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pagoDeudaPersonal.create({ data: pagoData });

      const deuda = await tx.deudaConPersonal.findUnique({
        where: { id: data.deudaConPersonalId }
      });

      const nuevoMontoPagado = Number(deuda.montoPagado) + Number(data.montoPago);
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - nuevoMontoPagado;
      const nuevoEstadoId = calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      await tx.deudaConPersonal.update({
        where: { id: data.deudaConPersonalId },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId
        }
      });

      return nuevoPago;
    });

    return resultado;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al crear pago', err.message);
    }
    throw err;
  }
};

/**
 * Actualizar pago
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.pagoDeudaPersonal.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundError('Pago de deuda personal no encontrado');
    }

    // Los pagos se registran solo desde Caja y Bancos (pago especializado): ya generaron
    // movimientos de caja, saldos y asientos. Editar monto, fecha o medio de pago los dejaría
    // descuadrados, por eso solo se permite actualizar las observaciones.
    // Los adjuntos (voucher y comprobante) se actualizan por el sistema PDF, no por aquí.
    if (existente.movimientoCajaId) {
      return await prisma.pagoDeudaPersonal.update({
        where: { id },
        data: {
          observaciones: data.observaciones ?? existente.observaciones,
          actualizadoPor: data.actualizadoPor || null
        }
      });
    }

    await validarPagoDeudaPersonal({ ...data, id });

    const pagoData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    // Transacción: Actualizar pago y recalcular deuda
    const resultado = await prisma.$transaction(async (tx) => {
      const pagoActualizado = await tx.pagoDeudaPersonal.update({
        where: { id },
        data: pagoData
      });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaConPersonalId;
      const pagos = await tx.pagoDeudaPersonal.findMany({
        where: { deudaConPersonalId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaConPersonal.findUnique({ where: { id: deudaId } });
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;
      const nuevoEstadoId = calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      await tx.deudaConPersonal.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId
        }
      });

      return pagoActualizado;
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al actualizar pago', err.message);
    }
    throw err;
  }
};

/**
 * Eliminar pago
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.pagoDeudaPersonal.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundError('Pago de deuda personal no encontrado');
    }

    // Permite corregir un pago erróneo. Solo elimina el pago y recalcula la deuda: NO revierte
    // los movimientos de caja, saldos ni asientos que ese pago haya generado (la interfaz lo advierte).
    // La validación del derecho de eliminar se hace en la interfaz (permisos?.puedeEliminar).

    // Transacción: Eliminar pago y recalcular deuda
    await prisma.$transaction(async (tx) => {
      await tx.pagoDeudaPersonal.delete({ where: { id } });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaConPersonalId;
      const pagos = await tx.pagoDeudaPersonal.findMany({
        where: { deudaConPersonalId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaConPersonal.findUnique({ where: { id: deudaId } });
      // Saldo = original - pagado antes del sistema - pagos del sistema (misma fórmula que DeudaConPersonalForm)
      const montoPagadoAnterior = Number(deuda.montoPagadoAnterior || 0);
      const nuevoSaldoPendiente =
        Math.round((Number(deuda.montoOriginal) - montoPagadoAnterior - montoPagadoTotal) * 100) / 100;
      // Si ya no queda ningún pago (ni pagado anterior) la deuda vuelve a PENDIENTE
      const nuevoEstadoId =
        montoPagadoTotal + montoPagadoAnterior <= 0
          ? ESTADOS_DEUDA.PENDIENTE
          : calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      await tx.deudaConPersonal.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId
        }
      });
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al eliminar pago', err.message);
    }
    throw err;
  }
};

/**
 * Listar pagos por deuda
 */
const listarPorDeuda = async (deudaConPersonalId) => {
  try {
       return await prisma.pagoDeudaPersonal.findMany({
      where: { deudaConPersonalId },
      include: {
        periodoContable: true,
        medioPago: true,
        movimientoCaja: {
          include: {
            tipoMovimiento: true,
            moneda: true,
            estadoMovimientoCaja: true
          }
        }
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos por deuda', err.message);
    }
    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES
// ════════════════════════════════════════════════════════════
// El pago de deudas con personal se procesa en pagoDeudaPersonalMultiple.service.js

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorDeuda
};