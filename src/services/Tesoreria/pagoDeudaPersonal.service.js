import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PagoDeudaPersonal
 * Gestiona los pagos realizados a trabajadores
 * Actualiza automáticamente el saldo de la deuda
 * Documentado en español.
 */

async function validarPagoDeudaPersonal(data) {
  if (data.deudaConPersonalId) {
    const deuda = await prisma.deudaConPersonal.findUnique({ where: { id: data.deudaConPersonalId } });
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
  if (data.deudaConPersonalId && data.montoPago) {
    const deuda = await prisma.deudaConPersonal.findUnique({ where: { id: data.deudaConPersonalId } });
    if (deuda && Number(data.montoPago) > Number(deuda.saldoPendiente)) {
      throw new ValidationError('El monto del pago no puede ser mayor al saldo pendiente de la deuda.');
    }
  }
}

const listar = async () => {
  try {
    return await prisma.pagoDeudaPersonal.findMany({
      include: {
        deudaConPersonal: {
          include: {
            personal: true,
            empresa: true,
            tipoDeuda: true
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
        movimientoCaja: true
      }
    });
    if (!pago) throw new NotFoundError('Pago de deuda personal no encontrado');
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
    if (!data.deudaConPersonalId || !data.fechaPago || !data.montoPago) {
      throw new ValidationError('Faltan campos obligatorios.');
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

    // ✅ TRANSACCIÓN: Crear pago y actualizar deuda
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el pago
      const nuevoPago = await tx.pagoDeudaPersonal.create({ data: pagoData });

      // Recalcular montoPagado y saldoPendiente de la deuda
      const deuda = await tx.deudaConPersonal.findUnique({
        where: { id: data.deudaConPersonalId }
      });

      const nuevoMontoPagado = Number(deuda.montoPagado) + Number(data.montoPago);
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - nuevoMontoPagado;

      await tx.deudaConPersonal.update({
        where: { id: data.deudaConPersonalId },
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
    const existente = await prisma.pagoDeudaPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de deuda personal no encontrado');

    await validarPagoDeudaPersonal({ ...data, id });

    const pagoData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    // ✅ TRANSACCIÓN: Actualizar pago y recalcular deuda
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

      await tx.deudaConPersonal.update({
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
    const existente = await prisma.pagoDeudaPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de deuda personal no encontrado');

    // ✅ TRANSACCIÓN: Eliminar pago y recalcular deuda
    await prisma.$transaction(async (tx) => {
      await tx.pagoDeudaPersonal.delete({ where: { id } });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaConPersonalId;
      const pagos = await tx.pagoDeudaPersonal.findMany({
        where: { deudaConPersonalId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaConPersonal.findUnique({ where: { id: deudaId } });
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;

      await tx.deudaConPersonal.update({
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

const listarPorDeuda = async (deudaConPersonalId) => {
  try {
    return await prisma.pagoDeudaPersonal.findMany({
      where: { deudaConPersonalId },
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