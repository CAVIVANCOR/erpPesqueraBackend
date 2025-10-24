// src/services/Almacen/generarKardex.service.js
import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";

const generarKardexMovimiento = async (movimientoAlmacenId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoAlmacen.findUnique({
        where: { id: movimientoAlmacenId },
        include: {
          conceptoMovAlmacen: true,
          empresa: true,
          detalles: {
            include: { producto: { include: { unidadMedida: true } } },
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
        kardexActualizados: 0,
        saldosDetActualizados: 0,
        saldosGenActualizados: 0,
        errores: [],
      };

      for (const detalle of movimiento.detalles) {
        try {
          if (conceptoMovAlmacen.llevaKardexOrigen) {
            const res = await procesarKardexOrigen(
              tx,
              movimiento,
              detalle,
              conceptoMovAlmacen
            );
            if (res.creado) resultados.kardexCreados++;
            if (res.actualizado) resultados.kardexActualizados++;
            if (res.error) resultados.errores.push(res.error);
          }
          if (conceptoMovAlmacen.llevaKardexDestino) {
            const res = await procesarKardexDestino(
              tx,
              movimiento,
              detalle,
              conceptoMovAlmacen
            );
            if (res.creado) resultados.kardexCreados++;
            if (res.actualizado) resultados.kardexActualizados++;
            if (res.error) resultados.errores.push(res.error);
          }
        } catch (error) {
          resultados.errores.push({
            detalleId: detalle.id,
            productoId: detalle.productoId,
            error: error.message,
          });
        }
      }

      await calcularSaldosKardex(tx, movimiento);
      await calcularSaldosKardexConVariables(tx, movimiento);
      const saldosActualizados = await actualizarSaldos(tx, movimiento);
      resultados.saldosDetActualizados =
        saldosActualizados.saldosDetActualizados;
      resultados.saldosGenActualizados =
        saldosActualizados.saldosGenActualizados;
      return resultados;
    });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    if (error.code?.startsWith("P"))
      throw new DatabaseError(
        "Error de base de datos al generar Kardex",
        error.message
      );
    throw error;
  }
};

async function procesarKardexOrigen(
  tx,
  movimiento,
  detalle,
  conceptoMovAlmacen
) {
  const filtro = {
    empresaId: movimiento.empresaId,
    movimientoAlmacenId: movimiento.id,
    detalleMovimientoAlmacenId: detalle.id,
    almacenId: conceptoMovAlmacen.almacenOrigenId,
    fechaMovimientoAlmacen: movimiento.fechaDocumento,
    esCustodia: movimiento.esCustodia,
  };
  const kardexExistentes = await tx.kardexAlmacen.findMany({ where: filtro });
  if (kardexExistentes.length > 1)
    return {
      error: {
        detalleId: detalle.id,
        tipo: "DUPLICIDAD_ORIGEN",
        mensaje: `${kardexExistentes.length} registros duplicados`,
      },
    };

  const dataKardex = {
    ...filtro,
    productoId: detalle.productoId,
    clienteId: movimiento.entidadComercialId,
    numDocCompleto: movimiento.numeroDocumento,
    esIngresoEgreso: false,
    conceptoMovAlmacenId: movimiento.conceptoMovAlmacenId,
    ingresoCant: 0,
    ingresoCantCostoUnit: 0,
    ingresoCantCostoTotal: 0,
    ingresoCantVariables: 0,
    ingresoPeso: 0,
    ingresoPesoCostoUnit: 0,
    ingresoPesoCostoTotal: 0,
    ingresoPesoVariables: 0,
    egresoCant: detalle.cantidad,
    egresoCantCostoUnit: 0,
    egresoCantCostoTotal: 0,
    egresoCantVariables: 0,
    egresoPeso: detalle.peso,
    egresoPesoCostoUnit: 0,
    egresoPesoCostoTotal: 0,
    egresoPesoVariables: 0,
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
    lote: detalle.lote || "",
    fechaVencimiento: detalle.fechaVencimiento,
    fechaProduccion: detalle.fechaProduccion,
    fechaIngreso: detalle.fechaIngreso,
    numContenedor: detalle.nroContenedor || "",
    nroSerie: detalle.nroSerie || "",
    estadoId: detalle.estadoMercaderiaId,
    estadoCalidadId: detalle.estadoCalidadId,
  };
  if (kardexExistentes.length === 1) {
    await tx.kardexAlmacen.update({
      where: { id: kardexExistentes[0].id },
      data: dataKardex,
    });
    return { actualizado: true };
  }
  await tx.kardexAlmacen.create({ data: dataKardex });
  return { creado: true };
}

