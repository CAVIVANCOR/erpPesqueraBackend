import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EstadoMultiFuncion
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de tipoProvieneDeId si se envía.
 * Lanza ValidationError si no existe.
 * @param {Object} data - Datos del estado
 */
async function validarEstado(data) {
  if (data.tipoProvieneDeId !== undefined && data.tipoProvieneDeId !== null) {
    const existe = await prisma.tipoProvieneDe.findUnique({ where: { id: data.tipoProvieneDeId } });
    if (!existe) throw new ValidationError('TipoProvieneDe no existente para el campo tipoProvieneDeId.');
  }
}

/**
 * Lista todos los estados multi función.
 */
const listar = async () => {
  try {
    return await prisma.estadoMultiFuncion.findMany({ include: { tipoProvieneDe: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un estado por ID (incluyendo tipoProvieneDe asociado).
 */
const obtenerPorId = async (id) => {
  try {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id }, include: { tipoProvieneDe: true } });
    if (!estado) throw new NotFoundError('Estado multi función no encontrado');
    return estado;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un estado multi función validando tipoProvieneDeId si corresponde.
 */
const crear = async (data) => {
  try {
    await validarEstado(data);
    return await prisma.estadoMultiFuncion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un estado multi función existente, validando existencia y tipoProvieneDeId.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.estadoMultiFuncion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Estado multi función no encontrado');
    await validarEstado(data);
    return await prisma.estadoMultiFuncion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un estado multi función por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.estadoMultiFuncion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Estado multi función no encontrado');
    await prisma.estadoMultiFuncion.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista estados multifunción específicamente para productos.
 * Filtra por TipoProvieneDe con descripción "PRODUCTOS".
 */
const listarParaProductos = async () => {
  try {
    const estadosParaProductos = await prisma.estadoMultiFuncion.findMany({
      include: { tipoProvieneDe: true },
      where: {
        tipoProvieneDe: {
          descripcion: "PRODUCTOS"
        }
      }
    });
    return estadosParaProductos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista estados multifunción específicamente para embarcaciones.
 * Filtra por TipoProvieneDe con descripción "EMBARCACIONES".
 */
const listarParaEmbarcaciones = async () => {
  try {
    const estadosParaEmbarcaciones = await prisma.estadoMultiFuncion.findMany({
      include: { tipoProvieneDe: true },
      where: {
        tipoProvieneDe: {
          descripcion: "EMBARCACIONES"
        }
      }
    });
    return estadosParaEmbarcaciones;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista estados multifunción específicamente para temporadas de pesca.
 * Filtra por TipoProvieneDe con descripción "TEMPORADA PESCA".
 */
const listarParaTemporadaPesca = async () => {
  try {
    const estadosParaTemporadaPesca = await prisma.estadoMultiFuncion.findMany({
      include: { tipoProvieneDe: true },
      where: {
        tipoProvieneDe: {
          descripcion: "TEMPORADA PESCA"
        }
      }
    });
    return estadosParaTemporadaPesca;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista estados multifunción específicamente para faenas de pesca.
 * Filtra por TipoProvieneDe con descripción "FAENA PESCA".
 */
const listarParaFaenaPesca = async () => {
  try {
    const estadosParaFaenaPesca = await prisma.estadoMultiFuncion.findMany({
      include: { tipoProvieneDe: true },
      where: {
        tipoProvieneDe: {
          descripcion: "FAENA PESCA"
        }
      }
    });
    return estadosParaFaenaPesca;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista estados multifunción específicamente para faenas de pesca consumo.
 * Filtra por TipoProvieneDe con descripción "FAENA PESCA CONSUMO".
 */
const listarParaFaenaPescaConsumo = async () => {
  try {
    const estadosParaFaenaPescaConsumo = await prisma.estadoMultiFuncion.findMany({
      include: { tipoProvieneDe: true },
      where: {
        tipoProvieneDe: {
          descripcion: "FAENA PESCA CONSUMO"
        }
      }
    });
    return estadosParaFaenaPescaConsumo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista estados multifunción filtrados por tipoProvieneDeId.
 * Solo retorna los que no están cesados.
 */
const listarPorTipoProviene = async (tipoProvieneDeId) => {
  try {
    return await prisma.estadoMultiFuncion.findMany({
      where: {
        tipoProvieneDeId: BigInt(tipoProvieneDeId),
        cesado: false
      },
      include: { tipoProvieneDe: true }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarParaProductos,
  listarParaEmbarcaciones,
  listarParaTemporadaPesca,
  listarParaFaenaPesca,
  listarParaFaenaPescaConsumo,
  listarPorTipoProviene
};
