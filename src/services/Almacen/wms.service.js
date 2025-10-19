import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import { llenaNumerosIzquierda } from '../../utils/numberUtils.js';

/**
 * Servicio WMS (Warehouse Management System)
 * Maneja la generación automática de movimientos de almacén desde diferentes procesos
 * @module services/Almacen/wms.service
 */

/**
 * Genera un movimiento de almacén desde una temporada de pesca finalizada
 * @param {BigInt} temporadaPescaId - ID de la temporada de pesca
 * @param {BigInt} faenaPescaId - ID de la faena de pesca
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Movimiento de almacén creado con sus detalles
 */
const generarMovimientoDesdeTemporadaPesca = async (temporadaPescaId, faenaPescaId, usuarioId) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // 1. Obtener datos de la temporada de pesca
      const temporada = await tx.temporadaPesca.findUnique({
        where: { id: temporadaPescaId },
        include: {
          embarcacion: true,
        },
      });

      if (!temporada) {
        throw new ValidationError('Temporada de pesca no encontrada');
      }

      // 2. Obtener la faena de pesca
      const faena = await tx.faenaPesca.findUnique({
        where: { id: faenaPescaId },
      });

      if (!faena) {
        throw new ValidationError('Faena de pesca no encontrada');
      }

      // 3. Obtener todas las descargas de la faena
      const descargas = await tx.descargaFaenaPesca.findMany({
        where: { faenaPescaId: faenaPescaId },
        include: {
          especie: true,
        },
      });

      if (!descargas || descargas.length === 0) {
        throw new ValidationError('No se encontraron descargas para esta faena');
      }

      // 4. Obtener el responsable de almacén desde ParametroAprobador
      const parametroAprobador = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: temporada.empresaId,
          moduloSistemaId: BigInt(6), // Inventarios
          cesado: false,
        },
      });

      if (!parametroAprobador) {
        throw new ValidationError(
          'No se encontró un responsable de almacén configurado para esta empresa en el módulo de Inventarios'
        );
      }

      // 5. Obtener y actualizar la serie de documento
      const serieDoc = await tx.serieDoc.findFirst({
        where: {
          empresaId: temporada.empresaId,
          tipoDocumentoId: BigInt(13), // NOTA DE INGRESO ALMACEN
          tipoAlmacenId: BigInt(2), // Materia Prima
          serie: '001',
          activo: true,
        },
      });

      if (!serieDoc) {
        throw new ValidationError(
          'No se encontró una serie de documento activa para Nota de Ingreso de Almacén (serie 001)'
        );
      }

      // Incrementar correlativo
      const nuevoCorrelativo = BigInt(serieDoc.correlativo) + BigInt(1);
      await tx.serieDoc.update({
        where: { id: serieDoc.id },
        data: { correlativo: nuevoCorrelativo },
      });

      // Generar números de serie y correlativo
      const numSerieDoc = llenaNumerosIzquierda(
        Number(serieDoc.serie),
        serieDoc.numCerosIzqSerie
      );
      const numCorreDoc = llenaNumerosIzquierda(
        Number(nuevoCorrelativo),
        serieDoc.numCerosIzqCorre
      );
      const numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;

      // 6. Obtener el concepto de movimiento de almacén
      const conceptoMovAlmacen = await tx.conceptoMovAlmacen.findUnique({
        where: { id: BigInt(1) }, // INGRESO POR EXTRACCION
      });

      if (!conceptoMovAlmacen) {
        throw new ValidationError('Concepto de movimiento de almacén no encontrado');
      }

      // 7. Crear el MovimientoAlmacen
      const fechaActual = new Date();
      const movimientoAlmacen = await tx.movimientoAlmacen.create({
        data: {
          empresaId: temporada.empresaId,
          tipoDocumentoId: BigInt(13), // NOTA DE INGRESO ALMACEN
          conceptoMovAlmacenId: BigInt(1), // INGRESO POR EXTRACCION
          serieDocId: serieDoc.id,
          numSerieDoc,
          numCorreDoc,
          numeroDocumento,
          fechaDocumento: fechaActual,
          entidadComercialId: descargas[0].clienteId, // Cliente de la primera descarga
          faenaPescaId: faenaPescaId,
          embarcacionId: temporada.embarcacionId,
          personalRespAlmacen: parametroAprobador.personalRespId,
          estadoDocAlmacenId: BigInt(30), // Pendiente
          creadoEn: fechaActual,
          actualizadoEn: fechaActual,
          creadoPor: usuarioId,
          actualizadoPor: usuarioId,
        },
      });

      // 8. Crear los DetalleMovimientoAlmacen y Kardex para cada descarga
      const detallesCreados = [];
      const kardexCreados = [];

      for (const descarga of descargas) {
        // 8.1 Buscar el producto
        const producto = await tx.producto.findFirst({
          where: {
            empresaId: temporada.empresaId,
            clienteId: descarga.clienteId,
            especieId: descarga.especieId,
            cesado: false,
          },
        });

        if (!producto) {
          throw new ValidationError(
            `No se encontró un producto activo para la empresa ${temporada.empresaId}, ` +
            `cliente ${descarga.clienteId} y especie ${descarga.especieId}`
          );
        }

        // 8.2 Calcular fecha de vencimiento (30 días después de la fecha de inicio de descarga)
        const fechaVencimiento = new Date(descarga.fechaHoraInicioDescarga);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

        // 8.3 Crear DetalleMovimientoAlmacen
        const detalle = await tx.detalleMovimientoAlmacen.create({
          data: {
            movimientoAlmacenId: movimientoAlmacen.id,
            productoId: producto.id,
            cantidad: descarga.toneladas,
            peso: descarga.toneladas,
            lote: temporada.numeroResolucion,
            fechaProduccion: descarga.fechaHoraInicioDescarga,
            fechaVencimiento: fechaVencimiento,
            fechaIngreso: descarga.fechaHoraInicioDescarga,
            estadoMercaderiaId: BigInt(6), // Liberado
            estadoCalidadId: BigInt(10), // Calidad A
            entidadComercialId: movimientoAlmacen.entidadComercialId,
            esCustodia: false,
            empresaId: movimientoAlmacen.empresaId,
            creadoEn: fechaActual,
            actualizadoEn: fechaActual,
            creadoPor: usuarioId,
            actualizadoPor: usuarioId,
          },
        });

        detallesCreados.push(detalle);

        // 8.4 Generar registros de Kardex según el concepto
        // Kardex Origen (Egreso)
        if (conceptoMovAlmacen.llevaKardexOrigen && conceptoMovAlmacen.almacenOrigenId) {
          const kardexOrigen = await tx.kardexAlmacen.create({
            data: {
              empresaId: movimientoAlmacen.empresaId,
              almacenId: conceptoMovAlmacen.almacenOrigenId,
              productoId: detalle.productoId,
              clienteId: detalle.entidadComercialId,
              esCustodia: detalle.esCustodia,
              fechaMovimientoAlmacen: movimientoAlmacen.fechaDocumento,
              numDocCompleto: movimientoAlmacen.numeroDocumento,
              esIngresoEgreso: false, // Egreso
              conceptoMovAlmacenId: movimientoAlmacen.conceptoMovAlmacenId,
              movimientoAlmacenId: movimientoAlmacen.id,
              detalleMovimientoAlmacenId: detalle.id,
              lote: detalle.lote,
              fechaVencimiento: detalle.fechaVencimiento,
              fechaProduccion: detalle.fechaProduccion,
              fechaIngreso: detalle.fechaIngreso,
              numContenedor: detalle.nroContenedor,
              nroSerie: detalle.nroSerie,
              estadoId: detalle.estadoMercaderiaId,
              estadoCalidadId: detalle.estadoCalidadId,
              egresoCant: detalle.cantidad,
              egresoPeso: detalle.peso,
              saldoIniCant: 0, // Se calculará después
              saldoFinalCant: 0, // Se calculará después
            },
          });
          kardexCreados.push(kardexOrigen);
        }

        // Kardex Destino (Ingreso)
        if (conceptoMovAlmacen.llevaKardexDestino && conceptoMovAlmacen.almacenDestinoId) {
          const kardexDestino = await tx.kardexAlmacen.create({
            data: {
              empresaId: movimientoAlmacen.empresaId,
              almacenId: conceptoMovAlmacen.almacenDestinoId,
              productoId: detalle.productoId,
              clienteId: detalle.entidadComercialId,
              esCustodia: detalle.esCustodia,
              fechaMovimientoAlmacen: movimientoAlmacen.fechaDocumento,
              esIngresoEgreso: true, // Ingreso
              conceptoMovAlmacenId: movimientoAlmacen.conceptoMovAlmacenId,
              movimientoAlmacenId: movimientoAlmacen.id,
              detalleMovimientoAlmacenId: detalle.id,
              lote: detalle.lote,
              fechaVencimiento: detalle.fechaVencimiento,
              fechaProduccion: detalle.fechaProduccion,
              fechaIngreso: detalle.fechaIngreso,
              numContenedor: detalle.nroContenedor,
              nroSerie: detalle.nroSerie,
              estadoId: detalle.estadoMercaderiaId,
              estadoCalidadId: detalle.estadoCalidadId,
              ingresoCant: detalle.cantidad,
              ingresoPeso: detalle.peso,
              saldoIniCant: 0, // Se calculará después
              saldoFinalCant: 0, // Se calculará después
            },
          });
          kardexCreados.push(kardexDestino);
        }
      }

      // 9. Recalcular saldos del kardex y actualizar SaldosDetProductoCliente
      await recalcularSaldosKardex(tx, movimientoAlmacen.empresaId, detallesCreados);

      return {
        movimientoAlmacen,
        detalles: detallesCreados,
        kardex: kardexCreados,
      };
    } catch (error) {
      console.error('Error en generarMovimientoDesdeTemporadaPesca:', error);
      throw error;
    }
  });
};

