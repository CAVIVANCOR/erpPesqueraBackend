import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetDocEmbarcacionPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, documento] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }),
    prisma.documentoPesca.findUnique({ where: { id: data.documentoPescaId } })
  ]);
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (!documento) throw new ValidationError('El documentoPescaId no existe.');
}

const listar = async () => {
  try {
    const detalles = await prisma.detDocEmbarcacionPescaConsumo.findMany();
    
    // Obtener todos los documentos de pesca
    const documentosPesca = await prisma.documentoPesca.findMany();
    
    // Agregar el nombre del documento a cada detalle
    const detallesConDocumento = detalles.map(detalle => ({
      ...detalle,
      documentoPesca: documentosPesca.find(doc => Number(doc.id) === Number(detalle.documentoPescaId))
    }));
    
    return detallesConDocumento;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detDocEmbarcacionPescaConsumo.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetDocEmbarcacionPescaConsumo no encontrado');
    
    // Obtener el documento de pesca
    const documentoPesca = await prisma.documentoPesca.findUnique({ 
      where: { id: det.documentoPescaId } 
    });
    
    return {
      ...det,
      documentoPesca
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['faenaPescaConsumoId','documentoPescaId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    
    const nuevoDetalle = await prisma.detDocEmbarcacionPescaConsumo.create({ data: dataConFecha });
    
    // Obtener el documento de pesca
    const documentoPesca = await prisma.documentoPesca.findUnique({ 
      where: { id: nuevoDetalle.documentoPescaId } 
    });
    
    return {
      ...nuevoDetalle,
      documentoPesca
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detDocEmbarcacionPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocEmbarcacionPescaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaConsumoId','documentoPescaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    
    const actualizado = await prisma.detDocEmbarcacionPescaConsumo.update({ where: { id }, data: dataConFecha });
    
    // Obtener el documento de pesca
    const documentoPesca = await prisma.documentoPesca.findUnique({ 
      where: { id: actualizado.documentoPescaId } 
    });
    
    return {
      ...actualizado,
      documentoPesca
    };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detDocEmbarcacionPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocEmbarcacionPescaConsumo no encontrado');
    await prisma.detDocEmbarcacionPescaConsumo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};