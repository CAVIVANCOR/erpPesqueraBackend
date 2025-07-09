import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EmpresaCentroCosto
 * Aplica validaciones de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de Empresa y CentroCosto.
 * Lanza ValidationError si no existe alguna clave foránea.
 * @param {BigInt} empresaId
 * @param {BigInt} centroCostoId
 */
async function validarForaneas(empresaId, centroCostoId) {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  const centro = await prisma.centroCosto.findUnique({ where: { id: centroCostoId } });
  if (!centro) throw new ValidationError('El centro de costo referenciado no existe.');
}

/**
 * Lista todos los registros de EmpresaCentroCosto.
 */
const listar = async () => {
  try {
    return await prisma.empresaCentroCosto.findMany({ include: { empresa: true, centroCosto: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un registro por ID (incluyendo relaciones asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const registro = await prisma.empresaCentroCosto.findUnique({ where: { id }, include: { empresa: true, centroCosto: true } });
    if (!registro) throw new NotFoundError('EmpresaCentroCosto no encontrado');
    return registro;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un registro validando existencia de claves foráneas y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.EmpresaID || !data.CentroCostoID || !data.ResponsableID) {
      throw new ValidationError('Los campos EmpresaID, CentroCostoID y ResponsableID son obligatorios.');
    }
    await validarForaneas(data.EmpresaID, data.CentroCostoID);
    return await prisma.empresaCentroCosto.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un registro existente, validando existencia y claves foráneas si cambian.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.empresaCentroCosto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EmpresaCentroCosto no encontrado');
    if (data.EmpresaID !== undefined && data.EmpresaID !== null) {
      await validarForaneas(data.EmpresaID, data.CentroCostoID ?? existente.CentroCostoID);
    } else if (data.CentroCostoID !== undefined && data.CentroCostoID !== null) {
      await validarForaneas(existente.EmpresaID, data.CentroCostoID);
    }
    return await prisma.empresaCentroCosto.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un registro por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.empresaCentroCosto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EmpresaCentroCosto no encontrado');
    await prisma.empresaCentroCosto.delete({ where: { id } });
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