/**
 * Recalcula los saldos del kardex desde la fecha del movimiento para cada producto afectado
 * @param {Object} tx - Transacción de Prisma
 * @param {BigInt} empresaId - ID de la empresa
 * @param {Array} detalles - Detalles del movimiento
 */
const recalcularSaldosKardex = async (tx, empresaId, detalles) => {
  // Agrupar detalles por combinación única de producto, cliente, almacén y custodia
  const combinaciones = new Map();

  for (const detalle of detalles) {
    const key = `${detalle.productoId}-${detalle.entidadComercialId}-${detalle.esCustodia}`;
    if (!combinaciones.has(key)) {
      combinaciones.set(key, {
        productoId: detalle.productoId,
        clienteId: detalle.entidadComercialId,
        esCustodia: detalle.esCustodia,
      });
    }
  }

  // Recalcular para cada combinación
  for (const [key, combo] of combinaciones) {
    await recalcularSaldosProducto(tx, empresaId, combo.productoId, combo.clienteId, combo.esCustodia);
  }
};

/**
 * Recalcula los saldos de un producto específico en todos los almacenes
 * @param {Object} tx - Transacción de Prisma
 * @param {BigInt} empresaId - ID de la empresa
 * @param {BigInt} productoId - ID del producto
 * @param {BigInt} clienteId - ID del cliente
 * @param {Boolean} esCustodia - Indica si es custodia
 */
