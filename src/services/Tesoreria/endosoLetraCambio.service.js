import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EndosoLetraCambio
 * Gestiona los endosos de letras de cambio
 */

const incluirRelaciones = {
  letraCambio: {
    select: {
      id: true,
      numeroDocumento: true,
      montoOriginal: true,
      fechaVencimiento: true
    }
  },
  endosante: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
    }
  },
  endosatario: {
    select: {
      id: true,
      razonSocial: true,
      numeroDocumento: true
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

async function validarEndosoLetraCambio(data) {
  if (!data.letraCambioId || !data.fechaEndoso || !data.endosanteId || !data.endosatarioId || !data.tipoEndoso) {
    throw new ValidationError('Letra, fecha de endoso, endosante, endosatario y tipo de endoso son obligatorios');
  }

  if (!['PLENO', 'PROCURACION', 'GARANTIA'].includes(data.tipoEndoso)) {
    throw new ValidationError('El tipo de endoso debe ser PLENO, PROCURACION o GARANTIA');
  }

  const letra = await prisma.letraCambio.findUnique({ where: { id: data.letraCambioId } });
  if (!letra) throw new ValidationError('La letra de cambio referenciada no existe');

  const endosante = await prisma.entidadComercial.findUnique({ where: { id: data.endosanteId } });
  if (!endosante) throw new ValidationError('El endosante referenciado no existe');

  const endosatario = await prisma.entidadComercial.findUnique({ where: { id: data.endosatarioId } });
  if (!endosatario) throw new ValidationError('El endosatario referenciado no existe');

  if (data.endosanteId === data.endosatarioId) {
    throw new ValidationError('El endosante y el endosatario no pueden ser la misma entidad');
  }

  if (data.registradoPor) {
    const personal = await prisma.personal.findUnique({ where: { id: data.registradoPor } });
    if (!personal) throw new ValidationError('El personal registrador no existe');
  }
}

const listar = async () => {
  try {
    return await prisma.endosoLetraCambio.findMany({
      include: incluirRelaciones,
      orderBy: { fechaEndoso: 'desc' }
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
    const endoso = await prisma.endosoLetraCambio.findUnique({
      where: { id },
      include: incluirRelaciones
    });
    if (!endoso) throw new NotFoundError('Endoso de letra no encontrado');
    return endoso;
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
    await validarEndosoLetraCambio(data);

    return await prisma.endosoLetraCambio.create({
      data: {
        letraCambioId: data.letraCambioId,
        fechaEndoso: new Date(data.fechaEndoso),
        endosanteId: data.endosanteId,
        endosatarioId: data.endosatarioId,
        tipoEndoso: data.tipoEndoso,
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
    const existente = await prisma.endosoLetraCambio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Endoso de letra no encontrado');

    await validarEndosoLetraCambio({ ...data, id });

    return await prisma.endosoLetraCambio.update({
      where: { id },
      data: {
        letraCambioId: data.letraCambioId,
        fechaEndoso: data.fechaEndoso ? new Date(data.fechaEndoso) : undefined,
        endosanteId: data.endosanteId,
        endosatarioId: data.endosatarioId,
        tipoEndoso: data.tipoEndoso,
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
    const existente = await prisma.endosoLetraCambio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Endoso de letra no encontrado');

    await prisma.endosoLetraCambio.delete({ where: { id } });
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
    return await prisma.endosoLetraCambio.findMany({
      where: { letraCambioId },
      include: incluirRelaciones,
      orderBy: { fechaEndoso: 'desc' }
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