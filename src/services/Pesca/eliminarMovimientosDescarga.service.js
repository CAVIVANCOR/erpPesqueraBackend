import prisma from '../../config/prismaClient.js';
import { ValidationError } from '../../utils/errors.js';
import eliminarMovimientoAlmacenService from '../Almacen/eliminarMovimientoAlmacen.service.js';

/**
 * Servicio para eliminar movimientos de almacén de una descarga
 * 
 * Elimina los movimientos de ingreso y salida asociados a una descarga,
 * incluyendo sus detalles, kardex y regeneración de saldos.
 * 
 * @param {BigInt} descargaId - ID de la descarga de faena pesca
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Resultado de la eliminación
 */
const eliminarMovimientosDescarga = async (descargaId, usuarioId) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // ============================================
      // PASO 1: OBTENER DESCARGA Y VALIDAR
      // ============================================
      
      const descarga = await tx.descargaFaenaPesca.findUnique({
        where: { id: descargaId },
        select: {
          id: true,
          movIngresoAlmacenId: true,
          movSalidaAlmacenId: true,
          faenaPescaId: true
        }
      });

      if (!descarga) {
        throw new ValidationError('Descarga de faena no encontrada');
      }

      if (!descarga.movIngresoAlmacenId && !descarga.movSalidaAlmacenId) {
        throw new ValidationError('Esta descarga no tiene movimientos de almacén para eliminar');
      }

      const movimientosEliminados = [];
      let preFacturaEliminada = null;

      // ============================================
      // PASO 2: ELIMINAR PREFACTURA ASOCIADA (SI EXISTE)
      // ============================================
      
      if (descarga.movSalidaAlmacenId) {
        // Buscar PreFactura asociada al movimiento de salida
        const preFactura = await tx.preFactura.findFirst({
          where: { movSalidaAlmacenId: descarga.movSalidaAlmacenId },
          include: { 
            detalles: true,
            estadoDoc: true
          }
        });

        if (preFactura) {
          // Validar que la PreFactura esté en estado PENDIENTE (id=45)
          if (Number(preFactura.estadoId) !== 45) {
            const estadoNombre = preFactura.estadoDoc?.descripcion || 'Desconocido';
            throw new ValidationError(
              `No se puede eliminar la PreFactura ${preFactura.numeroDocumento} porque está en estado "${estadoNombre}". ` +
              `Solo se pueden eliminar PreFacturas en estado PENDIENTE.`
            );
          }

          try {
            // Eliminar detalles de PreFactura
            await tx.detallePreFactura.deleteMany({
              where: { preFacturaId: preFactura.id }
            });

            // Eliminar PreFactura
            await tx.preFactura.delete({
              where: { id: preFactura.id }
            });

            preFacturaEliminada = {
              id: preFactura.id,
              codigo: preFactura.codigo,
              numeroDocumento: preFactura.numeroDocumento
            };
          } catch (error) {
            console.error('❌ Error eliminando PreFactura:', error);
            throw new ValidationError(`Error al eliminar PreFactura: ${error.message}`);
          }
        }
      }

      // ============================================
      // PASO 3: ELIMINAR MOVIMIENTO DE SALIDA
      // ============================================
      
      if (descarga.movSalidaAlmacenId) {
        try {
          await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
            descarga.movSalidaAlmacenId,
            usuarioId,
            tx
          );
          movimientosEliminados.push({
            tipo: 'SALIDA',
            id: descarga.movSalidaAlmacenId
          });
        } catch (error) {
          console.error('❌ Error eliminando movimiento de salida:', error);
          throw new ValidationError(`Error al eliminar movimiento de salida: ${error.message}`);
        }
      }

      // ============================================
      // PASO 4: ELIMINAR MOVIMIENTO DE INGRESO (DESPUÉS)
      // ============================================
      
      if (descarga.movIngresoAlmacenId) {
        try {
          await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
            descarga.movIngresoAlmacenId,
            usuarioId,
            tx
          );
          movimientosEliminados.push({
            tipo: 'INGRESO',
            id: descarga.movIngresoAlmacenId
          });
        } catch (error) {
          console.error('❌ Error eliminando movimiento de ingreso:', error);
          throw new ValidationError(`Error al eliminar movimiento de ingreso: ${error.message}`);
        }
      }

      // ============================================
      // PASO 4: LIMPIAR REFERENCIAS EN DESCARGA
      // ============================================
      
      await tx.descargaFaenaPesca.update({
        where: { id: descargaId },
        data: {
          movIngresoAlmacenId: null,
          movSalidaAlmacenId: null,
          actualizadoEn: new Date()
        }
      });

      // ============================================
      // PASO 5: RETORNAR RESULTADO
      // ============================================
      
      const mensaje = `Se eliminaron ${movimientosEliminados.length} movimiento(s) de almacén exitosamente.${preFacturaEliminada ? ` PreFactura ${preFacturaEliminada.numeroDocumento} eliminada.` : ''} Los saldos fueron regenerados.`;
      
      return {
        descarga: {
          id: descarga.id,
          faenaPescaId: descarga.faenaPescaId
        },
        movimientosEliminados: movimientosEliminados,
        preFacturaEliminada: preFacturaEliminada,
        mensaje: mensaje
      };

    } catch (error) {
      console.error('❌ Error en eliminarMovimientosDescarga:', error);
      throw error;
    }
  });
};

