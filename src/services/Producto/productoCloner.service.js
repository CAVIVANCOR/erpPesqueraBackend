import prisma from '../../config/prismaClient.js';
import { ValidationError } from '../../utils/errors.js';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO DE CLONACIÓN DE PRODUCTOS A MÚLTIPLES EMPRESAS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Permite clonar productos existentes de una empresa a otras empresas.
 * 
 * FLUJO:
 * 1. Usuario selecciona N productos de una empresa origen
 * 2. Usuario selecciona M empresas destino
 * 3. Sistema clona cada producto a cada empresa (N × M clones)
 * 4. Sistema valida duplicados y omite productos que ya existen
 * 5. Sistema retorna resumen de clonación
 * 
 * EJEMPLO:
 * - 3 productos seleccionados
 * - 3 empresas destino
 * - Total: 9 productos clonados
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Verifica si un producto ya existe en una empresa
 * @param {string} codigo - Código del producto
 * @param {BigInt} empresaId - ID de la empresa
 * @returns {Promise<boolean>} - true si existe, false si no
 */
const verificarProductoExistente = async (codigo, empresaId) => {
  if (!codigo) return false;
  
  const existente = await prisma.producto.findFirst({
    where: {
      codigo,
      empresaId,
    },
  });
  
  return !!existente;
};

/**
 * Genera un código único para el producto clonado
 * @param {string} codigoOriginal - Código del producto original
 * @param {BigInt} empresaDestinoId - ID de la empresa destino
 * @returns {Promise<string>} - Código único generado
 */
const generarCodigoUnico = async (codigoOriginal, empresaDestinoId) => {
  if (!codigoOriginal) {
    return null; // Si no hay código original, retornar null
  }

  // Obtener información de la empresa destino para usar en el sufijo
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaDestinoId },
    select: { id: true }
  });

  if (!empresa) {
    throw new Error('Empresa destino no encontrada');
  }

  // Generar código con sufijo de empresa
  // Formato: CODIGO-ORIGINAL-EMP{ID}
  let codigoNuevo = `${codigoOriginal}-E${empresa.id}`;
  
  // Verificar si el código ya existe (por si se clona múltiples veces)
  let contador = 1;
  let codigoExiste = await prisma.producto.findFirst({
    where: { codigo: codigoNuevo }
  });

  // Si existe, agregar un contador
  while (codigoExiste) {
    codigoNuevo = `${codigoOriginal}-E${empresa.id}-${contador}`;
    codigoExiste = await prisma.producto.findFirst({
      where: { codigo: codigoNuevo }
    });
    contador++;
  }

  return codigoNuevo;
};

/**
 * Clona un producto individual a una empresa destino
 * @param {Object} productoOrigen - Producto a clonar
 * @param {BigInt} empresaDestinoId - ID de la empresa destino
 * @param {BigInt|null} clienteId - ID del cliente a asignar (opcional)
 * @returns {Promise<Object>} - Producto clonado
 */
const clonarProductoIndividual = async (productoOrigen, empresaDestinoId, clienteId = null) => {
  // Extraer solo los campos necesarios para la clonación
  const {
    id,
    codigo,
    fechaCreacion,
    fechaActualizacion,
    empresaId,
    // Relaciones (no se copian)
    familia,
    subfamilia,
    unidadMedida,
    unidadMedidaComercial,
    tipoMaterial,
    color,
    tipoAlmacenamiento,
    marca,
    detallesMovimiento,
    kardexAlmacenes,
    detallesRequerimientosCompra,
    detallesOrdenCompra,
    detallesPreFactura,
    detallesCotizacionVentas,
    saldosDetProductoCliente,
    saldosProductoCliente,
    detalleCotizacionProveedor,
    detMovsEntregaRendirPCompras,
    detMovsEntregaRendir,
    detMovsEntregaRendirPescaConsumo,
    detMovsEntregaRendirPVentas,
    costosExportacionCotizacion,
    costosExportacionPorIncoterm,
    precioEntidad,
    movimientosCaja,
    detMovsEntregaRendirMovAlmacen,
    serviciosContrato,
    movimientosContratoServicio,
    detMovsEntregaOTMantenimiento,
    detallesComprobante,
    gastosPlanificados,
    serviciosContratistasOT,
    repuestosContratistasOT,
    cuentaCompras,
    cuentaInventario,
    cuentaCostoVentas,
    cuentaVariacion,
    cuentaVentas,
    tipoDetraccion,
    tipoAfectacionIGV,
    activos,
    ...datosProducto
  } = productoOrigen;

  // Generar código único para el producto clonado
  const codigoUnico = await generarCodigoUnico(codigo, empresaDestinoId);

  // PASO 1: Crear el producto clonado (exactamente igual, solo cambia código y empresa)
  let productoClonado = await prisma.producto.create({
    data: {
      ...datosProducto,
      codigo: codigoUnico,
      empresaId: empresaDestinoId,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    },
    include: {
      familia: true,
      subfamilia: true,
      unidadMedida: true,
      marca: true,
      color: true,
      tipoAlmacenamiento: true,
      tipoMaterial: true,
    },
  });

  // PASO 2: Actualizar el cliente si fue seleccionado
  if (clienteId) {
    productoClonado = await prisma.producto.update({
      where: { id: productoClonado.id },
      data: {
        clienteId: BigInt(clienteId)
      },
      include: {
        familia: true,
        subfamilia: true,
        unidadMedida: true,
        marca: true,
        color: true,
        tipoAlmacenamiento: true,
        tipoMaterial: true,
      },
    });
  }

  return productoClonado;
};

