import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para RequerimientoCompra
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 */
async function validarForaneas(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }
  
  if (data.tipoDocumentoId) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
    if (!tipoDoc) throw new ValidationError('El tipo de documento referenciado no existe.');
  }
  
  if (data.serieDocId) {
    const serieDoc = await prisma.serieDoc.findUnique({ where: { id: data.serieDocId } });
    if (!serieDoc) throw new ValidationError('La serie de documento referenciada no existe.');
  }
  
  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) throw new ValidationError('El proveedor referenciado no existe.');
  }
}

/**
 * Lista todos los requerimientos de compra.
 */
const listar = async () => {
  try {
    return await prisma.requerimientoCompra.findMany({
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoProducto: true,
        tipoEstadoProducto: true,
        destinoProducto: true,
        formaPago: true,
        modoDespachoRecepcion: true,
        moneda: true,
        detalles: {
          include: {
            producto: true
          }
        }
      },
      orderBy: {
        fechaDocumento: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un requerimiento por ID (incluyendo detalles).
 */
const obtenerPorId = async (id) => {
  try {
    const req = await prisma.requerimientoCompra.findUnique({ 
      where: { id }, 
      include: { 
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoProducto: true,
        tipoEstadoProducto: true,
        destinoProducto: true,
        formaPago: true,
        modoDespachoRecepcion: true,
        moneda: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true,
                marca: true,
                familia: true,
                subfamilia: true
              }
            },
            proveedor: true,
            detallesCotizacion: true
          }
        },
        cotizacionesProveedores: {
          include: {
            proveedor: true
          }
        },
        ordenesCompra: true,
        entregaARendir: true
      } 
    });
    
    if (!req) throw new NotFoundError('RequerimientoCompra no encontrado');
    return req;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo requerimiento de compra.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios y acumular los faltantes
    const camposFaltantes = [];
    
    if (!data.empresaId) camposFaltantes.push('Empresa');
    if (!data.tipoDocumentoId) camposFaltantes.push('Tipo de Documento');
    if (!data.serieDocId) camposFaltantes.push('Serie de Documento');
    if (!data.tipoProductoId) camposFaltantes.push('Tipo Producto');
    if (!data.tipoEstadoProductoId) camposFaltantes.push('Estado Producto');
    if (!data.destinoProductoId) camposFaltantes.push('Destino Producto');
    if (!data.centroCostoId) camposFaltantes.push('Centro de Costo');
    
    if (camposFaltantes.length > 0) {
      throw new ValidationError(
        `Usted debe ingresar estos campos: ${camposFaltantes.join(', ')} que son obligatorios.`
      );
    }
    
    await validarForaneas(data);
    
    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener la empresa para el porcentaje de IGV
      const empresa = await tx.empresa.findUnique({
        where: { id: BigInt(data.empresaId) }
      });
      
      if (!empresa) {
        throw new ValidationError('Empresa no encontrada.');
      }
      
      // 2. Obtener la serie seleccionada
      const serie = await tx.serieDoc.findUnique({
        where: { id: BigInt(data.serieDocId) }
      });
      
      if (!serie) {
        throw new ValidationError('Serie de documento no encontrada.');
      }
      
      // 3. Calcular nuevo correlativo
      const nuevoCorrelativo = Number(serie.correlativo) + 1;
      
      // 4. Generar números con formato
      const numSerie = String(serie.serie).padStart(serie.numCerosIzqSerie, '0');
      const numCorre = String(nuevoCorrelativo).padStart(serie.numCerosIzqCorre, '0');
      const numeroDocumento = `${numSerie}-${numCorre}`;
      
      // 5. Actualizar el correlativo en SerieDoc
      await tx.serieDoc.update({
        where: { id: BigInt(data.serieDocId) },
        data: { correlativo: BigInt(nuevoCorrelativo) }
      });
      
      // 6. Crear el requerimiento con los números generados
      const nuevo = await tx.requerimientoCompra.create({
        data: {
          ...data,
          numSerieDoc: numSerie,
          numCorreDoc: numCorre,
          numeroDocumento,
          estadoId: data.estadoId || BigInt(34), // Estado por defecto: 34 (Pendiente)
          centroCostoId: data.centroCostoId || BigInt(14), // Centro de costo por defecto: 14
          fechaDocumento: data.fechaDocumento || new Date(),
          creadoPor: data.creadoPor || null,
          // Asignar porcentaje IGV desde la empresa si no viene en data
          porcentajeIGV: data.porcentajeIGV !== undefined ? data.porcentajeIGV : empresa.porcentajeIgv,
          esExoneradoAlIGV: data.esExoneradoAlIGV !== undefined ? data.esExoneradoAlIGV : false
        },
        include: {
          empresa: true,
          tipoProducto: true,
          tipoEstadoProducto: true,
          destinoProducto: true,
          proveedor: true,
          formaPago: true,
          tipoDocumento: true,
          serieDoc: true,
          moneda: true
        }
      });
      
      return nuevo;
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un requerimiento de compra existente.
 */
const actualizar = async (id, data) => {
  try {
    const existe = await prisma.requerimientoCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('RequerimientoCompra no encontrado');
    
    // Validar que no esté aprobado, anulado o autorizado
    if (existe.estadoId === BigInt(35)) { // APROBADO
      throw new ValidationError('No se puede modificar un requerimiento aprobado');
    }
    if (existe.estadoId === BigInt(36)) { // ANULADO
      throw new ValidationError('No se puede modificar un requerimiento anulado');
    }
    if (existe.estadoId === BigInt(37)) { // AUTORIZA COMPRA
      throw new ValidationError('No se puede modificar un requerimiento autorizado para compra');
    }
    
    await validarForaneas(data);
    
    const actualizado = await prisma.requerimientoCompra.update({
      where: { id },
      data: {
        ...data,
        actualizadoEn: new Date()
      },
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        moneda: true,
        detalles: {
          include: {
            producto: true
          }
        }
      }
    });
    
    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un requerimiento de compra.
 */
const eliminar = async (id) => {
  try {
    const existe = await prisma.requerimientoCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('RequerimientoCompra no encontrado');
    
    // Validar que no esté aprobado
    if (existe.estadoId === 33) { // APROBADO
      throw new ValidationError('No se puede eliminar un requerimiento aprobado. Debe anularlo primero.');
    }
    
    await prisma.requerimientoCompra.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Aprueba un requerimiento de compra y crea automáticamente la EntregaARendir
 * FLUJO COMPRA DIRECTA: Marca todos los detalles con aprobadoParaOrdenCompra = true
 * FLUJO CON COTIZACIONES: Regenera detalles desde items seleccionados de cotizaciones
 */
const aprobar = async (id) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const requerimiento = await tx.requerimientoCompra.findUnique({ 
        where: { id },
        include: {
          detalles: true,
          cotizacionesProveedores: {
            include: {
              proveedor: true,
              detalles: {
                include: {
                  producto: true
                }
              }
            }
          }
        }
      });
      
      if (!requerimiento) throw new NotFoundError('RequerimientoCompra no encontrado');
      
      // Buscar aprobador configurado
      const aprobador = await tx.parametroAprobador.findFirst({
        where: {
          moduloSistemaId: 4, // Compras
          empresaId: requerimiento.empresaId,
          cesado: false,
          vigenteDesde: { lte: new Date() },
          OR: [
            { vigenteHasta: null },
            { vigenteHasta: { gte: new Date() } }
          ]
        }
      });
      
      if (!aprobador) {
        throw new ValidationError('No hay aprobador configurado para esta empresa en el módulo de Compras');
      }
      
      // ===== FLUJO COMPRA DIRECTA =====
      if (!requerimiento.esConCotizacion) {
        // Validar que tenga detalles
        if (!requerimiento.detalles || requerimiento.detalles.length === 0) {
          throw new ValidationError('El requerimiento debe tener al menos un detalle para ser aprobado');
        }
        
        // Marcar todos los detalles como aprobados para OC
        await tx.detalleReqCompra.updateMany({
          where: { requerimientoCompraId: id },
          data: { aprobadoParaOrdenCompra: true }
        });
      }
      // ===== FLUJO CON COTIZACIONES =====
      else {
        // Obtener todos los items seleccionados de todas las cotizaciones
        const itemsSeleccionados = [];
        
        for (const cotizacion of requerimiento.cotizacionesProveedores) {
          const detallesSeleccionados = cotizacion.detalles.filter(
            d => d.esSeleccionadoParaOrdenCompra === true
          );
          
          for (const detalle of detallesSeleccionados) {
            itemsSeleccionados.push({
              cotizacionProveedorId: cotizacion.id,
              proveedorId: cotizacion.proveedorId,
              productoId: detalle.productoId,
              cantidad: detalle.cantidad,
              costoUnitario: detalle.precioUnitario,
              subtotal: detalle.subtotal,
              observaciones: detalle.observaciones,
              monedaId: requerimiento.monedaId // Usar moneda del requerimiento
            });
          }
        }
        
        if (itemsSeleccionados.length === 0) {
          throw new ValidationError('Debe seleccionar al menos un item de las cotizaciones antes de aprobar');
        }
        
        // Eliminar todos los detalles actuales del requerimiento
        await tx.detalleReqCompra.deleteMany({
          where: { requerimientoCompraId: id }
        });
        
        // Crear nuevos detalles desde los items seleccionados
        for (const item of itemsSeleccionados) {
          await tx.detalleReqCompra.create({
            data: {
              requerimientoCompraId: id,
              productoId: item.productoId,
              proveedorId: item.proveedorId,
              cantidad: item.cantidad,
              costoUnitario: item.costoUnitario,
              subtotal: item.subtotal,
              monedaId: item.monedaId,
              cotizacionProveedorId: item.cotizacionProveedorId,
              observaciones: item.observaciones,
              aprobadoParaOrdenCompra: true // Marcar como aprobado
            }
          });
        }
      }
      
      // Actualizar estado a APROBADO (id=35)
      const aprobado = await tx.requerimientoCompra.update({
        where: { id },
        data: {
          estadoId: BigInt(35), // APROBADO
          aprobadoPorId: aprobador.personalRespId,
          fechaAprobacion: new Date(),
          actualizadoEn: new Date()
        },
        include: {
          empresa: true,
          proveedor: true,
          detalles: {
            include: {
              producto: true,
              proveedor: true
            }
          }
        }
      });
      
      // Crear EntregaARendir automáticamente (solo si no existe)
      const entregaRendir = await tx.entregaARendirPCompras.upsert({
        where: { requerimientoCompraId: id },
        update: {},
        create: {
          requerimientoCompraId: id,
          respEntregaRendirId: requerimiento.solicitanteId || aprobador.personalRespId,
          centroCostoId: requerimiento.centroCostoId || BigInt(1),
          entregaLiquidada: false
        }
      });
      
      return {
        ...aprobado,
        entregaARendir: entregaRendir
      };
    });
  } catch (err) {
    console.error('Error en aprobar requerimiento:', err);
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Anula un requerimiento de compra
 */
const anular = async (id) => {
  try {
    const requerimiento = await prisma.requerimientoCompra.findUnique({ 
      where: { id },
      include: {
        ordenesCompra: true
      }
    });
    
    if (!requerimiento) throw new NotFoundError('RequerimientoCompra no encontrado');
    
    // Validar que no tenga órdenes de compra generadas
    if (requerimiento.ordenesCompra && requerimiento.ordenesCompra.length > 0) {
      throw new ValidationError('No se puede anular un requerimiento que ya tiene órdenes de compra generadas');
    }
    
    // Actualizar estado a ANULADO (id=36)
    const anulado = await prisma.requerimientoCompra.update({
      where: { id },
      data: {
        estadoId: BigInt(36), // ANULADO
        actualizadoEn: new Date()
      },
      include: {
        empresa: true,
        proveedor: true
      }
    });
    
    return anulado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Autoriza la compra de un requerimiento y genera órdenes de compra
 * Usa la lógica completa de generación con series y correlativos
 */
const autorizarCompra = async (id, autorizadoPorId) => {
  try {
    // Usar transacción para garantizar atomicidad
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener el requerimiento con todas sus relaciones
      const requerimiento = await tx.requerimientoCompra.findUnique({
        where: { id },
        include: {
          serieDoc: true,
          detalles: {
            include: {
              producto: true,
              proveedor: true
            }
          },
          cotizacionesProveedores: {
            include: {
              detalles: {
                where: {
                  esSeleccionadoParaOrdenCompra: true
                },
                include: {
                  producto: true,
                  detalleReqCompra: true
                }
              },
              proveedor: true
            }
          }
        }
      });
      
      if (!requerimiento) {
        throw new NotFoundError('Requerimiento de Compra no encontrado');
      }
      
      // 2. Validar que el requerimiento esté aprobado (estadoId = 35)
      if (requerimiento.estadoId !== BigInt(35)) {
        throw new ValidationError('Solo se pueden generar órdenes desde requerimientos aprobados');
      }
      
      // 3. Determinar si es compra directa o con cotizaciones
      const esCompraDirecta = !requerimiento.esConCotizacion;
      
      let ordenesGeneradas = [];
      
      if (esCompraDirecta) {
        // COMPRA DIRECTA: Generar una orden por proveedor
        const detallesPorProveedor = new Map();
        
        for (const detalle of requerimiento.detalles) {
          if (!detalle.proveedorId) {
            throw new ValidationError(`El detalle del producto ${detalle.producto?.nombre || detalle.productoId} no tiene proveedor asignado`);
          }
          
          const proveedorId = String(detalle.proveedorId);
          if (!detallesPorProveedor.has(proveedorId)) {
            detallesPorProveedor.set(proveedorId, []);
          }
          detallesPorProveedor.get(proveedorId).push(detalle);
        }
        
        // Generar una orden por cada proveedor
        for (const [proveedorId, detalles] of detallesPorProveedor) {
          const orden = await crearOrdenCompraDirectaInterno(tx, requerimiento, BigInt(proveedorId), detalles);
          ordenesGeneradas.push(orden);
        }
      } else {
        // COMPRA CON COTIZACIONES: Obtener detalles seleccionados
        const itemsPorProveedorMoneda = new Map();
        
        for (const cotizacion of requerimiento.cotizacionesProveedores) {
          if (cotizacion.detalles.length > 0) {
            const key = `${cotizacion.proveedorId}-${cotizacion.monedaId || 'null'}`;
            
            if (!itemsPorProveedorMoneda.has(key)) {
              itemsPorProveedorMoneda.set(key, {
                proveedorId: cotizacion.proveedorId,
                monedaId: cotizacion.monedaId,
                detalles: []
              });
            }
            
            itemsPorProveedorMoneda.get(key).detalles.push(...cotizacion.detalles);
          }
        }
        
        if (itemsPorProveedorMoneda.size === 0) {
          throw new ValidationError('No hay items seleccionados para generar órdenes de compra');
        }
        
        // Generar una orden por cada combinación proveedor-moneda
        for (const [key, data] of itemsPorProveedorMoneda) {
          const orden = await crearOrdenCompraConCotizacionInterno(tx, requerimiento, data.proveedorId, data.monedaId, data.detalles);
          ordenesGeneradas.push(orden);
        }
      }
      
      // 4. Actualizar estado del requerimiento a AUTORIZA COMPRA (37)
      const autorizado = await tx.requerimientoCompra.update({
        where: { id },
        data: {
          estadoId: BigInt(37), // AUTORIZA COMPRA
          autorizaCompraId: autorizadoPorId ? BigInt(autorizadoPorId) : null,
          actualizadoEn: new Date()
        },
        include: {
          empresa: true,
          proveedor: true
        }
      });
      
      return {
        ...autorizado,
        ordenesGeneradas
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Función auxiliar interna para crear una Orden de Compra (Compra Directa)
 */
async function crearOrdenCompraDirectaInterno(tx, requerimiento, proveedorId, detalles) {
  // 1. Buscar la serie correspondiente
  const serieOrden = await tx.serieDoc.findFirst({
    where: {
      tipoDocumentoId: BigInt(17), // ORDEN DE COMPRA
      empresaId: requerimiento.empresaId,
      tipoAlmacenId: requerimiento.serieDoc.tipoAlmacenId,
      serie: requerimiento.serieDoc.serie,
      activo: true
    }
  });
  
  if (!serieOrden) {
    throw new ValidationError(
      `No se encontró una serie activa para Orden de Compra con los criterios: ` +
      `empresaId=${requerimiento.empresaId}, tipoAlmacenId=${requerimiento.serieDoc.tipoAlmacenId}, serie=${requerimiento.serieDoc.serie}`
    );
  }
  
  // 2. Calcular nuevo correlativo
  const nuevoCorrelativo = Number(serieOrden.correlativo) + 1;
  
  // 3. Generar números con formato
  const numSerie = String(serieOrden.serie).padStart(serieOrden.numCerosIzqSerie, '0');
  const numCorre = String(nuevoCorrelativo).padStart(serieOrden.numCerosIzqCorre, '0');
  const numeroDocumento = `${numSerie}-${numCorre}`;
  
  // 4. Actualizar el correlativo en SerieDoc
  await tx.serieDoc.update({
    where: { id: serieOrden.id },
    data: { correlativo: BigInt(nuevoCorrelativo) }
  });
  
  // 5. Crear la Orden de Compra
  const ordenCompra = await tx.ordenCompra.create({
    data: {
      empresaId: requerimiento.empresaId,
      tipoDocumentoId: BigInt(17), // ORDEN DE COMPRA
      serieDocId: serieOrden.id,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento,
      fechaDocumento: new Date(),
      requerimientoCompraId: requerimiento.id,
      proveedorId: proveedorId,
      formaPagoId: requerimiento.formaPagoId,
      monedaId: requerimiento.monedaId,
      tipoCambio: requerimiento.tipoCambio,
      fechaEntrega: requerimiento.fechaRequerida,
      solicitanteId: requerimiento.solicitanteId,
      estadoId: BigInt(38), // PENDIENTE
      centroCostoId: requerimiento.centroCostoId,
      porcentajeIGV: requerimiento.porcentajeIGV,
      esExoneradoAlIGV: requerimiento.esExoneradoAlIGV,
      detalles: {
        create: detalles.map(detalle => ({
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.costoUnitario,
          observaciones: detalle.observaciones
        }))
      }
    },
    include: {
      proveedor: true,
      detalles: {
        include: {
          producto: true
        }
      }
    }
  });
  
  return ordenCompra;
}

/**
 * Función auxiliar interna para crear una Orden de Compra (Con Cotizaciones)
 */
async function crearOrdenCompraConCotizacionInterno(tx, requerimiento, proveedorId, monedaId, detallesCotizacion) {
  // 1. Buscar la serie correspondiente
  const serieOrden = await tx.serieDoc.findFirst({
    where: {
      tipoDocumentoId: BigInt(17), // ORDEN DE COMPRA
      empresaId: requerimiento.empresaId,
      tipoAlmacenId: requerimiento.serieDoc.tipoAlmacenId,
      serie: requerimiento.serieDoc.serie,
      activo: true
    }
  });
  
  if (!serieOrden) {
    throw new ValidationError(
      `No se encontró una serie activa para Orden de Compra con los criterios: ` +
      `empresaId=${requerimiento.empresaId}, tipoAlmacenId=${requerimiento.serieDoc.tipoAlmacenId}, serie=${requerimiento.serieDoc.serie}`
    );
  }
  
  // 2. Calcular nuevo correlativo
  const nuevoCorrelativo = Number(serieOrden.correlativo) + 1;
  
  // 3. Generar números con formato
  const numSerie = String(serieOrden.serie).padStart(serieOrden.numCerosIzqSerie, '0');
  const numCorre = String(nuevoCorrelativo).padStart(serieOrden.numCerosIzqCorre, '0');
  const numeroDocumento = `${numSerie}-${numCorre}`;
  
  // 4. Actualizar el correlativo en SerieDoc
  await tx.serieDoc.update({
    where: { id: serieOrden.id },
    data: { correlativo: BigInt(nuevoCorrelativo) }
  });
  
  // 5. Crear la Orden de Compra
  const ordenCompra = await tx.ordenCompra.create({
    data: {
      empresaId: requerimiento.empresaId,
      tipoDocumentoId: BigInt(17), // ORDEN DE COMPRA
      serieDocId: serieOrden.id,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento,
      fechaDocumento: new Date(),
      requerimientoCompraId: requerimiento.id,
      proveedorId: proveedorId,
      formaPagoId: requerimiento.formaPagoId,
      monedaId: monedaId, // Moneda del detalle de cotización
      tipoCambio: requerimiento.tipoCambio,
      fechaEntrega: requerimiento.fechaRequerida,
      solicitanteId: requerimiento.solicitanteId,
      estadoId: BigInt(38), // PENDIENTE
      centroCostoId: requerimiento.centroCostoId,
      porcentajeIGV: requerimiento.porcentajeIGV,
      esExoneradoAlIGV: requerimiento.esExoneradoAlIGV,
      detalles: {
        create: detallesCotizacion.map(detalle => ({
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
          observaciones: detalle.observaciones
        }))
      }
    },
    include: {
      proveedor: true,
      detalles: {
        include: {
          producto: true
        }
      }
    }
  });
  
  return ordenCompra;
}

/**
 * Obtiene series de documentos filtradas
 * Filtrado: SerieDoc.empresaId = RequerimientoCompra.empresaId
 *           SerieDoc.activo = true
 *           SerieDoc.tipoDocumentoId = RequerimientoCompra.tipoDocumentoId
 */
const obtenerSeriesDoc = async (empresaId, tipoDocumentoId) => {
  try {
    const where = {
      activo: true // Solo series activas
    };
    
    if (empresaId) where.empresaId = BigInt(empresaId);
    if (tipoDocumentoId) where.tipoDocumentoId = BigInt(tipoDocumentoId);
    
    const series = await prisma.serieDoc.findMany({
      where,
      orderBy: {
        serie: 'asc'
      }
    });
    
    return series;
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
  aprobar,
  anular,
  autorizarCompra,
  obtenerSeriesDoc
};