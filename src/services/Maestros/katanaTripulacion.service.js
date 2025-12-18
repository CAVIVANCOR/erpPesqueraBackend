import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para KatanaTripulacion
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de empresaId y rangos.
 * Lanza ValidationError si no son válidos.
 * @param {Object} data - Datos de la katana tripulación
 */
async function validarKatanaTripulacion(data) {
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const existe = await prisma.empresa.findUnique({ where: { id: BigInt(data.empresaId) } });
    if (!existe) {
      throw new ValidationError('La empresa seleccionada no existe');
    }
  }

  // Validar rangos
  if (data.rangoInicialTn !== undefined && data.rangoInicialTn !== null) {
    const valor = Number(data.rangoInicialTn);
    if (valor < 0) {
      throw new ValidationError('El rango inicial no puede ser negativo');
    }
  }

  if (data.rangoFinaTn !== undefined && data.rangoFinaTn !== null) {
    const valor = Number(data.rangoFinaTn);
    if (valor < 0) {
      throw new ValidationError('El rango final no puede ser negativo');
    }
  }

  // Validar que rangoInicial <= rangoFinal
  if (data.rangoInicialTn !== undefined && data.rangoFinaTn !== undefined &&
      data.rangoInicialTn !== null && data.rangoFinaTn !== null) {
    const inicial = Number(data.rangoInicialTn);
    const final = Number(data.rangoFinaTn);
    if (inicial > final) {
      throw new ValidationError('El rango inicial no puede ser mayor al rango final');
    }
  }

  if (data.kgOtorgadoCalculo !== undefined && data.kgOtorgadoCalculo !== null) {
    const valor = Number(data.kgOtorgadoCalculo);
    if (valor < 0) {
      throw new ValidationError('Los kg otorgados no pueden ser negativos');
    }
  }
}

/**
 * Lista todas las katanas tripulación.
 */
const listar = async () => {
  try {
    return await prisma.katanaTripulacion.findMany({ 
      include: { 
        empresa: true,
        descargasFaenaConsumo: true
      } 
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una katana tripulación por ID (incluyendo empresa y descargas asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const katana = await prisma.katanaTripulacion.findUnique({ 
      where: { id }, 
      include: { 
        empresa: true,
        descargasFaenaConsumo: true
      } 
    });
    if (!katana) throw new NotFoundError('Katana tripulación no encontrada');
    return katana;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una katana tripulación validando empresaId.
 */
const crear = async (data) => {
  try {
    await validarKatanaTripulacion(data);
    
    return await prisma.katanaTripulacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una katana tripulación existente, validando existencia y empresaId.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.katanaTripulacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Katana tripulación no encontrada');
    await validarKatanaTripulacion(data);
    
    return await prisma.katanaTripulacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una katana tripulación por ID, validando existencia y que no tenga descargas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.katanaTripulacion.findUnique({ 
      where: { id }, 
      include: { descargasFaenaConsumo: true } 
    });
    if (!existente) throw new NotFoundError('Katana tripulación no encontrada');
    if (existente.descargasFaenaConsumo && existente.descargasFaenaConsumo.length > 0) {
      throw new ConflictError('No se puede eliminar la katana tripulación porque tiene descargas de faena asociadas.');
    }
    await prisma.katanaTripulacion.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default { listar, obtenerPorId, crear, actualizar, eliminar };
