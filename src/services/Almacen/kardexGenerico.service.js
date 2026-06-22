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
// 3. recalcularSaldosAfectados() - Regenera saldos desde kardex restante
//
// ============================================================================

import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";

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
 * Recalcula los saldos SOLO de los productos que fueron capturados
 * 
 * PROPÓSITO:
 * - Regenerar saldos detallados y generales desde el kardex restante
 * - Optimización: Solo recalcula productos afectados (no todos)
 * 
 * PROCESO:
 * 1. Para cada combinación DETALLADA:
 *    - Lee kardex restante con esos filtros
 *    - Suma ingresos - egresos
 *    - Actualiza SaldosDetProductoCliente
 *    - Si saldo = 0, elimina registro
 * 
 * 2. Para cada combinación GENERAL:
 *    - Lee kardex restante con esos filtros
 *    - Suma ingresos - egresos
 *    - Calcula costo promedio ponderado
 *    - Actualiza SaldosProductoCliente
 *    - Si saldo = 0, elimina registro
 * 
 * PATRÓN ERP MEGUI:
 * - findFirst + update/create (NO upsert con campos nullables)
 * - SaldosDetProductoCliente usa "esCustodia"
 * - SaldosProductoCliente usa "custodia"
 * 
 * @param {Object} combinaciones - { detalladas: [...], generales: [...] }
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Object>} { saldosDetActualizados, saldosGenActualizados }
 */
const recalcularSaldosAfectados = async (combinaciones, tx) => {
    let saldosDetActualizados = 0;
    let saldosGenActualizados = 0;

    // ========================================
    // RECALCULAR SALDOS DETALLADOS
    // ========================================
    for (const combinacion of combinaciones.detalladas) {
        // Construir filtro para buscar en kardex
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

        // Leer kardex restante y calcular saldo
        const kardexRestante = await tx.kardexAlmacen.findMany({
            where: filtroKardex,
        });

        let saldoCantidad = 0;
        let saldoPeso = 0;

        for (const k of kardexRestante) {
            saldoCantidad += Number(k.ingresoCant || 0) - Number(k.egresoCant || 0);
            saldoPeso += Number(k.ingresoPeso || 0) - Number(k.egresoPeso || 0);
        }

        // Buscar saldo existente (PATRÓN ERP MEGUI: findFirst)
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

    // ========================================
    // RECALCULAR SALDOS GENERALES
    // ========================================
    for (const combinacion of combinaciones.generales) {
        // Construir filtro para buscar en kardex
        // ⚠️ IMPORTANTE: KardexAlmacen usa "esCustodia"
        const filtroKardex = {
            empresaId: combinacion.empresaId ? Number(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? Number(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? Number(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? Number(combinacion.clienteId) : null,
            esCustodia: combinacion.custodia, // ← Mapear custodia a esCustodia
        };

        // Leer kardex restante y calcular saldo + costo promedio
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

        // Construir filtro para buscar en SaldosProductoCliente
        // ⚠️ IMPORTANTE: SaldosProductoCliente usa "custodia"
        const filtroSaldo = {
            empresaId: combinacion.empresaId ? Number(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? Number(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? Number(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? Number(combinacion.clienteId) : null,
            custodia: combinacion.custodia,
        };

        // Buscar saldo existente (PATRÓN ERP MEGUI: findFirst)
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

    return {
        saldosDetActualizados,
        saldosGenActualizados,
    };
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