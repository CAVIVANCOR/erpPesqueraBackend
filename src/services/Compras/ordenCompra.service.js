import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para OrdenCompra
 * Documentado en español.
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
  
  if (data.requerimientoCompraId) {
    const req = await prisma.requerimientoCompra.findUnique({ 
      where: { id: data.requerimientoCompraId } 
    });
    if (!req) throw new ValidationError('El requerimiento de compra referenciado no existe.');
  }
}

const listar = async () => {
  try {
    return await prisma.ordenCompra.findMany({
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        requerimientoCompra: true,
        proveedor: true,
        formaPago: true,
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

const obtenerPorId = async (id) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({ 
      where: { id },
      include: { 
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        requerimientoCompra: {
          include: {
            detalles: {
              include: {
                producto: {
                  include: {
                    unidadMedida: true
                  }
                }
              }
            }
          }
        },
        proveedor: true,
        formaPago: true,
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
            }
          }
        }
      }
    });
    
    if (!orden) throw new NotFoundError('OrdenCompra no encontrada');
    return orden;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.empresaId || !data.tipoDocumentoId || !data.proveedorId) {
      throw new ValidationError('Los campos empresaId, tipoDocumentoId y proveedorId son obligatorios.');
    }
    if (!data.serieDocId) {
      throw new ValidationError('El campo serieDocId es obligatorio.');
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
      
      // 6. Obtener estado inicial (PENDIENTE = 32)
      const estadoInicial = await tx.estadoMultiFuncion.findFirst({
        where: { id: 32 } // PENDIENTE
      });
      
      if (!estadoInicial) {
        throw new ValidationError('No se encontró el estado inicial PENDIENTE (id=32)');
      }
      
      // 7. Crear la orden de compra con los números generados
      const nuevo = await tx.ordenCompra.create({
        data: {
          ...data,
          numSerieDoc: numSerie,
          numCorreDoc: numCorre,
          numeroDocumento,
          estadoId: estadoInicial.id,
          fechaDocumento: data.fechaDocumento || new Date(),
          // Asignar porcentaje IGV desde la empresa si no viene en data
          porcentajeIGV: data.porcentajeIGV !== undefined ? data.porcentajeIGV : empresa.porcentajeIgv,
          esExoneradoAlIGV: data.esExoneradoAlIGV !== undefined ? data.esExoneradoAlIGV : false
        },
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
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

const actualizar = async (id, data) => {
  try {
    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('OrdenCompra no encontrada');
    
    // Validar que no esté anulada
    if (existe.estadoId === 40) { // ANULADO - ORDEN DE COMPRA
      throw new ValidationError('No se puede modificar una orden anulada');
    }
    
    await validarForaneas(data);
    
    // Usar transacción para actualizar orden y recalcular subtotales de detalles
    const actualizado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la orden de compra
      const ordenActualizada = await tx.ordenCompra.update({
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
      
      // 2. Recalcular subtotales de TODOS los detalles (si existen)
      const detalles = await tx.detalleOrdenCompra.findMany({
        where: { ordenCompraId: id }
      });
      
      // Solo actualizar si hay detalles
      if (detalles && detalles.length > 0) {
        for (const detalle of detalles) {
          const subtotalCalculado = Number(detalle.cantidad) * Number(detalle.precioUnitario);
          await tx.detalleOrdenCompra.update({
            where: { id: detalle.id },
            data: {
              subtotal: subtotalCalculado
            }
          });
        }
      }
      
      // 3. Retornar la orden actualizada con detalles recalculados
      return await tx.ordenCompra.findUnique({
        where: { id },
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
    });
    
    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('OrdenCompra no encontrada');
    
    // Validar que no esté anulada
    if (existe.estadoId === 40) { // ANULADO - ORDEN DE COMPRA
      throw new ValidationError('No se puede eliminar una orden anulada.');
    }
    
    await prisma.ordenCompra.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene series de documentos filtradas
 * Filtrado: SerieDoc.empresaId = OrdenCompra.empresaId
 *           SerieDoc.activo = true
 *           SerieDoc.tipoDocumentoId = OrdenCompra.tipoDocumentoId
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

/**
 * Aprueba una orden de compra
 */
const aprobar = async (id) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) throw new NotFoundError('OrdenCompra no encontrada');
    
    // Validar que esté en estado PENDIENTE
    if (orden.estadoId !== 38) {
      throw new ValidationError('Solo se pueden aprobar órdenes en estado PENDIENTE');
    }
    
    const aprobado = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estadoId: BigInt(39), // APROBADO - ORDEN DE COMPRA
        actualizadoEn: new Date()
      },
      include: {
        empresa: true,
        tipoDocumento: true,
        proveedor: true,
        detalles: {
          include: {
            producto: true
          }
        }
      }
    });
    
    return aprobado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Anula una orden de compra
 */
const anular = async (id) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) throw new NotFoundError('OrdenCompra no encontrada');
    
    // Validar que no esté ya anulada
    if (orden.estadoId === 40) {
      throw new ValidationError('La orden ya está anulada');
    }
    
    const anulado = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estadoId: BigInt(40), // ANULADO - ORDEN DE COMPRA
        actualizadoEn: new Date()
      },
      include: {
        empresa: true,
        tipoDocumento: true,
        proveedor: true,
        detalles: {
          include: {
            producto: true
          }
        }
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
 * Genera Órdenes de Compra desde un Requerimiento de Compra
 * Maneja tanto compra directa como compra con cotizaciones
 */
const generarDesdeRequerimiento = async (requerimientoCompraId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener el requerimiento con todas sus relaciones
      const requerimiento = await tx.requerimientoCompra.findUnique({
        where: { id: BigInt(requerimientoCompraId) },
        include: {
          serieDoc: true,
          detalles: {
            include: {
              producto: true,
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
          const orden = await crearOrdenCompraDirecta(tx, requerimiento, BigInt(proveedorId), detalles);
          ordenesGeneradas.push(orden);
        }
      } else {
        // COMPRA CON COTIZACIONES: Obtener detalles seleccionados
        const cotizaciones = await tx.cotizacionProveedor.findMany({
          where: {
            requerimientoCompraId: BigInt(requerimientoCompraId)
          },
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
        });
        
        // Agrupar por proveedor y moneda
        const itemsPorProveedorMoneda = new Map();
        
        for (const cotizacion of cotizaciones) {
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
          const orden = await crearOrdenCompraConCotizacion(tx, requerimiento, data.proveedorId, data.monedaId, data.detalles);
          ordenesGeneradas.push(orden);
        }
      }
      
      // 4. Actualizar estado del requerimiento a AUTORIZA COMPRA (37)
      await tx.requerimientoCompra.update({
        where: { id: BigInt(requerimientoCompraId) },
        data: {
          estadoId: BigInt(37), // AUTORIZA COMPRA
          actualizadoEn: new Date()
        }
      });
      
      return ordenesGeneradas;
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Función auxiliar para crear una Orden de Compra (Compra Directa)
 */
async function crearOrdenCompraDirecta(tx, requerimiento, proveedorId, detalles) {
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
  
  // 3. Generar números con formato (mismo patrón que RequerimientoCompra)
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
 * Función auxiliar para crear una Orden de Compra (Con Cotizaciones)
 */
async function crearOrdenCompraConCotizacion(tx, requerimiento, proveedorId, monedaId, detallesCotizacion) {
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

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerSeriesDoc,
  aprobar,
  anular,
  generarDesdeRequerimiento
};