import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Especie
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todas las especies.
 */
const listar = async () => {
  try {
    return await prisma.especie.findMany({ include: { calaEspecie: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una especie por ID (incluyendo calas asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const especie = await prisma.especie.findUnique({ where: { id }, include: { calaEspecie: true } });
    if (!especie) throw new NotFoundError('Especie no encontrada');
    return especie;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una especie.
 */
const crear = async (data) => {
  try {
    // Validar campos requeridos
    if (!data.nombre || data.nombre.trim() === '') {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    if (!data.nombreCientifico || data.nombreCientifico.trim() === '') {
      throw new ValidationError('El campo nombre científico es obligatorio.');
    }
    
    // Convertir a mayúsculas
    const dataToSave = {
      ...data,
      nombre: data.nombre.toUpperCase(),
      nombreCientifico: data.nombreCientifico.toUpperCase()
    };
    
    return await prisma.especie.create({ data: dataToSave });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una especie existente, validando existencia.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.especie.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Especie no encontrada');
    
    // Validar campos si se están actualizando
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    if (data.nombreCientifico !== undefined && (!data.nombreCientifico || data.nombreCientifico.trim() === '')) {
      throw new ValidationError('El campo nombre científico es obligatorio.');
    }
    
    // Convertir a mayúsculas
    const dataToSave = {
      ...data,
      nombre: data.nombre ? data.nombre.toUpperCase() : existente.nombre,
      nombreCientifico: data.nombreCientifico ? data.nombreCientifico.toUpperCase() : existente.nombreCientifico
    };
    
    return await prisma.especie.update({ where: { id }, data: dataToSave });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una especie por ID, validando existencia y que no tenga calas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.especie.findUnique({ where: { id }, include: { calaEspecie: true } });
    if (!existente) throw new NotFoundError('Especie no encontrada');
    if (existente.calaEspecie && existente.calaEspecie.length > 0) {
      throw new ConflictError('No se puede eliminar la especie porque tiene calas asociadas.');
    }
    await prisma.especie.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
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
