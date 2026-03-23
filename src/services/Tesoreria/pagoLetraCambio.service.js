import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PagoLetraCambio
 * Gestiona los pagos realizados a letras de cambio
 */

const incluirRelaciones = {
  letraCambio: {
    select: {
      id: true,
      numeroDocumento: true,
      montoOriginal: true,
      fechaVencimiento: true,
      girado: {
        select: {
          id: true,
          razonSocial: true
        }
      }
    }
  },
  moneda: {
    select: {
      id: true,
      simbolo: true,
      codigoSunat: true
    }
  },
  medioPago: {
    select: {
      id: true,
    nombre: true  // ✅ Campo CORRECTO según schema
    }
  },
  banco: {
    select: {
      id: true,
      nombre: true
    }
  },
  movimientoCaja: {
    select: {
      id: true,
      monto: true,
      descripcion: true
    }
  },
  registrador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true
    }
  }
};

async function validarPagoLetraCambio(data) {
  if (!data.letraCambioId || !data.fechaPago || !data.montoPago || !data.monedaId || !data.medioPagoId) {
    throw new ValidationError('Letra, fecha de pago, monto, moneda y medio de pago son obligatorios');
  }

  const letra = await prisma.letraCambio.findUnique({ where: { id: data.letraCambioId } });
  if (!letra) throw new ValidationError('La letra de cambio referenciada no existe');

  const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
  if (!moneda) throw new ValidationError('La moneda referenciada no existe');

  const medioPago = await prisma.medioPago.findUnique({ where: { id: data.medioPagoId } });
  if (!medioPago) throw new ValidationError('El medio de pago referenciado no existe');

  if (data.bancoId) {
    const banco = await prisma.banco.findUnique({ where: { id: data.bancoId } });
    if (!banco) throw new ValidationError('El banco referenciado no existe');
  }

  if (data.movimientoCajaId) {
    const movimiento = await prisma.movimientoCaja.findUnique({ where: { id: data.movimientoCajaId } });
    if (!movimiento) throw new ValidationError('El movimiento de caja referenciado no existe');
  }

  if (data.registradoPor) {
    const personal = await prisma.personal.findUnique({ where: { id: data.registradoPor } });
    if (!personal) throw new ValidationError('El personal registrador no existe');
  }

  if (data.montoPago <= 0) {
    throw new ValidationError('El monto del pago debe ser mayor a cero');
  }
}

const listar = async () => {
  try {
    return await prisma.pagoLetraCambio.findMany({
      include: incluirRelaciones,
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
    const pago = await prisma.pagoLetraCambio.findUnique({
      where: { id },
      include: incluirRelaciones
    });
    if (!pago) throw new NotFoundError('Pago de letra no encontrado');
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
    await validarPagoLetraCambio(data);

    return await prisma.pagoLetraCambio.create({
      data: {
        letraCambioId: data.letraCambioId,
        fechaPago: new Date(data.fechaPago),
        montoPago: data.montoPago,
        monedaId: data.monedaId,
        medioPagoId: data.medioPagoId,
        numeroOperacion: data.numeroOperacion || null,
        bancoId: data.bancoId || null,
        movimientoCajaId: data.movimientoCajaId || null,
        observaciones: data.observaciones || null,
        registradoPor: data.registradoPor || null
      },
      include: incluirRelaciones
    });
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
    const existente = await prisma.pagoLetraCambio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de letra no encontrado');

    await validarPagoLetraCambio({ ...data, id });

    return await prisma.pagoLetraCambio.update({
      where: { id },
      data: {
        letraCambioId: data.letraCambioId,
        fechaPago: data.fechaPago ? new Date(data.fechaPago) : undefined,
        montoPago: data.montoPago,
        monedaId: data.monedaId,
        medioPagoId: data.medioPagoId,
        numeroOperacion: data.numeroOperacion,
        bancoId: data.bancoId,
        movimientoCajaId: data.movimientoCajaId,
        observaciones: data.observaciones
      },
      include: incluirRelaciones
    });
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
    const existente = await prisma.pagoLetraCambio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de letra no encontrado');

    await prisma.pagoLetraCambio.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorLetra = async (letraCambioId) => {
  try {
    return await prisma.pagoLetraCambio.findMany({
      where: { letraCambioId },
      include: incluirRelaciones,
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
  listarPorLetra
};