const recalcularSaldosProducto = async (tx, empresaId, productoId, clienteId, esCustodia) => {
  // Obtener todos los registros de kardex ordenados por fecha y almacén
  const kardexRegistros = await tx.kardexAlmacen.findMany({
    where: {
      empresaId,
      productoId,
      clienteId,
      esCustodia,
    },
    orderBy: [
      { almacenId: 'asc' },
      { fechaMovimientoAlmacen: 'asc' },
      { id: 'asc' },
    ],
  });

  // Agrupar por almacén
  const porAlmacen = {};
  for (const registro of kardexRegistros) {
    const almacenKey = String(registro.almacenId);
    if (!porAlmacen[almacenKey]) {
      porAlmacen[almacenKey] = [];
    }
    porAlmacen[almacenKey].push(registro);
  }

  // Recalcular saldos por almacén
  for (const almacenId in porAlmacen) {
    const registros = porAlmacen[almacenId];
    let saldoCantidad = 0;
    let saldoPeso = 0;

    for (const registro of registros) {
      // Saldo inicial = saldo final anterior
      const saldoIniCant = saldoCantidad;
      const saldoIniPeso = saldoPeso;

      // Calcular movimiento
      const ingresoCant = registro.ingresoCant || 0;
      const egresoCant = registro.egresoCant || 0;
      const ingresoPeso = registro.ingresoPeso || 0;
      const egresoPeso = registro.egresoPeso || 0;

      // Calcular saldo final
      saldoCantidad = Number(saldoIniCant) + Number(ingresoCant) - Number(egresoCant);
      saldoPeso = Number(saldoIniPeso) + Number(ingresoPeso) - Number(egresoPeso);

      // Actualizar registro de kardex
      await tx.kardexAlmacen.update({
        where: { id: registro.id },
        data: {
          saldoIniCant: saldoIniCant,
          saldoInicialPeso: saldoIniPeso,
          saldoFinalCant: saldoCantidad,
          saldoFinalPeso: saldoPeso,
        },
      });
    }

    // Actualizar o crear SaldosDetProductoCliente para cada combinación única
    await actualizarSaldosDetProductoCliente(
      tx,
      empresaId,
      BigInt(almacenId),
      productoId,
      clienteId,
      esCustodia,
      registros
    );
  }
};

