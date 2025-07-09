import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetCotizacionVentas
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

async function validarForaneas(data) {
  // Validar existencia de claves foráneas principales
  const claves = [
    { campo: 'empresaId', modelo: 'empresa' },
    { campo: 'cotizacionVentasId', modelo: 'cotizacionVentas' },
    { campo: 'productoId', modelo: 'producto' },
    { campo: 'clienteId', modelo: 'cliente' },
    { campo: 'monedaId', modelo: 'moneda' },
    { campo: 'movSalidaAlmacenId', modelo: 'movimientoAlmacen' },
    { campo: 'centroCostoId', modelo: 'centroCosto' }
  ];
  for (const clave of claves) {
    if (data[clave.campo] !== undefined && data[clave.campo] !== null) {
      const existe = await prisma[clave.modelo].findUnique({ where: { id: data[clave.campo] } });
      if (!existe) throw new ValidationError(`La clave foránea ${clave.campo} (${clave.modelo}) no existe.`);
    }
  }
}

const listar = async () => {
  try {
    return await prisma.detCotizacionVentas.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detCotizacionVentas.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetCotizacionVentas no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios
    const obligatorios = [
      'empresaId','cotizacionVentasId','productoId','clienteId','cantidad','precioUnitario','monedaId','movSalidaAlmacenId','centroCostoId'
    ];
    for (const campo of obligatorios) {
      if (data[campo] === undefined || data[campo] === null) {
        throw new ValidationError(`El campo obligatorio ${campo} no fue proporcionado.`);
      }
    }
    await validarForaneas(data);
    return await prisma.detCotizacionVentas.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detCotizacionVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetCotizacionVentas no encontrado');
    await validarForaneas({ ...existente, ...data });
    return await prisma.detCotizacionVentas.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detCotizacionVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetCotizacionVentas no encontrado');
    await prisma.detCotizacionVentas.delete({ where: { id } });
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
