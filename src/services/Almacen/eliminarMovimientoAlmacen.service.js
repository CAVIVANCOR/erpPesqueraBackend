import prisma from "../../config/prismaClient.js";
import {
  ValidationError,
  DatabaseError,
  NotFoundError,
} from "../../utils/errors.js";
import {
  capturarCombinacionesAnterioresSAP,
  limpiarKardexAnteriorSAP,
  limpiarSaldosHuerfanosSAP
} from './kardexSaldosSAP.service.js';

/**
 * ============================================================================
 * SERVICIO PROFESIONAL: ELIMINAR MOVIMIENTO DE ALMACÉN COMPLETO
 * ============================================================================
 *
 * Elimina un movimiento de almacén, su kardex y regenera los saldos usando
 * las mismas funciones de recálculo que generarKardex.service.js para
 * garantizar saldos 100% correctos y en línea.
 *
  * PROCESO:
 * 1. Valida que el movimiento exista
 * 2. Captura combinaciones anteriores usando servicio SAP
 * 3. Elimina kardex del movimiento usando servicio SAP
 * 4. Limpia saldos huérfanos usando servicio SAP
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

      const resultados = {
        movimientoId: movimiento.id,
        numeroDocumento: movimiento.numeroDocumento,
        kardexEliminados: 0,
        saldosDetRegenerados: 0,
        saldosGenRegenerados: 0,
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
      // PASO 4: RECALCULAR SALDOS DESDE KARDEX RESTANTE (SERVICIO SAP)
      // ========================================
      // Registrar productos afectados (usar combinaciones capturadas ANTES de eliminar)
      const productosUnicos = [
        ...new Set(combinacionesAnteriores.detalladas.map((c) => c.productoId)),
      ];
      resultados.productosAfectados = productosUnicos.map((prodId) => ({
        productoId: prodId,
      }));
      let saldosDetActualizados = 0;
      let saldosGenActualizados = 0;
      // Recalcular saldos detallados para cada combinación afectada
      for (const combinacion of combinacionesAnteriores.detalladas) {
        // Construir filtro para buscar kardex de esta combinación
        const filtroKardex = {
          empresaId: combinacion.empresaId ? Number(combinacion.empresaId) : null,
          almacenId: combinacion.almacenId ? Number(combinacion.almacenId) : null,
          productoId: combinacion.productoId ? Number(combinacion.productoId) : null,
          clienteId: combinacion.clienteId ? Number(combinacion.clienteId) : null,
          esCustodia: combinacion.esCustodia,
          lote: combinacion.lote,
          fechaIngreso: combinacion.fechaIngreso ? new Date(combinacion.fechaIngreso) : null,
          fechaProduccion: combinacion.fechaProduccion ? new Date(combinacion.fechaProduccion) : null,
          fechaVencimiento: combinacion.fechaVencimiento ? new Date(combinacion.fechaVencimiento) : null,
          estadoId: combinacion.estadoId ? Number(combinacion.estadoId) : null,
          estadoCalidadId: combinacion.estadoCalidadId ? Number(combinacion.estadoCalidadId) : null,
          numContenedor: combinacion.numContenedor,
          nroSerie: combinacion.nroSerie,
          ubicacionFisicaId: combinacion.ubicacionFisicaId ? Number(combinacion.ubicacionFisicaId) : null,
        };
        // Sumar ingresos y egresos del kardex restante
        const kardexRestante = await tx.kardexAlmacen.findMany({
          where: filtroKardex,
        });
        let saldoCantidad = 0;
        let saldoPeso = 0;
        for (const k of kardexRestante) {
          saldoCantidad += Number(k.ingresoCant || 0) - Number(k.egresoCant || 0);
          saldoPeso += Number(k.ingresoPeso || 0) - Number(k.egresoPeso || 0);
        }
        // Buscar saldo existente
        const saldoExistente = await tx.saldosDetProductoCliente.findFirst({
          where: filtroKardex,
        });
        if (saldoCantidad === 0 && saldoPeso === 0) {
          // Si saldo es 0, eliminar si existe
          if (saldoExistente) {
            await tx.saldosDetProductoCliente.delete({
              where: { id: saldoExistente.id },
            });
            saldosDetActualizados++;
          }
        } else {
          // Si saldo > 0, actualizar o crear
          if (saldoExistente) {
            await tx.saldosDetProductoCliente.update({
              where: { id: saldoExistente.id },
              data: {
                saldoCantidad: saldoCantidad,
                saldoPeso: saldoPeso,
                actualizadoEn: new Date(),
              },
            });
          } else {
            // CREAR saldo si no existe
            await tx.saldosDetProductoCliente.create({
              data: {
                empresaId: Number(combinacion.empresaId),
                almacenId: Number(combinacion.almacenId),
                productoId: Number(combinacion.productoId),
                clienteId: Number(combinacion.clienteId),
                esCustodia: combinacion.esCustodia,
                lote: combinacion.lote,
                fechaIngreso: combinacion.fechaIngreso ? new Date(combinacion.fechaIngreso) : null,
                fechaProduccion: combinacion.fechaProduccion ? new Date(combinacion.fechaProduccion) : null,
                fechaVencimiento: combinacion.fechaVencimiento ? new Date(combinacion.fechaVencimiento) : null,
                estadoId: combinacion.estadoId ? Number(combinacion.estadoId) : null,
                estadoCalidadId: combinacion.estadoCalidadId ? Number(combinacion.estadoCalidadId) : null,
                numContenedor: combinacion.numContenedor,
                nroSerie: combinacion.nroSerie,
                ubicacionFisicaId: combinacion.ubicacionFisicaId ? Number(combinacion.ubicacionFisicaId) : null,
                saldoCantidad: saldoCantidad,
                saldoPeso: saldoPeso,
                actualizadoEn: new Date(),
              },
            });
          }
          saldosDetActualizados++;
        }
      }

      // Recalcular saldos generales para cada combinación afectada
      for (const combinacion of combinacionesAnteriores.generales) {
        // Construir filtro para buscar kardex de esta combinación
        const filtroKardex = {
          empresaId: combinacion.empresaId ? Number(combinacion.empresaId) : null,
          almacenId: combinacion.almacenId ? Number(combinacion.almacenId) : null,
          productoId: combinacion.productoId ? Number(combinacion.productoId) : null,
          clienteId: combinacion.clienteId ? Number(combinacion.clienteId) : null,
          esCustodia: combinacion.custodia,
        };

        // Sumar ingresos y egresos del kardex restante
        const kardexRestante = await tx.kardexAlmacen.findMany({
          where: filtroKardex,
        });
        let saldoCantidad = 0;
        let saldoPeso = 0;
        let costoTotal = 0;
        for (const k of kardexRestante) {
          saldoCantidad += Number(k.ingresoCant || 0) - Number(k.egresoCant || 0);
          saldoPeso += Number(k.ingresoPeso || 0) - Number(k.egresoPeso || 0);
          costoTotal += Number(k.ingresoCant || 0) * Number(k.ingresoCantCostoUnit || 0);
        }
        const costoUnitarioPromedio = saldoCantidad > 0 ? costoTotal / saldoCantidad : 0;
        // Buscar saldo existente (SaldosProductoCliente usa 'custodia', no 'esCustodia')
        const filtroSaldo = {
          empresaId: combinacion.empresaId ? Number(combinacion.empresaId) : null,
          almacenId: combinacion.almacenId ? Number(combinacion.almacenId) : null,
          productoId: combinacion.productoId ? Number(combinacion.productoId) : null,
          clienteId: combinacion.clienteId ? Number(combinacion.clienteId) : null,
          custodia: combinacion.custodia,
        };
        const saldoExistente = await tx.saldosProductoCliente.findFirst({
          where: filtroSaldo,
        });
        if (saldoCantidad === 0 && saldoPeso === 0) {
          // Si saldo es 0, eliminar si existe
          if (saldoExistente) {
            await tx.saldosProductoCliente.delete({
              where: { id: saldoExistente.id },
            });
            saldosGenActualizados++;
          }
        } else {
          // Si saldo > 0, actualizar o crear
          if (saldoExistente) {
            await tx.saldosProductoCliente.update({
              where: { id: saldoExistente.id },
              data: {
                saldoCantidad: saldoCantidad,
                saldoPeso: saldoPeso,
                costoUnitarioPromedio: costoUnitarioPromedio,
                actualizadoEn: new Date(),
              },
            });
          } else {
            // CREAR saldo si no existe
            await tx.saldosProductoCliente.create({
              data: {
                empresaId: Number(combinacion.empresaId),
                almacenId: Number(combinacion.almacenId),
                productoId: Number(combinacion.productoId),
                clienteId: Number(combinacion.clienteId),
                custodia: combinacion.custodia,
                saldoCantidad: saldoCantidad,
                saldoPeso: saldoPeso,
                costoUnitarioPromedio: costoUnitarioPromedio,
                actualizadoEn: new Date(),
              },
            });
          }
          saldosGenActualizados++;
        }
      }

      resultados.saldosDetRegenerados = saldosDetActualizados;
      resultados.saldosGenRegenerados = saldosGenActualizados;
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
    console.error("Error al eliminar movimiento de almacén:", error);
    throw new DatabaseError(
      "Error al eliminar movimiento de almacén: " + error.message,
    );
  }
};

export default {
  eliminarMovimientoAlmacenCompleto,
};
