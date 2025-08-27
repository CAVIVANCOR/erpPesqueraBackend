import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Personal
 * Aplica validaciones de unicidad, referencias foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de numeroDocumento por empresa y existencia de referencias foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del personal
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarPersonal(data, excluirId = null) {
  // Validar unicidad de numeroDocumento por empresa
  if (data.numeroDocumento && data.empresaId) {
    const where = excluirId ? {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId,
      id: { not: excluirId }
    } : {
      numeroDocumento: data.numeroDocumento,
      empresaId: data.empresaId
    };
    const existe = await prisma.personal.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un personal con ese número de documento en la empresa.');
  }

  // Validar existencia de Empresa
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('Empresa no existente.');
  }

  // Validar existencia de referencias opcionales si se proveen
  // Solo se validan referencias que existen en el modelo Prisma actual
  const referencias = [
    { campo: 'tipoDocumentoId', modelo: 'tiposDocIdentidad' },
    { campo: 'tipoContratoId', modelo: 'tipoContrato' },
    { campo: 'cargoId', modelo: 'cargosPersonal' },
    { campo: 'ubigeoId', modelo: 'ubigeo' },
    { campo: 'areaFisicaId', modelo: 'areaFisicaSede' },
    { campo: 'sedeEmpresaId', modelo: 'sedesEmpresa' } // sedeEmpresaId referencia a la tabla sede
  ];
  for (const ref of referencias) {
    if (data[ref.campo] !== undefined && data[ref.campo] !== null) {
      const existe = await prisma[ref.modelo]?.findUnique?.({ where: { id: data[ref.campo] } });
      if (!existe) throw new ValidationError(`Referencia no existente para ${ref.campo}`);
    }
  }
}

/**
 * Lista todo el personal, incluyendo relaciones principales.
 * @param {Object} filtros - Filtros opcionales para la consulta
 * @param {number} filtros.empresaId - ID de la empresa para filtrar
 * @param {boolean} filtros.esVendedor - Si es vendedor o no
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    
    if (filtros.empresaId) {
      where.empresaId = filtros.empresaId;
    }
    
    if (filtros.esVendedor !== undefined) {
      where.esVendedor = filtros.esVendedor;
    }
    
    return await prisma.personal.findMany({
      where,
      include: {
        usuario: true,
        cargo: true,
        ubigeo: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un personal por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const persona = await prisma.personal.findUnique({
      where: { id },
      include: {
        usuario: true,
        cargo: true,
        ubigeo: true
      }
    });
    if (!persona) throw new NotFoundError('Personal no encontrado');
    return persona;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un registro de personal validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarPersonal(data);
    return await prisma.personal.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un registro de personal existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.personal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Personal no encontrado');
    await validarPersonal(data, id);
    return await prisma.personal.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un registro de personal por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.personal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Personal no encontrado');
    await prisma.personal.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista personal con cargo "BAHIA COMERCIAL" filtrado por empresa.
 * @param {number} empresaId - ID de la empresa para filtrar
 */
const listarBahiasComerciales = async (empresaId) => {
  try {
    const where = {
      empresaId: empresaId,
      cargo: {
        descripcion: "BAHIA COMERCIAL"
      }
    };
    
    return await prisma.personal.findMany({
      where,
      include: {
        cargo: true,
        ubigeo: true
      }
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
  listarBahiasComerciales
};
