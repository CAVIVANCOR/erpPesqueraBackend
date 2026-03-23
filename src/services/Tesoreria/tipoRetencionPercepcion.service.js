import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoRetencionPercepcion
 * Catálogo de tipos de retención y percepción según SUNAT
 */

async function validarTipoRetencionPercepcion(data) {
  if (!data.codigo || !data.nombre || !data.tipo) {
    throw new ValidationError('Código, nombre y tipo son obligatorios');
  }

  if (!['RETENCION', 'PERCEPCION'].includes(data.tipo)) {
    throw new ValidationError('El tipo debe ser RETENCION o PERCEPCION');
  }

  if (data.tasa !== undefined && (data.tasa < 0 || data.tasa > 100)) {
    throw new ValidationError('La tasa debe estar entre 0 y 100');
  }

  const existente = await prisma.tipoRetencionPercepcion.findFirst({
    where: {
      codigo: data.codigo,
      id: data.id ? { not: data.id } : undefined
    }
  });

  if (existente) {
    throw new ConflictError(`Ya existe un tipo con el código ${data.codigo}`);
  }
}

const listar = async () => {
  try {
    return await prisma.tipoRetencionPercepcion.findMany({
      orderBy: [
        { tipo: 'asc' },
        { codigo: 'asc' }
      ]
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
    const tipo = await prisma.tipoRetencionPercepcion.findUnique({
      where: { id }
    });
    if (!tipo) throw new NotFoundError('Tipo de retención/percepción no encontrado');
    return tipo;
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
    await validarTipoRetencionPercepcion(data);

    return await prisma.tipoRetencionPercepcion.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        tasa: data.tasa || 0,
        activo: data.activo !== undefined ? data.activo : true
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
    const existente = await prisma.tipoRetencionPercepcion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de retención/percepción no encontrado');

    await validarTipoRetencionPercepcion({ ...data, id });

    return await prisma.tipoRetencionPercepcion.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        tasa: data.tasa,
        activo: data.activo
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
    const existente = await prisma.tipoRetencionPercepcion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de retención/percepción no encontrado');

    const enUsoRetenciones = await prisma.retencion.count({ where: { tipoRetencionId: id } });
    const enUsoPercepciones = await prisma.percepcion.count({ where: { tipoPercepcionId: id } });

    if (enUsoRetenciones > 0 || enUsoPercepciones > 0) {
      throw new ConflictError('No se puede eliminar el tipo porque está en uso');
    }

    await prisma.tipoRetencionPercepcion.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorTipo = async (tipo) => {
  try {
    if (!['RETENCION', 'PERCEPCION'].includes(tipo)) {
      throw new ValidationError('El tipo debe ser RETENCION o PERCEPCION');
    }

    return await prisma.tipoRetencionPercepcion.findMany({
      where: { tipo, activo: true },
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
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
  listarPorTipo
};