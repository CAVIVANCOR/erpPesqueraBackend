// ============================================================================
// SERVICIO GENÉRICO: KARDEX - FUENTE ÚNICA DE VERDAD
// ============================================================================
// 
// RESPONSABILIDAD:
// - Funciones genéricas reutilizables para eliminar kardex y recalcular saldos
// - Usadas por: ELIMINAR, REACTIVAR, ANULAR movimientos
// - Garantiza consistencia en todos los procesos
//
// PATRÓN: Single Source of Truth (SSOT)
// - Una sola implementación para cada operación
// - Reutilizable en todos los módulos (Compras, Ventas, Pesca, etc.)
//
// FUNCIONES GENÉRICAS:
// 1. capturarCombinacionesAfectadas() - Fotografía del "antes"
// 2. eliminarKardexDeMovimiento() - Elimina kardex
// 3. recalcularSaldosAfectados() - Recalcula la cadena completa (cantidades, costos y saldos)
//
// ============================================================================

import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";
import { recalcularCadenaCompletaSAP } from "./kardexSaldosSAP.service.js";

// ============================================================================
// FUNCIÓN 1: CAPTURAR COMBINACIONES AFECTADAS
// ============================================================================
/**
 * Captura todas las combinaciones únicas de productos/saldos que serán afectados
 * ANTES de eliminar el kardex
 * 
 * PROPÓSITO:
 * - Tomar una "fotografía" de qué productos/saldos se verán afectados
 * - Permite saber qué saldos recalcular después de eliminar el kardex
 * 
 * PROCESO:
 * 1. Lee todos los registros de kardex del movimiento
 * 2. Extrae combinaciones únicas DETALLADAS (con todas las variables)
 * 3. Extrae combinaciones únicas GENERALES (sin variables)
 * 
 * @param {Number} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Object>} { detalladas: [...], generales: [...] }
 */
const capturarCombinacionesAfectadas = async (movimientoAlmacenId, tx) => {
    const kardexAnteriores = await tx.kardexAlmacen.findMany({
        where: { movimientoAlmacenId },
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
            ubicacionFisicaId: true,
        },
    });

    // Crear Set de combinaciones únicas
    const combinacionesDetalladas = new Set();
    const combinacionesGenerales = new Set();

    for (const kardex of kardexAnteriores) {
        // Combinación detallada (con todas las variables de control)
        const keyDet = JSON.stringify({
            empresaId: kardex.empresaId?.toString(),
            almacenId: kardex.almacenId?.toString(),
            productoId: kardex.productoId?.toString(),
            clienteId: kardex.clienteId?.toString(),
            esCustodia: kardex.esCustodia,
            lote: kardex.lote,
            fechaIngreso: kardex.fechaIngreso?.toISOString(),
            fechaProduccion: kardex.fechaProduccion?.toISOString(),
            fechaVencimiento: kardex.fechaVencimiento?.toISOString(),
            estadoId: kardex.estadoId?.toString(),
            estadoCalidadId: kardex.estadoCalidadId?.toString(),
            numContenedor: kardex.numContenedor,
            nroSerie: kardex.nroSerie,
            ubicacionFisicaId: kardex.ubicacionFisicaId?.toString(),
        });
        combinacionesDetalladas.add(keyDet);

        // Combinación general (sin variables de control)
        // ⚠️ IMPORTANTE: SaldosProductoCliente usa "custodia" NO "esCustodia"
        const keyGen = JSON.stringify({
            empresaId: kardex.empresaId?.toString(),
            almacenId: kardex.almacenId?.toString(),
            productoId: kardex.productoId?.toString(),
            clienteId: kardex.clienteId?.toString(),
            custodia: kardex.esCustodia, // ← Mapear esCustodia a custodia
        });
        combinacionesGenerales.add(keyGen);
    }

    return {
        detalladas: Array.from(combinacionesDetalladas).map((k) => JSON.parse(k)),
        generales: Array.from(combinacionesGenerales).map((k) => JSON.parse(k)),
    };
};

// ============================================================================
// FUNCIÓN 2: ELIMINAR KARDEX DE MOVIMIENTO
// ============================================================================
/**
 * Elimina TODOS los registros de kardex asociados a un movimiento
 * 
 * PROPÓSITO:
 * - Limpiar el kardex del movimiento antes de regenerarlo o eliminarlo
 * 
 * PROCESO:
 * - DELETE FROM kardexAlmacen WHERE movimientoAlmacenId = X
 * 
 * @param {Number} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Number>} Cantidad de registros eliminados
 */
const eliminarKardexDeMovimiento = async (movimientoAlmacenId, tx) => {
    const resultado = await tx.kardexAlmacen.deleteMany({
        where: { movimientoAlmacenId },
    });

    return resultado.count;
};

// ============================================================================
// FUNCIÓN 3: RECALCULAR SALDOS AFECTADOS
// ============================================================================
/**
 * Recalcula, desde el kardex restante, TODA la cadena de las combinaciones capturadas:
 * cantidades acumuladas y costo promedio móvil de cada fila (incluidos los movimientos
 * posteriores al eliminado) y los saldos detallado y general con su costo unitario promedio.
 *
 * Usa la misma rutina que la generación y regeneración del kardex (kardexSaldosSAP), de modo que el
 * costo promedio coincide en todos los procesos.
 *
 * @param {Object} combinaciones - { detalladas, generales } capturadas ANTES de eliminar el kardex
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<{saldosDetActualizados:number, saldosGenActualizados:number}>}
 */
const recalcularSaldosAfectados = async (combinaciones, tx) => {
    const { saldosDetActualizados, saldosGenActualizados } = await recalcularCadenaCompletaSAP(combinaciones, tx);
    return { saldosDetActualizados, saldosGenActualizados };
};

// ============================================================================
// EXPORTAR FUNCIONES
// ============================================================================
export {
    capturarCombinacionesAfectadas,
    eliminarKardexDeMovimiento,
    recalcularSaldosAfectados,
};

export default {
    capturarCombinacionesAfectadas,
    eliminarKardexDeMovimiento,
    recalcularSaldosAfectados,
};
