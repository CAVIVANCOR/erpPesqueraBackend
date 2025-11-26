// src/services/Pesca/finalizarFaenaConMovimientos.service.js
/**
 * Servicio para finalizar faenas de pesca generando movimientos de almacén automáticamente
 * Utiliza las funciones genéricas del módulo de Inventarios
 * @module services/Pesca/finalizarFaenaConMovimientos
 */

import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import movimientoAlmacenService from '../Almacen/movimientoAlmacen.service.js';
import generarKardexService from '../Almacen/generarKardex.service.js';

/**
 * Finaliza una faena de pesca y genera automáticamente DOS movimientos de almacén:
 * 1. INGRESO (Concepto 1): De Proveedor MEGUI a Almacén MP Recurso Hidrobiológico
 * 2. SALIDA (Concepto 3): De Almacén MP Recurso Hidrobiológico a Cliente MEGUI
 * 
 * @param {BigInt} faenaPescaId - ID de la faena de pesca
 * @param {BigInt} temporadaPescaId - ID de la temporada de pesca
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Resultado con faena actualizada y movimientos generados
 */
const finalizarFaenaConMovimientosAlmacen = async (faenaPescaId, temporadaPescaId, usuarioId) => {
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

      // 1.2 Obtener faena de pesca con embarcación
      const faena = await tx.faenaPesca.findUnique({
        where: { id: faenaPescaId },
        include: {
          embarcacion: true
        }
      });

      if (!faena) {
        throw new ValidationError('Faena de pesca no encontrada');
      }

      // 1.3 Obtener todas las descargas de la faena
      const descargas = await tx.descargaFaenaPesca.findMany({
        where: { faenaPescaId: faenaPescaId }
      });

      if (!descargas || descargas.length === 0) {
        throw new ValidationError('No se encontraron descargas para esta faena');
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

      // 1.6 Obtener cliente principal - usar el clienteId de la primera descarga
      const clientePrincipalId = descargas[0].clienteId;
      if (!clientePrincipalId) {
        throw new ValidationError('No se encontró el cliente en las descargas');
      }

      // ============================================
      // PASO 2: ACTUALIZAR ESTADO DE LA FAENA
      // ============================================
      
      await tx.faenaPesca.update({
        where: { id: faenaPescaId },
        data: {
          estadoFaenaId: BigInt(19), // FINALIZADA
          updatedAt: new Date()
        }
      });

      // ============================================
      // PASO 3: CALCULAR COSTOS Y PRECIOS
      // ============================================
      
      // 3.1 Calcular costo unitario desde entregas a rendir
      const costoUnitario = await calcularCostoUnitario(tx, temporadaPescaId, descargas);

      // ============================================
      // PASO 4: GENERAR MOVIMIENTO DE INGRESO (CONCEPTO 1)
      // ============================================
      
      const movimientoIngreso = await generarMovimientoIngreso(
        tx,
        temporada,
        faena,
        descargas,
        parametroAprobador,
        empresaMegui.entidadComercialId,
        usuarioId,
        costoUnitario
      );

      // ============================================
      // PASO 5: GENERAR MOVIMIENTO DE SALIDA (CONCEPTO 3)
      // ============================================
      
      const movimientoSalida = await generarMovimientoSalida(
        tx,
        temporada,
        faena,
        descargas,
        parametroAprobador,
        clientePrincipalId,
        usuarioId,
        costoUnitario
      );

      // ============================================
      // PASO 5: RETORNAR RESULTADO COMPLETO
      // ============================================
      
      return {
        faena: {
          id: faena.id,
          estadoFaenaId: BigInt(19)
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
        mensaje: 'Faena finalizada exitosamente. Se generaron 2 movimientos de almacén con sus kardex.'
      };

    } catch (error) {
      console.error('❌ Error en finalizarFaenaConMovimientosAlmacen:', error);
      throw error;
    }
  });
};

/**
 * Calcula el costo unitario desde las entregas a rendir
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
      console.log('⚠️ No se encontraron egresos en entrega a rendir, costo unitario = 0');
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
      console.log('⚠️ Total de toneladas es 0, costo unitario = 0');
      return 0;
    }

    // Calcular costo unitario prorrateado
    const costoUnitario = totalEgresos / totalToneladas;
    
    console.log(`✅ Costo unitario calculado: ${costoUnitario} (Total egresos: ${totalEgresos} / Total toneladas: ${totalToneladas})`);
    
    return costoUnitario;
  } catch (error) {
    console.error('❌ Error calculando costo unitario:', error);
    return 0;
  }
}

/**
 * Calcula el precio unitario buscando precio estándar y precio especial
 */
