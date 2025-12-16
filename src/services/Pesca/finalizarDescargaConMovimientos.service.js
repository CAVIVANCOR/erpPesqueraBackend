import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import movimientoAlmacenService from '../Almacen/movimientoAlmacen.service.js';
import generarKardexService from '../Almacen/generarKardex.service.js';

/**
 * Servicio para finalizar una descarga individual y generar movimientos de almacén
 * 
 * Este servicio ejecuta los pasos 3, 4, 5 y 6 del proceso original de finalización de faena:
 * - PASO 3: Calcular costos y precios
 * - PASO 4: Generar movimiento de ingreso (concepto 1)
 * - PASO 5: Generar movimiento de salida (concepto 3)
 * - PASO 6: Retornar resultado completo
 * 
 * @param {BigInt} descargaId - ID de la descarga de faena pesca
 * @param {BigInt} temporadaPescaId - ID de la temporada de pesca
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Resultado con movimientos generados
 */
const finalizarDescargaConMovimientos = async (descargaId, temporadaPescaId, usuarioId) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // ============================================
      // PASO 1: VALIDAR Y OBTENER DATOS BASE
      // ============================================
      
      // 1.1 Obtener temporada de pesca
      const temporada = await tx.temporadaPesca.findUnique({
        where: { id: temporadaPescaId }
      });

      if (!temporada) {
        throw new ValidationError('Temporada de pesca no encontrada');
      }

      // 1.2 Obtener descarga con su faena y embarcación
      const descarga = await tx.descargaFaenaPesca.findUnique({
        where: { id: descargaId },
        include: {
          faenaPesca: {
            include: {
              embarcacion: true
            }
          }
        }
      });

      if (!descarga) {
        throw new ValidationError('Descarga de faena no encontrada');
      }

      // 1.3 Validar que la descarga tenga una faena asociada
      if (!descarga.faenaPesca) {
        throw new ValidationError('La descarga no tiene una faena asociada');
      }

      // 1.4 Obtener el responsable de almacén desde ParametroAprobador
      const parametroAprobador = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: temporada.empresaId,
          moduloSistemaId: BigInt(6), // Inventarios
          cesado: false
        }
      });

      if (!parametroAprobador) {
        throw new ValidationError(
          'No se encontró un responsable de almacén configurado para esta empresa en el módulo de Inventarios'
        );
      }

      // 1.5 Obtener la entidad comercial de la empresa (proveedor MEGUI)
      const empresaMegui = await tx.empresa.findUnique({
        where: { id: temporada.empresaId },
        select: { entidadComercialId: true }
      });

      if (!empresaMegui || !empresaMegui.entidadComercialId) {
        throw new ValidationError('La empresa no tiene una entidad comercial asociada');
      }

      // 1.6 Obtener cliente de la descarga
      const clienteId = descarga.clienteId;
      if (!clienteId) {
        throw new ValidationError('La descarga no tiene un cliente asociado');
      }

      // ============================================
      // PASO 2: CALCULAR COSTOS Y PRECIOS
      // ============================================
      
      // Crear array con una sola descarga para reutilizar funciones
      const descargas = [descarga];
      
      // Calcular costo unitario desde entregas a rendir
      const costoUnitario = await calcularCostoUnitario(tx, temporadaPescaId, descargas);

      // ============================================
      // PASO 3: GENERAR MOVIMIENTO DE INGRESO (CONCEPTO 1)
      // ============================================
      
      const movimientoIngreso = await generarMovimientoIngreso(
        tx,
        temporada,
        descarga.faenaPesca,
        descargas,
        parametroAprobador,
        empresaMegui.entidadComercialId,
        usuarioId,
        costoUnitario
      );

      // ============================================
      // PASO 4: GENERAR MOVIMIENTO DE SALIDA (CONCEPTO 3)
      // ============================================
      
      const movimientoSalida = await generarMovimientoSalida(
        tx,
        temporada,
        descarga.faenaPesca,
        descargas,
        parametroAprobador,
        clienteId,
        usuarioId,
        costoUnitario
      );

      // ============================================
      // PASO 5: RETORNAR RESULTADO COMPLETO
      // ============================================
      
      return {
        descarga: {
          id: descarga.id,
          faenaPescaId: descarga.faenaPescaId
        },
        movimientoIngreso: {
          id: movimientoIngreso.movimiento.id,
          numeroDocumento: movimientoIngreso.movimiento.numeroDocumento,
          cantidadDetalles: movimientoIngreso.movimiento.detalles?.length || 0,
          kardex: movimientoIngreso.kardex
        },
        movimientoSalida: {
          id: movimientoSalida.movimiento.id,
          numeroDocumento: movimientoSalida.movimiento.numeroDocumento,
          cantidadDetalles: movimientoSalida.movimiento.detalles?.length || 0,
          kardex: movimientoSalida.kardex
        },
        mensaje: 'Descarga finalizada exitosamente. Se generaron 2 movimientos de almacén con sus kardex.'
      };

    } catch (error) {
      console.error('❌ Error en finalizarDescargaConMovimientos:', error);
      throw error;
    }
  });
};

