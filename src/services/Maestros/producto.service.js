import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Producto
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Incluye todas las relaciones con Marca, TipoAlmacenamiento y demás catálogos.
 * Documentado en español.
 */

/**
 * Configuración de relaciones para incluir en las consultas
 */
const includeRelaciones = {
  familia: true,
  subfamilia: true,
  unidadMedida: true,
  tipoAlmacenamiento: true,
  marca: true,
  tipoMaterial: true,
  color: true
};

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
    { key: 'subfamiliaId', model: prisma.subfamiliaProducto, label: 'Subfamilia de producto' },
    { key: 'unidadMedidaId', model: prisma.unidadMedida, label: 'Unidad de medida' },
    { key: 'tipoAlmacenamientoId', model: prisma.tipoAlmacenamiento, label: 'Tipo de almacenamiento' },
    { key: 'marcaId', model: prisma.marca, label: 'Marca' },
    { key: 'estadoInicialId', model: prisma.estadoMultiFuncion, label: 'Estado inicial' },
    { key: 'tipoMaterialId', model: prisma.tipoMaterial, label: 'Tipo de material' },
    { key: 'colorId', model: prisma.color, label: 'Color' },
    { key: 'unidadAnguloId', model: prisma.unidadMedida, label: 'Unidad de ángulo' }
  ];

  for (const ref of refsObligatorias) {
    if (data[ref.key]) {
      const existe = await ref.model.findUnique({ where: { id: data[ref.key] } });
      if (!existe) throw new ValidationError(`${ref.label} no existente.`);
    }
  }

  // Validar existencia de referencias foráneas opcionales si se envían
  const opcionales = [
    { key: 'unidadDiametroId', model: prisma.unidadMedida, label: 'Unidad de diámetro' },
    { key: 'unidadAnchoId', model: prisma.unidadMedida, label: 'Unidad de ancho' },
    { key: 'unidadAltoId', model: prisma.unidadMedida, label: 'Unidad de alto' },
    { key: 'unidadLargoId', model: prisma.unidadMedida, label: 'Unidad de largo' },
    { key: 'unidadEspesorId', model: prisma.unidadMedida, label: 'Unidad de espesor' }
  ];

  for (const ref of opcionales) {
    if (data[ref.key] !== undefined && data[ref.key] !== null) {
      const existe = await ref.model.findUnique({ where: { id: data[ref.key] } });
      if (!existe) throw new ValidationError(`${ref.label} no existente.`);
    }
  }

  // Validar que la subfamilia pertenezca a la familia seleccionada
  if (data.familiaId && data.subfamiliaId) {
    const subfamilia = await prisma.subfamiliaProducto.findUnique({
      where: { id: data.subfamiliaId }
    });
    if (subfamilia && Number(subfamilia.familiaId) !== Number(data.familiaId)) {
      throw new ValidationError('La subfamilia seleccionada no pertenece a la familia indicada.');
    }
  }
}

/**
 * Lista todos los productos con sus relaciones completas.
 * @param {Object} filtros - Filtros opcionales { empresaId, clienteId }
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    
    // Aplicar filtros si están presentes
    if (filtros.empresaId) {
      where.empresaId = Number(filtros.empresaId);
    }
    
    if (filtros.clienteId) {
      where.clienteId = Number(filtros.clienteId);
    }

    return await prisma.producto.findMany({
      where,
      include: includeRelaciones,
      orderBy: {
        codigo: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar productos', err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un producto por ID con sus relaciones completas.
 */
const obtenerPorId = async (id) => {
  try {
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: includeRelaciones
    });
    if (!producto) throw new NotFoundError('Producto no encontrado');
    return producto;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene productos filtrados por entidad comercial (clienteId) y empresa (empresaId).
 * @param {number} entidadComercialId - ID de la entidad comercial (clienteId)
 * @param {number} empresaId - ID de la empresa
 */
const obtenerPorEntidadYEmpresa = async (entidadComercialId, empresaId) => {
  try {
    return await prisma.producto.findMany({
      where: {
        clienteId: Number(entidadComercialId),
        empresaId: Number(empresaId)
      },
      include: includeRelaciones,
      orderBy: {
        codigo: 'asc'
      }
    });
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
    const producto = await prisma.producto.create({
      data: {
        ...data,
        fechaActualizacion: new Date()
      },
      include: includeRelaciones
    });
    return producto;
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
    const producto = await prisma.producto.update({
      where: { id },
      data: {
        ...data,
        fechaActualizacion: new Date()
      },
      include: includeRelaciones
    });
    return producto;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un producto por ID, validando existencia y dependencias.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.producto.findUnique({
      where: { id },
      include: {
        detallesMovimiento: true,
        kardexAlmacenes: true,
        detallesRequerimientosCompra: true,
        detallesOrdenCompra: true,
        detallesPreFactura: true
      }
    });
    
    if (!existente) throw new NotFoundError('Producto no encontrado');
    
    // Verificar dependencias antes de eliminar
    const tieneDependencias = 
      existente.detallesMovimiento?.length > 0 ||
      existente.kardexAlmacenes?.length > 0 ||
      existente.detallesRequerimientosCompra?.length > 0 ||
      existente.detallesOrdenCompra?.length > 0 ||
      existente.detallesPreFactura?.length > 0;
    
    if (tieneDependencias) {
      throw new ConflictError('No se puede eliminar el producto porque tiene movimientos, órdenes o documentos asociados.');
    }
    
    await prisma.producto.delete({ where: { id } });
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
  obtenerPorEntidadYEmpresa,
  crear,
  actualizar,
  eliminar
};