async function calcularPrecioUnitario(tx, empresaId, proveedorMeguiId, clienteId, descargas) {
  try {
    // Obtener el primer producto de las descargas para buscar precio
    const primeraDescarga = descargas[0];
    if (!primeraDescarga) {
      console.log('⚠️ No hay descargas, precio unitario = 0');
      return 0;
    }

    // Buscar el producto
    const producto = await tx.producto.findFirst({
      where: {
        empresaId: empresaId,
        clienteId: primeraDescarga.clienteId,
        especieId: primeraDescarga.especieId,
        cesado: false
      }
    });

    if (!producto) {
      console.log('⚠️ No se encontró producto, precio unitario = 0');
      return 0;
    }

    const fechaActual = new Date();

    // 1. Buscar precio especial del cliente (tiene prioridad)
    const precioEspecial = await tx.precioEntidad.findFirst({
      where: {
        entidadComercialId: clienteId,
        productoId: producto.id,
        activo: true,
        fechaVigenciaInicio: { lte: fechaActual },
        OR: [
          { fechaVigenciaFin: { gte: fechaActual } },
          { fechaVigenciaFin: null }
        ]
      },
      orderBy: { fechaVigenciaInicio: 'desc' }
    });

    if (precioEspecial) {
      console.log(`✅ Precio especial del cliente encontrado: ${precioEspecial.precio}`);
      return Number(precioEspecial.precio);
    }

    // 2. Buscar precio estándar de la empresa (proveedor MEGUI)
    const precioEstandar = await tx.precioEntidad.findFirst({
      where: {
        entidadComercialId: proveedorMeguiId,
        productoId: producto.id,
        activo: true,
        fechaVigenciaInicio: { lte: fechaActual },
        OR: [
          { fechaVigenciaFin: { gte: fechaActual } },
          { fechaVigenciaFin: null }
        ]
      },
      orderBy: { fechaVigenciaInicio: 'desc' }
    });

    if (precioEstandar) {
      console.log(`✅ Precio estándar encontrado: ${precioEstandar.precio}`);
      return Number(precioEstandar.precio);
    }

    console.log('⚠️ No se encontró precio (ni especial ni estándar), precio unitario = 0');
    return 0;
  } catch (error) {
    console.error('❌ Error calculando precio unitario:', error);
    return 0;
  }
}