/**
 * Calcula el costo unitario desde las entregas a rendir (copiado del servicio que funciona)
 */
async function calcularCostoUnitario(tx, temporadaPescaId, descargas) {
  try {
    // Buscar la entrega a rendir asociada a la temporada
    const entregaRendir = await tx.entregaARendir.findFirst({
      where: { temporadaPescaId: temporadaPescaId },
      include: {
        movimientos: {
          where: {
            tipoMovimientoId: BigInt(2) // Solo EGRESOS
          }
        }
      }
    });

    if (!entregaRendir || !entregaRendir.movimientos || entregaRendir.movimientos.length === 0) {
      return 0;
    }

    // Sumar todos los egresos
    const totalEgresos = entregaRendir.movimientos.reduce((sum, detalle) => {
      return sum + Number(detalle.monto || 0);
    }, 0);

    // Sumar todas las toneladas
    const totalToneladas = descargas.reduce((sum, descarga) => {
      return sum + Number(descarga.toneladas || 0);
    }, 0);

    if (totalToneladas === 0) {
      return 0;
    }

    // Calcular costo unitario prorrateado
    const costoUnitario = totalEgresos / totalToneladas;
    
    return costoUnitario;
  } catch (error) {
    console.error('❌ Error calculando costo unitario:', error);
    return 0;
  }
}

/**
 * Genera el movimiento de INGRESO (Concepto 1) - Copiado exactamente del servicio que funciona
 */
