import prisma from '../../config/prismaClient.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';

/**
 * Servicio Profesional de Kardex y Saldos
 * 
 * REGLAS DE NEGOCIO FUNDAMENTALES:
 * 1. Mercadería Propia (esCustodia=false): clienteId NO interviene en cálculo de saldos (se usa NULL)
 * 2. Mercadería en Custodia (esCustodia=true): clienteId SÍ interviene (identifica al dueño)
 * 3. Ordenamiento Anti-Negativos: fecha DESC, esIngresoEgreso DESC (INGRESOS primero), id DESC
 * 4. Variables de Control: Se agrupa por TODAS (lote, fechas, contenedor, serie, estados)
 * 
 * Documentado en español.
 */

/**
 * Obtiene el stock disponible de un producto en un almacén específico.
 */
export const obtenerStockDisponible = async (empresaId, almacenId, productoId, clienteId, esCustodia) => {
  try {
    const saldos = await prisma.saldosDetProductoCliente.findMany({
      where: {
        empresaId: BigInt(empresaId),
        almacenId: BigInt(almacenId),
        productoId: BigInt(productoId),
        clienteId: clienteId ? BigInt(clienteId) : null,
        esCustodia: esCustodia || false
      }
    });
    
    return saldos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Valida stock disponible para movimientos de salida o transferencia.
 */
export const validarStockDisponible = async (movimiento, detalles) => {
  const concepto = await prisma.conceptoMovAlmacen.findUnique({
    where: { id: BigInt(movimiento.conceptoMovAlmacenId) }
  });
  
  if (!concepto) throw new ValidationError('Concepto de movimiento no encontrado');
  
  // Si el concepto lleva kardex origen (es salida o transferencia), validar stock
  if (concepto.llevaKardexOrigen) {
    for (const detalle of detalles) {
      const stock = await obtenerStockDisponible(
        movimiento.empresaId,
        concepto.almacenOrigenId,
        detalle.productoId,
        detalle.entidadComercialId,
        detalle.esCustodia
      );
      
      const saldoTotal = stock.reduce((sum, s) => sum + Number(s.saldoCantidad), 0);
      
      if (saldoTotal < Number(detalle.cantidad)) {
        const producto = await prisma.producto.findUnique({ where: { id: BigInt(detalle.productoId) } });
        throw new ValidationError(
          `Stock insuficiente para ${producto?.descripcionArmada || 'producto'}. ` +
          `Disponible: ${saldoTotal}, Requerido: ${detalle.cantidad}`
        );
      }
    }
  }
};

/**
 * Obtiene el último kardex para calcular saldos iniciales.
 * Usa ordenamiento profesional: fecha DESC, esIngresoEgreso DESC, id DESC
 * 
 * IMPORTANTE: Para mercadería propia NO filtra por clienteId
 */
const obtenerUltimoKardex = async (tx, empresaId, almacenId, productoId, clienteId, esCustodia, variables = {}) => {
  // Ordenamiento profesional anti-negativos
  const orderByProfesional = [
    { fechaMovimientoAlmacen: 'desc' },
    { esIngresoEgreso: 'desc' }, // INGRESOS (true) antes que EGRESOS (false)
    { id: 'desc' }
  ];

  // Base común
  const whereBase = {
    empresaId,
    almacenId,
    productoId,
    esCustodia
  };

  // REGLA: Solo agregar clienteId si es custodia
  if (esCustodia) {
    whereBase.clienteId = clienteId;
  }

  // Saldo general (sin variables de control)
  const ultimoKardexGeneral = await tx.kardexAlmacen.findFirst({
    where: whereBase,
    orderBy: orderByProfesional
  });

  // Saldo con variables de control (lote, fechas, contenedor, serie, estados)
  const whereVariables = {
    ...whereBase,
    lote: variables.lote || null,
    fechaIngreso: variables.fechaIngreso || null,
    fechaProduccion: variables.fechaProduccion || null,
    fechaVencimiento: variables.fechaVencimiento || null,
    estadoId: variables.estadoId || null,
    estadoCalidadId: variables.estadoCalidadId || null,
    numContenedor: variables.numContenedor || null,
    nroSerie: variables.nroSerie || null
  };

  const ultimoKardexVariables = await tx.kardexAlmacen.findFirst({
    where: whereVariables,
    orderBy: orderByProfesional
  });

  return {
    saldoIniCant: ultimoKardexGeneral?.saldoFinalCant || 0,
    saldoInicialPeso: ultimoKardexGeneral?.saldoFinalPeso || null,
    saldoInicialCantVariables: ultimoKardexVariables?.saldoFinalCantVariables || 0,
    saldoInicialPesoVariables: ultimoKardexVariables?.saldoFinalPesoVariables || null
  };
};

/**
 * Genera registros de kardex para un detalle de movimiento.
 * Calcula saldos iniciales y finales correctamente.
 */
export const generarKardex = async (tx, movimiento, detalle, concepto) => {
  const kardexGenerados = [];
  
  // Variables de control del detalle
  const variables = {
    lote: detalle.lote,
    fechaIngreso: detalle.fechaIngreso,
    fechaProduccion: detalle.fechaProduccion,
    fechaVencimiento: detalle.fechaVencimiento,
    estadoId: detalle.estadoMercaderiaId,
    estadoCalidadId: detalle.estadoCalidadId,
    numContenedor: detalle.nroContenedor,
    nroSerie: detalle.nroSerie
  };

  // Si lleva kardex origen (EGRESO)
  if (concepto.llevaKardexOrigen && concepto.almacenOrigenId) {
    // Obtener saldos iniciales
    const saldosIniciales = await obtenerUltimoKardex(
      tx,
      movimiento.empresaId,
      concepto.almacenOrigenId,
      detalle.productoId,
      detalle.entidadComercialId || movimiento.entidadComercialId,
      detalle.esCustodia || false,
      variables
    );

    // Calcular saldos finales (restar egreso)
    const saldoFinalCant = Number(saldosIniciales.saldoIniCant) - Number(detalle.cantidad);
    const saldoFinalPeso = detalle.peso 
      ? Number(saldosIniciales.saldoInicialPeso || 0) - Number(detalle.peso)
      : null;
    const saldoFinalCantVariables = Number(saldosIniciales.saldoInicialCantVariables) - Number(detalle.cantidad);
    const saldoFinalPesoVariables = detalle.peso
      ? Number(saldosIniciales.saldoInicialPesoVariables || 0) - Number(detalle.peso)
      : null;

    const kardexOrigen = await tx.kardexAlmacen.create({
      data: {
        empresaId: movimiento.empresaId,
        almacenId: concepto.almacenOrigenId,
        productoId: detalle.productoId,
        clienteId: detalle.entidadComercialId || movimiento.entidadComercialId || BigInt(0),
        esCustodia: detalle.esCustodia || false,
        fechaMovimientoAlmacen: movimiento.fechaDocumento,
        numDocCompleto: movimiento.numeroDocumento,
        esIngresoEgreso: false, // EGRESO
        conceptoMovAlmacenId: movimiento.conceptoMovAlmacenId,
        movimientoAlmacenId: movimiento.id,
        detalleMovimientoAlmacenId: detalle.id,
        // Egresos
        egresoCant: detalle.cantidad,
        egresoPeso: detalle.peso,
        egresoCantVariables: detalle.cantidad,
        egresoPesoVariables: detalle.peso,
        // Saldos iniciales
        saldoIniCant: saldosIniciales.saldoIniCant,
        saldoInicialPeso: saldosIniciales.saldoInicialPeso,
        saldoInicialCantVariables: saldosIniciales.saldoInicialCantVariables,
        saldoInicialPesoVariables: saldosIniciales.saldoInicialPesoVariables,
        // Saldos finales
        saldoFinalCant: saldoFinalCant,
        saldoFinalPeso: saldoFinalPeso,
        saldoFinalCantVariables: saldoFinalCantVariables,
        saldoFinalPesoVariables: saldoFinalPesoVariables,
        // Variables de control
        lote: detalle.lote,
        fechaVencimiento: detalle.fechaVencimiento,
        fechaProduccion: detalle.fechaProduccion,
        fechaIngreso: detalle.fechaIngreso,
        numContenedor: detalle.nroContenedor,
        nroSerie: detalle.nroSerie,
        estadoId: detalle.estadoMercaderiaId,
        estadoCalidadId: detalle.estadoCalidadId
      }
    });
    kardexGenerados.push(kardexOrigen);
  }
  
  // Si lleva kardex destino (INGRESO)
  if (concepto.llevaKardexDestino && concepto.almacenDestinoId) {
    // Obtener saldos iniciales
    const saldosIniciales = await obtenerUltimoKardex(
      tx,
      movimiento.empresaId,
      concepto.almacenDestinoId,
      detalle.productoId,
      detalle.entidadComercialId || movimiento.entidadComercialId,
      detalle.esCustodia || false,
      variables
    );

    // Calcular saldos finales (sumar ingreso)
    const saldoFinalCant = Number(saldosIniciales.saldoIniCant) + Number(detalle.cantidad);
    const saldoFinalPeso = detalle.peso
      ? Number(saldosIniciales.saldoInicialPeso || 0) + Number(detalle.peso)
      : null;
    const saldoFinalCantVariables = Number(saldosIniciales.saldoInicialCantVariables) + Number(detalle.cantidad);
    const saldoFinalPesoVariables = detalle.peso
      ? Number(saldosIniciales.saldoInicialPesoVariables || 0) + Number(detalle.peso)
      : null;

    const kardexDestino = await tx.kardexAlmacen.create({
      data: {
        empresaId: movimiento.empresaId,
        almacenId: concepto.almacenDestinoId,
        productoId: detalle.productoId,
        clienteId: detalle.entidadComercialId || movimiento.entidadComercialId || BigInt(0),
        esCustodia: detalle.esCustodia || false,
        fechaMovimientoAlmacen: movimiento.fechaDocumento,
        numDocCompleto: movimiento.numeroDocumento,
        esIngresoEgreso: true, // INGRESO
        conceptoMovAlmacenId: movimiento.conceptoMovAlmacenId,
        movimientoAlmacenId: movimiento.id,
        detalleMovimientoAlmacenId: detalle.id,
        // Ingresos
        ingresoCant: detalle.cantidad,
        ingresoPeso: detalle.peso,
        ingresoCantVariables: detalle.cantidad,
        ingresoPesoVariables: detalle.peso,
        // Saldos iniciales
        saldoIniCant: saldosIniciales.saldoIniCant,
        saldoInicialPeso: saldosIniciales.saldoInicialPeso,
        saldoInicialCantVariables: saldosIniciales.saldoInicialCantVariables,
        saldoInicialPesoVariables: saldosIniciales.saldoInicialPesoVariables,
        // Saldos finales
        saldoFinalCant: saldoFinalCant,
        saldoFinalPeso: saldoFinalPeso,
        saldoFinalCantVariables: saldoFinalCantVariables,
        saldoFinalPesoVariables: saldoFinalPesoVariables,
        // Variables de control
        lote: detalle.lote,
        fechaVencimiento: detalle.fechaVencimiento,
        fechaProduccion: detalle.fechaProduccion,
        fechaIngreso: detalle.fechaIngreso,
        numContenedor: detalle.nroContenedor,
        nroSerie: detalle.nroSerie,
        estadoId: detalle.estadoMercaderiaId,
        estadoCalidadId: detalle.estadoCalidadId
      }
    });
    kardexGenerados.push(kardexDestino);
  }
  
  return kardexGenerados;
};

/**
 * Actualiza saldos detallados por producto, cliente y características.
 * 
 * REGLA CRÍTICA: Para mercadería propia (esCustodia=false), clienteId = NULL
 */
export const actualizarSaldosDetallados = async (tx, movimiento, detalle, concepto) => {
  // Construir el objeto con TODAS las variables del constraint único
  // @@unique([empresaId, almacenId, productoId, clienteId, esCustodia, lote, fechaIngreso, fechaProduccion, fechaVencimiento, estadoId, estadoCalidadId, numContenedor, nroSerie])
  const buildUniqueWhere = (almacenId) => {
    const where = {
      empresaId: movimiento.empresaId,
      almacenId: BigInt(almacenId),
      productoId: detalle.productoId,
      esCustodia: detalle.esCustodia || false,
      lote: detalle.lote || null,
      fechaIngreso: detalle.fechaIngreso || null,
      fechaProduccion: detalle.fechaProduccion || null,
      fechaVencimiento: detalle.fechaVencimiento || null,
      estadoId: detalle.estadoMercaderiaId || null,
      estadoCalidadId: detalle.estadoCalidadId || null,
      numContenedor: detalle.nroContenedor || null,
      nroSerie: detalle.nroSerie || null
    };

    // REGLA: Solo agregar clienteId si es custodia
    if (detalle.esCustodia) {
      where.clienteId = detalle.entidadComercialId || movimiento.entidadComercialId || null;
    } else {
      where.clienteId = null; // Mercadería propia: clienteId = NULL
    }

    return where;
  };
  
  // Si es egreso (origen) - DECREMENTAR
  if (concepto.llevaKardexOrigen && concepto.almacenOrigenId) {
    const whereOrigen = buildUniqueWhere(concepto.almacenOrigenId);
    
    // Buscar saldo existente
    const saldoActual = await tx.saldosDetProductoCliente.findUnique({ 
      where: {
        empresaId_almacenId_productoId_clienteId_esCustodia_lote_fechaIngreso_fechaProduccion_fechaVencimiento_estadoId_estadoCalidadId_numContenedor_nroSerie: whereOrigen
      }
    });
    
    if (saldoActual) {
      // Actualizar saldo existente
      await tx.saldosDetProductoCliente.update({
        where: { id: saldoActual.id },
        data: {
          saldoCantidad: { decrement: detalle.cantidad },
          saldoPeso: detalle.peso ? { decrement: detalle.peso } : undefined,
          actualizadoEn: new Date()
        }
      });
    } else {
      // Si no existe saldo, es un error (no se puede retirar de donde no hay)
      throw new ValidationError(
        `No existe saldo disponible para el producto en el almacén origen. ` +
        `Producto: ${detalle.productoId}, Almacén: ${concepto.almacenOrigenId}`
      );
    }
  }
  
  // Si es ingreso (destino) - INCREMENTAR o CREAR
  if (concepto.llevaKardexDestino && concepto.almacenDestinoId) {
    const whereDestino = buildUniqueWhere(concepto.almacenDestinoId);
    
    // Usar upsert para crear o actualizar
    await tx.saldosDetProductoCliente.upsert({
      where: {
        empresaId_almacenId_productoId_clienteId_esCustodia_lote_fechaIngreso_fechaProduccion_fechaVencimiento_estadoId_estadoCalidadId_numContenedor_nroSerie: whereDestino
      },
      update: {
        saldoCantidad: { increment: detalle.cantidad },
        saldoPeso: detalle.peso ? { increment: detalle.peso } : undefined,
        actualizadoEn: new Date()
      },
      create: {
        ...whereDestino,
        saldoCantidad: detalle.cantidad,
        saldoPeso: detalle.peso || null,
        actualizadoEn: new Date()
      }
    });
  }
};

/**
 * Actualiza saldos generales por producto y cliente.
 * @@unique([empresaId, almacenId, productoId, clienteId, custodia])
 * 
 * REGLA CRÍTICA: Para mercadería propia (custodia=false), clienteId = NULL
 */
export const actualizarSaldosGenerales = async (tx, movimiento, detalle, concepto) => {
  // Construir el objeto con TODAS las variables del constraint único
  const buildUniqueWhere = (almacenId) => {
    const where = {
      empresaId: movimiento.empresaId,
      almacenId: BigInt(almacenId),
      productoId: detalle.productoId,
      custodia: detalle.esCustodia || false
    };

    // REGLA: Solo agregar clienteId si es custodia
    if (detalle.esCustodia) {
      where.clienteId = detalle.entidadComercialId || movimiento.entidadComercialId || null;
    } else {
      where.clienteId = null; // Mercadería propia: clienteId = NULL
    }

    return where;
  };
  
  // Si es egreso (origen) - DECREMENTAR
  if (concepto.llevaKardexOrigen && concepto.almacenOrigenId) {
    const whereOrigen = buildUniqueWhere(concepto.almacenOrigenId);
    
    // Buscar saldo existente usando el constraint único
    const saldoActual = await tx.saldosProductoCliente.findUnique({ 
      where: {
        empresaId_almacenId_productoId_clienteId_custodia: whereOrigen
      }
    });
    
    if (saldoActual) {
      await tx.saldosProductoCliente.update({
        where: { id: saldoActual.id },
        data: {
          saldoCantidad: { decrement: detalle.cantidad },
          saldoPeso: detalle.peso ? { decrement: detalle.peso } : undefined,
          actualizadoEn: new Date()
        }
      });
    } else {
      // Si no existe saldo general, es un error
      throw new ValidationError(
        `No existe saldo general disponible para el producto en el almacén origen. ` +
        `Producto: ${detalle.productoId}, Almacén: ${concepto.almacenOrigenId}`
      );
    }
  }
  
  // Si es ingreso (destino) - INCREMENTAR o CREAR
  if (concepto.llevaKardexDestino && concepto.almacenDestinoId) {
    const whereDestino = buildUniqueWhere(concepto.almacenDestinoId);
    
    // Usar upsert para crear o actualizar
    await tx.saldosProductoCliente.upsert({
      where: {
        empresaId_almacenId_productoId_clienteId_custodia: whereDestino
      },
      update: {
        saldoCantidad: { increment: detalle.cantidad },
        saldoPeso: detalle.peso ? { increment: detalle.peso } : undefined,
        actualizadoEn: new Date()
      },
      create: {
        ...whereDestino,
        saldoCantidad: detalle.cantidad,
        saldoPeso: detalle.peso || null,
        costoUnitarioPromedio: null, // Se calculará en otro proceso
        actualizadoEn: new Date()
      }
    });
  }
};

/**
 * Elimina kardex asociado a un movimiento.
 */
export const eliminarKardex = async (tx, movimientoId) => {
  await tx.kardexAlmacen.deleteMany({
    where: { movimientoAlmacenId: BigInt(movimientoId) }
  });
};

/**
 * Revierte saldos al anular un movimiento.
 */
export const revertirSaldos = async (tx, movimiento, detalles, concepto) => {
  for (const detalle of detalles) {
    // Revertir saldos detallados
    await revertirSaldosDetallados(tx, movimiento, detalle, concepto);
    
    // Revertir saldos generales
    await revertirSaldosGenerales(tx, movimiento, detalle, concepto);
  }
};

const revertirSaldosDetallados = async (tx, movimiento, detalle, concepto) => {
  const whereBase = {
    empresaId: movimiento.empresaId,
    productoId: detalle.productoId,
    clienteId: detalle.entidadComercialId || movimiento.entidadComercialId,
    esCustodia: detalle.esCustodia,
    lote: detalle.lote,
    fechaIngreso: detalle.fechaIngreso,
    fechaProduccion: detalle.fechaProduccion,
    fechaVencimiento: detalle.fechaVencimiento,
    estadoId: detalle.estadoMercaderiaId,
    estadoCalidadId: detalle.estadoCalidadId,
    numContenedor: detalle.nroContenedor,
    nroSerie: detalle.nroSerie
  };
  
  // Revertir egreso (sumar de vuelta)
  if (concepto.llevaKardexOrigen && concepto.almacenOrigenId) {
    const whereOrigen = { ...whereBase, almacenId: concepto.almacenOrigenId };
    const saldoActual = await tx.saldosDetProductoCliente.findFirst({ where: whereOrigen });
    
    if (saldoActual) {
      await tx.saldosDetProductoCliente.update({
        where: { id: saldoActual.id },
        data: {
          saldoCantidad: { increment: detalle.cantidad },
          saldoPeso: detalle.peso ? { increment: detalle.peso } : undefined,
          actualizadoEn: new Date()
        }
      });
    }
  }
  
  // Revertir ingreso (restar)
  if (concepto.llevaKardexDestino && concepto.almacenDestinoId) {
    const whereDestino = { ...whereBase, almacenId: concepto.almacenDestinoId };
    const saldoExistente = await tx.saldosDetProductoCliente.findFirst({ where: whereDestino });
    
    if (saldoExistente) {
      await tx.saldosDetProductoCliente.update({
        where: { id: saldoExistente.id },
        data: {
          saldoCantidad: { decrement: detalle.cantidad },
          saldoPeso: detalle.peso ? { decrement: detalle.peso } : undefined,
          actualizadoEn: new Date()
        }
      });
    }
  }
};

const revertirSaldosGenerales = async (tx, movimiento, detalle, concepto) => {
  // Revertir egreso
  if (concepto.llevaKardexOrigen && concepto.almacenOrigenId) {
    const whereOrigen = {
      empresaId: movimiento.empresaId,
      almacenId: concepto.almacenOrigenId,
      productoId: detalle.productoId,
      clienteId: detalle.entidadComercialId || movimiento.entidadComercialId,
      custodia: detalle.esCustodia
    };
    
    const saldoActual = await tx.saldosProductoCliente.findFirst({ where: whereOrigen });
    
    if (saldoActual) {
      await tx.saldosProductoCliente.update({
        where: { id: saldoActual.id },
        data: {
          saldoCantidad: { increment: detalle.cantidad },
          saldoPeso: detalle.peso ? { increment: detalle.peso } : undefined,
          actualizadoEn: new Date()
        }
      });
    }
  }
  
  // Revertir ingreso
  if (concepto.llevaKardexDestino && concepto.almacenDestinoId) {
    const whereDestino = {
      empresaId: movimiento.empresaId,
      almacenId: concepto.almacenDestinoId,
      productoId: detalle.productoId,
      clienteId: detalle.entidadComercialId || movimiento.entidadComercialId,
      custodia: detalle.esCustodia
    };
    
    const saldoExistente = await tx.saldosProductoCliente.findFirst({ where: whereDestino });
    
    if (saldoExistente) {
      await tx.saldosProductoCliente.update({
        where: { id: saldoExistente.id },
        data: {
          saldoCantidad: { decrement: detalle.cantidad },
          saldoPeso: detalle.peso ? { decrement: detalle.peso } : undefined,
          actualizadoEn: new Date()
        }
      });
    }
  }
};

export default {
  obtenerStockDisponible,
  validarStockDisponible,
  generarKardex,
  actualizarSaldosDetallados,
  actualizarSaldosGenerales,
  eliminarKardex,
  revertirSaldos
};
