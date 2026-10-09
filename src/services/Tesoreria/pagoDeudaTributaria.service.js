import prisma from '../../config/prismaClient.js';
import { ValidationError, NotFoundError, DatabaseError } from '../../utils/errors.js';
/**
 * Estados de deudas tributarias (tipoProvieneDeId = 27)
 * - 120: PENDIENTE (danger)
 * - 121: PAGO PARCIAL (warning)
 * - 122: PAGADO (success)
 * - 123: VENCIDO (danger)
 * - 124: ANULADO (secondary)
 * - 125: CANJEADO (contrast)
 */
const ESTADOS_DEUDA_TRIBUTARIA = {
  PENDIENTE: 120,
  PAGO_PARCIAL: 121,
  PAGADO: 122,
  VENCIDO: 123,
  ANULADO: 124,
  CANJEADO: 125,
};
// Constantes de MovimientoCaja
const TIPO_PROVIENE_MOVIMIENTOS_CAJA = 6;
 
const ESTADOS_MOVIMIENTO_CAJA = {
  PENDIENTE: 20,
  VALIDADO: 21,
  ASIENTO_GENERADO: 22
};
 
const CATEGORIA_IMPUESTOS = 24;
 
const TIPOS_MOVIMIENTO_IMPUESTOS = {
  SUNAT: 165,
  MUNICIPIOS: 166,
  RENTA_ALQUILERES: 167
};

async function validarPagoDeudaTributaria(data) {
  if (data.deudaTributariaId) {
    const deuda = await prisma.deudaTributaria.findUnique({ where: { id: data.deudaTributariaId } });
    if (!deuda) throw new ValidationError('La deuda referenciada no existe.');
  }

  if (data.medioPagoId) {
    const medioPago = await prisma.medioPago.findUnique({ where: { id: data.medioPagoId } });
    if (!medioPago) throw new ValidationError('El medio de pago referenciado no existe.');
  }

  if (data.montoPago !== undefined && data.montoPago <= 0) {
    throw new ValidationError('El monto del pago debe ser mayor a cero.');
  }

  // Validar que el pago no exceda el saldo pendiente
  if (data.deudaTributariaId && data.montoPago) {
    const deuda = await prisma.deudaTributaria.findUnique({ where: { id: data.deudaTributariaId } });
    if (deuda && Number(data.montoPago) > Number(deuda.saldoPendiente)) {
      throw new ValidationError('El monto del pago no puede ser mayor al saldo pendiente de la deuda.');
    }
  }
}

