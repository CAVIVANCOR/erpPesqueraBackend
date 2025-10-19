// src/services/Almacen/generarKardex.service.js
// Servicio para generación automática de Kardex y actualización de saldos
import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';

/**
 * Genera Kardex completo para un MovimientoAlmacen
 * Incluye:
 * 1. Creación/actualización de registros KardexAlmacen (origen y/o destino)
 * 2. Cálculo de saldos con método de costo promedio ponderado
 * 3. Actualización de SaldosDetProductoCliente
 * 4. Actualización de SaldosProductoCliente
 * 
 * @param {BigInt} movimientoAlmacenId - ID del movimiento de almacén
 * @returns {Object} Resultado de la operación
 */
const generarKardexMovimiento = async (movimientoAlmacenId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener MovimientoAlmacen con todas las relaciones necesarias
      const movimiento = await tx.movimientoAlmacen.findUnique({
        where: { id: movimientoAlmacenId },
        include: {
          conceptoMovAlmacen: true,
          empresa: true, // NECESARIO para obtener empresa.entidadComercialId
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
      });

      if (!movimiento) {
        throw new ValidationError('Movimiento de almacén no encontrado');
      }

      if (!movimiento.detalles || movimiento.detalles.length === 0) {
        throw new ValidationError('El movimiento no tiene detalles');
      }

      const conceptoMovAlmacen = movimiento.conceptoMovAlmacen;
      const llevaKardexOrigen = conceptoMovAlmacen.llevaKardexOrigen;
      const llevaKardexDestino = conceptoMovAlmacen.llevaKardexDestino;

      const resultados = {
        kardexCreados: 0,
        kardexActualizados: 0,
        saldosDetActualizados: 0,
        saldosGenActualizados: 0,
        errores: []
      };

      // 2. Procesar cada detalle
      for (const detalle of movimiento.detalles) {
        try {
          // 2.1. KARDEX ORIGEN (EGRESO)
          if (llevaKardexOrigen) {
            const resultadoOrigen = await procesarKardexOrigen(
              tx,
              movimiento,
              detalle,
              conceptoMovAlmacen
            );
            
            if (resultadoOrigen.creado) resultados.kardexCreados++;
            if (resultadoOrigen.actualizado) resultados.kardexActualizados++;
            if (resultadoOrigen.error) resultados.errores.push(resultadoOrigen.error);
          }

          // 2.2. KARDEX DESTINO (INGRESO)
          if (llevaKardexDestino) {
            const resultadoDestino = await procesarKardexDestino(
              tx,
              movimiento,
              detalle,
              conceptoMovAlmacen
            );
            
            if (resultadoDestino.creado) resultados.kardexCreados++;
            if (resultadoDestino.actualizado) resultados.kardexActualizados++;
            if (resultadoDestino.error) resultados.errores.push(resultadoDestino.error);
          }
        } catch (error) {
          resultados.errores.push({
            detalleId: detalle.id,
            productoId: detalle.productoId,
            error: error.message
          });
        }
      }

      // 3. Calcular saldos de Kardex (costo promedio ponderado)
      await calcularSaldosKardex(tx, movimiento);

      // 3.1. Calcular saldos de Kardex CON VARIABLES (agrupado por variables de trazabilidad)
      await calcularSaldosKardexConVariables(tx, movimiento);

      // 4. Actualizar SaldosDetProductoCliente y SaldosProductoCliente
      const saldosActualizados = await actualizarSaldos(tx, movimiento);
      resultados.saldosDetActualizados = saldosActualizados.saldosDetActualizados;
      resultados.saldosGenActualizados = saldosActualizados.saldosGenActualizados;

      return resultados;
    });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    if (error.code && error.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar Kardex', error.message);
    }
    throw error;
  }
};

/**
 * Procesa Kardex de ORIGEN (EGRESO)
 */
