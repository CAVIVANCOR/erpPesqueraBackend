import prisma from "../../config/prismaClient.js";
import {
  ValidationError,
  DatabaseError,
  NotFoundError,
} from "../../utils/errors.js";
import {
  capturarCombinacionesAnterioresSAP,
  limpiarKardexAnteriorSAP,
  recalcularCadenaCompletaSAP,
} from './kardexSaldosSAP.service.js';

/**
 * ============================================================================
 * SERVICIO PROFESIONAL: ELIMINAR MOVIMIENTO DE ALMACÉN COMPLETO
 * ============================================================================
 *
 * Elimina un movimiento de almacén, su kardex y recalcula, desde ese movimiento en adelante,
 * las cantidades acumuladas, el costo promedio móvil y los saldos (detallado y general) usando la
 * misma rutina que la generación y regeneración del kardex (kardexSaldosSAP).
 *
  * PROCESO:
 * 1. Valida que el movimiento exista
 * 2. Captura combinaciones anteriores usando servicio SAP
 * 3. Elimina kardex del movimiento usando servicio SAP
 * 4. Recalcula la cadena completa de esas combinaciones (cantidades, costos y saldos)
 * 5. Elimina los detalles del movimiento
 * 6. Elimina el movimiento de almacén
 * 7. Retorna resultado
 *
 * @param {Number} movimientoAlmacenId - ID del movimiento de almacén a eliminar
 * @param {PrismaTransaction} transaccion - Transacción de Prisma (opcional)
 * @returns {Promise<Object>} Resultado con información de la eliminación
 */
