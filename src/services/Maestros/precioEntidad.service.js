import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PrecioEntidad
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialId, productoId y monedaId.
 * Lanza ValidationError según corresponda.
 * @param {Object} data - Datos del precio
 */
async function validarPrecioEntidad(data) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
  }
  // Validar existencia de Producto
  if (data.productoId) {
    const existeProducto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!existeProducto) throw new ValidationError('Producto no existente.');
  }
  // Validar existencia de Moneda
  if (data.monedaId) {
    const existeMoneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!existeMoneda) throw new ValidationError('Moneda no existente.');
  }
}

/**
 * Lista todos los precios de entidad.
 */
const listar = async () => {
  try {
    return await prisma.precioEntidad.findMany({
      include: {
        entidadComercial: true,
        moneda: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un precio por ID (incluyendo entidad comercial y moneda asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const precio = await prisma.precioEntidad.findUnique({
      where: { id },
      include: { entidadComercial: true, moneda: true }
    });
    if (!precio) throw new NotFoundError('Precio no encontrado');
    return precio;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene todos los precios de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialId) => {
  try {
    const resultado = await prisma.precioEntidad.findMany({
      where: { entidadComercialId },
      include: {
        entidadComercial: true,
        moneda: true,
      }
    });
    return resultado;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un precio validando referencias.
 */
const crear = async (data) => {
  try {
    await validarPrecioEntidad(data);
    return await prisma.precioEntidad.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un precio existente, validando existencia y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.precioEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Precio no encontrado');
    await validarPrecioEntidad(data);
    return await prisma.precioEntidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un precio por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.precioEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Precio no encontrado');
    await prisma.precioEntidad.delete({ where: { id } });
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