async function procesarKardexOrigen(tx, movimiento, detalle, conceptoMovAlmacen) {
  const filtro = {
    empresaId: movimiento.empresaId,
    movimientoAlmacenId: movimiento.id,
    detalleMovimientoAlmacenId: detalle.id,
    almacenId: conceptoMovAlmacen.almacenOrigenId,
    fechaMovimientoAlmacen: movimiento.fechaDocumento,
    esCustodia: movimiento.esCustodia
  };

  const kardexExistentes = await tx.kardexAlmacen.findMany({ where: filtro });

  if (kardexExistentes.length > 1) {
    return {
      error: {
        detalleId: detalle.id,
        tipo: 'DUPLICIDAD_ORIGEN',
        mensaje: `Se encontraron ${kardexExistentes.length} registros de Kardex origen duplicados`
      }
    };
  }

  const dataKardex = {
    empresaId: movimiento.empresaId,
    almacenId: conceptoMovAlmacen.almacenOrigenId,
    productoId: detalle.productoId,
    clienteId: movimiento.entidadComercialId,
    esCustodia: movimiento.esCustodia,
    fechaMovimientoAlmacen: movimiento.fechaDocumento,
    numDocCompleto: movimiento.numeroDocumento,
    esIngresoEgreso: false, // EGRESO
    conceptoMovAlmacenId: movimiento.conceptoMovAlmacenId,
    movimientoAlmacenId: movimiento.id,
    detalleMovimientoAlmacenId: detalle.id,

    // INGRESOS (todos en 0 para egreso)
    ingresoCant: 0,
    ingresoCantCostoUnit: 0,
    ingresoCantCostoTotal: 0,
    ingresoCantVariables: 0,
    ingresoPeso: 0,
    ingresoPesoCostoUnit: 0,
    ingresoPesoCostoTotal: 0,
    ingresoPesoVariables: 0,

    // EGRESOS
    egresoCant: detalle.cantidad,
    egresoCantCostoUnit: 0, // Se calcula después
    egresoCantCostoTotal: 0, // Se calcula después
    egresoCantVariables: 0, // Se calcula después
    egresoPeso: detalle.peso,
    egresoPesoCostoUnit: 0, // Se calcula después
    egresoPesoCostoTotal: 0, // Se calcula después
    egresoPesoVariables: 0, // Se calcula después

    // SALDOS INICIALES (se calculan después)
    saldoIniCant: 0,
    saldoInicialCostoUnitCant: 0,
    saldoInicialCostoTotalCant: 0,
    saldoInicialCantVariables: 0,
    saldoInicialPeso: 0,
    saldoInicialPesoCostoUnit: 0,
    saldoInicialPesoCostoTotal: 0,
    saldoInicialPesoVariables: 0,

    // SALDOS FINALES (se calculan después)
    saldoFinalCant: 0,
    saldoFinalCostoUnitCant: 0,
    saldoFinalCostoTotalCant: 0,
    saldoFinalCantVariables: 0,
    saldoFinalPeso: 0,
    saldoFinalPesoCostoUnit: 0,
    saldoFinalPesoCostoTotal: 0,
    saldoFinalPesoVariables: 0,

    // VARIABLES DE CONTROL
    lote: detalle.lote || "",
    fechaVencimiento: detalle.fechaVencimiento,
    fechaProduccion: detalle.fechaProduccion,
    fechaIngreso: detalle.fechaIngreso,
    numContenedor: detalle.nroContenedor || "",
    nroSerie: detalle.nroSerie || "",
    estadoId: detalle.estadoMercaderiaId,
    estadoCalidadId: detalle.estadoCalidadId
  };

  if (kardexExistentes.length === 1) {
    // ACTUALIZAR
    await tx.kardexAlmacen.update({
      where: { id: kardexExistentes[0].id },
      data: dataKardex
    });
    return { actualizado: true };
  } else {
    // CREAR
    await tx.kardexAlmacen.create({ data: dataKardex });
    return { creado: true };
  }
}