/**
 * Genera el movimiento de INGRESO (Concepto 1)
 * De Proveedor MEGUI a Almacén MP Recurso Hidrobiológico
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
    // Primero intentar con cliente y especie
    let producto = await tx.producto.findFirst({
      where: {
        empresaId: temporada.empresaId,
        clienteId: descarga.clienteId,
        especieId: descarga.especieId,
        cesado: false
      }
    });

    // Si no se encuentra, buscar solo por empresa y especie (sin cliente específico)
    if (!producto) {
      console.log(`⚠️ No se encontró producto con cliente ${descarga.clienteId}, buscando sin cliente específico...`);
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
        `No se encontró un producto activo para la empresa ${temporada.empresaId} y especie ${descarga.especieId}. ` +
        `Por favor, configure un producto para esta combinación.`
      );
    }

    console.log(`✅ Producto INGRESO encontrado: ID ${producto.id}`);

    // Calcular fecha de vencimiento (30 días después de la fecha de inicio de descarga)
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
      estadoMercaderiaId: BigInt(6), // Liberado
      estadoCalidadId: BigInt(10), // Calidad A
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

  // 3. Preparar datos del movimiento de INGRESO
  const dataMovimientoIngreso = {
    empresaId: temporada.empresaId,
    tipoDocumentoId: BigInt(13), // NOTA DE INGRESO ALMACEN
    conceptoMovAlmacenId: BigInt(1), // INGRESO MATERIA PRIMA DE PROVEEDOR MEGUI
    serieDocId: serieIngreso.id,
    fechaDocumento: new Date(),
    entidadComercialId: proveedorMeguiId, // Proveedor MEGUI
    faenaPescaId: faena.id,
    embarcacionId: faena.embarcacionId, // Embarcación de la faena
    personalRespAlmacen: parametroAprobador.personalRespId,
    esCustodia: false,
    observaciones: `Ingreso automático por finalización de Faena ID: ${faena.id}`,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    creadoPor: usuarioId,
    actualizadoPor: usuarioId,
    detalles: detallesIngreso
  };

  // 4. Crear movimiento usando la función genérica dentro de la transacción
  // Nota: Necesitamos usar la lógica de creación directamente en la transacción
  
  // 4.1 Calcular nuevo correlativo y generar número de documento
  const nuevoCorrelativo = Number(serieIngreso.correlativo) + 1;
  const numSerie = String(serieIngreso.serie).padStart(serieIngreso.numCerosIzqSerie, '0');
  const numCorre = String(nuevoCorrelativo).padStart(serieIngreso.numCerosIzqCorre, '0');
  const numeroDocumento = `${numSerie}-${numCorre}`;
  
  // 4.2 Extraer detalles del data
  const { detalles, ...dataMovimiento } = dataMovimientoIngreso;
  
  // 4.3 Crear el movimiento con estado PENDIENTE (30)
  const movimientoCreado = await tx.movimientoAlmacen.create({
    data: {
      ...dataMovimiento,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento: numeroDocumento,
      estadoDocAlmacenId: BigInt(30), // PENDIENTE
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
  
  // 4.4 Actualizar el correlativo en SerieDoc
  await tx.serieDoc.update({
    where: { id: serieIngreso.id },
    data: { correlativo: BigInt(nuevoCorrelativo) }
  });

  // 5. Cambiar estado a CERRADO (31) antes de generar kardex
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(31), // CERRADO
      actualizadoEn: new Date()
    }
  });

  console.log(`✅ Movimiento INGRESO ${movimientoCreado.numeroDocumento} cambiado a estado CERRADO (31)`);

  // 6. Generar kardex usando la función genérica (pasando la transacción)
  const kardexGenerado = await generarKardexService.generarKardexMovimiento(movimientoCreado.id, tx);

  // 7. Cambiar estado a KARDEX GENERADO (33)
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(33), // KARDEX GENERADO
      actualizadoEn: new Date()
    }
  });

  console.log(`✅ Movimiento INGRESO ${movimientoCreado.numeroDocumento} cambiado a estado KARDEX GENERADO (33)`);

  return {
    movimiento: movimientoCreado,
    kardex: kardexGenerado
  };
}

/**
 * Genera el movimiento de SALIDA (Concepto 3)
 * De Almacén MP Recurso Hidrobiológico a Cliente MEGUI
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
    // Primero intentar con cliente y especie
    let producto = await tx.producto.findFirst({
      where: {
        empresaId: temporada.empresaId,
        clienteId: descarga.clienteId,
        especieId: descarga.especieId,
        cesado: false
      }
    });

    // Si no se encuentra, buscar solo por empresa y especie (sin cliente específico)
    if (!producto) {
      console.log(`⚠️ No se encontró producto con cliente ${descarga.clienteId}, buscando sin cliente específico...`);
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
        `No se encontró un producto activo para la empresa ${temporada.empresaId} y especie ${descarga.especieId}. ` +
        `Por favor, configure un producto para esta combinación.`
      );
    }

    console.log(`✅ Producto SALIDA encontrado: ID ${producto.id}`);

    // Calcular fecha de vencimiento (30 días después de la fecha de inicio de descarga)
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
      estadoMercaderiaId: BigInt(6), // Liberado
      estadoCalidadId: BigInt(10), // Calidad A
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
    tipoDocumentoId: BigInt(14), // NOTA DE SALIDA ALMACEN
    conceptoMovAlmacenId: BigInt(3), // SALIDA MATERIA PRIMA A CLIENTE MEGUI
    serieDocId: serieSalida.id,
    fechaDocumento: new Date(),
    entidadComercialId: clienteId, // Cliente (Hayduk)
    faenaPescaId: faena.id,
    embarcacionId: faena.embarcacionId, // Embarcación de la faena
    personalRespAlmacen: parametroAprobador.personalRespId,
    esCustodia: false,
    observaciones: `Salida automática por finalización de Faena ID: ${faena.id}`,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    creadoPor: usuarioId,
    actualizadoPor: usuarioId,
    detalles: detallesSalida
  };

  // 4. Crear movimiento usando la función genérica dentro de la transacción
  // Nota: Necesitamos usar la lógica de creación directamente en la transacción
  
  // 4.1 Calcular nuevo correlativo y generar número de documento
  const nuevoCorrelativo = Number(serieSalida.correlativo) + 1;
  const numSerie = String(serieSalida.serie).padStart(serieSalida.numCerosIzqSerie, '0');
  const numCorre = String(nuevoCorrelativo).padStart(serieSalida.numCerosIzqCorre, '0');
  const numeroDocumento = `${numSerie}-${numCorre}`;
  
  // 4.2 Extraer detalles del data
  const { detalles, ...dataMovimiento } = dataMovimientoSalida;
  
  // 4.3 Crear el movimiento con estado PENDIENTE (30)
  const movimientoCreado = await tx.movimientoAlmacen.create({
    data: {
      ...dataMovimiento,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento: numeroDocumento,
      estadoDocAlmacenId: BigInt(30), // PENDIENTE
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
  
  // 4.4 Actualizar el correlativo en SerieDoc
  await tx.serieDoc.update({
    where: { id: serieSalida.id },
    data: { correlativo: BigInt(nuevoCorrelativo) }
  });

  // 5. Cambiar estado a CERRADO (31) antes de generar kardex
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(31), // CERRADO
      actualizadoEn: new Date()
    }
  });

  console.log(`✅ Movimiento SALIDA ${movimientoCreado.numeroDocumento} cambiado a estado CERRADO (31)`);

  // 6. Generar kardex usando la función genérica (pasando la transacción)
  const kardexGenerado = await generarKardexService.generarKardexMovimiento(movimientoCreado.id, tx);

  // 7. Cambiar estado a KARDEX GENERADO (33)
  await tx.movimientoAlmacen.update({
    where: { id: movimientoCreado.id },
    data: { 
      estadoDocAlmacenId: BigInt(33), // KARDEX GENERADO
      actualizadoEn: new Date()
    }
  });

  console.log(`✅ Movimiento SALIDA ${movimientoCreado.numeroDocumento} cambiado a estado KARDEX GENERADO (33)`);

  return {
    movimiento: movimientoCreado,
    kardex: kardexGenerado
  };
}

export default {
  finalizarFaenaConMovimientosAlmacen
};