async function generarMovimientoIngreso(
  tx,
  temporada,
  faena,
  descargas,
  parametroAprobador,
  proveedorMeguiId,
  usuarioId,
  costoUnitario
) {
  // 1. Obtener serie de documento para INGRESO (ID: 1)
  const serieIngreso = await tx.serieDoc.findUnique({
    where: { id: BigInt(1) }
  });

  if (!serieIngreso) {
    throw new ValidationError(
      'No se encontró la serie de documento ID 1 para Nota de Ingreso de Almacén'
    );
  }

  if (!serieIngreso.activo) {
    throw new ValidationError(
      'La serie de documento ID 1 para Nota de Ingreso de Almacén está inactiva'
    );
  }

  // 2. Preparar detalles del movimiento desde las descargas
  const detallesIngreso = [];
  
  for (const descarga of descargas) {
    // Buscar el producto correspondiente a esta descarga
    let producto = await tx.producto.findFirst({
      where: {
        empresaId: temporada.empresaId,
        clienteId: descarga.clienteId,
        especieId: descarga.especieId,
        cesado: false
      }
    });

    if (!producto) {
      producto = await tx.producto.findFirst({
        where: {
          empresaId: temporada.empresaId,
          especieId: descarga.especieId,
          cesado: false
        }
      });
    }

    if (!producto) {
      throw new ValidationError(
        `No se encontró un producto activo para la empresa ${temporada.empresaId} y especie ${descarga.especieId}`
      );
    }

    const fechaVencimiento = new Date(descarga.fechaHoraInicioDescarga);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    detallesIngreso.push({
      productoId: producto.id,
      cantidad: descarga.toneladas,
      peso: descarga.toneladas,
      lote: temporada.numeroResolucion || '',
      fechaProduccion: descarga.fechaHoraInicioDescarga,
      fechaVencimiento: fechaVencimiento,
      fechaIngreso: descarga.fechaHoraInicioDescarga,
      estadoMercaderiaId: BigInt(6),
      estadoCalidadId: BigInt(10),
      entidadComercialId: descarga.clienteId,
      esCustodia: false,
      empresaId: temporada.empresaId,
      costoUnitario: costoUnitario,
      creadoPor: usuarioId,
      actualizadoPor: usuarioId,
      creadoEn: new Date(),
      actualizadoEn: new Date()
    });
  }

  // 3. Preparar datos del movimiento
  const dataMovimientoIngreso = {
    empresaId: temporada.empresaId,
    tipoDocumentoId: BigInt(13),
    conceptoMovAlmacenId: BigInt(1),
    serieDocId: serieIngreso.id,
    fechaDocumento: new Date(),
    entidadComercialId: proveedorMeguiId,
    faenaPescaId: faena.id,
    embarcacionId: faena.embarcacionId,
    personalRespAlmacen: parametroAprobador.personalRespId,
    esCustodia: false,
    observaciones: `Ingreso automático - Descarga ID: ${descargas[0].id}`,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    creadoPor: usuarioId,
    actualizadoPor: usuarioId,
    detalles: detallesIngreso
  };

  // 4. Generar número de documento
  const nuevoCorrelativo = Number(serieIngreso.correlativo) + 1;
  const numSerie = String(serieIngreso.serie).padStart(serieIngreso.numCerosIzqSerie, '0');
  const numCorre = String(nuevoCorrelativo).padStart(serieIngreso.numCerosIzqCorre, '0');
  const numeroDocumento = `${numSerie}-${numCorre}`;
  
  const { detalles, ...dataMovimiento } = dataMovimientoIngreso;
  
  // 5. Crear movimiento con estado PENDIENTE
  const movimientoCreado = await tx.movimientoAlmacen.create({
    data: {
      ...dataMovimiento,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento: numeroDocumento,
      estadoDocAlmacenId: BigInt(30),
      detalles: {
        create: detalles.map(detalle => ({
          productoId: BigInt(detalle.productoId),
          cantidad: detalle.cantidad,
          peso: detalle.peso || null,
          lote: detalle.lote || null,
          fechaProduccion: detalle.fechaProduccion || null,
          fechaVencimiento: detalle.fechaVencimiento || null,
          fechaIngreso: detalle.fechaIngreso || null,
          nroSerie: detalle.nroSerie || null,
          nroContenedor: detalle.nroContenedor || null,
          estadoMercaderiaId: detalle.estadoMercaderiaId ? BigInt(detalle.estadoMercaderiaId) : null,
          estadoCalidadId: detalle.estadoCalidadId ? BigInt(detalle.estadoCalidadId) : null,
          entidadComercialId: detalle.entidadComercialId ? BigInt(detalle.entidadComercialId) : null,
          esCustodia: detalle.esCustodia || false,
          empresaId: BigInt(detalle.empresaId),
          observaciones: detalle.observaciones || null,
          costoUnitario: detalle.costoUnitario || null,
          creadoPor: detalle.creadoPor ? BigInt(detalle.creadoPor) : null,
          actualizadoPor: detalle.actualizadoPor ? BigInt(detalle.actualizadoPor) : null,
          creadoEn: detalle.creadoEn || new Date(),
          actualizadoEn: detalle.actualizadoEn || new Date()
        }))
      }
    },
    include: {
      detalles: true,
      conceptoMovAlmacen: true
    }
  });
  
  // 6. Actualizar correlativo
  await tx.serieDoc.update({
    where: { id: serieIngreso.id },
    data: { correlativo: BigInt(nuevoCorrelativo) }
  });

  // 7. Cambiar a CERRADO
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(31),
      actualizadoEn: new Date()
    }
  });

  // 8. Generar kardex
  const kardexGenerado = await generarKardexService.generarKardexMovimiento(movimientoCreado.id, tx);

  // 9. Cambiar a KARDEX GENERADO
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(33),
      actualizadoEn: new Date()
    }
  });

  return {
    movimiento: movimientoCreado,
    kardex: kardexGenerado
  };
}

/**
 * Genera el movimiento de SALIDA (Concepto 3) - Copiado exactamente del servicio que funciona
 */