/**
 * Procesa Kardex de DESTINO (INGRESO)
 */
async function procesarKardexDestino(tx, movimiento, detalle, conceptoMovAlmacen) {
  const filtro = {
    empresaId: movimiento.empresaId,
    movimientoAlmacenId: movimiento.id,
    detalleMovimientoAlmacenId: detalle.id,
    almacenId: conceptoMovAlmacen.almacenDestinoId,
    fechaMovimientoAlmacen: movimiento.fechaDocumento,
    esCustodia: movimiento.esCustodia
  };

  const kardexExistentes = await tx.kardexAlmacen.findMany({ where: filtro });

  if (kardexExistentes.length > 1) {
    return {
      error: {
        detalleId: detalle.id,
        tipo: 'DUPLICIDAD_DESTINO',
        mensaje: `Se encontraron ${kardexExistentes.length} registros de Kardex destino duplicados`
      }
    };
  }

  const dataKardex = {
    empresaId: movimiento.empresaId,
    almacenId: conceptoMovAlmacen.almacenDestinoId,
    productoId: detalle.productoId,
    clienteId: movimiento.entidadComercialId,
    esCustodia: movimiento.esCustodia,
    fechaMovimientoAlmacen: movimiento.fechaDocumento,
    numDocCompleto: movimiento.numeroDocumento,
    esIngresoEgreso: true, // INGRESO
    conceptoMovAlmacenId: movimiento.conceptoMovAlmacenId,
    movimientoAlmacenId: movimiento.id,
    detalleMovimientoAlmacenId: detalle.id,

    // INGRESOS
    ingresoCant: detalle.cantidad,
    ingresoCantCostoUnit: detalle.costoUnitario || 0,
    ingresoCantCostoTotal: 0, // Se calcula después
    ingresoCantVariables: 0, // Se calcula después
    ingresoPeso: detalle.peso,
    ingresoPesoCostoUnit: 0, // Se calcula después
    ingresoPesoCostoTotal: 0, // Se calcula después
    ingresoPesoVariables: 0, // Se calcula después

    // EGRESOS (todos en 0 para ingreso)
    egresoCant: 0,
    egresoCantCostoUnit: 0,
    egresoCantCostoTotal: 0,
    egresoCantVariables: 0,
    egresoPeso: 0,
    egresoPesoCostoUnit: 0,
    egresoPesoCostoTotal: 0,
    egresoPesoVariables: 0,

    // SALDOS INICIALES (se calculan después)
    saldoIniCant: 0,
    saldoInicialCostoUnitCant: 0,
    saldoInicialCostoTotalCant: 0,
    saldoInicialCantVariables: 0,
    saldoInicialPeso: 0,
    saldoInicialPesoCostoUnit: 0,
    saldoInicialPesoCostoTotal: 0,
    saldoInicialPesoVariables: 0,

    // SALDOS FINALES (se calculan después)
    saldoFinalCant: 0,
    saldoFinalCostoUnitCant: 0,
    saldoFinalCostoTotalCant: 0,
    saldoFinalCantVariables: 0,
    saldoFinalPeso: 0,
    saldoFinalPesoCostoUnit: 0,
    saldoFinalPesoCostoTotal: 0,
    saldoFinalPesoVariables: 0,

    // VARIABLES DE CONTROL
    lote: detalle.lote || "",
    fechaVencimiento: detalle.fechaVencimiento,
    fechaProduccion: detalle.fechaProduccion,
    fechaIngreso: detalle.fechaIngreso,
    numContenedor: detalle.nroContenedor || "",
    nroSerie: detalle.nroSerie || "",
    estadoId: detalle.estadoMercaderiaId,
    estadoCalidadId: detalle.estadoCalidadId
  };

  if (kardexExistentes.length === 1) {
    // ACTUALIZAR
    await tx.kardexAlmacen.update({
      where: { id: kardexExistentes[0].id },
      data: dataKardex
    });
    return { actualizado: true };
  } else {
    // CREAR
    await tx.kardexAlmacen.create({ data: dataKardex });
    return { creado: true };
  }
}

