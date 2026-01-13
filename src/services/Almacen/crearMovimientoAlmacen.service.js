import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import generarKardexService from './generarKardex.service.js';

/**
 * Crea un movimiento de almacén completo con sus detalles y genera el kardex automáticamente.
 * Función reutilizable para INGRESO, SALIDA o TRANSFERENCIA.
 * 
 * @param {Object} cabecera - Objeto con los campos de MovimientoAlmacen
 * @param {Array} detalles - Array de objetos con los campos de DetalleMovimientoAlmacen
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la operación
 * @param {PrismaTransaction} transaccion - Transacción de Prisma (opcional)
 * @returns {Promise<Object>} Resultado con movimiento creado y kardex generado
 */
const crearMovimientoAlmacenCompleto = async (
  cabecera,
  detalles,
  usuarioId,
  transaccion = null
) => {
  try {
    const ejecutarEnTransaccion = async (tx) => {
      // ========================================
      // PASO 1: VALIDACIONES DE ENTRADA
      // ========================================
      
      if (!cabecera || typeof cabecera !== 'object') {
        throw new ValidationError('La cabecera es obligatoria y debe ser un objeto');
      }

      if (!cabecera.empresaId) {
        throw new ValidationError('empresaId es obligatorio en la cabecera');
      }
      if (!cabecera.tipoDocumentoId) {
        throw new ValidationError('tipoDocumentoId es obligatorio en la cabecera');
      }
      if (!cabecera.conceptoMovAlmacenId) {
        throw new ValidationError('conceptoMovAlmacenId es obligatorio en la cabecera');
      }
      if (!cabecera.serieDocId) {
        throw new ValidationError('serieDocId es obligatorio en la cabecera');
      }
      if (!cabecera.fechaDocumento) {
        throw new ValidationError('fechaDocumento es obligatorio en la cabecera');
      }
      if (!cabecera.entidadComercialId) {
        throw new ValidationError('entidadComercialId es obligatorio en la cabecera');
      }
      if (!cabecera.estadoDocAlmacenId) {
        throw new ValidationError('estadoDocAlmacenId es obligatorio en la cabecera');
      }
      if (cabecera.esCustodia === undefined || cabecera.esCustodia === null) {
        throw new ValidationError('esCustodia es obligatorio en la cabecera');
      }

      if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
        throw new ValidationError('Debe proporcionar al menos un detalle');
      }

      detalles.forEach((det, index) => {
        if (!det.productoId) {
          throw new ValidationError(`Detalle ${index + 1}: productoId es obligatorio`);
        }
        if (det.cantidad === undefined || det.cantidad === null) {
          throw new ValidationError(`Detalle ${index + 1}: cantidad es obligatorio`);
        }
        if (det.peso === undefined || det.peso === null) {
          throw new ValidationError(`Detalle ${index + 1}: peso es obligatorio`);
        }
        if (det.lote === undefined || det.lote === null) {
          throw new ValidationError(`Detalle ${index + 1}: lote es obligatorio`);
        }
        if (det.fechaProduccion === undefined || det.fechaProduccion === null) {
          throw new ValidationError(`Detalle ${index + 1}: fechaProduccion es obligatorio`);
        }
        if (det.fechaVencimiento === undefined || det.fechaVencimiento === null) {
          throw new ValidationError(`Detalle ${index + 1}: fechaVencimiento es obligatorio`);
        }
        if (det.fechaIngreso === undefined || det.fechaIngreso === null) {
          throw new ValidationError(`Detalle ${index + 1}: fechaIngreso es obligatorio`);
        }
        if (det.nroSerie === undefined || det.nroSerie === null) {
          throw new ValidationError(`Detalle ${index + 1}: nroSerie es obligatorio`);
        }
        if (det.nroContenedor === undefined || det.nroContenedor === null) {
          throw new ValidationError(`Detalle ${index + 1}: nroContenedor es obligatorio`);
        }
        if (det.estadoMercaderiaId === undefined || det.estadoMercaderiaId === null) {
          throw new ValidationError(`Detalle ${index + 1}: estadoMercaderiaId es obligatorio`);
        }
        if (det.estadoCalidadId === undefined || det.estadoCalidadId === null) {
          throw new ValidationError(`Detalle ${index + 1}: estadoCalidadId es obligatorio`);
        }
        if (det.entidadComercialId === undefined || det.entidadComercialId === null) {
          throw new ValidationError(`Detalle ${index + 1}: entidadComercialId es obligatorio`);
        }
        if (det.esCustodia === undefined || det.esCustodia === null) {
          throw new ValidationError(`Detalle ${index + 1}: esCustodia es obligatorio`);
        }
        if (!det.empresaId) {
          throw new ValidationError(`Detalle ${index + 1}: empresaId es obligatorio`);
        }
        if (det.costoUnitario === undefined || det.costoUnitario === null) {
          throw new ValidationError(`Detalle ${index + 1}: costoUnitario es obligatorio`);
        }
      });

      if (!usuarioId) {
        throw new ValidationError('usuarioId es obligatorio');
      }

      // ========================================
      // PASO 2: OBTENER Y VALIDAR SERIE
      // ========================================
      
      const serie = await tx.serieDoc.findUnique({
        where: { id: cabecera.serieDocId }
      });

      if (!serie) {
        throw new ValidationError('Serie de documento no encontrada');
      }

      if (!serie.activo) {
        throw new ValidationError('La serie de documento está inactiva');
      }

      // ========================================
      // PASO 3: GENERAR NÚMERO DE DOCUMENTO (SI NO VIENE)
      // ========================================
      
      let numSerieDoc = cabecera.numSerieDoc;
      let numCorreDoc = cabecera.numCorreDoc;
      let numeroDocumento = cabecera.numeroDocumento;

      if (!numeroDocumento) {
        const nuevoCorrelativo = Number(serie.correlativo) + 1;
        numSerieDoc = String(serie.serie).padStart(Number(serie.numCerosIzqSerie), '0');
        numCorreDoc = String(nuevoCorrelativo).padStart(Number(serie.numCerosIzqCorre), '0');
        numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;
        
        await tx.serieDoc.update({
          where: { id: cabecera.serieDocId },
          data: { correlativo: BigInt(nuevoCorrelativo) }
        });
      }

      // ========================================
      // PASO 4: CREAR MOVIMIENTO DE ALMACÉN CON DETALLES
      // ========================================
      
      const movimiento = await tx.movimientoAlmacen.create({
        data: {
          empresaId: cabecera.empresaId,
          tipoDocumentoId: cabecera.tipoDocumentoId,
          conceptoMovAlmacenId: cabecera.conceptoMovAlmacenId,
          serieDocId: cabecera.serieDocId,
          fechaDocumento: cabecera.fechaDocumento,
          entidadComercialId: cabecera.entidadComercialId,
          estadoDocAlmacenId: cabecera.estadoDocAlmacenId,
          esCustodia: cabecera.esCustodia,
          
          creadoEn: new Date(),
          actualizadoEn: new Date(),
          creadoPor: usuarioId,
          actualizadoPor: usuarioId,
          
          numSerieDoc: numSerieDoc || null,
          numCorreDoc: numCorreDoc || null,
          numeroDocumento: numeroDocumento || null,
          faenaPescaId: cabecera.faenaPescaId || null,
          embarcacionId: cabecera.embarcacionId || null,
          ordenTrabajoId: cabecera.ordenTrabajoId || null,
          dirOrigenId: cabecera.dirOrigenId || null,
          dirDestinoId: cabecera.dirDestinoId || null,
          numGuiaSunat: cabecera.numGuiaSunat || null,
          fechaGuiaSunat: cabecera.fechaGuiaSunat || null,
          transportistaId: cabecera.transportistaId || null,
          vehiculoId: cabecera.vehiculoId || null,
          agenciaEnvioId: cabecera.agenciaEnvioId || null,
          dirAgenciaEnvioId: cabecera.dirAgenciaEnvioId || null,
          personalRespAlmacen: cabecera.personalRespAlmacen || null,
          ordenCompraId: cabecera.ordenCompraId || null,
          pedidoVentaId: cabecera.pedidoVentaId || null,
          observaciones: cabecera.observaciones || null,
          
          detalles: {
            create: detalles.map(det => ({
              productoId: det.productoId,
              cantidad: det.cantidad,
              peso: det.peso,
              lote: det.lote,
              fechaProduccion: det.fechaProduccion,
              fechaVencimiento: det.fechaVencimiento,
              fechaIngreso: det.fechaIngreso,
              nroSerie: det.nroSerie,
              nroContenedor: det.nroContenedor,
              estadoMercaderiaId: det.estadoMercaderiaId,
              estadoCalidadId: det.estadoCalidadId,
              entidadComercialId: det.entidadComercialId,
              esCustodia: det.esCustodia,
              empresaId: det.empresaId,
              costoUnitario: det.costoUnitario,
              
              creadoPor: usuarioId,
              actualizadoPor: usuarioId,
              creadoEn: new Date(),
              actualizadoEn: new Date(),
              
              observaciones: det.observaciones || null,
              detalleReqCompraId: det.detalleReqCompraId || null,
            }))
          }
        },
        include: {
          detalles: true,
          conceptoMovAlmacen: true
        }
      });

      // ========================================
      // PASO 5: CAMBIAR ESTADO A CERRADO (31)
      // ========================================
      
      await tx.movimientoAlmacen.update({
        where: { id: movimiento.id },
        data: { 
          estadoDocAlmacenId: BigInt(31),
          actualizadoEn: new Date()
        }
      });

      // ========================================
      // PASO 6: GENERAR KARDEX
      // ========================================
      
      const kardex = await generarKardexService.generarKardexMovimiento(
        movimiento.id,
        tx
      );

      // ========================================
      // PASO 7: CAMBIAR ESTADO A KARDEX GENERADO (33)
      // ========================================
      
      await tx.movimientoAlmacen.update({
        where: { id: movimiento.id },
        data: { 
          estadoDocAlmacenId: BigInt(33),
          actualizadoEn: new Date()
        }
      });

      // ========================================
      // PASO 8: RETORNAR RESULTADO
      // ========================================
      
      return {
        success: true,
        movimiento: {
          id: movimiento.id,
          numeroDocumento: movimiento.numeroDocumento,
          fechaDocumento: movimiento.fechaDocumento,
          cantidadDetalles: movimiento.detalles.length
        },
        kardex: kardex,
        mensaje: 'Movimiento de almacén creado exitosamente con kardex generado'
      };
    };

    if (transaccion) {
      return await ejecutarEnTransaccion(transaccion);
    } else {
      return await prisma.$transaction(ejecutarEnTransaccion);
    }

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('Error al crear movimiento de almacén:', error);
    throw new DatabaseError('Error al crear movimiento de almacén: ' + error.message);
  }
};

export default {
  crearMovimientoAlmacenCompleto
};
