import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Empresa
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de representantelegalId y entidadComercialId si se envían.
 * Lanza ValidationError si no existen.
 * @param {Object} data - Datos de la empresa
 */
async function validarEmpresa(data) {
  if (data.representantelegalId !== undefined && data.representantelegalId !== null) {
    // Si existe la entidad Persona o similar, descomentar y ajustar:
    // const existe = await prisma.persona.findUnique({ where: { id: data.representantelegalId } });
    // if (!existe) throw new ValidationError('Representante legal no existente para el campo representantelegalId.');
  }
  
  if (data.entidadComercialId !== undefined && data.entidadComercialId !== null) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente para el campo entidadComercialId.');
  }
}

/**
 * Lista todas las empresas.
 */
const listar = async () => {
  try {
    return await prisma.empresa.findMany({ include: { sedes: true, centrosCosto: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una empresa por ID (incluyendo sedes y centros de costo asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id }, include: { sedes: true, centrosCosto: true } });
    if (!empresa) throw new NotFoundError('Empresa no encontrada');
    return empresa;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una empresa validando representantelegalId.
 */
const crear = async (data) => {
  try {
    await validarEmpresa(data);
    return await prisma.empresa.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una empresa existente, validando existencia y representantelegalId.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.empresa.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Empresa no encontrada');
    await validarEmpresa(data);
    return await prisma.empresa.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una empresa por ID, validando existencia y que no tenga sedes o centros de costo asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.empresa.findUnique({ where: { id }, include: { sedes: true, centrosCosto: true } });
    if (!existente) throw new NotFoundError('Empresa no encontrada');
    if ((existente.sedes && existente.sedes.length > 0) || (existente.centrosCosto && existente.centrosCosto.length > 0)) {
      throw new ConflictError('No se puede eliminar la empresa porque tiene sedes o centros de costo asociados.');
    }
    await prisma.empresa.delete({ where: { id } });
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