/**
 * Actualiza o crea los saldos detallados por producto y cliente
 * @param {Object} tx - Transacción de Prisma
 * @param {BigInt} empresaId - ID de la empresa
 * @param {BigInt} almacenId - ID del almacén
 * @param {BigInt} productoId - ID del producto
 * @param {BigInt} clienteId - ID del cliente
 * @param {Boolean} esCustodia - Indica si es custodia
 * @param {Array} registrosKardex - Registros de kardex del almacén
 */
const actualizarSaldosDetProductoCliente = async (
  tx,
  empresaId,
  almacenId,
  productoId,
  clienteId,
  esCustodia,
  registrosKardex
) => {
  // Agrupar por combinación única de lote, fechas, estados, etc.
  const saldosPorCombinacion = {};

  for (const registro of registrosKardex) {
    const key = [
      registro.lote || 'NULL',
      registro.fechaIngreso?.toISOString() || 'NULL',
      registro.fechaProduccion?.toISOString() || 'NULL',
      registro.fechaVencimiento?.toISOString() || 'NULL',
      registro.estadoId || 'NULL',
      registro.estadoCalidadId || 'NULL',
      registro.numContenedor || 'NULL',
      registro.nroSerie || 'NULL',
    ].join('|');

    if (!saldosPorCombinacion[key]) {
      saldosPorCombinacion[key] = {
        lote: registro.lote,
        fechaIngreso: registro.fechaIngreso,
        fechaProduccion: registro.fechaProduccion,
        fechaVencimiento: registro.fechaVencimiento,
        estadoId: registro.estadoId,
        estadoCalidadId: registro.estadoCalidadId,
        numContenedor: registro.numContenedor,
        nroSerie: registro.nroSerie,
        saldoCantidad: 0,
        saldoPeso: 0,
      };
    }

    // Acumular saldos
    const ingresoCant = Number(registro.ingresoCant || 0);
    const egresoCant = Number(registro.egresoCant || 0);
    const ingresoPeso = Number(registro.ingresoPeso || 0);
    const egresoPeso = Number(registro.egresoPeso || 0);

    saldosPorCombinacion[key].saldoCantidad += ingresoCant - egresoCant;
    saldosPorCombinacion[key].saldoPeso += ingresoPeso - egresoPeso;
  }

  // Actualizar o crear cada saldo
  const fechaActual = new Date();
  for (const key in saldosPorCombinacion) {
    const saldo = saldosPorCombinacion[key];

    // Solo crear/actualizar si hay saldo positivo
    if (saldo.saldoCantidad > 0 || saldo.saldoPeso > 0) {
      await tx.saldosDetProductoCliente.upsert({
        where: {
          empresaId_almacenId_productoId_clienteId_esCustodia_lote_fechaIngreso_fechaProduccion_fechaVencimiento_estadoId_estadoCalidadId_numContenedor_nroSerie: {
            empresaId,
            almacenId,
            productoId,
            clienteId,
            esCustodia,
            lote: saldo.lote,
            fechaIngreso: saldo.fechaIngreso,
            fechaProduccion: saldo.fechaProduccion,
            fechaVencimiento: saldo.fechaVencimiento,
            estadoId: saldo.estadoId,
            estadoCalidadId: saldo.estadoCalidadId,
            numContenedor: saldo.numContenedor,
            nroSerie: saldo.nroSerie,
          },
        },
        update: {
          saldoCantidad: saldo.saldoCantidad,
          saldoPeso: saldo.saldoPeso,
          actualizadoEn: fechaActual,
        },
        create: {
          empresaId,
          almacenId,
          productoId,
          clienteId,
          esCustodia,
          lote: saldo.lote,
          fechaIngreso: saldo.fechaIngreso,
          fechaProduccion: saldo.fechaProduccion,
          fechaVencimiento: saldo.fechaVencimiento,
          estadoId: saldo.estadoId,
          estadoCalidadId: saldo.estadoCalidadId,
          numContenedor: saldo.numContenedor,
          nroSerie: saldo.nroSerie,
          saldoCantidad: saldo.saldoCantidad,
          saldoPeso: saldo.saldoPeso,
          actualizadoEn: fechaActual,
        },
      });
    }
  }
};

export default {
  generarMovimientoDesdeTemporadaPesca,
  recalcularSaldosKardex,
  recalcularSaldosProducto,
};