/**
 * Regenera los movimientos de almacén de una descarga
 * 
 * Elimina los movimientos existentes y genera nuevos movimientos
 * con los datos actualizados de la descarga.
 * 
 * @param {BigInt} descargaId - ID de la descarga de faena pesca
 * @param {BigInt} temporadaPescaId - ID de la temporada de pesca
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Resultado de la regeneración
 */
const regenerarMovimientosDescarga = async (descargaId, temporadaPescaId, usuarioId) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // ============================================
      // PASO 1: VERIFICAR QUE EXISTAN MOVIMIENTOS
      // ============================================
      
      const descarga = await tx.descargaFaenaPesca.findUnique({
        where: { id: descargaId },
        select: {
          id: true,
          movIngresoAlmacenId: true,
          movSalidaAlmacenId: true
        }
      });

      if (!descarga) {
        throw new ValidationError('Descarga de faena no encontrada');
      }

      if (!descarga.movIngresoAlmacenId && !descarga.movSalidaAlmacenId) {
        throw new ValidationError('Esta descarga no tiene movimientos de almacén para regenerar. Use la función de finalizar descarga.');
      }

      // ============================================
      // PASO 1.5: VALIDAR ESTADO DE PREFACTURA (SI EXISTE)
      // ============================================
      
      if (descarga.movSalidaAlmacenId) {
        const preFactura = await tx.preFactura.findFirst({
          where: { movSalidaAlmacenId: descarga.movSalidaAlmacenId },
          include: { estadoDoc: true }
        });

        if (preFactura) {
          // Validar que la PreFactura esté en estado PENDIENTE (id=45)
          if (Number(preFactura.estadoId) !== 45) {
            const estadoNombre = preFactura.estadoDoc?.descripcion || 'Desconocido';
            throw new ValidationError(
              `No se pueden regenerar los movimientos porque la PreFactura ${preFactura.numeroDocumento} está en estado "${estadoNombre}". ` +
              `Solo se pueden regenerar movimientos si la PreFactura está en estado PENDIENTE. ` +
              `Si la PreFactura ya fue aprobada o facturada, no se puede modificar.`
            );
          }
        }
      }

      // ============================================
      // PASO 2: ELIMINAR MOVIMIENTOS EXISTENTES
      // ============================================
      
      const resultadoEliminacion = await eliminarMovimientosDescarga(descargaId, usuarioId);

      // ============================================
      // PASO 3: IMPORTAR Y LLAMAR SERVICIO DE FINALIZACIÓN
      // ============================================
      
      // Importación dinámica para evitar dependencias circulares
      const finalizarDescargaService = await import('./finalizarDescargaConMovimientos.service.js');
      
      const resultadoCreacion = await finalizarDescargaService.default.finalizarDescargaConMovimientos(
        descargaId,
        temporadaPescaId,
        usuarioId
      );

      // ============================================
      // PASO 4: RETORNAR RESULTADO COMPLETO
      // ============================================
      
      return {
        descarga: resultadoCreacion.descarga,
        eliminacion: {
          movimientosEliminados: resultadoEliminacion.movimientosEliminados.length
        },
        creacion: {
          movimientoIngreso: resultadoCreacion.movimientoIngreso,
          movimientoSalida: resultadoCreacion.movimientoSalida
        },
        mensaje: 'Movimientos regenerados exitosamente. Se eliminaron los anteriores y se crearon nuevos con los datos actualizados.'
      };

    } catch (error) {
      console.error('❌ Error en regenerarMovimientosDescarga:', error);
      throw error;
    }
  });
};

export default {
  eliminarMovimientosDescarga,
  regenerarMovimientosDescarga
};