async function procesarKardexDestino(
  tx,
  movimiento,
  detalle,
  conceptoMovAlmacen
) {
  const filtro = {
    empresaId: movimiento.empresaId,
    movimientoAlmacenId: movimiento.id,
    detalleMovimientoAlmacenId: detalle.id,
    almacenId: conceptoMovAlmacen.almacenDestinoId,
    fechaMovimientoAlmacen: movimiento.fechaDocumento,
    esCustodia: movimiento.esCustodia,
  };
  const kardexExistentes = await tx.kardexAlmacen.findMany({ where: filtro });
  if (kardexExistentes.length > 1)
    return {
      error: {
        detalleId: detalle.id,
        tipo: "DUPLICIDAD_DESTINO",
        mensaje: `${kardexExistentes.length} registros duplicados`,
      },
    };

  const dataKardex = {
    ...filtro,
    productoId: detalle.productoId,
    clienteId: movimiento.entidadComercialId,
    numDocCompleto: movimiento.numeroDocumento,
    esIngresoEgreso: true,
    conceptoMovAlmacenId: movimiento.conceptoMovAlmacenId,
    ingresoCant: detalle.cantidad,
    ingresoCantCostoUnit: detalle.costoUnitario || 0,
    ingresoCantCostoTotal: 0,
    ingresoCantVariables: 0,
    ingresoPeso: detalle.peso,
    ingresoPesoCostoUnit: 0,
    ingresoPesoCostoTotal: 0,
    ingresoPesoVariables: 0,
    egresoCant: 0,
    egresoCantCostoUnit: 0,
    egresoCantCostoTotal: 0,
    egresoCantVariables: 0,
    egresoPeso: 0,
    egresoPesoCostoUnit: 0,
    egresoPesoCostoTotal: 0,
    egresoPesoVariables: 0,
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
    lote: detalle.lote || "",
    fechaVencimiento: detalle.fechaVencimiento,
    fechaProduccion: detalle.fechaProduccion,
    fechaIngreso: detalle.fechaIngreso,
    numContenedor: detalle.nroContenedor || "",
    nroSerie: detalle.nroSerie || "",
    estadoId: detalle.estadoMercaderiaId,
    estadoCalidadId: detalle.estadoCalidadId,
  };
  if (kardexExistentes.length === 1) {
    await tx.kardexAlmacen.update({
      where: { id: kardexExistentes[0].id },
      data: dataKardex,
    });
    return { actualizado: true };
  }
  await tx.kardexAlmacen.create({ data: dataKardex });
  return { creado: true };
}
async function calcularSaldosKardex(tx, movimiento) {
  const combinaciones = await tx.kardexAlmacen.findMany({
    where: { movimientoAlmacenId: movimiento.id },
    select: {
      empresaId: true,
      almacenId: true,
      productoId: true,
      esCustodia: true,
    },
    distinct: ["empresaId", "almacenId", "productoId", "esCustodia"],
  });
  for (const combo of combinaciones) await calcularSaldosProducto(tx, combo);
}

async function calcularSaldosProducto(
  tx,
  { empresaId, almacenId, productoId, esCustodia }
) {
  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where: { empresaId, almacenId, productoId, esCustodia },
    orderBy: [
      { fechaMovimientoAlmacen: "asc" },
      { esIngresoEgreso: "desc" },
      { id: "asc" },
    ],
  });

  let saldoCantidad = 0,
    saldoPeso = 0,
    costoTotalAcumulado = 0,
    costoUnitarioPromedio = 0;

  for (const registro of kardexRegistros) {
    const saldoIniCant = saldoCantidad,
      saldoIniPeso = saldoPeso,
      saldoIniCostoUnit = costoUnitarioPromedio,
      saldoIniCostoTotal = costoTotalAcumulado;

    if (registro.esIngresoEgreso) {
      const ingresoCant = Number(registro.ingresoCant || 0);
      const ingresoCostoUnit = Number(registro.ingresoCantCostoUnit || 0);
      const ingresoCostoTotal = ingresoCant * ingresoCostoUnit;
      saldoCantidad += ingresoCant;
      saldoPeso += Number(registro.ingresoPeso || 0);
      costoTotalAcumulado += ingresoCostoTotal;
      costoUnitarioPromedio =
        saldoCantidad > 0 ? costoTotalAcumulado / saldoCantidad : 0;

      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          ingresoCantCostoTotal: ingresoCostoTotal,
          ingresoPesoCostoUnit: ingresoCostoUnit,
          ingresoPesoCostoTotal:
            Number(registro.ingresoPeso || 0) * ingresoCostoUnit,
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
          saldoFinalPesoCostoTotal: saldoPeso * costoUnitarioPromedio,
        },
      });
    } else {
      const egresoCant = Number(registro.egresoCant || 0);
      const egresoCostoUnit = costoUnitarioPromedio;
      const egresoCostoTotal = egresoCant * egresoCostoUnit;
      saldoCantidad -= egresoCant;
      saldoPeso -= Number(registro.egresoPeso || 0);
      costoTotalAcumulado -= egresoCostoTotal;

      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          egresoCantCostoUnit: egresoCostoUnit,
          egresoCantCostoTotal: egresoCostoTotal,
          egresoPesoCostoUnit: egresoCostoUnit,
          egresoPesoCostoTotal:
            Number(registro.egresoPeso || 0) * egresoCostoUnit,
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
          saldoFinalPesoCostoTotal: saldoPeso * costoUnitarioPromedio,
        },
      });
    }
  }
}

