import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Producto
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codigo y existencia de referencias foráneas.
 * Lanza ConflictError y ValidationError según corresponda.
 * @param {Object} data - Datos del producto
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarProducto(data, excluirId = null) {
  // Validar unicidad de codigo
  if (data.codigo) {
    const where = excluirId ? { codigo: data.codigo, id: { not: excluirId } } : { codigo: data.codigo };
    const existe = await prisma.producto.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un producto con ese código.');
  }
  // Validar existencia de referencias foráneas obligatorias
  const refsObligatorias = [
    { key: 'familiaId', model: prisma.familiaProducto, label: 'Familia de producto' },
    { key: 'unidadMedidaId', model: prisma.unidadMedida, label: 'Unidad de medida' }
  ];
  for (const ref of refsObligatorias) {
    if (data[ref.key]) {
      const existe = await ref.model.findUnique({ where: { id: data[ref.key] } });
      if (!existe) throw new ValidationError(`${ref.label} no existente.`);
    }
  }
  // Validar existencia de referencias foráneas opcionales si se envían
  const opcionales = [
    { key: 'subfamiliaId', model: prisma.subfamiliaProducto, label: 'Subfamilia' },
    { key: 'tipoAlmacenamientoId', model: prisma.tipoAlmacenamiento, label: 'Tipo de almacenamiento' },
    { key: 'procedenciaId', model: prisma.procedencia, label: 'Procedencia' },
    { key: 'marcaId', model: prisma.marca, label: 'Marca' },
    { key: 'estadoInicialId', model: prisma.estadoInicial, label: 'Estado inicial' },
    { key: 'tipoMaterialId', model: prisma.tipoMaterial, label: 'Tipo de material' },
    { key: 'colorId', model: prisma.color, label: 'Color' },
    { key: 'unidadDiametroId', model: prisma.unidadMedida, label: 'Unidad de diámetro' },
    { key: 'unidadAnchoId', model: prisma.unidadMedida, label: 'Unidad de ancho' },
    { key: 'unidadAltoId', model: prisma.unidadMedida, label: 'Unidad de alto' },
    { key: 'unidadLargoId', model: prisma.unidadMedida, label: 'Unidad de largo' },
    { key: 'unidadEspesorId', model: prisma.unidadMedida, label: 'Unidad de espesor' },
    { key: 'unidadAnguloId', model: prisma.unidadMedida, label: 'Unidad de ángulo' },
    { key: 'clienteId', model: prisma.entidadComercial, label: 'Cliente' }
  ];
  for (const ref of opcionales) {
    if (data[ref.key] !== undefined && data[ref.key] !== null) {
      const existe = await ref.model.findUnique({ where: { id: data[ref.key] } });
      if (!existe) throw new ValidationError(`${ref.label} no existente.`);
    }
  }
}

/**
 * Lista todos los productos.
 */
const listar = async () => {
  try {
    return await prisma.producto.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un producto por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const producto = await prisma.producto.findUnique({ where: { id } });
    if (!producto) throw new NotFoundError('Producto no encontrado');
    return producto;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un producto validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarProducto(data);
    return await prisma.producto.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un producto existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.producto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Producto no encontrado');
    await validarProducto(data, id);
    return await prisma.producto.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un producto por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.producto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Producto no encontrado');
    await prisma.producto.delete({ where: { id } });
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
