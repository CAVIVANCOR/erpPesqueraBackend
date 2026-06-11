import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import generarKardexService from './generarKardex.service.js';

/**
 * Actualiza un MovimientoAlmacen existente con nuevos datos
 * Elimina kardex anterior, actualiza movimiento y regenera kardex
 * Los saldos se recalculan automáticamente (PATRÓN MOVIMIENTOALMACEN)
 */
const actualizarMovimientoAlmacenCompleto = async (
  movimientoId,
  cabecera,
  detalles,
  usuarioId,
  transaccion = null
) => {
  try {
    const ejecutarEnTransaccion = async (tx) => {
      // ========================================
      // PASO 1: VALIDAR MOVIMIENTO EXISTENTE
      // ========================================
      const movimientoExistente = await tx.movimientoAlmacen.findUnique({
        where: { id: movimientoId },
        include: {
          detalles: true,
        },
      });

      if (!movimientoExistente) {
        throw new ValidationError('Movimiento de almacén no encontrado');
      }

      // ========================================
      // PASO 2: ELIMINAR KARDEX ANTERIOR
      // ========================================
      await tx.kardexAlmacen.deleteMany({
        where: { movimientoAlmacenId: movimientoId },
      });

      // ========================================
      // PASO 3: ACTUALIZAR CABECERA DEL MOVIMIENTO
      // ========================================
      await tx.movimientoAlmacen.update({
        where: { id: movimientoId },
        data: {
          fechaDocumento: cabecera.fechaDocumento,
          dirOrigenId: cabecera.dirOrigenId,
          dirDestinoId: cabecera.dirDestinoId,
          observaciones: cabecera.observaciones,
          actualizadoEn: new Date(),
          actualizadoPor: usuarioId,
          estadoDocAlmacenId: BigInt(30), // PENDIENTE
        },
      });

      // ========================================
      // PASO 4: ELIMINAR DETALLES ANTIGUOS
      // ========================================
      await tx.detalleMovimientoAlmacen.deleteMany({
        where: { movimientoAlmacenId: movimientoId },
      });

      // ========================================
      // PASO 5: INSERTAR NUEVOS DETALLES
      // ========================================
      await tx.detalleMovimientoAlmacen.createMany({
        data: detalles.map((det) => ({
          movimientoAlmacenId: movimientoId,
          productoId: det.productoId,
          cantidad: det.cantidad,
          peso: det.peso,
          lote: det.lote || null,
          fechaProduccion: det.fechaProduccion || null,
          fechaVencimiento: det.fechaVencimiento || null,
          fechaIngreso: det.fechaIngreso,
          nroSerie: det.nroSerie || null,
          nroContenedor: det.nroContenedor || null,
          estadoMercaderiaId: det.estadoMercaderiaId,
          estadoCalidadId: det.estadoCalidadId,
          entidadComercialId: det.entidadComercialId || null,
          esCustodia: det.esCustodia || false,
          empresaId: det.empresaId,
          costoUnitario: det.costoUnitario || 0,
          creadoPor: usuarioId,
          actualizadoPor: usuarioId,
          creadoEn: new Date(),
          actualizadoEn: new Date(),
          observaciones: det.observaciones || null,
          ubicacionFisicaOrigenId: det.ubicacionFisicaOrigenId || null,
          ubicacionFisicaDestinoId: det.ubicacionFisicaDestinoId || null,
        })),
      });

      // ========================================
      // PASO 6: CAMBIAR ESTADO A CERRADO (31)
      // ========================================
      await tx.movimientoAlmacen.update({
        where: { id: movimientoId },
        data: {
          estadoDocAlmacenId: BigInt(31),
          actualizadoEn: new Date(),
        },
      });

      // ========================================
      // PASO 7: REGENERAR KARDEX
      // ========================================
      const kardex = await generarKardexService.generarKardexMovimiento(
        movimientoId,
        tx
      );

      // ========================================
      // PASO 8: CAMBIAR ESTADO A KARDEX GENERADO (33)
      // ========================================
      const movimientoActualizado = await tx.movimientoAlmacen.update({
        where: { id: movimientoId },
        data: {
          estadoDocAlmacenId: BigInt(33),
          actualizadoEn: new Date(),
        },
        include: {
          detalles: true,
        },
      });

      // ========================================
      // PASO 9: RETORNAR RESULTADO
      // ========================================
      return {
        success: true,
        movimiento: {
          id: movimientoActualizado.id,
          numeroDocumento: movimientoActualizado.numeroDocumento,
          fechaDocumento: movimientoActualizado.fechaDocumento,
          cantidadDetalles: movimientoActualizado.detalles.length,
        },
        kardex: kardex,
        mensaje: 'Movimiento de almacén actualizado exitosamente con kardex regenerado',
      };
    };

    if (transaccion) {
      return await ejecutarEnTransaccion(transaccion);
    } else {
      return await prisma.$transaction(ejecutarEnTransaccion, {
        timeout: 120000,
        maxWait: 125000,
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('Error al actualizar movimiento de almacén:', error);
    throw new DatabaseError('Error al actualizar movimiento de almacén: ' + error.message);
  }
};

export default {
  actualizarMovimientoAlmacenCompleto,
};