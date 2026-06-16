import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Almacen
 * Incluye validaciones de referencias foráneas y manejo de errores personalizados.
 * Documentado en español.
 */

async function listar() {
  try {
    return await prisma.almacen.findMany({
      include: {
        centroAlmacen: true,
        tipoAlmacenamiento: true,
        tipoAlmacen: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function obtenerPorId(id) {
  try {
    const almacen = await prisma.almacen.findUnique({
      where: { id },
      include: {
        centroAlmacen: true,
        tipoAlmacenamiento: true,
        tipoAlmacen: true
      }
    });
    if (!almacen) throw new NotFoundError('Almacén no encontrado');
    return almacen;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Valida que existan las referencias foráneas requeridas antes de crear o actualizar un almacén.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} data - Objeto con los IDs a validar
 */
async function validarReferencias({ centroAlmacenId, tipoAlmacenamientoId, tipoAlmacenId }) {
  if (centroAlmacenId !== undefined) {
    const centro = await prisma.centrosAlmacen.findUnique({ where: { id: centroAlmacenId } });
    if (!centro) throw new ValidationError('Centro de Almacén no existente');
  }
  if (tipoAlmacenamientoId !== undefined) {
    const tipoAlm = await prisma.tipoAlmacenamiento.findUnique({ where: { id: tipoAlmacenamientoId } });
    if (!tipoAlm) throw new ValidationError('Tipo de Almacenamiento no existente');
  }
  if (tipoAlmacenId !== undefined) {
    const tipo = await prisma.tipoAlmacen.findUnique({ where: { id: tipoAlmacenId } });
    if (!tipo) throw new ValidationError('Tipo de Almacén no existente');
  }
}

/**
 * Valida que no exista un almacén duplicado con el mismo nombre.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado({ nombre }, excluirId = null) {
  if (!nombre) return;
  const where = { nombre };
  const existe = await prisma.almacen.findFirst({
    where: excluirId ? { ...where, id: { not: excluirId } } : where
  });
  if (existe) throw new ConflictError('Ya existe un almacén con el mismo nombre');
}

/**
 * Crea un almacén nuevo validando referencias y unicidad.
 * @param {Object} data - Datos del almacén
 * @returns {Promise<Object>} - Almacén creado
 */
async function crear(data) {
  try {
    await validarReferencias(data);
    await validarDuplicado(data);
    return await prisma.almacen.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Actualiza un almacén existente, validando primero la existencia del ID, luego referencias y duplicados.
 * @param {BigInt|number} id - ID del almacén a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Almacén actualizado
 */
async function actualizar(id, data) {
  try {
    const existente = await prisma.almacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Almacén no encontrado');
    await validarReferencias(data);
    await validarDuplicado(data, id);
    const actualizado = await prisma.almacen.update({ where: { id }, data });
    return actualizado;
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function eliminar(id) {
  try {
    const existente = await prisma.almacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Almacén no encontrado');

    // Verificar si el almacén está siendo usado en ConceptoMovAlmacen (como origen o destino)
    const conceptosOrigen = await prisma.conceptoMovAlmacen.count({ 
      where: { almacenOrigenId: id } 
    });
    const conceptosDestino = await prisma.conceptoMovAlmacen.count({ 
      where: { almacenDestinoId: id } 
    });
    const totalConceptos = conceptosOrigen + conceptosDestino;
    
    if (totalConceptos > 0) {
      throw new ConflictError(
        `No se puede eliminar el almacén porque está siendo usado en ${totalConceptos} concepto(s) de movimiento de almacén`
      );
    }

    // Verificar si tiene contratos de servicio asociados
    const contratos = await prisma.contratoServicio.count({ where: { almacenId: id } });
    if (contratos > 0) {
      throw new ConflictError(
        `No se puede eliminar el almacén porque tiene ${contratos} contrato(s) de servicio asociado(s)`
      );
    }

    // Verificar si tiene registros de kardex
    const kardex = await prisma.kardexAlmacen.count({ where: { almacenId: id } });
    if (kardex > 0) {
      throw new ConflictError(
        `No se puede eliminar el almacén porque tiene ${kardex} registro(s) de kardex asociado(s)`
      );
    }

    // Verificar si tiene ubicaciones físicas
    const ubicaciones = await prisma.ubicacionFisica.count({ where: { almacenId: id } });
    if (ubicaciones > 0) {
      throw new ConflictError(
        `No se puede eliminar el almacén porque tiene ${ubicaciones} ubicación(es) física(s) asociada(s)`
      );
    }

    await prisma.almacen.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al eliminar almacén', err.message);
    }
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