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
        },
        movimientosAlmacen: true
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
          proveedor: true
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
    
    // Validar que no esté cerrada o anulada
    if (existe.estadoId === 31) { // CERRADO
      throw new ValidationError('No se puede modificar una orden cerrada');
    }
    if (existe.estadoId === 34) { // ANULADO
      throw new ValidationError('No se puede modificar una orden anulada');
    }
    
    await validarForaneas(data);
    
    const actualizado = await prisma.ordenCompra.update({
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

const eliminar = async (id) => {
  try {
    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('OrdenCompra no encontrada');
    
    // Validar que no esté cerrada
    if (existe.estadoId === 31) { // CERRADO
      throw new ValidationError('No se puede eliminar una orden cerrada. Debe anularla primero.');
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

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerSeriesDoc
};