/**
 * Clona múltiples productos a múltiples empresas
 * @param {BigInt[]} productosIds - IDs de los productos a clonar
 * @param {BigInt[]} empresasDestinoIds - IDs de las empresas destino
 * @param {BigInt|null} clienteId - ID del cliente a asignar (opcional)
 * @returns {Promise<Object>} - Resumen de la clonación
 */
export const clonarProductosAEmpresas = async (productosIds, empresasDestinoIds, clienteId = null) => {
  // ════════════════════════════════════════════════════════════════
  // VALIDACIONES
  // ════════════════════════════════════════════════════════════════
  
  if (!productosIds || productosIds.length === 0) {
    throw new ValidationError('Debe seleccionar al menos un producto para clonar');
  }

  if (!empresasDestinoIds || empresasDestinoIds.length === 0) {
    throw new ValidationError('Debe seleccionar al menos una empresa destino');
  }

  // ════════════════════════════════════════════════════════════════
  // CARGAR PRODUCTOS ORIGEN
  // ════════════════════════════════════════════════════════════════
  
  const productosOrigen = await prisma.producto.findMany({
    where: {
      id: {
        in: productosIds.map(id => BigInt(id)),
      },
    },
  });

  if (productosOrigen.length === 0) {
    throw new ValidationError('No se encontraron los productos seleccionados');
  }

  // ════════════════════════════════════════════════════════════════
  // VERIFICAR QUE LAS EMPRESAS DESTINO EXISTEN
  // ════════════════════════════════════════════════════════════════
  
  const empresasDestino = await prisma.empresa.findMany({
    where: {
      id: {
        in: empresasDestinoIds.map(id => BigInt(id)),
      },
    },
  });

  if (empresasDestino.length !== empresasDestinoIds.length) {
    throw new ValidationError('Una o más empresas destino no existen');
  }

  // ════════════════════════════════════════════════════════════════
  // PROCESO DE CLONACIÓN
  // ════════════════════════════════════════════════════════════════
  
  const resultados = {
    exitosos: [],
    omitidos: [],
    errores: [],
    totalProcesados: 0,
    totalExitosos: 0,
    totalOmitidos: 0,
    totalErrores: 0,
  };

  // Por cada producto origen
  for (const productoOrigen of productosOrigen) {
    // Por cada empresa destino
    for (const empresaDestino of empresasDestino) {
      resultados.totalProcesados++;

      try {
        // Clonar el producto (se genera código único automáticamente)
        const productoClonado = await clonarProductoIndividual(
          productoOrigen,
          empresaDestino.id,
          clienteId
        );

        resultados.exitosos.push({
          productoOrigenId: productoOrigen.id.toString(),
          productoOrigenCodigo: productoOrigen.codigo,
          productoOrigenNombre: productoOrigen.descripcionBase,
          productoNuevoId: productoClonado.id.toString(),
          productoNuevoCodigo: productoClonado.codigo,
          empresaId: empresaDestino.id.toString(),
          empresaNombre: empresaDestino.razonSocial,
        });
        resultados.totalExitosos++;

      } catch (error) {
        // Registrar error
        resultados.errores.push({
          productoId: productoOrigen.id.toString(),
          productoCodigo: productoOrigen.codigo,
          productoNombre: productoOrigen.descripcionBase,
          empresaId: empresaDestino.id.toString(),
          empresaNombre: empresaDestino.razonSocial,
          error: error.message,
        });
        resultados.totalErrores++;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // RETORNAR RESUMEN
  // ════════════════════════════════════════════════════════════════
  
  return resultados;
};

export default {
  clonarProductosAEmpresas,
};
