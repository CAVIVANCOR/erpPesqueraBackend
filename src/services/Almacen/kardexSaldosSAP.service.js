// ============================================================================
// SERVICIO CENTRAL SAP: KARDEX Y SALDOS
// ============================================================================
// 
// RESPONSABILIDAD:
// - Regeneración completa de Kardex y Saldos
// - Limpieza de saldos huérfanos
// - Validación de consistencia
// - Garantizar una sola fuente de verdad
//
// PATRÓN: Inspirado en SAP MM (Materials Management)
// - Kardex es la ÚNICA fuente de verdad
// - Saldos se CALCULAN desde Kardex
// - Transacciones atómicas (TODO o NADA)
// - Idempotencia garantizada
//
// USADO POR:
// - MovimientoAlmacen (crear, actualizar, eliminar)
// - OrdenCompra (generar kardex, regenerar)
// - PreFactura (generar kardex, regenerar)
// - DescargaFaena (generar kardex)
//
// NOMENCLATURA: Sufijo "SAP" para identificar nueva implementación
//
// ============================================================================

import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";

// ============================================================================
// FUNCIÓN MAESTRA: REGENERAR KARDEX Y SALDOS COMPLETO
// ============================================================================
/**
 * Regenera completamente el kardex y saldos de un movimiento de almacén
 * 
 * PROCESO COMPLETO (Nivel SAP):
 * 1. Captura snapshot de combinaciones anteriores
 * 2. Elimina kardex anterior
 * 3. Limpia saldos huérfanos
 * 4. Regenera kardex desde cero
 * 5. Calcula saldos acumulados en kardex
 * 6. Recalcula saldos detallados
 * 7. Recalcula saldos generales
 * 8. Valida consistencia
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma (obligatorio)
 * @returns {Promise<Object>} Resultado de la regeneración
 */
const regenerarKardexYSaldosCompletoSAP = async (movimientoAlmacenId, tx) => {
    try {
        const resultados = {
            movimientoId: movimientoAlmacenId,
            kardexEliminados: 0,
            saldosHuerfanosEliminados: 0,
            kardexCreados: 0,
            saldosDetActualizados: 0,
            saldosGenActualizados: 0,
            errores: [],
        };

        // ========================================
        // FASE 1: SNAPSHOT (Captura de estado anterior)
        // ========================================
        const combinacionesAnteriores = await capturarCombinacionesAnterioresSAP(
            movimientoAlmacenId,
            tx
        );

        // ========================================
        // FASE 2: LIMPIEZA TOTAL
        // ========================================

        // 2.1 Eliminar kardex anterior
        const kardexEliminados = await limpiarKardexAnteriorSAP(movimientoAlmacenId, tx);
        resultados.kardexEliminados = kardexEliminados;

        // 2.2 Eliminar saldos huérfanos
        const saldosEliminados = await limpiarSaldosHuerfanosSAP(
            combinacionesAnteriores,
            tx
        );
        resultados.saldosHuerfanosEliminados = saldosEliminados;

        // ========================================
        // FASE 3: REGENERACIÓN
        // ========================================

        // 3.1 Regenerar kardex
        const kardexGenerados = await regenerarKardexSAP(movimientoAlmacenId, tx);
        resultados.kardexCreados = kardexGenerados.kardexCreados;
        resultados.errores = kardexGenerados.errores;

        // 3.2 Calcular saldos acumulados en kardex
        await calcularSaldosAcumuladosKardexSAP(movimientoAlmacenId, tx);

        // ========================================
        // FASE 4: ACTUALIZACIÓN DE SALDOS
        // ========================================

        // 4.1 Recalcular saldos detallados
        const saldosDetActualizados = await recalcularSaldosDetalladosSAP(
            movimientoAlmacenId,
            tx
        );
        resultados.saldosDetActualizados = saldosDetActualizados;

        // 4.2 Recalcular saldos generales
        const saldosGenActualizados = await recalcularSaldosGeneralesSAP(
            movimientoAlmacenId,
            tx
        );
        resultados.saldosGenActualizados = saldosGenActualizados;

        // ========================================
        // FASE 5: VALIDACIÓN
        // ========================================

        // 5.1 Validar consistencia Kardex vs Saldos
        await validarConsistenciaSAP(movimientoAlmacenId, tx);

        // 5.2 Validar saldos no negativos
        await validarSaldosNoNegativosSAP(movimientoAlmacenId, tx);

        return resultados;
    } catch (error) {
        if (error instanceof ValidationError) throw error;
        if (error.code?.startsWith("P"))
            throw new DatabaseError(
                "Error de base de datos al regenerar kardex y saldos (SAP)",
                error.message
            );
        throw error;
    }
};