/**
 * Calcula saldos de Kardex usando método de costo promedio ponderado
 * Procesa por empresa, almacén, producto y custodia
 */
async function calcularSaldosKardex(tx, movimiento) {
  // Obtener combinaciones únicas de empresa-almacén-producto-custodia del movimiento
  const combinaciones = await tx.kardexAlmacen.findMany({
    where: { movimientoAlmacenId: movimiento.id },
    select: {
      empresaId: true,
      almacenId: true,
      productoId: true,
      esCustodia: true
    },
    distinct: ['empresaId', 'almacenId', 'productoId', 'esCustodia']
  });

  for (const combo of combinaciones) {
    await calcularSaldosProducto(tx, combo);
  }
}

/**
 * Calcula saldos para un producto específico en un almacén
 * Método: Costo Promedio Ponderado
 */
async function calcularSaldosProducto(tx, { empresaId, almacenId, productoId, esCustodia }) {
  // Obtener TODOS los registros de Kardex ordenados cronológicamente
  // Orden: fecha ASC, INGRESOS primero (esIngresoEgreso DESC), id ASC
  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where: {
      empresaId,
      almacenId,
      productoId,
      esCustodia
    },
    orderBy: [
      { fechaMovimientoAlmacen: 'asc' },
      { esIngresoEgreso: 'desc' }, // true (INGRESO) antes que false (EGRESO)
      { id: 'asc' }
    ]
  });

  let saldoCantidad = 0;
  let saldoPeso = 0;
  let costoTotalAcumulado = 0;
  let costoUnitarioPromedio = 0;

  for (const registro of kardexRegistros) {
    // SALDO INICIAL = saldo antes de este movimiento
    const saldoIniCant = saldoCantidad;
    const saldoIniPeso = saldoPeso;
    const saldoIniCostoUnit = costoUnitarioPromedio;
    const saldoIniCostoTotal = costoTotalAcumulado;

    if (registro.esIngresoEgreso) {
      // ===== INGRESO =====
      const ingresoCant = Number(registro.ingresoCant || 0);
      const ingresoCostoUnit = Number(registro.ingresoCantCostoUnit || 0);
      const ingresoCostoTotal = ingresoCant * ingresoCostoUnit;

      // Actualizar saldo y costo promedio ponderado
      const nuevoSaldoCant = saldoCantidad + ingresoCant;
      const nuevoCostoTotal = costoTotalAcumulado + ingresoCostoTotal;
      const nuevoCostoUnitPromedio = nuevoSaldoCant > 0 ? nuevoCostoTotal / nuevoSaldoCant : 0;

      saldoCantidad = nuevoSaldoCant;
      saldoPeso = saldoPeso + Number(registro.ingresoPeso || 0);
      costoTotalAcumulado = nuevoCostoTotal;
      costoUnitarioPromedio = nuevoCostoUnitPromedio;

      // Actualizar registro
      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          ingresoCantCostoTotal: ingresoCostoTotal,
          ingresoPesoCostoUnit: ingresoCostoUnit, // Mismo costo por unidad
          ingresoPesoCostoTotal: Number(registro.ingresoPeso || 0) * ingresoCostoUnit,
          
          saldoIniCant: saldoIniCant,
          saldoInicialCostoUnitCant: saldoIniCostoUnit,
          saldoInicialCostoTotalCant: saldoIniCostoTotal,
          saldoInicialPeso: saldoIniPeso,
          saldoInicialPesoCostoUnit: saldoIniCostoUnit,
          saldoInicialPesoCostoTotal: saldoIniPeso * saldoIniCostoUnit,
          
          saldoFinalCant: saldoCantidad,
          saldoFinalCostoUnitCant: costoUnitarioPromedio,
          saldoFinalCostoTotalCant: costoTotalAcumulado,
          saldoFinalPeso: saldoPeso,
          saldoFinalPesoCostoUnit: costoUnitarioPromedio,
          saldoFinalPesoCostoTotal: saldoPeso * costoUnitarioPromedio
        }
      });
    } else {
      // ===== EGRESO =====
      const egresoCant = Number(registro.egresoCant || 0);
      const egresoCostoUnit = costoUnitarioPromedio; // Usa costo promedio actual
      const egresoCostoTotal = egresoCant * egresoCostoUnit;

      // Actualizar saldo
      const nuevoSaldoCant = saldoCantidad - egresoCant;
      const nuevoCostoTotal = costoTotalAcumulado - egresoCostoTotal;

      saldoCantidad = nuevoSaldoCant;
      saldoPeso = saldoPeso - Number(registro.egresoPeso || 0);
      costoTotalAcumulado = nuevoCostoTotal;
      // costoUnitarioPromedio NO cambia en egresos

      // Actualizar registro
      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          egresoCantCostoUnit: egresoCostoUnit,
          egresoCantCostoTotal: egresoCostoTotal,
          egresoPesoCostoUnit: egresoCostoUnit,
          egresoPesoCostoTotal: Number(registro.egresoPeso || 0) * egresoCostoUnit,
          
          saldoIniCant: saldoIniCant,
          saldoInicialCostoUnitCant: saldoIniCostoUnit,
          saldoInicialCostoTotalCant: saldoIniCostoTotal,
          saldoInicialPeso: saldoIniPeso,
          saldoInicialPesoCostoUnit: saldoIniCostoUnit,
          saldoInicialPesoCostoTotal: saldoIniPeso * saldoIniCostoUnit,
          
          saldoFinalCant: saldoCantidad,
          saldoFinalCostoUnitCant: costoUnitarioPromedio,
          saldoFinalCostoTotalCant: costoTotalAcumulado,
          saldoFinalPeso: saldoPeso,
          saldoFinalPesoCostoUnit: costoUnitarioPromedio,
          saldoFinalPesoCostoTotal: saldoPeso * costoUnitarioPromedio
        }
      });
    }
  }
}

