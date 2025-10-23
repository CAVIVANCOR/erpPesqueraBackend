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
            cotizacionProveedor: true
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
          serieDoc: true
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
 */
const aprobar = async (id) => {
  try {
    const requerimiento = await prisma.requerimientoCompra.findUnique({ 
      where: { id },
      include: {
        detalles: true,
        cotizacionesProveedores: true
      }
    });
    
    if (!requerimiento) throw new NotFoundError('RequerimientoCompra no encontrado');
    
    // Validar que tenga detalles
    if (!requerimiento.detalles || requerimiento.detalles.length === 0) {
      throw new ValidationError('El requerimiento debe tener al menos un detalle para ser aprobado');
    }
    
    // Validar que si es con cotización, tenga una cotización seleccionada
    if (requerimiento.esConCotizacion) {
      const cotizacionSeleccionada = requerimiento.cotizacionesProveedores?.find(c => c.esSeleccionada);
      if (!cotizacionSeleccionada) {
        throw new ValidationError('Debe seleccionar una cotización antes de aprobar');
      }
    }
    
    // Buscar aprobador configurado
    const aprobador = await prisma.parametroAprobador.findFirst({
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
    
    // Actualizar estado a APROBADO (id=35)
    const aprobado = await prisma.requerimientoCompra.update({
      where: { id },
      data: {
        estadoId: BigInt(35), // APROBADO
        aprobadoPorId: aprobador.personalRespId,
        fechaAprobacion: new Date(),
        actualizadoEn: new Date()
      },
      include: {
        empresa: true,
        proveedor: true
      }
    });
    
    // Crear EntregaARendir automáticamente
    const entregaRendir = await prisma.entregaARendirPCompras.create({
      data: {
        requerimientoCompraId: id,
        respEntregaRendirId: requerimiento.solicitanteId || aprobador.personalRespId,
        centroCostoId: requerimiento.centroCostoId || BigInt(1), // Default
        entregaLiquidada: false,
        creadoEn: new Date(),
        actualizadoEn: new Date()
      }
    });
    
    return {
      ...aprobado,
      entregaARendir: entregaRendir
    };
  } catch (err) {
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
 * Autoriza la compra de un requerimiento
 */
const autorizarCompra = async (id, autorizadoPorId) => {
  try {
    const requerimiento = await prisma.requerimientoCompra.findUnique({ 
      where: { id }
    });
    
    if (!requerimiento) throw new NotFoundError('RequerimientoCompra no encontrado');
    
    // Validar que esté aprobado
    if (requerimiento.estadoId !== BigInt(35)) {
      throw new ValidationError('Solo se puede autorizar un requerimiento aprobado');
    }
    
    // Actualizar estado a AUTORIZA COMPRA (id=37)
    const autorizado = await prisma.requerimientoCompra.update({
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
    
    return autorizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

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
  obtenerSeriesDoc
};