async function actualizarSaldos(tx, movimiento) {
  let saldosDetActualizados = 0,
    saldosGenActualizados = 0;
  const empresa = await tx.empresa.findUnique({
    where: { id: movimiento.empresaId },
    select: { entidadComercialId: true },
  });
  if (!empresa) throw new ValidationError("Empresa no encontrada");

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
      nroSerie: true,
    },
  });

  console.log('\n🔍 COMBINACIONES encontradas para movimiento', movimiento.id, ':');
  combinaciones.forEach((c, i) => {
    console.log(`  [${i}] Producto: ${c.productoId}, Lote: "${c.lote}", AlmacenId: ${c.almacenId}`);
  });

  for (const combo of combinaciones) {
    const clienteIdCorrecto = combo.esCustodia
      ? combo.clienteId
      : empresa.entidadComercialId;

    // NORMALIZACIÓN PROFESIONAL: Strings siempre "", fechas/IDs null si vacío
    // Modelos actualizados con @default("") para strings y DateTime? para fechas
    const loteNormalizado = combo.lote || "";
    const numContenedorNormalizado = combo.numContenedor || "";
    const nroSerieNormalizado = combo.nroSerie || "";
    const fechaIngresoNormalizada = combo.fechaIngreso || null;
    const fechaProduccionNormalizada = combo.fechaProduccion || null;
    const fechaVencimientoNormalizada = combo.fechaVencimiento || null;
    const estadoIdNormalizado = combo.estadoId || null;
    const estadoCalidadIdNormalizado = combo.estadoCalidadId || null;

    const saldoDet = await recalcularSaldoDetalladoCompleto(tx, {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      clienteId: clienteIdCorrecto,
      esCustodia: combo.esCustodia,
      lote: loteNormalizado,
      fechaIngreso: fechaIngresoNormalizada,
      fechaProduccion: fechaProduccionNormalizada,
      fechaVencimiento: fechaVencimientoNormalizada,
      estadoId: estadoIdNormalizado,
      estadoCalidadId: estadoCalidadIdNormalizado,
      numContenedor: numContenedorNormalizado,
      nroSerie: nroSerieNormalizado,
    });

    const whereDet = {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      clienteId: clienteIdCorrecto,
      esCustodia: combo.esCustodia,
      lote: loteNormalizado,
      fechaIngreso: fechaIngresoNormalizada,
      fechaProduccion: fechaProduccionNormalizada,
      fechaVencimiento: fechaVencimientoNormalizada,
      estadoId: estadoIdNormalizado,
      estadoCalidadId: estadoCalidadIdNormalizado,
      numContenedor: numContenedorNormalizado,
      nroSerie: nroSerieNormalizado,
    };

    await upsertConReintentos(tx, "saldosDetProductoCliente", whereDet, {
      saldoCantidad: saldoDet.saldoCantidad,
      saldoPeso: saldoDet.saldoPeso,
      actualizadoEn: new Date(),
    });
    saldosDetActualizados++;

    const saldoGen = await recalcularSaldoGeneralCompleto(tx, {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      clienteId: clienteIdCorrecto,
      esCustodia: combo.esCustodia,
    });
    const whereGen = {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      clienteId: clienteIdCorrecto,
      custodia: combo.esCustodia,
    };

    await upsertConReintentos(tx, "saldosProductoCliente", whereGen, {
      saldoCantidad: saldoGen.saldoCantidad,
      saldoPeso: saldoGen.saldoPeso,
      costoUnitarioPromedio: saldoGen.costoUnitarioPromedio,
      actualizadoEn: new Date(),
    });
    saldosGenActualizados++;
  }

  return { saldosDetActualizados, saldosGenActualizados };
}