const listar = async () => {
  try {
    return await prisma.pagoDeudaTributaria.findMany({
      include: {
        deudaTributaria: {
          include: {
            empresa: true,
            tipoDeuda: {
              include: {
                entidadRecaudadora: true
              }
            },
            moneda: true
          }
        },
        medioPago: true,
        movimientoCaja: true,
        periodoContable: true
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const pago = await prisma.pagoDeudaTributaria.findUnique({
      where: { id },
      include: {
        deudaTributaria: {
          include: {
            empresa: true,
            tipoDeuda: {
              include: {
                entidadRecaudadora: true
              }
            },
            moneda: true
          }
        },
        medioPago: true,
        movimientoCaja: true,
        periodoContable: true
      }
    });
    if (!pago) throw new NotFoundError('Pago de deuda tributaria no encontrado');
    return pago;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.deudaTributariaId || !data.fechaPago || !data.montoPago) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarPagoDeudaTributaria(data);

    const pagoData = {
      ...data,
      medioPagoId: data.medioPagoId || null,
      numeroOperacion: data.numeroOperacion || null,
      numeroConstancia: data.numeroConstancia || null,
      movimientoCajaId: data.movimientoCajaId || null,
      observaciones: data.observaciones || null,
      creadoPor: data.creadoPor || null
    };

    // ✅ TRANSACCIÓN: Crear pago y actualizar deuda
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el pago
      const nuevoPago = await tx.pagoDeudaTributaria.create({ data: pagoData });

      // Recalcular montoPagado y saldoPendiente de la deuda
      const deuda = await tx.deudaTributaria.findUnique({
        where: { id: data.deudaTributariaId }
      });

      const nuevoMontoPagado = Number(deuda.montoPagado) + Number(data.montoPago);
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - nuevoMontoPagado;

      await tx.deudaTributaria.update({
        where: { id: data.deudaTributariaId },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente
        }
      });

      return nuevoPago;
    });

    return resultado;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.pagoDeudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de deuda tributaria no encontrado');

    // Los pagos se registran solo desde Caja y Bancos (pago especializado): ya generaron
    // movimientos de caja, saldos y asientos. Editar monto, fecha o medio de pago los dejaría
    // descuadrados, por eso solo se permite actualizar las observaciones.
    // Los adjuntos (voucher y comprobante) se actualizan por el sistema PDF, no por aquí.
    if (existente.movimientoCajaId) {
      return await prisma.pagoDeudaTributaria.update({
        where: { id },
        data: {
          observaciones: data.observaciones ?? existente.observaciones,
          actualizadoPor: data.actualizadoPor || null
        }
      });
    }

    await validarPagoDeudaTributaria({ ...data, id });

    const pagoData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    // ✅ TRANSACCIÓN: Actualizar pago y recalcular deuda
    const resultado = await prisma.$transaction(async (tx) => {
      const pagoActualizado = await tx.pagoDeudaTributaria.update({
        where: { id },
        data: pagoData
      });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaTributariaId;
      const pagos = await tx.pagoDeudaTributaria.findMany({
        where: { deudaTributariaId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaTributaria.findUnique({ where: { id: deudaId } });
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;

      await tx.deudaTributaria.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente
        }
      });

      return pagoActualizado;
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.pagoDeudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de deuda tributaria no encontrado');

    // Permite corregir un pago erróneo. Solo elimina el pago y recalcula la deuda: NO revierte
    // los movimientos de caja, saldos ni asientos que ese pago haya generado (la interfaz lo advierte).
    // La validación del derecho de eliminar se hace en la interfaz (permisos?.puedeEliminar).

    // ✅ TRANSACCIÓN: Eliminar pago y recalcular deuda
    await prisma.$transaction(async (tx) => {
      await tx.pagoDeudaTributaria.delete({ where: { id } });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaTributariaId;
      const pagos = await tx.pagoDeudaTributaria.findMany({
        where: { deudaTributariaId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaTributaria.findUnique({ where: { id: deudaId } });
      // Saldo = original - pagado antes del sistema - pagos del sistema (misma fórmula que DeudaTributariaForm)
      const montoPagadoAnterior = Number(deuda.montoPagadoAnterior || 0);
      const nuevoSaldoPendiente =
        Math.round((Number(deuda.montoOriginal) - montoPagadoAnterior - montoPagadoTotal) * 100) / 100;
      // Si ya no queda ningún pago (ni pagado anterior) la deuda vuelve a PENDIENTE
      const nuevoEstadoId =
        montoPagadoTotal + montoPagadoAnterior <= 0
          ? ESTADOS_DEUDA_TRIBUTARIA.PENDIENTE
          : calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      await tx.deudaTributaria.update({
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
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Calcular nuevo estado de la deuda según saldo pendiente
 */
function calcularNuevoEstadoDeuda(saldoPendiente) {
  if (saldoPendiente <= 0) {
    return ESTADOS_DEUDA_TRIBUTARIA.PAGADO;
  } else if (saldoPendiente > 0) {
    return ESTADOS_DEUDA_TRIBUTARIA.PAGO_PARCIAL;
  }
  return ESTADOS_DEUDA_TRIBUTARIA.PENDIENTE;
}

/**
 * Obtener descripción del estado
 */
function obtenerDescripcionEstado(estadoId) {
  const estados = {
    [ESTADOS_DEUDA_TRIBUTARIA.PENDIENTE]: 'Pendiente',
    [ESTADOS_DEUDA_TRIBUTARIA.PAGO_PARCIAL]: 'Pago Parcial',
    [ESTADOS_DEUDA_TRIBUTARIA.PAGADO]: 'Pagado',
    [ESTADOS_DEUDA_TRIBUTARIA.VENCIDO]: 'Vencido',
    [ESTADOS_DEUDA_TRIBUTARIA.ANULADO]: 'Anulado',
    [ESTADOS_DEUDA_TRIBUTARIA.CANJEADO]: 'Canjeado'
  };
  return estados[estadoId] || 'Desconocido';
}

const listarPorDeuda = async (deudaTributariaId) => {
  try {
    return await prisma.pagoDeudaTributaria.findMany({
      where: { deudaTributariaId },
      include: {
        medioPago: true,
        movimientoCaja: true,
        periodoContable: true
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorDeuda
};
// El pago de deudas tributarias se procesa en pagoDeudaTributariaMultiple.service.js