const eliminarMovimientoAlmacenCompleto = async (
  movimientoAlmacenId,
  transaccion = null,
) => {
  try {
    const ejecutarEnTransaccion = async (tx) => {
      // ========================================
      // PASO 1: VALIDAR QUE EL MOVIMIENTO EXISTA
      // ========================================

      if (!movimientoAlmacenId) {
        throw new ValidationError(
          "El ID del movimiento de almacén es obligatorio",
        );
      }

      const movimiento = await tx.movimientoAlmacen.findUnique({
        where: { id: movimientoAlmacenId },
        include: {
          conceptoMovAlmacen: true,
          empresa: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (!movimiento) {
        throw new NotFoundError("Movimiento de almacén no encontrado");
      }

      // Permitir eliminar movimientos sin detalles (cabecera vacía)
      // Si no tiene detalles, no habrá kardex ni saldos que regenerar

      // ========================================
      // VALIDAR QUE NO TENGA ENTREGA A RENDIR ASOCIADA
      // ========================================

      const entregaAsociada = await tx.entregaARendirMovAlmacen.findFirst({
        where: { movimientoAlmacenId: movimiento.id },
        include: {
          respEntregaRendir: true,
          centroCosto: true,
        },
      });

      if (entregaAsociada) {
        throw new ValidationError(
          `No se puede eliminar el movimiento porque tiene una Entrega a Rendir asociada (ID: ${entregaAsociada.id}). Responsable: ${entregaAsociada.respEntregaRendir?.nombreCompleto || "N/A"}. Primero debe eliminar la Entrega a Rendir.`,
        );
      }

      // ========================================
      // VENTAS: una PreFactura puede tener un movimiento de salida por almacén
      // ========================================
      // La PreFactura apunta a uno de ellos (movSalidaAlmacenId). Si se elimina ese, la referencia pasa a otro
      // movimiento de la misma venta; así la PreFactura no queda "sin kardex" mientras aún tiene salidas.
      const advertencias = [];
      if (movimiento.pedidoVentaId) {
        const preFacturaOrigen = await tx.preFactura.findUnique({
          where: { id: movimiento.pedidoVentaId },
          select: { id: true, numeroDocumento: true, movSalidaAlmacenId: true },
        });
        if (preFacturaOrigen) {
          const hermanos = await tx.movimientoAlmacen.findMany({
            where: { pedidoVentaId: preFacturaOrigen.id, NOT: { id: movimiento.id } },
            select: { id: true },
            orderBy: { id: "asc" },
          });
          if (preFacturaOrigen.movSalidaAlmacenId && Number(preFacturaOrigen.movSalidaAlmacenId) === Number(movimiento.id)) {
            await tx.preFactura.update({
              where: { id: preFacturaOrigen.id },
              data: { movSalidaAlmacenId: hermanos.length > 0 ? hermanos[0].id : null },
            });
          }
          if (hermanos.length > 0) {
            advertencias.push(
              `La pre-factura ${preFacturaOrigen.numeroDocumento || preFacturaOrigen.id} conserva ${hermanos.length} movimiento(s) de salida de otros almacenes. Para volver a asignar el stock use "Reactivar" en la pre-factura, que elimina todos sus movimientos.`,
            );
          }
        }
      }

      const resultados = {
        movimientoId: movimiento.id,
        numeroDocumento: movimiento.numeroDocumento,
        advertencias,
        kardexEliminados: 0,
        saldosDetRegenerados: 0,
        saldosGenRegenerados: 0,
        filasRecalculadas: 0,
        detallesEliminados: 0,
        productosAfectados: [],
      };
      // ========================================
      // PASO 2: CAPTURAR COMBINACIONES ANTERIORES (SERVICIO SAP)
      // ========================================
      const combinacionesAnteriores = await capturarCombinacionesAnterioresSAP(
        movimiento.id,
        tx
      );
      // ========================================
      // PASO 3: ELIMINAR KARDEX DEL MOVIMIENTO (SERVICIO SAP)
      // ========================================
      const kardexEliminados = await limpiarKardexAnteriorSAP(
        movimiento.id,
        tx
      );
      resultados.kardexEliminados = kardexEliminados;
      // ========================================
      // PASO 4: RECALCULAR LA CADENA COMPLETA (SERVICIO SAP)
      // ========================================
      // Registrar productos afectados (usar combinaciones capturadas ANTES de eliminar)
      const productosUnicos = [
        ...new Set(combinacionesAnteriores.detalladas.map((c) => c.productoId)),
      ];
      resultados.productosAfectados = productosUnicos.map((prodId) => ({
        productoId: prodId,
      }));

      // Recalcula, con el kardex restante, las cantidades y el costo promedio de cada fila de los
      // movimientos posteriores y los saldos detallado y general
      const cadena = await recalcularCadenaCompletaSAP(combinacionesAnteriores, tx);
      resultados.saldosDetRegenerados = cadena.saldosDetActualizados;
      resultados.saldosGenRegenerados = cadena.saldosGenActualizados;
      resultados.filasRecalculadas = cadena.filasRecalculadas;
      // ========================================
      // PASO 5: ELIMINAR DETALLES DEL MOVIMIENTO
      // ========================================
      const detallesEliminados = await tx.detalleMovimientoAlmacen.deleteMany({
        where: { movimientoAlmacenId: movimiento.id },
      });
      resultados.detallesEliminados = Number(detallesEliminados.count);
      // ========================================
      // PASO 6: ELIMINAR EL MOVIMIENTO DE ALMACÉN
      // ========================================
      await tx.movimientoAlmacen.delete({
        where: { id: movimiento.id },
      });
      // ========================================
      // PASO 7: RETORNAR RESULTADO
      // ========================================
      return {
        success: true,
        mensaje:
          "Movimiento de almacén eliminado exitosamente y saldos regenerados correctamente",
        resultados: resultados,
      };
    };

    if (transaccion) {
      return await ejecutarEnTransaccion(transaccion);
    } else {
      return await prisma.$transaction(ejecutarEnTransaccion);
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    // console.error("Error al eliminar movimiento de almacén:", error);
    throw new DatabaseError(
      "Error al eliminar movimiento de almacén: " + error.message,
    );
  }
};

export default {
  eliminarMovimientoAlmacenCompleto,
};
