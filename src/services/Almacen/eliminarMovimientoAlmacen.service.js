import prisma from "../../config/prismaClient.js";
import {
  ValidationError,
  DatabaseError,
  NotFoundError,
} from "../../utils/errors.js";

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
 * 2. Obtiene todas las combinaciones únicas de kardex antes de eliminar
 * 3. Elimina todos los registros de kardex del movimiento
 * 4. Regenera saldos detallados usando recalcularSaldoDetalladoCompleto()
 * 5. Regenera saldos generales usando recalcularSaldoGeneralCompleto()
 * 6. Elimina los detalles del movimiento
 * 7. Elimina el movimiento de almacén
 *
 * @param {BigInt} movimientoAlmacenId - ID del movimiento de almacén a eliminar
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

      if (!movimiento.detalles || movimiento.detalles.length === 0) {
        throw new ValidationError(
          "El movimiento no tiene detalles para eliminar",
        );
      }

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
      // VALIDAR QUE NO TENGA INSUMOS DE OT ASOCIADOS
      // ========================================

      const detallesIds = movimiento.detalles.map((d) => d.id);

      if (detallesIds.length > 0) {
        const insumosAsociados = await tx.detInsumosTareaOT.count({
          where: {
            OR: [
              { movimientoAlmacenId: movimiento.id },
              { detalleMovAlmacenId: { in: detallesIds } },
            ],
          },
        });

        if (insumosAsociados > 0) {
          throw new ValidationError(
            `No se puede eliminar el movimiento porque tiene ${insumosAsociados} insumo(s) de Orden de Trabajo asociado(s). Primero debe desvincular los insumos de las OT.`,
          );
        }
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
      // PASO 2: OBTENER COMBINACIONES ÚNICAS DE KARDEX
      // ========================================

      // Obtener todas las combinaciones únicas de kardex ANTES de eliminar
      // para poder regenerar los saldos correctamente después
      const combinacionesKardex = await tx.kardexAlmacen.findMany({
        where: { movimientoAlmacenId: movimiento.id },
        select: {
          empresaId: true,
          almacenId: true,
          productoId: true,
          clienteId: true,
          esCustodia: true,
          lote: true,
          fechaIngreso: true,
          fechaProduccion: true,
          fechaVencimiento: true,
          estadoId: true,
          estadoCalidadId: true,
          numContenedor: true,
          nroSerie: true,
        },
      });

      // Crear sets para combinaciones únicas
      const combinacionesDetalladas = new Set();
      const combinacionesGenerales = new Set();

      for (const kardex of combinacionesKardex) {
        // Clave para saldo detallado (con variables de control)
        const keyDet = JSON.stringify([
          kardex.empresaId?.toString(),
          kardex.almacenId?.toString(),
          kardex.productoId?.toString(),
          kardex.clienteId?.toString(),
          kardex.esCustodia,
          kardex.lote || "",
          kardex.fechaIngreso?.toISOString(),
          kardex.fechaProduccion?.toISOString(),
          kardex.fechaVencimiento?.toISOString(),
          kardex.estadoId?.toString(),
          kardex.estadoCalidadId?.toString(),
          kardex.numContenedor || "",
          kardex.nroSerie || "",
        ]);
        combinacionesDetalladas.add(keyDet);

        // Clave para saldo general (sin variables de control)
        const keyGen = JSON.stringify([
          kardex.empresaId?.toString(),
          kardex.almacenId?.toString(),
          kardex.productoId?.toString(),
          kardex.clienteId?.toString(),
          kardex.esCustodia,
        ]);
        combinacionesGenerales.add(keyGen);
      }

      // ========================================
      // PASO 3: ELIMINAR KARDEX DEL MOVIMIENTO
      // ========================================

      const kardexEliminados = await tx.kardexAlmacen.deleteMany({
        where: { movimientoAlmacenId: movimiento.id },
      });

      resultados.kardexEliminados = Number(kardexEliminados.count);

      // ========================================
      // PASO 4: REGENERAR SALDOS DETALLADOS
      // ========================================

      // Regenerar cada combinación de saldo detallado
      for (const keyDet of combinacionesDetalladas) {
        const combo = JSON.parse(keyDet);

        const filtro = {
          empresaId: BigInt(combo[0]),
          almacenId: BigInt(combo[1]),
          productoId: BigInt(combo[2]),
          clienteId: BigInt(combo[3]),
          esCustodia: combo[4],
          lote: combo[5],
          fechaIngreso: combo[6] ? new Date(combo[6]) : null,
          fechaProduccion: combo[7] ? new Date(combo[7]) : null,
          fechaVencimiento: combo[8] ? new Date(combo[8]) : null,
          estadoId: combo[9] ? BigInt(combo[9]) : null,
          estadoCalidadId: combo[10] ? BigInt(combo[10]) : null,
          numContenedor: combo[11],
          nroSerie: combo[12],
        };

        // Recalcular saldo detallado usando la función profesional
        const saldoDet = await recalcularSaldoDetalladoCompleto(tx, filtro);

        // Actualizar o eliminar el saldo detallado
        const saldoDetExistente = await tx.saldosDetProductoCliente.findFirst({
          where: filtro,
        });

        if (
          Number(saldoDet.saldoCantidad) === 0 &&
          Number(saldoDet.saldoPeso) === 0
        ) {
          // Si el saldo es cero, eliminar el registro
          if (saldoDetExistente) {
            await tx.saldosDetProductoCliente.delete({
              where: { id: saldoDetExistente.id },
            });
          }
        } else {
          // Si hay saldo, actualizar o crear
          if (saldoDetExistente) {
            await tx.saldosDetProductoCliente.update({
              where: { id: saldoDetExistente.id },
              data: {
                saldoCantidad: saldoDet.saldoCantidad,
                saldoPeso: saldoDet.saldoPeso,
                actualizadoEn: new Date(),
              },
            });
          } else {
            await tx.saldosDetProductoCliente.create({
              data: {
                ...filtro,
                saldoCantidad: saldoDet.saldoCantidad,
                saldoPeso: saldoDet.saldoPeso,
                actualizadoEn: new Date(),
              },
            });
          }
        }

        resultados.saldosDetRegenerados++;
      }

      // ========================================
      // PASO 5: REGENERAR SALDOS GENERALES
      // ========================================

      // Regenerar cada combinación de saldo general
      for (const keyGen of combinacionesGenerales) {
        const combo = JSON.parse(keyGen);

        const filtro = {
          empresaId: BigInt(combo[0]),
          almacenId: BigInt(combo[1]),
          productoId: BigInt(combo[2]),
          clienteId: BigInt(combo[3]),
          esCustodia: combo[4],
        };

        // Recalcular saldo general usando la función profesional
        const saldoGen = await recalcularSaldoGeneralCompleto(tx, filtro);

        // Actualizar o eliminar el saldo general
        const saldoGenExistente = await tx.saldosProductoCliente.findFirst({
          where: {
            empresaId: filtro.empresaId,
            almacenId: filtro.almacenId,
            productoId: filtro.productoId,
            clienteId: filtro.clienteId,
            custodia: filtro.esCustodia,
          },
        });

        if (
          Number(saldoGen.saldoCantidad) === 0 &&
          Number(saldoGen.saldoPeso) === 0
        ) {
          // Si el saldo es cero, eliminar el registro
          if (saldoGenExistente) {
            await tx.saldosProductoCliente.delete({
              where: { id: saldoGenExistente.id },
            });
          }
        } else {
          // Si hay saldo, actualizar o crear
          if (saldoGenExistente) {
            await tx.saldosProductoCliente.update({
              where: { id: saldoGenExistente.id },
              data: {
                saldoCantidad: saldoGen.saldoCantidad,
                saldoPeso: saldoGen.saldoPeso,
                costoUnitarioPromedio: saldoGen.costoUnitarioPromedio,
                actualizadoEn: new Date(),
              },
            });
          } else {
            await tx.saldosProductoCliente.create({
              data: {
                empresaId: filtro.empresaId,
                almacenId: filtro.almacenId,
                productoId: filtro.productoId,
                clienteId: filtro.clienteId,
                custodia: filtro.esCustodia,
                saldoCantidad: saldoGen.saldoCantidad,
                saldoPeso: saldoGen.saldoPeso,
                costoUnitarioPromedio: saldoGen.costoUnitarioPromedio,
                actualizadoEn: new Date(),
              },
            });
          }
        }

        resultados.saldosGenRegenerados++;
      }

      // Registrar productos afectados
      const productosUnicos = [
        ...new Set(combinacionesKardex.map((k) => k.productoId)),
      ];
      resultados.productosAfectados = productosUnicos.map((prodId) => ({
        productoId: prodId,
      }));

      // ========================================
      // PASO 6: ELIMINAR DETALLES DEL MOVIMIENTO
      // ========================================

      const detallesEliminados = await tx.detalleMovimientoAlmacen.deleteMany({
        where: { movimientoAlmacenId: movimiento.id },
      });

      resultados.detallesEliminados = Number(detallesEliminados.count);

      // ========================================
      // PASO 7: ELIMINAR EL MOVIMIENTO DE ALMACÉN
      // ========================================

      await tx.movimientoAlmacen.delete({
        where: { id: movimiento.id },
      });

      // ========================================
      // PASO 8: RETORNAR RESULTADO
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

/**
 * ============================================================================
 * FUNCIÓN: RECALCULAR SALDO DETALLADO COMPLETO
 * ============================================================================
 *
 * Recalcula el saldo detallado (con variables de control) desde el kardex.
 * Esta es la MISMA función que usa generarKardex.service.js
 *
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @param {Object} filtro - Filtro con todas las variables de control
 * @returns {Promise<Object>} Saldo calculado { saldoCantidad, saldoPeso }
 */
async function recalcularSaldoDetalladoCompleto(tx, filtro) {
  const whereClause = {
    empresaId: filtro.empresaId,
    almacenId: filtro.almacenId,
    productoId: filtro.productoId,
    esCustodia: filtro.esCustodia,
    lote: filtro.lote,
    fechaIngreso: filtro.fechaIngreso,
    fechaProduccion: filtro.fechaProduccion,
    fechaVencimiento: filtro.fechaVencimiento,
    estadoId: filtro.estadoId,
    estadoCalidadId: filtro.estadoCalidadId,
    numContenedor: filtro.numContenedor,
    nroSerie: filtro.nroSerie,
  };

  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where: whereClause,
    orderBy: [
      { fechaMovimientoAlmacen: "asc" },
      { esIngresoEgreso: "desc" },
      { id: "asc" },
    ],
  });

  let saldoCantidad = 0;
  let saldoPeso = 0;

  for (const kardex of kardexRegistros) {
    if (kardex.esIngresoEgreso) {
      // Usar ingresoCantVariables para saldos con trazabilidad
      saldoCantidad += Number(
        kardex.ingresoCantVariables || kardex.ingresoCant || 0,
      );
      saldoPeso += Number(
        kardex.ingresoPesoVariables || kardex.ingresoPeso || 0,
      );
    } else {
      // Usar egresoCantVariables para saldos con trazabilidad
      saldoCantidad -= Number(
        kardex.egresoCantVariables || kardex.egresoCant || 0,
      );
      saldoPeso -= Number(kardex.egresoPesoVariables || kardex.egresoPeso || 0);
    }
  }

  return {
    saldoCantidad: Math.max(0, saldoCantidad),
    saldoPeso: Math.max(0, saldoPeso),
  };
}

