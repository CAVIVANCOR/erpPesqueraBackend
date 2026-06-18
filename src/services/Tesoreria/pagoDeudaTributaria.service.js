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

async function validarPagoDeudaTributaria(data) {
  if (data.deudaTributariaId) {
    const deuda = await prisma.deudaTributaria.findUnique({ where: { id: data.deudaTributariaId } });
    if (!deuda) throw new ValidationError('La deuda referenciada no existe.');
  }

  if (data.medioPagoId) {
    const medioPago = await prisma.medioPago.findUnique({ where: { id: data.medioPagoId } });s
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
            }
          }
        },
        medioPago: true,
        movimientoCaja: true
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
        movimientoCaja: true
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
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;

      await tx.deudaTributaria.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente
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

const listarPorDeuda = async (deudaTributariaId) => {
  try {
    return await prisma.pagoDeudaTributaria.findMany({
      where: { deudaTributariaId },
      include: {
        medioPago: true,
        movimientoCaja: true
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