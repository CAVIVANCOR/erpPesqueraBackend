import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoAfectacionIGV
 * Gestiona el Catálogo 07 de SUNAT - Tipo de Afectación del IGV.
 * Documentado en español.
 */

/**
 * Valida los datos de un tipo de afectación IGV.
 * @param {Object} data - Datos del tipo de afectación
 */
async function validarTipoAfectacionIGV(data) {
  // Validar código SUNAT único
  if (data.codigoSunat) {
    const existente = await prisma.tipoAfectacionIGV.findFirst({
      where: {
        codigoSunat: data.codigoSunat,
        id: data.id ? { not: data.id } : undefined
      }
    });
    if (existente) {
      throw new ValidationError(`El código SUNAT "${data.codigoSunat}" ya existe.`);
    }
  }

  // Validar porcentaje IGV
  if (data.porcentajeIGV !== undefined && data.porcentajeIGV !== null) {
    if (data.porcentajeIGV < 0 || data.porcentajeIGV > 100) {
      throw new ValidationError('El porcentaje de IGV debe estar entre 0 y 100.');
    }
  }

  // Validar tipo operación
  if (data.tipoOperacion && !['GRAVADO', 'EXONERADO', 'INAFECTO', 'EXPORTACION', 'GRATUITO'].includes(data.tipoOperacion)) {
    throw new ValidationError('El tipo de operación debe ser: GRAVADO, EXONERADO, INAFECTO, EXPORTACION o GRATUITO.');
  }
}

/**
 * Lista todos los tipos de afectación IGV ordenados por código SUNAT.
 */
const listar = async () => {
  try {
    return await prisma.tipoAfectacionIGV.findMany({
      orderBy: { codigoSunat: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un tipo de afectación IGV por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoAfectacionIGV.findUnique({
      where: { id }
    });
    if (!tipo) throw new NotFoundError('Tipo de afectación IGV no encontrado');
    return tipo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo tipo de afectación IGV.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.codigoSunat || !data.descripcion) {
      throw new ValidationError('Los campos codigoSunat y descripcion son obligatorios.');
    }

    await validarTipoAfectacionIGV(data);

    const tipoData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.tipoAfectacionIGV.create({ data: tipoData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un tipo de afectación IGV existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoAfectacionIGV.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de afectación IGV no encontrado');

    await validarTipoAfectacionIGV({ ...data, id });

    const tipoData = {
      ...data,
      fechaActualizacion: new Date()
    };

    return await prisma.tipoAfectacionIGV.update({
      where: { id },
      data: tipoData
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Elimina un tipo de afectación IGV por ID.
 * Valida que no esté siendo usado en comprobantes electrónicos.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoAfectacionIGV.findUnique({
      where: { id },
      include: {
        detallesComprobante: true
      }
    });

    if (!existente) throw new NotFoundError('Tipo de afectación IGV no encontrado');

    // Validar que no esté siendo usado
    if (existente.detallesComprobante && existente.detallesComprobante.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de afectación porque está siendo usado en comprobantes electrónicos.');
    }

    await prisma.tipoAfectacionIGV.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista tipos de afectación IGV activos.
 */
const listarActivos = async () => {
  try {
    return await prisma.tipoAfectacionIGV.findMany({
      where: { activo: true },
      orderBy: { codigoSunat: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Lista tipos de afectación IGV por tipo de operación.
 */
const listarPorTipoOperacion = async (tipoOperacion) => {
  try {
    return await prisma.tipoAfectacionIGV.findMany({
      where: { tipoOperacion },
      orderBy: { codigoSunat: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un tipo de afectación IGV por código SUNAT.
 */
const obtenerPorCodigoSunat = async (codigoSunat) => {
  try {
    const tipo = await prisma.tipoAfectacionIGV.findFirst({
      where: { codigoSunat }
    });
    if (!tipo) throw new NotFoundError(`Tipo de afectación IGV con código SUNAT "${codigoSunat}" no encontrado`);
    return tipo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
  listarActivos,
  listarPorTipoOperacion,
  obtenerPorCodigoSunat
};