/**
 * Actualiza SaldosDetProductoCliente y SaldosProductoCliente
 * basándose en los registros de Kardex
 */
async function actualizarSaldos(tx, movimiento) {
  let saldosDetActualizados = 0;
  let saldosGenActualizados = 0;

  // Obtener combinaciones únicas
  const combinaciones = await tx.kardexAlmacen.findMany({
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
      nroSerie: true
    }
  });

  for (const combo of combinaciones) {
    // 1. Actualizar SaldosDetProductoCliente (con variables de control)
    const saldoDet = await calcularSaldoDetallado(tx, combo);
    
    const whereDet = {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      clienteId: combo.clienteId,
      esCustodia: combo.esCustodia,
      lote: combo.lote || "",
      fechaIngreso: combo.fechaIngreso,
      fechaProduccion: combo.fechaProduccion,
      fechaVencimiento: combo.fechaVencimiento,
      estadoId: combo.estadoId,
      estadoCalidadId: combo.estadoCalidadId,
      numContenedor: combo.numContenedor || "",
      nroSerie: combo.nroSerie || ""
    };

    await tx.saldosDetProductoCliente.upsert({
      where: { uk_saldo_det_completo: whereDet },
      update: {
        saldoCantidad: saldoDet.saldoCantidad,
        saldoPeso: saldoDet.saldoPeso,
        actualizadoEn: new Date()
      },
      create: {
        ...whereDet,
        saldoCantidad: saldoDet.saldoCantidad,
        saldoPeso: saldoDet.saldoPeso,
        actualizadoEn: new Date()
      }
    });
    saldosDetActualizados++;

    // 2. Actualizar SaldosProductoCliente (sin variables de control)
    const saldoGen = await calcularSaldoGeneral(tx, {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      clienteId: combo.clienteId,
      esCustodia: combo.esCustodia
    });

    const whereGen = {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      clienteId: combo.clienteId,
      custodia: combo.esCustodia
    };

    await tx.saldosProductoCliente.upsert({
      where: { uk_saldo_general_completo: whereGen },
      update: {
        saldoCantidad: saldoGen.saldoCantidad,
        saldoPeso: saldoGen.saldoPeso,
        costoUnitarioPromedio: saldoGen.costoUnitarioPromedio,
        actualizadoEn: new Date()
      },
      create: {
        ...whereGen,
        saldoCantidad: saldoGen.saldoCantidad,
        saldoPeso: saldoGen.saldoPeso,
        costoUnitarioPromedio: saldoGen.costoUnitarioPromedio,
        actualizadoEn: new Date()
      }
    });
    saldosGenActualizados++;
  }

  return { saldosDetActualizados, saldosGenActualizados };
}