async function generarMovimientoSalida(
  tx,
  temporada,
  faena,
  descargas,
  parametroAprobador,
  clienteId,
  usuarioId,
  costoUnitario
) {
  // 1. Obtener serie de documento para SALIDA (ID: 2)
  const serieSalida = await tx.serieDoc.findUnique({
    where: { id: BigInt(2) }
  });

  if (!serieSalida) {
    throw new ValidationError(
      'No se encontró la serie de documento ID 2 para Nota de Salida de Almacén'
    );
  }

  if (!serieSalida.activo) {
    throw new ValidationError(
      'La serie de documento ID 2 para Nota de Salida de Almacén está inactiva'
    );
  }

  // 2. Preparar detalles del movimiento desde las descargas
  const detallesSalida = [];
  
  for (const descarga of descargas) {
    // Buscar el producto correspondiente a esta descarga
    let producto = await tx.producto.findFirst({
      where: {
        empresaId: temporada.empresaId,
        clienteId: descarga.clienteId,
        especieId: descarga.especieId,
        cesado: false
      }
    });

    if (!producto) {
      producto = await tx.producto.findFirst({
        where: {
          empresaId: temporada.empresaId,
          especieId: descarga.especieId,
          cesado: false
        }
      });
    }

    if (!producto) {
      throw new ValidationError(
        `No se encontró un producto activo para la empresa ${temporada.empresaId} y especie ${descarga.especieId}`
      );
    }

    const fechaVencimiento = new Date(descarga.fechaHoraInicioDescarga);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    detallesSalida.push({
      productoId: producto.id,
      cantidad: descarga.toneladas,
      peso: descarga.toneladas,
      lote: temporada.numeroResolucion || '',
      fechaProduccion: descarga.fechaHoraInicioDescarga,
      fechaVencimiento: fechaVencimiento,
      fechaIngreso: descarga.fechaHoraInicioDescarga,
      estadoMercaderiaId: BigInt(6),
      estadoCalidadId: BigInt(10),
      entidadComercialId: descarga.clienteId,
      esCustodia: false,
      empresaId: temporada.empresaId,
      costoUnitario: costoUnitario,
      creadoPor: usuarioId,
      actualizadoPor: usuarioId,
      creadoEn: new Date(),
      actualizadoEn: new Date()
    });
  }

  // 3. Preparar datos del movimiento de SALIDA
  const dataMovimientoSalida = {
    empresaId: temporada.empresaId,
    tipoDocumentoId: BigInt(14),
    conceptoMovAlmacenId: BigInt(3),
    serieDocId: serieSalida.id,
    fechaDocumento: new Date(),
    entidadComercialId: clienteId,
    faenaPescaId: faena.id,
    embarcacionId: faena.embarcacionId,
    personalRespAlmacen: parametroAprobador.personalRespId,
    esCustodia: false,
    observaciones: `Salida automática - Descarga ID: ${descargas[0].id}`,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    creadoPor: usuarioId,
    actualizadoPor: usuarioId,
    detalles: detallesSalida
  };

  // 4. Generar número de documento
  const nuevoCorrelativo = Number(serieSalida.correlativo) + 1;
  const numSerie = String(serieSalida.serie).padStart(serieSalida.numCerosIzqSerie, '0');
  const numCorre = String(nuevoCorrelativo).padStart(serieSalida.numCerosIzqCorre, '0');
  const numeroDocumento = `${numSerie}-${numCorre}`;
  
  const { detalles, ...dataMovimiento } = dataMovimientoSalida;
  
  // 5. Crear movimiento con estado PENDIENTE
  const movimientoCreado = await tx.movimientoAlmacen.create({
    data: {
      ...dataMovimiento,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento: numeroDocumento,
      estadoDocAlmacenId: BigInt(30),
      detalles: {
        create: detalles.map(detalle => ({
          productoId: BigInt(detalle.productoId),
          cantidad: detalle.cantidad,
          peso: detalle.peso || null,
          lote: detalle.lote || null,
          fechaProduccion: detalle.fechaProduccion || null,
          fechaVencimiento: detalle.fechaVencimiento || null,
          fechaIngreso: detalle.fechaIngreso || null,
          nroSerie: detalle.nroSerie || null,
          nroContenedor: detalle.nroContenedor || null,
          estadoMercaderiaId: detalle.estadoMercaderiaId ? BigInt(detalle.estadoMercaderiaId) : null,
          estadoCalidadId: detalle.estadoCalidadId ? BigInt(detalle.estadoCalidadId) : null,
          entidadComercialId: detalle.entidadComercialId ? BigInt(detalle.entidadComercialId) : null,
          esCustodia: detalle.esCustodia || false,
          empresaId: BigInt(detalle.empresaId),
          observaciones: detalle.observaciones || null,
          costoUnitario: detalle.costoUnitario || null,
          creadoPor: detalle.creadoPor ? BigInt(detalle.creadoPor) : null,
          actualizadoPor: detalle.actualizadoPor ? BigInt(detalle.actualizadoPor) : null,
          creadoEn: detalle.creadoEn || new Date(),
          actualizadoEn: detalle.actualizadoEn || new Date()
        }))
      }
    },
    include: {
      detalles: true,
      conceptoMovAlmacen: true
    }
  });
  
  // 6. Actualizar correlativo
  await tx.serieDoc.update({
    where: { id: serieSalida.id },
    data: { correlativo: BigInt(nuevoCorrelativo) }
  });

  // 7. Cambiar a CERRADO
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(31),
      actualizadoEn: new Date()
    }
  });

  // 8. Generar kardex
  const kardexGenerado = await generarKardexService.generarKardexMovimiento(movimientoCreado.id, tx);

  // 9. Cambiar a KARDEX GENERADO
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(33),
      actualizadoEn: new Date()
    }
  });

  return {
    movimiento: movimientoCreado,
    kardex: kardexGenerado
  };
}

export default {
  finalizarDescargaConMovimientos
};