async function upsertConReintentos(tx, tabla, where, data, maxIntentos = 3) {
  for (let intento = 0; intento < maxIntentos; intento++) {
    try {
      if (tabla === "saldosDetProductoCliente") {
        // SOLUCIÓN PROFESIONAL: findFirst + update/create
        // Razón: PostgreSQL no maneja bien nulls en constraints únicos compuestos
        const existente = await tx[tabla].findFirst({ where });
        
        if (existente) {
          // Actualizar registro existente
          await tx[tabla].update({
            where: { id: existente.id },
            data,
          });
        } else {
          // Crear nuevo registro
          await tx[tabla].create({
            data: { ...where, ...data },
          });
        }
      } else {
        // Para SaldosProductoCliente: usar upsert (tiene constraint único válido sin nulls)
        const uniqueKey = "uk_saldo_general_completo";
        await tx[tabla].upsert({
          where: { [uniqueKey]: where },
          update: data,
          create: { ...where, ...data },
        });
      }
      return;
    } catch (error) {
      // Logging detallado del error
      console.error(`\n❌ ERROR en upsert (intento ${intento + 1}/${maxIntentos}):`);
      console.error('Tabla:', tabla);
      console.error('WHERE:', JSON.stringify(where, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      console.error('DATA:', JSON.stringify(data, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      
      if (intento === maxIntentos - 1)
        throw new DatabaseError(
          `Error al actualizar ${tabla} después de ${maxIntentos} intentos: ${error.message}`,
          error.message
        );
      await new Promise((resolve) =>
        setTimeout(resolve, 50 * Math.pow(2, intento))
      );
    }
  }
}

async function recalcularSaldoDetalladoCompleto(tx, filtro) {
  // WHERE clause simplificado: strings siempre "", fechas/IDs pueden ser null
  // Modelos normalizados con @default("") garantizan consistencia
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

  console.log('🔍 recalcularSaldoDetalladoCompleto - Producto:', filtro.productoId, 'Lote:', filtro.lote);
  console.log('   WHERE:', JSON.stringify(whereClause, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value, 2));
  console.log('📊 Registros encontrados:', kardexRegistros.length);
  if (kardexRegistros.length > 0) {
    console.log('📝 Primer registro:', {
      id: kardexRegistros[0].id,
      ingresoCant: kardexRegistros[0].ingresoCant,
      ingresoCantVariables: kardexRegistros[0].ingresoCantVariables,
      saldoFinalCantVariables: kardexRegistros[0].saldoFinalCantVariables
    });
  }

  let saldoCantidad = 0,
    saldoPeso = 0;
  for (const kardex of kardexRegistros) {
    if (kardex.esIngresoEgreso) {
      // Usar ingresoCantVariables para saldos con trazabilidad
      saldoCantidad += Number(kardex.ingresoCantVariables || kardex.ingresoCant || 0);
      saldoPeso += Number(kardex.ingresoPesoVariables || kardex.ingresoPeso || 0);
    } else {
      // Usar egresoCantVariables para saldos con trazabilidad
      saldoCantidad -= Number(kardex.egresoCantVariables || kardex.egresoCant || 0);
      saldoPeso -= Number(kardex.egresoPesoVariables || kardex.egresoPeso || 0);
    }
  }
  return {
    saldoCantidad: Math.max(0, saldoCantidad),
    saldoPeso: Math.max(0, saldoPeso),
  };
}

async function recalcularSaldoGeneralCompleto(
  tx,
  { empresaId, almacenId, productoId, clienteId, esCustodia }
) {
  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where: { empresaId, almacenId, productoId, esCustodia },
    orderBy: [
      { fechaMovimientoAlmacen: "asc" },
      { esIngresoEgreso: "desc" },
      { id: "asc" },
    ],
  });

  let saldoCantidad = 0,
    saldoPeso = 0,
    costoTotalAcumulado = 0,
    costoUnitarioPromedio = 0;
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
async function calcularSaldoDetallado(tx, combo) {
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
      nroSerie: combo.nroSerie,
    },
    orderBy: [
      { fechaMovimientoAlmacen: "desc" },
      { esIngresoEgreso: "desc" },
      { id: "desc" },
    ],
  });
  return {
    saldoCantidad: ultimoKardex ? Number(ultimoKardex.saldoFinalCant) : 0,
    saldoPeso: ultimoKardex ? Number(ultimoKardex.saldoFinalPeso || 0) : 0,
  };
}