/**
 * Calcula saldo detallado (con variables de control)
 */
async function calcularSaldoDetallado(tx, combo) {
  // Obtener último registro de Kardex con estas variables de control
  const ultimoKardex = await tx.kardexAlmacen.findFirst({
    where: {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      esCustodia: combo.esCustodia,
      lote: combo.lote,
      fechaIngreso: combo.fechaIngreso,
      fechaProduccion: combo.fechaProduccion,
      fechaVencimiento: combo.fechaVencimiento,
      estadoId: combo.estadoId,
      estadoCalidadId: combo.estadoCalidadId,
      numContenedor: combo.numContenedor,
      nroSerie: combo.nroSerie
    },
    orderBy: [
      { fechaMovimientoAlmacen: 'desc' },
      { esIngresoEgreso: 'desc' },
      { id: 'desc' }
    ]
  });

  return {
    saldoCantidad: ultimoKardex ? Number(ultimoKardex.saldoFinalCant) : 0,
    saldoPeso: ultimoKardex ? Number(ultimoKardex.saldoFinalPeso || 0) : 0
  };
}

/**
 * Calcula saldo general (sin variables de control)
 */
async function calcularSaldoGeneral(tx, { empresaId, almacenId, productoId, clienteId, esCustodia }) {
  // Obtener último registro de Kardex general
  const ultimoKardex = await tx.kardexAlmacen.findFirst({
    where: {
      empresaId,
      almacenId,
      productoId,
      esCustodia
    },
    orderBy: [
      { fechaMovimientoAlmacen: 'desc' },
      { esIngresoEgreso: 'desc' },
      { id: 'desc' }
    ]
  });

  return {
    saldoCantidad: ultimoKardex ? Number(ultimoKardex.saldoFinalCant) : 0,
    saldoPeso: ultimoKardex ? Number(ultimoKardex.saldoFinalPeso || 0) : 0,
    costoUnitarioPromedio: ultimoKardex ? Number(ultimoKardex.saldoFinalCostoUnitCant || 0) : 0
  };
}

/**
 * Calcula saldos de Kardex CON VARIABLES (agrupado por variables de trazabilidad)
 * Procesa por empresa, almacén, producto, custodia Y todas las variables de control
 */
async function calcularSaldosKardexConVariables(tx, movimiento) {
  // Obtener combinaciones únicas incluyendo TODAS las variables de trazabilidad
  const combinaciones = await tx.kardexAlmacen.findMany({
    where: { movimientoAlmacenId: movimiento.id },
    select: {
      empresaId: true,
      almacenId: true,
      productoId: true,
      esCustodia: true,
      lote: true,
      fechaVencimiento: true,
      fechaProduccion: true,
      fechaIngreso: true,
      numContenedor: true,
      nroSerie: true,
      estadoId: true,
      estadoCalidadId: true
    },
    distinct: [
      'empresaId',
      'almacenId',
      'productoId',
      'esCustodia',
      'lote',
      'fechaVencimiento',
      'fechaProduccion',
      'fechaIngreso',
      'numContenedor',
      'nroSerie',
      'estadoId',
      'estadoCalidadId'
    ]
  });

  for (const combo of combinaciones) {
    await calcularSaldosProductoConVariables(tx, combo);
  }
}

