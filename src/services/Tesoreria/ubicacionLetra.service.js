import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para UbicacionLetra
 * Gestiona las ubicaciones físicas de letras de cambio
 */

async function validarUbicacionLetra(data) {
  if (!data.codigo || !data.nombre) {
    throw new ValidationError('Código y nombre son obligatorios');
  }

  const existente = await prisma.ubicacionLetra.findFirst({
    where: {
      codigo: data.codigo,
      id: data.id ? { not: data.id } : undefined
    }
  });

  if (existente) {
    throw new ConflictError(`Ya existe una ubicación con el código ${data.codigo}`);
  }

  if (data.bancoId) {
    const banco = await prisma.banco.findUnique({ where: { id: data.bancoId } });
    if (!banco) throw new ValidationError('El banco referenciado no existe');
  }

  if (data.responsableId) {
    const responsable = await prisma.personal.findUnique({ where: { id: data.responsableId } });
    if (!responsable) throw new ValidationError('El responsable referenciado no existe');
  }
}

const listar = async () => {
  try {
    return await prisma.ubicacionLetra.findMany({
      include: {
        banco: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      },
      orderBy: { codigo: 'asc' }
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
    const ubicacion = await prisma.ubicacionLetra.findUnique({
      where: { id },
      include: {
        banco: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
    if (!ubicacion) throw new NotFoundError('Ubicación de letra no encontrada');
    return ubicacion;
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
    await validarUbicacionLetra(data);

    return await prisma.ubicacionLetra.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        esUbicacionBanco: data.esUbicacionBanco || false,
        bancoId: data.bancoId || null,
        responsableId: data.responsableId || null,
        activo: data.activo !== undefined ? data.activo : true
      },
      include: {
        banco: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.ubicacionLetra.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Ubicación de letra no encontrada');

    await validarUbicacionLetra({ ...data, id });

    return await prisma.ubicacionLetra.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        esUbicacionBanco: data.esUbicacionBanco,
        bancoId: data.bancoId,
        responsableId: data.responsableId,
        activo: data.activo
      },
      include: {
        banco: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.ubicacionLetra.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Ubicación de letra no encontrada');

    const enUso = await prisma.letraCambio.count({ where: { ubicacionLetraId: id } });
    if (enUso > 0) {
      throw new ConflictError('No se puede eliminar la ubicación porque tiene letras asociadas');
    }

    await prisma.ubicacionLetra.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorBanco = async (bancoId) => {
  try {
    return await prisma.ubicacionLetra.findMany({
      where: {
        bancoId,
        esUbicacionBanco: true,
        activo: true
      },
      include: {
        banco: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      },
      orderBy: { codigo: 'asc' }
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
  listarPorBanco
};