import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { toUpperCaseSafe } from '../../utils/numberUtils.js';

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
 * Normaliza campos de texto a mayúsculas y convierte strings vacíos a null
 * @param {Object} data - Datos del producto
 * @returns {Object} - Datos normalizados
 */
function normalizarDatosProducto(data) {
  // Helper para convertir string vacío a null
  const emptyToNull = (value) => {
    if (value === '' || value === undefined) return null;
    return value;
  };

  return {
    ...data,
    codigo: toUpperCaseSafe(data.codigo),
    descripcionBase: toUpperCaseSafe(data.descripcionBase),
    descripcionArmada: toUpperCaseSafe(data.descripcionArmada),
    descripcionExtendida: toUpperCaseSafe(data.descripcionExtendida),
    medidaAlto: emptyToNull(toUpperCaseSafe(data.medidaAlto)),
    medidaAncho: emptyToNull(toUpperCaseSafe(data.medidaAncho)),
    medidaAngulo: emptyToNull(toUpperCaseSafe(data.medidaAngulo)),
    medidaDiametro: emptyToNull(toUpperCaseSafe(data.medidaDiametro)),
    medidaEspesor: emptyToNull(toUpperCaseSafe(data.medidaEspesor)),
    medidaLargo: emptyToNull(toUpperCaseSafe(data.medidaLargo)),
    descripcionMedidaAdicional: emptyToNull(toUpperCaseSafe(data.descripcionMedidaAdicional)),
    urlFichaTecnica: emptyToNull(data.urlFichaTecnica),
    // Convertir IDs de unidades a null si son 0 o vacíos
    unidadDiametroId: data.unidadDiametroId && data.unidadDiametroId !== 0 ? data.unidadDiametroId : null,
    unidadAnchoId: data.unidadAnchoId && data.unidadAnchoId !== 0 ? data.unidadAnchoId : null,
    unidadAltoId: data.unidadAltoId && data.unidadAltoId !== 0 ? data.unidadAltoId : null,
    unidadLargoId: data.unidadLargoId && data.unidadLargoId !== 0 ? data.unidadLargoId : null,
    unidadEspesorId: data.unidadEspesorId && data.unidadEspesorId !== 0 ? data.unidadEspesorId : null,
    unidadAnguloId: data.unidadAnguloId && data.unidadAnguloId !== 0 ? data.unidadAnguloId : null,
  };
}

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
    { key: 'colorId', model: prisma.color, label: 'Color' }
  ];

  for (const ref of refsObligatorias) {
    if (data[ref.key]) {
      const existe = await ref.model.findUnique({ where: { id: data[ref.key] } });
      if (!existe) throw new ValidationError(`${ref.label} no existente.`);
    }
  }

  // Validar existencia de referencias foráneas opcionales si se envían
  const opcionales = [
    { key: 'unidadAnguloId', model: prisma.unidadMedida, label: 'Unidad de ángulo' },
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

    const productos = await prisma.producto.findMany({
      where,
      include: includeRelaciones,
      orderBy: {
        codigo: 'asc'
      }
    });

    // Agregar manualmente empresa y cliente a cada producto
    const productosConRelaciones = await Promise.all(
      productos.map(async (producto) => {
        let empresa = null;
        let cliente = null;

        // Consultar empresa si existe empresaId
        if (producto.empresaId) {
          empresa = await prisma.empresa.findUnique({
            where: { id: producto.empresaId },
            select: { id: true, razonSocial: true, nombreComercial: true }
          });
        }

        // Consultar cliente (EntidadComercial) si existe clienteId
        if (producto.clienteId) {
          cliente = await prisma.entidadComercial.findUnique({
            where: { id: producto.clienteId },
            select: { id: true, razonSocial: true, nombreComercial: true }
          });
        }

        return {
          ...producto,
          empresa,
          cliente
        };
      })
    );

    return productosConRelaciones;
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
 * Hereda automáticamente los márgenes de utilidad de la Empresa si no se especifican.
 */
const crear = async (data) => {
  try {
    console.log('📦 Iniciando creación de producto con datos:', JSON.stringify(data, null, 2));
    
    // Normalizar campos de texto a mayúsculas
    const dataNormalizada = normalizarDatosProducto(data);
    console.log('✅ Datos normalizados correctamente');
    
    // Si no hay código, generar uno automático basado en familia y timestamp
    if (!dataNormalizada.codigo) {
      const timestamp = Date.now().toString().slice(-6);
      const familiaPrefix = dataNormalizada.familiaId ? `F${dataNormalizada.familiaId}` : 'PROD';
      dataNormalizada.codigo = `${familiaPrefix}-${timestamp}`;
      console.log('📝 Código generado automáticamente:', dataNormalizada.codigo);
    }
    
    await validarProducto(dataNormalizada);
    console.log('✅ Validaciones completadas correctamente');
    
    // Heredar márgenes de la Empresa si no se especificaron
    let dataConMargenes = { ...dataNormalizada };
    
    if (data.empresaId && (data.margenMinimoPermitido === undefined || data.margenUtilidadObjetivo === undefined)) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: data.empresaId },
        select: {
          margenMinimoPermitido: true,
          margenUtilidadObjetivo: true
        }
      });
      
      if (empresa) {
        // Solo heredar si no se especificaron en el producto
        if (data.margenMinimoPermitido === undefined && empresa.margenMinimoPermitido !== null) {
          dataConMargenes.margenMinimoPermitido = empresa.margenMinimoPermitido;
        }
        if (data.margenUtilidadObjetivo === undefined && empresa.margenUtilidadObjetivo !== null) {
          dataConMargenes.margenUtilidadObjetivo = empresa.margenUtilidadObjetivo;
        }
      }
    }
    
    console.log('📝 Intentando crear producto en BD con datos finales:', JSON.stringify(dataConMargenes, null, 2));
    
    // Eliminar el campo 'id' si existe para evitar conflictos con autoincrement
    const { id, ...dataParaCrear } = dataConMargenes;
    
    if (id) {
      console.warn('⚠️ Se intentó enviar un ID en la creación, se ha removido:', id);
    }
    
    const producto = await prisma.producto.create({
      data: {
        ...dataParaCrear,
        fechaActualizacion: new Date()
      },
      include: includeRelaciones
    });
    
    console.log('✅ Producto creado exitosamente con ID:', producto.id);
    return producto;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      // Extraer información más específica del error de Prisma
      let mensajeDetallado = 'Error de base de datos';
      
      if (err.code === 'P2002') {
        mensajeDetallado = 'Ya existe un registro con ese valor único';
      } else if (err.code === 'P2003') {
        mensajeDetallado = 'Referencia a registro inexistente';
      } else if (err.code === 'P2025') {
        mensajeDetallado = 'Registro no encontrado';
      } else if (err.meta?.target) {
        mensajeDetallado = `Error en campo: ${err.meta.target}`;
      }
      
      console.error('❌ Error Prisma al crear producto:', {
        code: err.code,
        message: err.message,
        meta: err.meta
      });
      
      throw new DatabaseError(mensajeDetallado, err.message);
    }
    console.error('❌ Error inesperado al crear producto:', err);
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
    
    // Normalizar campos de texto a mayúsculas
    const dataNormalizada = normalizarDatosProducto(data);
    
    await validarProducto(dataNormalizada, id);
    const producto = await prisma.producto.update({
      where: { id },
      data: {
        ...dataNormalizada,
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