/**
 * Calcula saldos CON VARIABLES para un producto específico
 * Agrupa por todas las variables de trazabilidad
 */
async function calcularSaldosProductoConVariables(tx, combo) {
  // Construir filtro con TODAS las variables
  const where = {
    empresaId: combo.empresaId,
    almacenId: combo.almacenId,
    productoId: combo.productoId,
    esCustodia: combo.esCustodia,
    lote: combo.lote || null,
    fechaVencimiento: combo.fechaVencimiento || null,
    fechaProduccion: combo.fechaProduccion || null,
    fechaIngreso: combo.fechaIngreso || null,
    numContenedor: combo.numContenedor || null,
    nroSerie: combo.nroSerie || null,
    estadoId: combo.estadoId || null,
    estadoCalidadId: combo.estadoCalidadId || null
  };

  // Obtener TODOS los registros de Kardex con estas variables ordenados cronológicamente
  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where,
    orderBy: [
      { fechaMovimientoAlmacen: 'asc' },
      { esIngresoEgreso: 'desc' }, // true (INGRESO) antes que false (EGRESO)
      { id: 'asc' }
    ]
  });

  let saldoCantidadVar = 0;
  let saldoPesoVar = 0;

  for (const registro of kardexRegistros) {
    // SALDO INICIAL CON VARIABLES = saldo antes de este movimiento
    const saldoIniCantVar = saldoCantidadVar;
    const saldoIniPesoVar = saldoPesoVar;

    if (registro.esIngresoEgreso) {
      // ===== INGRESO CON VARIABLES =====
      const ingresoCantVar = Number(registro.ingresoCant || 0);
      const ingresoPesoVar = Number(registro.ingresoPeso || 0);

      // Actualizar saldo con variables
      saldoCantidadVar = saldoCantidadVar + ingresoCantVar;
      saldoPesoVar = saldoPesoVar + ingresoPesoVar;

      // Actualizar registro
      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          ingresoCantVariables: ingresoCantVar,
          ingresoPesoVariables: ingresoPesoVar,
          
          saldoInicialCantVariables: saldoIniCantVar,
          saldoInicialPesoVariables: saldoIniPesoVar,
          
          saldoFinalCantVariables: saldoCantidadVar,
          saldoFinalPesoVariables: saldoPesoVar
        }
      });
    } else {
      // ===== EGRESO CON VARIABLES =====
      const egresoCantVar = Number(registro.egresoCant || 0);
      const egresoPesoVar = Number(registro.egresoPeso || 0);

      // Actualizar saldo con variables
      saldoCantidadVar = saldoCantidadVar - egresoCantVar;
      saldoPesoVar = saldoPesoVar - egresoPesoVar;

      // Actualizar registro
      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          egresoCantVariables: egresoCantVar,
          egresoPesoVariables: egresoPesoVar,
          
          saldoInicialCantVariables: saldoIniCantVar,
          saldoInicialPesoVariables: saldoIniPesoVar,
          
          saldoFinalCantVariables: saldoCantidadVar,
          saldoFinalPesoVariables: saldoPesoVar
        }
      });
    }
  }
}

// ========================================
// EXPORTS INDIVIDUALES PARA USO MODULAR
// ========================================

/**
 * Exportar funciones individuales para uso desde otros módulos
 */
export {
  generarKardexMovimiento,
  calcularSaldosKardexConVariables,
  calcularSaldoDetallado,
  calcularSaldoGeneral
};

// Export default para compatibilidad
export default {
  generarKardexMovimiento,
  calcularSaldosKardexConVariables,
  calcularSaldoDetallado,
  calcularSaldoGeneral
};