import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Banco
 * Incluye validaciones de unicidad y manejo de errores personalizados.
 * Documentado en español.
 */

/**
 * Relaciones que se devuelven con cada banco.
 * enlaceEntidadComercial: entidad comercial (acreedor/tercero) que representa al banco.
 */
const includeBanco = {
  cuentaContable: true,
  enlaceEntidadComercial: {
    select: {
      id: true,
      razonSocial: true,
      nombreComercial: true,
      numeroDocumento: true,
      estado: true,
    },
  },
};

async function listar() {
  try {
    return await prisma.banco.findMany({
      include: includeBanco,
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function obtenerPorId(id) {
  try {
    const banco = await prisma.banco.findUnique({
      where: { id },
      include: includeBanco,
    });
    if (!banco) throw new NotFoundError('Banco no encontrado');
    return banco;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Valida que existan las referencias foráneas requeridas antes de crear o actualizar un banco.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} data - Objeto con los IDs a validar
 */
async function validarReferencias({ paisId, enlaceEntidadComercialId }) {
  if (paisId !== undefined) {
    const pais = await prisma.pais.findUnique({ where: { id: paisId } });
    if (!pais) throw new ValidationError('País no existente');
  }

  // La entidad comercial enlazada es opcional; null, 0 o vacío significan "sin enlace"
  const enlace = normalizarEnlaceEntidadComercial(enlaceEntidadComercialId);
  if (enlace) {
    const entidad = await prisma.entidadComercial.findUnique({
      where: { id: enlace },
      select: { id: true, estado: true },
    });
    if (!entidad) throw new ValidationError('Entidad comercial enlazada no existente');
    if (!entidad.estado) throw new ValidationError('La entidad comercial enlazada está inactiva');
  }
}

/**
 * Normaliza el enlace con la entidad comercial:
 * - undefined  -> undefined (el campo no se envió: no se modifica)
 * - null, 0, '' -> null     (sin enlace / limpiar el campo)
 * - otro valor  -> Number(id)
 */
function normalizarEnlaceEntidadComercial(valor) {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '' || Number(valor) === 0) return null;
  const id = Number(valor);
  if (!Number.isInteger(id) || id < 0) {
    throw new ValidationError('Entidad comercial enlazada inválida');
  }
  return id;
}

/**
 * Valida que no exista un banco duplicado con el mismo nombre, código Swift o código BCRP.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado({ nombre, codigoSwift, codigoBcrp }, excluirId = null) {
  const where = {
    OR: [
      nombre ? { nombre } : undefined,
      codigoSwift ? { codigoSwift } : undefined,
      codigoBcrp ? { codigoBcrp } : undefined
    ].filter(Boolean)
  };
  if (where.OR.length === 0) return;
  const existe = await prisma.banco.findFirst({ where: excluirId ? { ...where, id: { not: excluirId } } : where });
  if (existe) throw new ConflictError('Ya existe un banco con el mismo nombre o código');
}

/**
 * Crea un banco nuevo validando referencias y unicidad.
 * @param {Object} data - Datos del banco
 * @returns {Promise<Object>} - Banco creado
 */
async function crear(data) {
  try {
    await validarReferencias(data);
    await validarDuplicado(data);
    
    // Convertir 0 a null para cuenta contable (0 significa "limpiar campo")
    const dataToCreate = { ...data };
    if (dataToCreate.cuentaContableId === 0) {
      dataToCreate.cuentaContableId = null;
    }

    // Enlace con la entidad comercial: 0/vacío -> null; si no se envió, no se toca
    const enlaceCrear = normalizarEnlaceEntidadComercial(dataToCreate.enlaceEntidadComercialId);
    if (enlaceCrear !== undefined) dataToCreate.enlaceEntidadComercialId = enlaceCrear;
    
    return await prisma.banco.create({ data: dataToCreate });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Actualiza un banco existente, validando primero la existencia del ID, luego referencias y duplicados.
 * @param {BigInt|number} id - ID del banco a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Banco actualizado
 */
async function actualizar(id, data) {
  try {
    // Primero valida existencia del banco
    const existente = await prisma.banco.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Banco no encontrado');

    // Valida referencias foráneas
    await validarReferencias(data);

    // Valida duplicados
    await validarDuplicado(data, id);

    // Convertir 0 a null para cuenta contable (0 significa "limpiar campo")
    const dataToUpdate = { ...data };
    if (dataToUpdate.cuentaContableId === 0) {
      dataToUpdate.cuentaContableId = null;
    }

    // Enlace con la entidad comercial: 0/vacío -> null (limpia); si no se envió, no se toca
    const enlaceActualizar = normalizarEnlaceEntidadComercial(dataToUpdate.enlaceEntidadComercialId);
    if (enlaceActualizar !== undefined) dataToUpdate.enlaceEntidadComercialId = enlaceActualizar;

    // Realiza la actualización
    const actualizado = await prisma.banco.update({ where: { id }, data: dataToUpdate });
    return actualizado;
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}


async function eliminar(id) {
  try {
    const existente = await prisma.banco.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Banco no encontrado');
    await prisma.banco.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