/**
 * ============================================================================
 * FUNCIÓN: RECALCULAR SALDO GENERAL COMPLETO
 * ============================================================================
 *
 * Recalcula el saldo general (sin variables de control) desde el kardex.
 * Esta es la MISMA función que usa generarKardex.service.js
 *
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @param {Object} filtro - Filtro { empresaId, almacenId, productoId, clienteId, esCustodia }
 * @returns {Promise<Object>} Saldo calculado { saldoCantidad, saldoPeso, costoUnitarioPromedio }
 */
async function recalcularSaldoGeneralCompleto(
  tx,
  { empresaId, almacenId, productoId, clienteId, esCustodia },
) {
  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where: { empresaId, almacenId, productoId, esCustodia },
    orderBy: [
      { fechaMovimientoAlmacen: "asc" },
      { esIngresoEgreso: "desc" },
      { id: "asc" },
    ],
  });

  let saldoCantidad = 0;
  let saldoPeso = 0;
  let costoTotalAcumulado = 0;
  let costoUnitarioPromedio = 0;

  for (const kardex of kardexRegistros) {
    if (kardex.esIngresoEgreso) {
      const ingresoCant = Number(kardex.ingresoCant || 0);
      const ingresoCostoUnit = Number(kardex.ingresoCantCostoUnit || 0);
      saldoCantidad += ingresoCant;
      saldoPeso += Number(kardex.ingresoPeso || 0);
      costoTotalAcumulado += ingresoCant * ingresoCostoUnit;
      costoUnitarioPromedio =
        saldoCantidad > 0 ? costoTotalAcumulado / saldoCantidad : 0;
    } else {
      const egresoCant = Number(kardex.egresoCant || 0);
      saldoCantidad -= egresoCant;
      saldoPeso -= Number(kardex.egresoPeso || 0);
      costoTotalAcumulado -= egresoCant * costoUnitarioPromedio;
    }
  }

  return {
    saldoCantidad: Math.max(0, saldoCantidad),
    saldoPeso: Math.max(0, saldoPeso),
    costoUnitarioPromedio: Math.max(0, costoUnitarioPromedio),
  };
}

export default {
  eliminarMovimientoAlmacenCompleto,
};