// ============================================================================
// FASE 1: SNAPSHOT - Captura de combinaciones anteriores
// ============================================================================
/**
 * Captura todas las combinaciones únicas de variables de control
 * ANTES de eliminar el kardex
 * 
 * Esto permite identificar qué saldos quedarán huérfanos después del cambio
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Object>} Objeto con combinaciones detalladas y generales
 */
const capturarCombinacionesAnterioresSAP = async (movimientoAlmacenId, tx) => {
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
        const keyGen = JSON.stringify({
            empresaId: kardex.empresaId?.toString(),
            almacenId: kardex.almacenId?.toString(),
            productoId: kardex.productoId?.toString(),
            clienteId: kardex.clienteId?.toString(),
            custodia: kardex.esCustodia,
        });
        combinacionesGenerales.add(keyGen);
    }

    return {
        detalladas: Array.from(combinacionesDetalladas).map((k) => JSON.parse(k)),
        generales: Array.from(combinacionesGenerales).map((k) => JSON.parse(k)),
    };
};

// ============================================================================
// FASE 2.1: LIMPIEZA - Eliminar kardex anterior
// ============================================================================
/**
 * Elimina todos los registros de kardex del movimiento
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Number>} Cantidad de registros eliminados
 */
const limpiarKardexAnteriorSAP = async (movimientoAlmacenId, tx) => {
    const resultado = await tx.kardexAlmacen.deleteMany({
        where: { movimientoAlmacenId },
    });

    return resultado.count;
};

// ============================================================================
// FASE 2.2: LIMPIEZA - Eliminar saldos huérfanos
// ============================================================================
/**
 * Elimina saldos que ya no tienen kardex asociado
 * 
 * LÓGICA:
 * - Por cada combinación anterior, verifica si aún existe en kardex
 * - Si NO existe en kardex = HUÉRFANO → Eliminar
 * 
 * @param {Object} combinacionesAnteriores - Combinaciones capturadas antes
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Number>} Cantidad de saldos eliminados
 */