async function calcularSaldoGeneral(
  tx,
  { empresaId, almacenId, productoId, clienteId, esCustodia }
) {
  const ultimoKardex = await tx.kardexAlmacen.findFirst({
    where: { empresaId, almacenId, productoId, esCustodia },
    orderBy: [
      { fechaMovimientoAlmacen: "desc" },
      { esIngresoEgreso: "desc" },
      { id: "desc" },
    ],
  });
  return {
    saldoCantidad: ultimoKardex ? Number(ultimoKardex.saldoFinalCant) : 0,
    saldoPeso: ultimoKardex ? Number(ultimoKardex.saldoFinalPeso || 0) : 0,
    costoUnitarioPromedio: ultimoKardex
      ? Number(ultimoKardex.saldoFinalCostoUnitCant || 0)
      : 0,
  };
}

async function calcularSaldosKardexConVariables(tx, movimiento) {
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
      estadoCalidadId: true,
    },
    distinct: [
      "empresaId",
      "almacenId",
      "productoId",
      "esCustodia",
      "lote",
      "fechaVencimiento",
      "fechaProduccion",
      "fechaIngreso",
      "numContenedor",
      "nroSerie",
      "estadoId",
      "estadoCalidadId",
    ],
  });
  
  console.log('\n📦 calcularSaldosKardexConVariables - Combinaciones:', combinaciones.length);
  combinaciones.forEach((c, i) => {
    console.log(`  [${i}] Prod: ${c.productoId}, Lote: "${c.lote}", FechaIng: ${c.fechaIngreso}, Estado: ${c.estadoId}`);
  });
  
  for (const combo of combinaciones)
    await calcularSaldosProductoConVariables(tx, combo);
}

async function calcularSaldosProductoConVariables(tx, combo) {
  // Normalizar valores: strings a "", fechas/IDs a null
  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where: {
      empresaId: combo.empresaId,
      almacenId: combo.almacenId,
      productoId: combo.productoId,
      esCustodia: combo.esCustodia,
      lote: combo.lote || "",              // String siempre ""
      fechaVencimiento: combo.fechaVencimiento || null,
      fechaProduccion: combo.fechaProduccion || null,
      fechaIngreso: combo.fechaIngreso || null,
      numContenedor: combo.numContenedor || "",  // String siempre ""
      nroSerie: combo.nroSerie || "",            // String siempre ""
      estadoId: combo.estadoId || null,
      estadoCalidadId: combo.estadoCalidadId || null,
    },
    orderBy: [
      { fechaMovimientoAlmacen: "asc" },
      { esIngresoEgreso: "desc" },
      { id: "asc" },
    ],
  });

  console.log(`\n⚙️ calcularSaldosProductoConVariables - Prod: ${combo.productoId}, Lote: "${combo.lote}"`);
  console.log(`   Registros encontrados: ${kardexRegistros.length}`);
  if (kardexRegistros.length > 0) {
    console.log(`   Primer registro ID: ${kardexRegistros[0].id}, ingresoCant: ${kardexRegistros[0].ingresoCant}`);
  }

  let saldoCantidadVar = 0,
    saldoPesoVar = 0;
  for (const registro of kardexRegistros) {
    const saldoIniCantVar = saldoCantidadVar,
      saldoIniPesoVar = saldoPesoVar;
    if (registro.esIngresoEgreso) {
      saldoCantidadVar += Number(registro.ingresoCant || 0);
      saldoPesoVar += Number(registro.ingresoPeso || 0);
      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          ingresoCantVariables: Number(registro.ingresoCant || 0),
          ingresoPesoVariables: Number(registro.ingresoPeso || 0),
          saldoInicialCantVariables: saldoIniCantVar,
          saldoInicialPesoVariables: saldoIniPesoVar,
          saldoFinalCantVariables: saldoCantidadVar,
          saldoFinalPesoVariables: saldoPesoVar,
        },
      });
    } else {
      saldoCantidadVar -= Number(registro.egresoCant || 0);
      saldoPesoVar -= Number(registro.egresoPeso || 0);
      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          egresoCantVariables: Number(registro.egresoCant || 0),
          egresoPesoVariables: Number(registro.egresoPeso || 0),
          saldoInicialCantVariables: saldoIniCantVar,
          saldoInicialPesoVariables: saldoIniPesoVar,
          saldoFinalCantVariables: saldoCantidadVar,
          saldoFinalPesoVariables: saldoPesoVar,
        },
      });
    }
  }
}

export {
  generarKardexMovimiento,
  calcularSaldosKardexConVariables,
  calcularSaldoDetallado,
  calcularSaldoGeneral,
};
export default {
  generarKardexMovimiento,
  calcularSaldosKardexConVariables,
  calcularSaldoDetallado,
  calcularSaldoGeneral,
};
