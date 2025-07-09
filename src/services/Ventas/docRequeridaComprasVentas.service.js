import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DocRequeridaComprasVentas
 * Valida unicidad de nombre, existencia de claves foráneas y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.docRequeridaComprasVentas.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un documento requerido con ese nombre.');
}

async function validarClavesForaneas(data) {
  const [tipoProducto, tipoEstado, destino, forma] = await Promise.all([
    prisma.tipoProducto.findUnique({ where: { id: data.tipoProductoId } }),
    prisma.tipoEstadoProducto.findUnique({ where: { id: data.tipoEstadoProductoId } }),
    prisma.destinoProducto.findUnique({ where: { id: data.destinoProductoId } }),
    prisma.formaTransaccion.findUnique({ where: { id: data.formaTransaccionId } })
  ]);
  if (!tipoProducto) throw new ValidationError('El tipoProductoId no existe.');
  if (!tipoEstado) throw new ValidationError('El tipoEstadoProductoId no existe.');
  if (!destino) throw new ValidationError('El destinoProductoId no existe.');
  if (!forma) throw new ValidationError('El formaTransaccionId no existe.');
}

const listar = async () => {
  try {
    return await prisma.docRequeridaComprasVentas.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const doc = await prisma.docRequeridaComprasVentas.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('DocRequeridaComprasVentas no encontrada');
    return doc;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) throw new ValidationError('El campo nombre es obligatorio.');
    if (!data.tipoProductoId || !data.tipoEstadoProductoId || !data.destinoProductoId || !data.formaTransaccionId) {
      throw new ValidationError('Todos los campos de clave foránea son obligatorios.');
    }
    await validarUnicidadNombre(data.nombre);
    await validarClavesForaneas(data);
    return await prisma.docRequeridaComprasVentas.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.docRequeridaComprasVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DocRequeridaComprasVentas no encontrada');
    if (data.nombre && data.nombre !== existente.nombre) {
      await validarUnicidadNombre(data.nombre, id);
    }
    // Validar claves foráneas si cambian
    const claves = ['tipoProductoId','tipoEstadoProductoId','destinoProductoId','formaTransaccionId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.docRequeridaComprasVentas.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.docRequeridaComprasVentas.findUnique({
      where: { id },
      include: { detallesDocCotizacion: true, detallesDocCotizacionCompras: true }
    });
    if (!existente) throw new NotFoundError('DocRequeridaComprasVentas no encontrada');
    if ((existente.detallesDocCotizacion && existente.detallesDocCotizacion.length > 0) ||
        (existente.detallesDocCotizacionCompras && existente.detallesDocCotizacionCompras.length > 0)) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.docRequeridaComprasVentas.delete({ where: { id } });
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