const limpiarSaldosHuerfanosSAP = async (combinacionesAnteriores, tx) => {
    let saldosDetalladosEliminados = 0;
    let saldosGeneralesEliminados = 0;

    // ========================================
    // Limpiar saldos detallados huérfanos
    // ========================================
    for (const combinacion of combinacionesAnteriores.detalladas) {
        // Construir filtro para buscar en kardex
        const filtroKardex = {
            empresaId: combinacion.empresaId ? BigInt(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? BigInt(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? BigInt(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? BigInt(combinacion.clienteId) : null,
            esCustodia: combinacion.esCustodia,
            lote: combinacion.lote,
            fechaIngreso: combinacion.fechaIngreso ? new Date(combinacion.fechaIngreso) : null,
            fechaProduccion: combinacion.fechaProduccion ? new Date(combinacion.fechaProduccion) : null,
            fechaVencimiento: combinacion.fechaVencimiento ? new Date(combinacion.fechaVencimiento) : null,
            estadoId: combinacion.estadoId ? BigInt(combinacion.estadoId) : null,
            estadoCalidadId: combinacion.estadoCalidadId ? BigInt(combinacion.estadoCalidadId) : null,
            numContenedor: combinacion.numContenedor,
            nroSerie: combinacion.nroSerie,
            ubicacionFisicaId: combinacion.ubicacionFisicaId ? BigInt(combinacion.ubicacionFisicaId) : null,
        };

        // Verificar si existe en kardex
        const existeEnKardex = await tx.kardexAlmacen.count({
            where: filtroKardex,
        });

        // Si NO existe en kardex = HUÉRFANO
        if (existeEnKardex === 0) {
            // Eliminar de SaldosDetProductoCliente
            const resultado = await tx.saldosDetProductoCliente.deleteMany({
                where: filtroKardex,
            });
            saldosDetalladosEliminados += resultado.count;
        }
    }

    // ========================================
    // Limpiar saldos generales huérfanos
    // ========================================
    for (const combinacion of combinacionesAnteriores.generales) {
        // Construir filtro para buscar en kardex
        const filtroKardex = {
            empresaId: combinacion.empresaId ? BigInt(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? BigInt(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? BigInt(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? BigInt(combinacion.clienteId) : null,
            esCustodia: combinacion.custodia,
        };

        // Verificar si existe en kardex
        const existeEnKardex = await tx.kardexAlmacen.count({
            where: filtroKardex,
        });

        // Si NO existe en kardex = HUÉRFANO
        if (existeEnKardex === 0) {
            // Eliminar de SaldosProductoCliente
            const resultado = await tx.saldosProductoCliente.deleteMany({
                where: {
                    empresaId: filtroKardex.empresaId,
                    almacenId: filtroKardex.almacenId,
                    productoId: filtroKardex.productoId,
                    clienteId: filtroKardex.clienteId,
                    custodia: filtroKardex.esCustodia,
                },
            });
            saldosGeneralesEliminados += resultado.count;
        }
    }

    return saldosDetalladosEliminados + saldosGeneralesEliminados;
};

// ============================================================================
// FASE 3.1: REGENERACIÓN - Regenerar kardex
// ============================================================================
/**
 * Regenera el kardex del movimiento desde cero
 * 
 * REUTILIZA la lógica existente de generarKardex.service.js
 * para mantener consistencia con el patrón actual
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Object>} Resultado de la generación
 */
const regenerarKardexSAP = async (movimientoAlmacenId, tx) => {
    // Obtener movimiento con detalles
    const movimiento = await tx.movimientoAlmacen.findUnique({
        where: { id: movimientoAlmacenId },
        include: {
            conceptoMovAlmacen: true,
            empresa: {
                select: {
                    id: true,
                    entidadComercialId: true,
                },
            },
            detalles: {
                include: {
                    producto: {
                        include: {
                            unidadMedida: true,
                        },
                    },
                },
            },
        },
    });

    if (!movimiento)
        throw new ValidationError("Movimiento de almacén no encontrado");
    if (!movimiento.detalles?.length)
        throw new ValidationError("El movimiento no tiene detalles");

    const conceptoMovAlmacen = movimiento.conceptoMovAlmacen;
    const resultados = {
        kardexCreados: 0,
        errores: [],
    };

    // NOTA: MovimientoAlmacen NO tiene almacenOrigenId ni almacenDestinoId
    // El almacén se debe obtener del ConceptoMovAlmacen o de otra fuente
    // Por ahora, se asume que el almacén está en el concepto

    // Procesar cada detalle
    for (const detalle of movimiento.detalles) {
        try {
            // Kardex Origen (si aplica)
            if (conceptoMovAlmacen.llevaKardexOrigen) {
                await procesarKardexSAP(
                    tx,
                    movimiento,
                    detalle,
                    conceptoMovAlmacen,
                    true // esOrigen
                );
                resultados.kardexCreados++;
            }

            // Kardex Destino (si aplica)
            if (conceptoMovAlmacen.llevaKardexDestino) {
                await procesarKardexSAP(
                    tx,
                    movimiento,
                    detalle,
                    conceptoMovAlmacen,
                    false // esDestino
                );
                resultados.kardexCreados++;
            }
        } catch (error) {
            resultados.errores.push({
                detalleId: detalle.id,
                productoId: detalle.productoId,
                error: error.message,
            });
        }
    }

    return resultados;
};

// ============================================================================
// HELPER: Procesar Kardex (Origen o Destino)
// ============================================================================
/**
 * Crea registro de kardex
 * PATRÓN: Reutiliza lógica de generarKardex.service.js
 * 
 * NOTA CRÍTICA: MovimientoAlmacen NO tiene almacenId
 * Se debe obtener del ConceptoMovAlmacen o de la configuración del sistema
 */
const procesarKardexSAP = async (tx, movimiento, detalle, conceptoMovAlmacen, esOrigen) => {
    // Obtener almacenId del ConceptoMovAlmacen según origen/destino
    const almacenId = esOrigen
        ? conceptoMovAlmacen.almacenOrigenId
        : conceptoMovAlmacen.almacenDestinoId;

    // Validar que el almacén esté definido
    if (!almacenId) {
        throw new ValidationError(
            `El concepto de movimiento no tiene almacén ${esOrigen ? 'origen' : 'destino'} definido`
        );
    }

    // Determinar ubicación física según origen/destino
    const ubicacionFisicaId = esOrigen
        ? detalle.ubicacionFisicaOrigenId
        : detalle.ubicacionFisicaDestinoId;

    // Determinar si es ingreso o egreso
    const esIngreso = esOrigen
        ? !conceptoMovAlmacen.esIngresoEgreso
        : conceptoMovAlmacen.esIngresoEgreso;

    const filtro = {
        empresaId: movimiento.empresaId,
        almacenId: almacenId, // ← DEBE SER DEFINIDO
        productoId: detalle.productoId,
        clienteId: detalle.entidadComercialId || movimiento.empresa.entidadComercialId,
        esCustodia: detalle.esCustodia || false,
        lote: detalle.lote || "",
        fechaIngreso: detalle.fechaIngreso,
        fechaProduccion: detalle.fechaProduccion,
        fechaVencimiento: detalle.fechaVencimiento,
        estadoId: detalle.estadoMercaderiaId,
        estadoCalidadId: detalle.estadoCalidadId,
        numContenedor: detalle.nroContenedor || "",
        nroSerie: detalle.nroSerie || "",
        ubicacionFisicaId: ubicacionFisicaId,
    };

    // Crear registro de kardex
    await tx.kardexAlmacen.create({
        data: {
            ...filtro,
            movimientoAlmacenId: movimiento.id,
            detalleMovimientoAlmacenId: detalle.id,
            fechaMovimientoAlmacen: movimiento.fechaDocumento,
            numDocCompleto: movimiento.numeroDocumento || "",
            esIngresoEgreso: esIngreso,
            conceptoMovAlmacenId: movimiento.conceptoMovAlmacenId,

            // Ingresos
            ingresoCant: esIngreso ? Number(detalle.cantidad || 0) : 0,
            ingresoPeso: esIngreso ? Number(detalle.peso || 0) : 0,
            ingresoCantCostoUnit: esIngreso ? Number(detalle.costoUnitario || 0) : 0,
            ingresoCantCostoTotal: esIngreso ? Number(detalle.cantidad || 0) * Number(detalle.costoUnitario || 0) : 0,
            ingresoCantVariables: esIngreso ? Number(detalle.cantidad || 0) : 0,
            ingresoPeso: esIngreso ? Number(detalle.peso || 0) : 0,
            ingresoPesoCostoUnit: esIngreso && detalle.peso ? Number(detalle.costoUnitario || 0) / Number(detalle.peso) : 0,
            ingresoPesoCostoTotal: esIngreso ? Number(detalle.peso || 0) * (detalle.peso ? Number(detalle.costoUnitario || 0) / Number(detalle.peso) : 0) : 0,
            ingresoPesoVariables: esIngreso ? Number(detalle.peso || 0) : 0,

            // Egresos
            egresoCant: !esIngreso ? Number(detalle.cantidad || 0) : 0,
            egresoPeso: !esIngreso ? Number(detalle.peso || 0) : 0,
            egresoCantCostoUnit: 0, // Se calcula con costo promedio
            egresoCantCostoTotal: 0, // Se calcula con costo promedio
            egresoCantVariables: !esIngreso ? Number(detalle.cantidad || 0) : 0,
            egresoPesoCostoUnit: 0, // Se calcula con costo promedio
            egresoPesoCostoTotal: 0, // Se calcula con costo promedio
            egresoPesoVariables: !esIngreso ? Number(detalle.peso || 0) : 0,

            // Saldos (se calcularán después)
            saldoIniCant: 0,
            saldoInicialCostoUnitCant: 0,
            saldoInicialCostoTotalCant: 0,
            saldoInicialCantVariables: 0,
            saldoInicialPeso: 0,
            saldoInicialPesoCostoUnit: 0,
            saldoInicialPesoCostoTotal: 0,
            saldoInicialPesoVariables: 0,
            saldoFinalCant: 0,
            saldoFinalCostoUnitCant: 0,
            saldoFinalCostoTotalCant: 0,
            saldoFinalCantVariables: 0,
            saldoFinalPeso: 0,
            saldoFinalPesoCostoUnit: 0,
            saldoFinalPesoCostoTotal: 0,
            saldoFinalPesoVariables: 0,
        },
    });
};

// ============================================================================
// FASE 3.2: CÁLCULO - Saldos acumulados en kardex
// ============================================================================
/**
 * Calcula los saldos acumulados cronológicamente en cada registro de kardex
 * 
 * LÓGICA:
 * - Agrupa por combinación única
 * - Ordena cronológicamente
 * - Acumula ingresos - egresos
 * - Actualiza saldoFinalCant y saldoFinalPeso en cada registro
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 */
const calcularSaldosAcumuladosKardexSAP = async (movimientoAlmacenId, tx) => {
    // Obtener todas las combinaciones únicas del movimiento
    const kardexMovimiento = await tx.kardexAlmacen.findMany({
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
    const combinaciones = new Set();
    for (const kardex of kardexMovimiento) {
        const key = JSON.stringify({
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
        combinaciones.add(key);
    }

    // Por cada combinación, calcular saldos acumulados
    for (const combinacionStr of combinaciones) {
        const combinacion = JSON.parse(combinacionStr);

        // Construir filtro
        const filtro = {
            empresaId: combinacion.empresaId ? BigInt(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? BigInt(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? BigInt(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? BigInt(combinacion.clienteId) : null,
            esCustodia: combinacion.esCustodia,
            lote: combinacion.lote,
            fechaIngreso: combinacion.fechaIngreso ? new Date(combinacion.fechaIngreso) : null,
            fechaProduccion: combinacion.fechaProduccion ? new Date(combinacion.fechaProduccion) : null,
            fechaVencimiento: combinacion.fechaVencimiento ? new Date(combinacion.fechaVencimiento) : null,
            estadoId: combinacion.estadoId ? BigInt(combinacion.estadoId) : null,
            estadoCalidadId: combinacion.estadoCalidadId ? BigInt(combinacion.estadoCalidadId) : null,
            numContenedor: combinacion.numContenedor,
            nroSerie: combinacion.nroSerie,
            ubicacionFisicaId: combinacion.ubicacionFisicaId ? BigInt(combinacion.ubicacionFisicaId) : null,
        };

        // Obtener kardex ordenado cronológicamente
        const kardexOrdenado = await tx.kardexAlmacen.findMany({
            where: filtro,
            orderBy: [
                { fechaMovimientoAlmacen: "asc" },
                { esIngresoEgreso: "desc" }, // Ingresos primero
                { id: "asc" },
            ],
        });

        // Calcular saldos acumulados
        let saldoCantidad = 0;
        let saldoPeso = 0;

        for (const kardex of kardexOrdenado) {
            if (kardex.esIngresoEgreso) {
                // INGRESO
                saldoCantidad += Number(kardex.ingresoCantVariables || kardex.ingresoCant || 0);
                saldoPeso += Number(kardex.ingresoPesoVariables || kardex.ingresoPeso || 0);
            } else {
                // EGRESO
                saldoCantidad -= Number(kardex.egresoCantVariables || kardex.egresoCant || 0);
                saldoPeso -= Number(kardex.egresoPesoVariables || kardex.egresoPeso || 0);
            }

            // Actualizar saldo en kardex
            await tx.kardexAlmacen.update({
                where: { id: kardex.id },
                data: {
                    saldoFinalCant: Math.max(0, saldoCantidad),
                    saldoFinalPeso: Math.max(0, saldoPeso),
                    saldoFinalCantVariables: Math.max(0, saldoCantidad),
                    saldoFinalPesoVariables: Math.max(0, saldoPeso),
                },
            });
        }
    }
};

// ============================================================================
// FASE 4.1: SALDOS - Recalcular saldos detallados
// ============================================================================
/**
 * Recalcula SaldosDetProductoCliente desde el kardex
 * 
 * LÓGICA:
 * - Obtiene combinaciones únicas del kardex
 * - Por cada combinación, suma ingresos - egresos
 * - Upsert en SaldosDetProductoCliente
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Number>} Cantidad de saldos actualizados
 */
const recalcularSaldosDetalladosSAP = async (movimientoAlmacenId, tx) => {
    // Obtener combinaciones únicas del kardex
    const kardexMovimiento = await tx.kardexAlmacen.findMany({
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

    const combinaciones = new Set();
    for (const kardex of kardexMovimiento) {
        const key = JSON.stringify({
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
        combinaciones.add(key);
    }

    let saldosActualizados = 0;

    // Por cada combinación, recalcular saldo
    for (const combinacionStr of combinaciones) {
        const combinacion = JSON.parse(combinacionStr);

        // Construir filtro
        const filtro = {
            empresaId: combinacion.empresaId ? BigInt(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? BigInt(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? BigInt(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? BigInt(combinacion.clienteId) : null,
            esCustodia: combinacion.esCustodia,
            lote: combinacion.lote,
            fechaIngreso: combinacion.fechaIngreso ? new Date(combinacion.fechaIngreso) : null,
            fechaProduccion: combinacion.fechaProduccion ? new Date(combinacion.fechaProduccion) : null,
            fechaVencimiento: combinacion.fechaVencimiento ? new Date(combinacion.fechaVencimiento) : null,
            estadoId: combinacion.estadoId ? BigInt(combinacion.estadoId) : null,
            estadoCalidadId: combinacion.estadoCalidadId ? BigInt(combinacion.estadoCalidadId) : null,
            numContenedor: combinacion.numContenedor,
            nroSerie: combinacion.nroSerie,
            ubicacionFisicaId: combinacion.ubicacionFisicaId ? BigInt(combinacion.ubicacionFisicaId) : null,
        };

        // Sumar desde kardex
        const kardexRegistros = await tx.kardexAlmacen.findMany({
            where: filtro,
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
                saldoCantidad += Number(kardex.ingresoCantVariables || kardex.ingresoCant || 0);
                saldoPeso += Number(kardex.ingresoPesoVariables || kardex.ingresoPeso || 0);
            } else {
                saldoCantidad -= Number(kardex.egresoCantVariables || kardex.egresoCant || 0);
                saldoPeso -= Number(kardex.egresoPesoVariables || kardex.egresoPeso || 0);
            }
        }

        // Upsert en SaldosDetProductoCliente
        // PATRÓN: findFirst + update/create (por constraint único con nulls)
        const existente = await tx.saldosDetProductoCliente.findFirst({
            where: filtro,
        });

        if (existente) {
            await tx.saldosDetProductoCliente.update({
                where: { id: existente.id },
                data: {
                    saldoCantidad: Math.max(0, saldoCantidad),
                    saldoPeso: Math.max(0, saldoPeso),
                    actualizadoEn: new Date(),
                },
            });
        } else {
            await tx.saldosDetProductoCliente.create({
                data: {
                    ...filtro,
                    saldoCantidad: Math.max(0, saldoCantidad),
                    saldoPeso: Math.max(0, saldoPeso),
                    actualizadoEn: new Date(),
                },
            });
        }

        saldosActualizados++;
    }

    return saldosActualizados;
};

// ============================================================================
// FASE 4.2: SALDOS - Recalcular saldos generales
// ============================================================================
/**
 * Recalcula SaldosProductoCliente desde SaldosDetProductoCliente
 * 
 * LÓGICA:
 * - Agrupa por empresa-almacén-producto-cliente-custodia
 * - Suma todos los saldos detallados
 * - Calcula costo promedio ponderado
 * - Upsert en SaldosProductoCliente
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @returns {Promise<Number>} Cantidad de saldos actualizados
 */
const recalcularSaldosGeneralesSAP = async (movimientoAlmacenId, tx) => {
    // Obtener combinaciones generales del kardex
    const kardexMovimiento = await tx.kardexAlmacen.findMany({
        where: { movimientoAlmacenId },
        select: {
            empresaId: true,
            almacenId: true,
            productoId: true,
            clienteId: true,
            esCustodia: true,
        },
    });

    const combinaciones = new Set();
    for (const kardex of kardexMovimiento) {
        const key = JSON.stringify({
            empresaId: kardex.empresaId?.toString(),
            almacenId: kardex.almacenId?.toString(),
            productoId: kardex.productoId?.toString(),
            clienteId: kardex.clienteId?.toString(),
            custodia: kardex.esCustodia,
        });
        combinaciones.add(key);
    }

    let saldosActualizados = 0;

    // Por cada combinación general, recalcular
    for (const combinacionStr of combinaciones) {
        const combinacion = JSON.parse(combinacionStr);

        const filtro = {
            empresaId: combinacion.empresaId ? BigInt(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? BigInt(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? BigInt(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? BigInt(combinacion.clienteId) : null,
            esCustodia: combinacion.custodia,
        };

        // Sumar desde kardex para calcular saldo y costo promedio
        const kardexRegistros = await tx.kardexAlmacen.findMany({
            where: filtro,
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

        // Upsert en SaldosProductoCliente
        // PATRÓN: upsert con constraint único válido
        await tx.saldosProductoCliente.upsert({
            where: {
                uk_saldo_general_completo: {
                    empresaId: filtro.empresaId,
                    almacenId: filtro.almacenId,
                    productoId: filtro.productoId,
                    clienteId: filtro.clienteId,
                    custodia: filtro.esCustodia,
                },
            },
            update: {
                saldoCantidad: Math.max(0, saldoCantidad),
                saldoPeso: Math.max(0, saldoPeso),
                costoUnitarioPromedio: Math.max(0, costoUnitarioPromedio),
                actualizadoEn: new Date(),
            },
            create: {
                empresaId: filtro.empresaId,
                almacenId: filtro.almacenId,
                productoId: filtro.productoId,
                clienteId: filtro.clienteId,
                custodia: filtro.esCustodia,
                saldoCantidad: Math.max(0, saldoCantidad),
                saldoPeso: Math.max(0, saldoPeso),
                costoUnitarioPromedio: Math.max(0, costoUnitarioPromedio),
                actualizadoEn: new Date(),
            },
        });

        saldosActualizados++;
    }

    return saldosActualizados;
};

// ============================================================================
// FASE 5.1: VALIDACIÓN - Consistencia Kardex vs Saldos
// ============================================================================
/**
 * Valida que los saldos en las tablas coincidan con el último saldo del kardex
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @throws {ValidationError} Si hay inconsistencias
 */
const validarConsistenciaSAP = async (movimientoAlmacenId, tx) => {
    // Obtener combinaciones únicas del kardex
    const kardexMovimiento = await tx.kardexAlmacen.findMany({
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

    const combinaciones = new Set();
    for (const kardex of kardexMovimiento) {
        const key = JSON.stringify({
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
        combinaciones.add(key);
    }

    // Validar cada combinación
    for (const combinacionStr of combinaciones) {
        const combinacion = JSON.parse(combinacionStr);

        const filtro = {
            empresaId: combinacion.empresaId ? BigInt(combinacion.empresaId) : null,
            almacenId: combinacion.almacenId ? BigInt(combinacion.almacenId) : null,
            productoId: combinacion.productoId ? BigInt(combinacion.productoId) : null,
            clienteId: combinacion.clienteId ? BigInt(combinacion.clienteId) : null,
            esCustodia: combinacion.esCustodia,
            lote: combinacion.lote,
            fechaIngreso: combinacion.fechaIngreso ? new Date(combinacion.fechaIngreso) : null,
            fechaProduccion: combinacion.fechaProduccion ? new Date(combinacion.fechaProduccion) : null,
            fechaVencimiento: combinacion.fechaVencimiento ? new Date(combinacion.fechaVencimiento) : null,
            estadoId: combinacion.estadoId ? BigInt(combinacion.estadoId) : null,
            estadoCalidadId: combinacion.estadoCalidadId ? BigInt(combinacion.estadoCalidadId) : null,
            numContenedor: combinacion.numContenedor,
            nroSerie: combinacion.nroSerie,
            ubicacionFisicaId: combinacion.ubicacionFisicaId ? BigInt(combinacion.ubicacionFisicaId) : null,
        };

        // Obtener último saldo del kardex
        const ultimoKardex = await tx.kardexAlmacen.findFirst({
            where: filtro,
            orderBy: [
                { fechaMovimientoAlmacen: "desc" },
                { id: "desc" },
            ],
        });

        // Obtener saldo de la tabla
        const saldoTabla = await tx.saldosDetProductoCliente.findFirst({
            where: filtro,
        });

        // Validar
        if (ultimoKardex && saldoTabla) {
            const saldoKardex = Number(ultimoKardex.saldoFinalCant);
            const saldoTablaCant = Number(saldoTabla.saldoCantidad);

            if (Math.abs(saldoKardex - saldoTablaCant) > 0.001) {
                throw new ValidationError(
                    `Inconsistencia detectada: Kardex=${saldoKardex}, Tabla=${saldoTablaCant} para producto ${filtro.productoId}`
                );
            }
        }
    }
};

// ============================================================================
// FASE 5.2: VALIDACIÓN - Saldos no negativos
// ============================================================================
/**
 * Valida que no existan saldos negativos
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento
 * @param {PrismaTransaction} tx - Transacción de Prisma
 * @throws {ValidationError} Si hay saldos negativos
 */
const validarSaldosNoNegativosSAP = async (movimientoAlmacenId, tx) => {
    // Validar en SaldosDetProductoCliente
    const saldosNegativos = await tx.saldosDetProductoCliente.count({
        where: {
            OR: [
                { saldoCantidad: { lt: 0 } },
                { saldoPeso: { lt: 0 } },
            ],
        },
    });

    if (saldosNegativos > 0) {
        throw new ValidationError(
            `Se detectaron ${saldosNegativos} saldos negativos en SaldosDetProductoCliente`
        );
    }

    // Validar en SaldosProductoCliente
    const saldosGeneralesNegativos = await tx.saldosProductoCliente.count({
        where: {
            OR: [
                { saldoCantidad: { lt: 0 } },
                { saldoPeso: { lt: 0 } },
            ],
        },
    });

    if (saldosGeneralesNegativos > 0) {
        throw new ValidationError(
            `Se detectaron ${saldosGeneralesNegativos} saldos negativos en SaldosProductoCliente`
        );
    }
};

// ============================================================================
// EXPORTAR FUNCIONES
// ============================================================================
export {
    regenerarKardexYSaldosCompletoSAP,
    capturarCombinacionesAnterioresSAP,
    limpiarKardexAnteriorSAP,
    limpiarSaldosHuerfanosSAP,
    regenerarKardexSAP,
    calcularSaldosAcumuladosKardexSAP,
    recalcularSaldosDetalladosSAP,
    recalcularSaldosGeneralesSAP,
    validarConsistenciaSAP,
    validarSaldosNoNegativosSAP,
};

export default {
    regenerarKardexYSaldosCompletoSAP,
    capturarCombinacionesAnterioresSAP,
    limpiarKardexAnteriorSAP,
    limpiarSaldosHuerfanosSAP,
    regenerarKardexSAP,
    calcularSaldosAcumuladosKardexSAP,
    recalcularSaldosDetalladosSAP,
    recalcularSaldosGeneralesSAP,
    validarConsistenciaSAP,
    validarSaldosNoNegativosSAP,
};