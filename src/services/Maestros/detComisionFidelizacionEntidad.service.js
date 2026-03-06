import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetComisionFidelizacionEntidad
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialFidelizacionId y personalId.
 * Lanza ValidationError según corresponda.
 * @param {Object} data - Datos de la comisión
 */
async function validarDetComisionFidelizacion(data) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialFidelizacionId) {
    const existe = await prisma.entidadComercial.findUnique({ 
      where: { id: data.entidadComercialFidelizacionId } 
    });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
  }
  // Validar existencia de Personal
  if (data.personalId) {
    const existePersonal = await prisma.personal.findUnique({ 
      where: { id: data.personalId } 
    });
    if (!existePersonal) throw new ValidationError('Personal no existente.');
  }
}

/**
 * Lista todos los detalles de comisión de fidelización.
 */
const listar = async () => {
  try {
    return await prisma.detComisionFidelizacionEntidad.findMany({
      include: {
        entidadComercial: true,
        personal: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un detalle de comisión por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detComisionFidelizacionEntidad.findUnique({
      where: { id },
      include: { 
        entidadComercial: true,
        personal: true
      }
    });
    if (!detalle) throw new NotFoundError('Detalle de comisión no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene todos los detalles de comisión de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialFidelizacionId) => {
  try {
    const resultado = await prisma.detComisionFidelizacionEntidad.findMany({
      where: { entidadComercialFidelizacionId },
      include: {
        entidadComercial: true,
        personal: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });
    
    return resultado;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en obtenerPorEntidad:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un detalle de comisión validando referencias.
 */
const crear = async (data) => {
  try {
    await validarDetComisionFidelizacion(data);
    return await prisma.detComisionFidelizacionEntidad.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle de comisión existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detComisionFidelizacionEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de comisión no encontrado');
    await validarDetComisionFidelizacion(data);
    return await prisma.detComisionFidelizacionEntidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle de comisión por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detComisionFidelizacionEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de comisión no encontrado');
    await prisma.detComisionFidelizacionEntidad.delete({ where: { id } });
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
  obtenerPorEntidad,
  crear,
  actualizar,
  eliminar
};