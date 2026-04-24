import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleDiaSinFaena
 * Maneja días sin faena para TemporadaPesca y NovedadPescaConsumo (polimórfico)
 * Documentado en español.
 */

/**
 * Valida claves foráneas y reglas de negocio
 */
async function validarDetalle(data) {
  // Validar que solo uno de los campos polimórficos esté lleno
  if (data.temporadaPescaId && data.novedadPescaConsumoId) {
    throw new ValidationError('Solo puede especificar temporadaPescaId O novedadPescaConsumoId, no ambos.');
  }

  if (!data.temporadaPescaId && !data.novedadPescaConsumoId) {
    throw new ValidationError('Debe especificar temporadaPescaId O novedadPescaConsumoId.');
  }

  // Validar existencia de TemporadaPesca si se envía
  if (data.temporadaPescaId) {
    const temporada = await prisma.temporadaPesca.findUnique({
      where: { id: data.temporadaPescaId }
    });
    if (!temporada) {
      throw new ValidationError('La temporadaPescaId no existe.');
    }
  }

  // Validar existencia de NovedadPescaConsumo si se envía
  if (data.novedadPescaConsumoId) {
    const novedad = await prisma.novedadPescaConsumo.findUnique({
      where: { id: data.novedadPescaConsumoId }
    });
    if (!novedad) {
      throw new ValidationError('La novedadPescaConsumoId no existe.');
    }
  }

  // Validar existencia de MotivoSinFaena
  if (data.motivoSinFaenaId) {
    const motivo = await prisma.motivoSinFaena.findUnique({
      where: { id: data.motivoSinFaenaId }
    });
    if (!motivo) {
      throw new ValidationError('El motivoSinFaenaId no existe.');
    }
  }
}

/**
 * Lista todos los detalles de días sin faena
 */
const listar = async () => {
  try {
    return await prisma.detalleDiaSinFaena.findMany({
      include: {
        temporadaPesca: true,
        novedadPescaConsumo: true,
        motivoSinFaena: true,
        personalCreador: true,
        personalActualizador: true
      },
      orderBy: { fecha: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) 
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista detalles por temporadaPescaId
 */
const listarPorTemporada = async (temporadaPescaId) => {
  try {
    return await prisma.detalleDiaSinFaena.findMany({
      where: { temporadaPescaId: BigInt(temporadaPescaId) },
      include: {
        motivoSinFaena: true,
        personalCreador: true,
        personalActualizador: true
      },
      orderBy: { fecha: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) 
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista detalles por novedadPescaConsumoId
 */
const listarPorNovedad = async (novedadPescaConsumoId) => {
  try {
    return await prisma.detalleDiaSinFaena.findMany({
      where: { novedadPescaConsumoId: BigInt(novedadPescaConsumoId) },
      include: {
        motivoSinFaena: true,
        personalCreador: true,
        personalActualizador: true
      },
      orderBy: { fecha: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) 
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un detalle por ID
 */
const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleDiaSinFaena.findUnique({
      where: { id },
      include: {
        temporadaPesca: true,
        novedadPescaConsumo: true,
        motivoSinFaena: true,
        personalCreador: true,
        personalActualizador: true
      }
    });
    if (!detalle) throw new NotFoundError('Detalle de día sin faena no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) 
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un detalle de día sin faena
 */
const crear = async (data) => {
  try {
    await validarDetalle(data);
    return await prisma.detalleDiaSinFaena.create({
      data,
      include: {
        motivoSinFaena: true,
        personalCreador: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) 
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle de día sin faena
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detalleDiaSinFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de día sin faena no encontrado');
    
    await validarDetalle(data);
    
    return await prisma.detalleDiaSinFaena.update({
      where: { id },
      data,
      include: {
        motivoSinFaena: true,
        personalActualizador: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) 
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle de día sin faena
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleDiaSinFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de día sin faena no encontrado');
    
    await prisma.detalleDiaSinFaena.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) 
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  listarPorTemporada,
  listarPorNovedad,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};