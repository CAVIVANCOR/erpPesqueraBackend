import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from './correlativoOperacionCaja.service.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';
import { TIPO_LIBRO } from '../../utils/tiposLibroContable.js';
import { ESTADO_ASIENTO_CONTABLE } from '../../utils/estados.constants.js';
import { generarVoucherContableMovimientoCaja } from '../FlujoCaja/voucherContableMovimientoCaja.service.js';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO PROFESIONAL: MOVIMIENTOS DE CAJA ESPECIALIZADOS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Servicio unificado para procesar 3 tipos de operaciones de caja:
 * 
 * 1️⃣ TRANSFERENCIA INTERNA (cuenta origen + cuenta destino)
 *    - Mueve dinero entre dos cuentas de la misma empresa
 *    - Ejemplo: Transferir de BCP a Interbank
 *    - Crea: Egreso (origen) + Ingreso (destino) + ITF/comisiones opcionales
 * 
 * 2️⃣ EGRESO DIRECTO (solo cuenta origen)
 *    - Dinero sale de una cuenta sin ir a otra cuenta propia
 *    - Ejemplo: Retiro de efectivo, pago directo, gasto
 *    - Crea: Solo egreso + ITF/comisiones opcionales
 * 
 * 3️⃣ INGRESO DIRECTO (solo cuenta destino)
 *    - Dinero entra a una cuenta sin venir de otra cuenta propia
 *    - Ejemplo: Depósito de efectivo, ingreso externo, cobro
 *    - Crea: Solo ingreso + ITF/comisiones opcionales
 * 
 * @features
 * ✅ Validación inteligente según tipo de operación
 * ✅ Creación condicional de movimientos (solo los necesarios)
 * ✅ Actualización automática de saldos en cascada
 * ✅ Generación de correlativo único por operación
 * ✅ Transacción atómica (rollback automático en errores)
 * ✅ Soporta conversión de moneda con tipo de cambio
 * ✅ Sigue patrón establecido de pagos especializados CxC/CxP
 * ✅ Principios SOLID aplicados
 * 
 * @pattern
 * Basado en: pagoEspecializadoCuentaPorPagar.service.js
 * 
 * @author Sistema ERP Pesquera
 * @version 2.0 - Soporte para 3 tipos de operaciones (Enero 2025)
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - ESTADOS
// ════════════════════════════════════════════════════════════

const ESTADOS_MOVIMIENTO_CAJA = {
  PENDIENTE: 20,
  VALIDADO: 21,
  ASIENTO_GENERADO: 22
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - TIPOS DE MOVIMIENTO
// ════════════════════════════════════════════════════════════

const TIPOS_MOVIMIENTO = {
  ITF: 163,                    // ✅ ITF PORTES EMBARGOS MANTENIMIENTO DE CUENTAS COMISIONES
  COMISION_BANCARIA: 163,      // ✅ ITF PORTES EMBARGOS MANTENIMIENTO DE CUENTAS COMISIONES (mismo que ITF)
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - SUBMÓDULOS
// ════════════════════════════════════════════════════════════

const SUBMODULOS = {
  TRANSFERENCIAS_INTERNAS: 135     // Tesorería - Transferencias Internas
};

// ════════════════════════════════════════════════════════════
// CONSTANTES CONTABLES - CÓDIGOS DE CUENTAS
// ════════════════════════════════════════════════════════════

const CODIGOS_CUENTAS_CONTABLES = {
  ITF: '641101',                           // ✅ ITF
  COMISIONES_BANCARIAS: '679401',          // ✅ COMISIONES BANCARIAS
  TRANSFERENCIAS_INTERNAS: '104901'        // ✅ TRANSFERENCIAS INTERNAS EN TRÁNSITO
};

// ════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════

/**
 * Validar datos completos para procesamiento de transferencia interna
 * @param {Object} data - Datos de la transferencia
 * @param {Object} tx - Transacción de Prisma (opcional, usa prisma si no se proporciona)
 */
/**
 * ════════════════════════════════════════════════════════════════════════════
 * FUNCIÓN: VALIDAR DATOS DE MOVIMIENTO DE CAJA
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Valida los datos de entrada según el tipo de operación (egreso, ingreso o transferencia).
 * Aplica validaciones condicionales inteligentes: solo valida lo necesario para cada caso.
 * 
 * @principle SOLID - Single Responsibility
 * Esta función solo valida, no crea ni modifica datos.
 * 
 * @param {Object} data - Datos de la operación
 * @param {number} data.empresaId - ID de la empresa (OBLIGATORIO)
 * @param {Date} data.fechaTransferencia - Fecha de la operación (OBLIGATORIO)
 * @param {number} data.monto - Monto principal (OBLIGATORIO)
 * @param {number} data.usuarioId - ID del usuario que registra (OBLIGATORIO)
 * @param {number} [data.cuentaOrigenId] - ID cuenta origen (OPCIONAL - requerido para egreso/transferencia)
 * @param {number} [data.cuentaDestinoId] - ID cuenta destino (OPCIONAL - requerido para ingreso/transferencia)
 * @param {number} [data.medioPagoOrigenId] - Medio de pago origen (requerido si hay cuentaOrigenId)
 * @param {number} [data.medioPagoDestinoId] - Medio de pago destino (requerido si hay cuentaDestinoId)
 * @param {number} [data.tipoMovimientoEgresoId] - Tipo movimiento egreso (requerido si hay cuentaOrigenId)
 * @param {number} [data.tipoMovimientoIngresoId] - Tipo movimiento ingreso (requerido si hay cuentaDestinoId)
 * @param {number} [data.itfOrigen] - ITF cuenta origen (opcional)
 * @param {number} [data.comisionOrigen] - Comisión cuenta origen (opcional)
 * @param {number} [data.itfDestino] - ITF cuenta destino (opcional)
 * @param {number} [data.comisionDestino] - Comisión cuenta destino (opcional)
 * @param {number} [data.tipoCambio] - Tipo de cambio (requerido si monedas difieren)
 * @param {number} [data.montoDestino] - Monto en moneda destino (requerido si monedas difieren)
 * 
 * @param {Object} tx - Transacción de Prisma (opcional, usa prisma global si no se proporciona)
 * 
 * @returns {Promise<Object>} Objeto con cuentas validadas
 * @returns {Object|null} cuentaOrigen - Cuenta origen con relaciones (banco, moneda, empresa) o null
 * @returns {Object|null} cuentaDestino - Cuenta destino con relaciones (banco, moneda, empresa) o null
 * @returns {Object|null} saldoOrigen - Saldo actual de cuenta origen o null
 * 
 * @throws {ValidationError} Si faltan campos obligatorios o datos inválidos
 * @throws {NotFoundError} Si una cuenta especificada no existe
 * 
 * @example
 * // Transferencia interna (ambas cuentas)
 * const { cuentaOrigen, cuentaDestino } = await validarDatosTransferenciaInterna({
 *   empresaId: 1,
 *   fechaTransferencia: new Date(),
 *   monto: 1000,
 *   cuentaOrigenId: 1,
 *   cuentaDestinoId: 2,
 *   medioPagoOrigenId: 5,
 *   medioPagoDestinoId: 5,
 *   tipoMovimientoEgresoId: 10,
 *   tipoMovimientoIngresoId: 11,
 *   usuarioId: 1
 * }, tx);
 * 
 * @example
 * // Egreso directo (solo origen)
 * const { cuentaOrigen } = await validarDatosTransferenciaInterna({
 *   empresaId: 1,
 *   fechaTransferencia: new Date(),
 *   monto: 500,
 *   cuentaOrigenId: 1,
 *   medioPagoOrigenId: 5,
 *   tipoMovimientoEgresoId: 10,
 *   usuarioId: 1
 * }, tx);
 */
async function validarDatosTransferenciaInterna(data, tx = null) {
  const db = tx || prisma;
  
  // ========================================
  // VALIDAR CAMPOS BÁSICOS OBLIGATORIOS
  // ========================================
  const camposBasicos = ['empresaId', 'fechaTransferencia', 'monto', 'usuarioId'];
  const camposFaltantes = camposBasicos.filter(campo => !data[campo]);

  if (camposFaltantes.length > 0) {
    throw new ValidationError(`Faltan campos obligatorios: ${camposFaltantes.join(', ')}`);
  }

  // ========================================
  // VALIDAR QUE EXISTA AL MENOS UNA CUENTA
  // ========================================
  if (!data.cuentaOrigenId && !data.cuentaDestinoId) {
    throw new ValidationError('Debe especificar al menos una cuenta (origen o destino).');
  }

  // ========================================
  // VALIDAR MONTOS
  // ========================================
  if (Number(data.monto) <= 0) {
    throw new ValidationError('El monto debe ser mayor a cero.');
  }

  if (data.itfOrigen && Number(data.itfOrigen) < 0) {
    throw new ValidationError('El ITF de origen no puede ser negativo.');
  }
  if (data.comisionOrigen && Number(data.comisionOrigen) < 0) {
    throw new ValidationError('La comisión de origen no puede ser negativa.');
  }
  if (data.itfDestino && Number(data.itfDestino) < 0) {
    throw new ValidationError('El ITF de destino no puede ser negativo.');
  }
  if (data.comisionDestino && Number(data.comisionDestino) < 0) {
    throw new ValidationError('La comisión de destino no puede ser negativa.');
  }

  // ========================================
  // VALIDAR Y CARGAR CUENTA ORIGEN (si existe)
  // ========================================
  let cuentaOrigen = null;
  let saldoOrigen = null;

  if (data.cuentaOrigenId) {
    // Validar campos requeridos para cuenta origen
    if (!data.medioPagoOrigenId) {
      throw new ValidationError('El medio de pago de origen es obligatorio cuando hay cuenta origen.');
    }
    if (!data.tipoMovimientoEgresoId) {
      throw new ValidationError('El tipo de movimiento de egreso es obligatorio cuando hay cuenta origen.');
    }

    cuentaOrigen = await db.cuentaCorriente.findUnique({
      where: { id: Number(data.cuentaOrigenId) },
      include: {
        banco: true,
        moneda: true,
        empresa: true
      }
    });

    if (!cuentaOrigen) {
      throw new NotFoundError('Cuenta de origen no encontrada.');
    }

    // Validar saldo disponible
    const totalDebitado = Number(data.monto) + 
                          Number(data.itfOrigen || 0) + 
                          Number(data.comisionOrigen || 0);

    saldoOrigen = await db.saldoCuentaCorriente.findFirst({
      where: {
        cuentaCorrienteId: cuentaOrigen.id,
        empresaId: Number(data.empresaId)
      },
      orderBy: { fecha: 'desc' }
    });

    const saldoDisponible = saldoOrigen ? Number(saldoOrigen.saldoActual) : 0;
    
    if (saldoDisponible < totalDebitado) {
      throw new ValidationError(
        `Saldo insuficiente en cuenta de origen. ` +
        `Disponible: ${saldoDisponible}, Requerido: ${totalDebitado}`
      );
    }
  }

  // ========================================
  // VALIDAR Y CARGAR CUENTA DESTINO (si existe)
  // ========================================
  let cuentaDestino = null;

  if (data.cuentaDestinoId) {
    // Validar campos requeridos para cuenta destino
    if (!data.medioPagoDestinoId) {
      throw new ValidationError('El medio de pago de destino es obligatorio cuando hay cuenta destino.');
    }
    if (!data.tipoMovimientoIngresoId) {
      throw new ValidationError('El tipo de movimiento de ingreso es obligatorio cuando hay cuenta destino.');
    }

    cuentaDestino = await db.cuentaCorriente.findUnique({
      where: { id: Number(data.cuentaDestinoId) },
      include: {
        banco: true,
        moneda: true,
        empresa: true
      }
    });

    if (!cuentaDestino) {
      throw new NotFoundError('Cuenta de destino no encontrada.');
    }
  }

  // ========================================
  // VALIDAR QUE NO SEAN LA MISMA CUENTA (si ambas existen)
  // ========================================
  if (cuentaOrigen && cuentaDestino && cuentaOrigen.id === cuentaDestino.id) {
    throw new ValidationError('La cuenta de origen y destino no pueden ser la misma.');
  }

  // ========================================
  // VALIDAR TIPO DE CAMBIO (si hay conversión)
  // ========================================
  if (cuentaOrigen && cuentaDestino && cuentaOrigen.monedaId !== cuentaDestino.monedaId) {
    if (!data.tipoCambio || Number(data.tipoCambio) <= 0) {
      throw new ValidationError(
        'Debe proporcionar un tipo de cambio válido para operaciones entre diferentes monedas.'
      );
    }
    if (!data.montoDestino || Number(data.montoDestino) <= 0) {
      throw new ValidationError(
        'Debe proporcionar el monto de destino para operaciones entre diferentes monedas.'
      );
    }
  }

  return { cuentaOrigen, cuentaDestino, saldoOrigen };
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN HELPER: ACTUALIZAR SALDO DE CUENTA CORRIENTE
// ════════════════════════════════════════════════════════════
/**
 * ✅ UNA SOLA VERDAD: Actualizar saldo de cuenta corriente CON CONVERSIÓN DE MONEDA
 * COPIADO DEL PATRÓN DE PAGOS ESPECIALIZADOS
 */
async function actualizarSaldoCuentaCorriente({
  tx,
  cuentaCorrienteId,
  empresaId,
  fecha,
  ingresos = 0,
  egresos = 0,
  monedaMovimientoId,
  tipoCambio = 1,
  movimientoCajaId,
  centroCostoId = null,
  saldoAnteriorManual = null
}) {
  // 1. Obtener cuenta corriente con su moneda
  const cuentaCorriente = await tx.cuentaCorriente.findUnique({
    where: { id: Number(cuentaCorrienteId) },
    select: { monedaId: true }
  });

  if (!cuentaCorriente) {
    throw new Error(`Cuenta corriente ${cuentaCorrienteId} no encontrada`);
  }

  // 2. Convertir montos a la moneda de la cuenta corriente
  let ingresosEnMonedaCuenta = Number(ingresos);
  let egresosEnMonedaCuenta = Number(egresos);

  const monedaCuentaId = Number(cuentaCorriente.monedaId);
  const monedaMovId = Number(monedaMovimientoId);

  // Solo convertir si las monedas son diferentes
  if (monedaCuentaId !== monedaMovId) {
    const tc = Number(tipoCambio);
    
    // Asumiendo: ID 1 = PEN (Soles), ID 2 = USD (Dólares)
    if (monedaMovId === 1 && monedaCuentaId === 2) {
      // Movimiento en Soles, Cuenta en Dólares: dividir entre TC
      ingresosEnMonedaCuenta = ingresosEnMonedaCuenta / tc;
      egresosEnMonedaCuenta = egresosEnMonedaCuenta / tc;
    } else if (monedaMovId === 2 && monedaCuentaId === 1) {
      // Movimiento en Dólares, Cuenta en Soles: multiplicar por TC
      ingresosEnMonedaCuenta = ingresosEnMonedaCuenta * tc;
      egresosEnMonedaCuenta = egresosEnMonedaCuenta * tc;
    }
  }

  // 3. Obtener saldo anterior
  let saldoAnterior;
  
  if (saldoAnteriorManual !== null) {
    saldoAnterior = Number(saldoAnteriorManual);
  } else {
    const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
      where: { cuentaCorrienteId: Number(cuentaCorrienteId) },
      orderBy: { fecha: 'desc' }
    });
    saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;
  }

  // 4. Calcular nuevo saldo EN LA MONEDA DE LA CUENTA
  const nuevoSaldoActual = saldoAnterior + ingresosEnMonedaCuenta - egresosEnMonedaCuenta;

  // 5. Crear registro de saldo
  return await tx.saldoCuentaCorriente.create({
    data: {
      cuentaCorrienteId: Number(cuentaCorrienteId),
      empresaId: Number(empresaId),
      fecha,
      saldoAnterior,
      ingresos: ingresosEnMonedaCuenta,
      egresos: egresosEnMonedaCuenta,
      saldoActual: nuevoSaldoActual,
      movimientoCajaId: Number(movimientoCajaId),
      centroCostoId: centroCostoId ? Number(centroCostoId) : null,
      conciliado: false
    }
  });
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN: GENERAR ASIENTOS CONTABLES PARA TRANSFERENCIAS
// ════════════════════════════════════════════════════════════

/**
 * ════════════════════════════════════════════════════════════════════════════
 * GENERAR ASIENTOS CONTABLES PARA MOVIMIENTOS DE TRANSFERENCIA
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Genera asientos contables automáticamente para cada movimiento de caja creado.
 * Sigue el patrón de pagoEspecializadoCuentaPorCobrar.service.js
 * 
 * @pattern
 * - Un asiento por cada movimiento con monto > 0
 * - Vinculación por procesoOrigenId = MovimientoCaja.id
 * - Usa referencia de asientos-contables-referencia.json
 * 
 * @param {Array} movimientos - Array de MovimientoCaja creados
 * @param {Object} periodoContable - Período contable
 * @param {Number} empresaId - ID empresa
 * @param {Number} creadoPor - ID usuario
 * @param {Object} cuentaOrigen - Cuenta corriente origen (puede ser null)
 * @param {Object} cuentaDestino - Cuenta corriente destino (puede ser null)
 * @param {Object} tx - Transacción Prisma
 * @returns {Promise<Array>} Array de asientos creados
 */
async function generarAsientosContablesTransferencia(
  movimientos,
  periodoContable,
  empresaId,
  creadoPor,
  cuentaOrigen,
  cuentaDestino,
  tx
) {
  try {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║  INICIANDO GENERACIÓN DE ASIENTOS CONTABLES               ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    console.log(`📊 Total de movimientos a procesar: ${movimientos.length}`);
    console.log(`📋 IDs de movimientos: ${movimientos.map(m => m.id).join(', ')}`);

    // ========================================
    // 1. BUSCAR SUBMÓDULO "MovimientoCaja"
    // ========================================
    const submodulo = await tx.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "MovimientoCaja",
        activo: true
      }
    });

    if (!submodulo) {
      throw new ValidationError('No se encontró el submódulo "MovimientoCaja"');
    }

    // ========================================
    // 2. BUSCAR ESTADO PENDIENTE
    // ========================================
    const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) }
    });

    if (!estadoPendiente) {
      throw new ValidationError('No se encontró el estado PENDIENTE para asientos contables');
    }

    // ========================================
    // 3. BUSCAR CUENTA CONTABLE DE TERCEROS
    // ========================================
    // Cuenta 461101 - RECLAMACIONES DE TERCEROS M.N.
    const cuentaTercerosSoles = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: '461101' }
    });

    // Cuenta 461102 - RECLAMACIONES DE TERCEROS M.E.
    const cuentaTercerosDolares = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: '461102' }
    });

    if (!cuentaTercerosSoles) {
      console.warn('⚠️ No se encontró la cuenta 461101 (Terceros Soles)');
    }
    if (!cuentaTercerosDolares) {
      console.warn('⚠️ No se encontró la cuenta 461102 (Terceros Dólares)');
    }

    const asientosCreados = [];

    // ========================================
    // 4. GENERAR ASIENTO PARA CADA MOVIMIENTO
    // ========================================
    for (let i = 0; i < movimientos.length; i++) {
      const movimiento = movimientos[i];
      console.log(`\n[${i + 1}/${movimientos.length}] Procesando movimiento ID: ${movimiento.id}`);

      try {
        // Cargar movimiento completo con relaciones
        const movimientoCompleto = await tx.movimientoCaja.findUnique({
          where: { id: movimiento.id },
          include: {
            tipoMovimiento: true,
            moneda: true,
            cuentaCorrienteOrigen: {
              include: {
                banco: true,
                moneda: true,
                cuentaContable: true
              }
            },
            cuentaCorrienteDestino: {
              include: {
                banco: true,
                moneda: true,
                cuentaContable: true
              }
            }
          }
        });

        if (!movimientoCompleto) {
          console.warn(`⚠️ No se encontró el movimiento ${movimiento.id}`);
          continue;
        }

        // Determinar tipo de asiento según el movimiento
        const asiento = await crearAsientoSegunTipo(
          movimientoCompleto,
          periodoContable,
          empresaId,
          creadoPor,
          submodulo,
          estadoPendiente,
          cuentaOrigen,
          cuentaDestino,
          cuentaTercerosSoles,
          cuentaTercerosDolares,
          tx
        );

        if (asiento) {
          asientosCreados.push(asiento);
          console.log(`✅ Asiento creado: ${asiento.numeroAsiento} (ID: ${asiento.id})`);
        }
      } catch (error) {
        console.error(`❌ Error generando asiento para movimiento ${movimiento.id}:`, error.message);
        // Continuar con el siguiente movimiento
      }
    }

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║  RESUMEN FINAL DE GENERACIÓN DE ASIENTOS                  ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    console.log(`📊 Movimientos procesados: ${movimientos.length}`);
    console.log(`✅ Asientos generados: ${asientosCreados.length}`);
    console.log(`❌ Movimientos omitidos: ${movimientos.length - asientosCreados.length}`);
    if (asientosCreados.length > 0) {
      console.log(`📝 IDs de asientos creados: ${asientosCreados.map(a => a.id).join(', ')}`);
    }
    console.log(`════════════════════════════════════════════════════════════\n`);

    // ✅ Recargar asientos con la relación moneda para el frontend
    const asientosConMoneda = await tx.asientoContable.findMany({
      where: {
        id: { in: asientosCreados.map(a => a.id) }
      },
      include: {
        moneda: true
      }
    });

    return asientosConMoneda;
  } catch (error) {
    console.error('❌ Error generando asientos contables:', error);
    throw error;
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CREAR ASIENTO SEGÚN TIPO DE MOVIMIENTO
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Determina el tipo de asiento a crear según el contexto del movimiento:
 * - TRANSFERENCIA_ENTRE_CUENTAS: Si hay cuenta origen Y destino
 * - PAGO_A_TERCERO: Si solo hay cuenta origen (egreso)
 * - INGRESO_DE_TERCERO: Si solo hay cuenta destino (ingreso)
 * - ITF y Comisión: Se omiten (no generan asiento contable)
 */
async function crearAsientoSegunTipo(
  movimiento,
  periodoContable,
  empresaId,
  creadoPor,
  submodulo,
  estadoPendiente,
  cuentaOrigen,
  cuentaDestino,
  cuentaTercerosSoles,
  cuentaTercerosDolares,
  tx
) {
  // ========================================
  // DETERMINAR TIPO DE MOVIMIENTO
  // ========================================
  // ✅ PROFESIONAL: Diferenciar ITF y Comisión por descripción (mismo tipoMovimientoId: 163)
  const tipoMovimientoEsITFoComision = Number(movimiento.tipoMovimientoId) === TIPOS_MOVIMIENTO.ITF;
  const descripcionUpper = movimiento.descripcion ? movimiento.descripcion.toUpperCase() : '';
  const esITF = tipoMovimientoEsITFoComision && descripcionUpper.startsWith('ITF');
  const esComision = tipoMovimientoEsITFoComision && 
                     (descripcionUpper.startsWith('COMISION') || descripcionUpper.startsWith('COMISIÓN'));
  
  let cuentaDebe = null;
  let cuentaHaber = null;
  let glosa = '';
  let centroCostoId = null;
  const monedaId = Number(movimiento.monedaId);
  const montoOriginal = Number(movimiento.monto);
  const tipoCambio = Number(movimiento.tipoCambio || 1);
  
  // ✅ Los asientos contables SIEMPRE deben estar en SOLES (moneda nacional)
  // Si la moneda es USD (monedaId === 2), convertir a soles
  const monto = monedaId === 2 ? montoOriginal * tipoCambio : montoOriginal;

  // ========================================
  // CASO 1: ITF (Impuesto a las Transacciones Financieras)
  // ========================================
  if (esITF) {
    console.log(`   💸 Tipo: ITF (Egreso bancario)`);
    
    // Buscar cuenta de gasto ITF (641101)
    const cuentaGastoITF = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: '641101' }
    });
    
    if (!cuentaGastoITF) {
      console.error(`   ❌ ERROR: No se encontró la cuenta 641101 (Gasto ITF)`);
      return null;
    }
    
    if (!cuentaGastoITF.centroCostoId) {
      console.error(`   ❌ ERROR: La cuenta 641101 no tiene centro de costo asignado`);
      return null;
    }
    
    // ITF es EGRESO: usa cuentaCorrienteOrigen (de donde sale el dinero)
    if (!movimiento.cuentaCorrienteOrigen?.cuentaContable) {
      console.error(`   ❌ ERROR: La cuenta origen no tiene cuenta contable asociada`);
      return null;
    }
    
    cuentaDebe = cuentaGastoITF.id;
    cuentaHaber = movimiento.cuentaCorrienteOrigen.cuentaContable.id;
    centroCostoId = cuentaGastoITF.centroCostoId;
    glosa = `POR EL ITF - ${movimiento.descripcion || 'TRANSFERENCIA'}`;
    
    console.log(`      ✅ DEBE: ${cuentaDebe} (Gasto ITF 641101)`);
    console.log(`      ✅ HABER: ${cuentaHaber} (Banco)`);
    console.log(`      ✅ Centro Costo: ${centroCostoId}`);
  }
  // ========================================
  // CASO 2: COMISIÓN BANCARIA
  // ========================================
  else if (esComision) {
    console.log(`   💳 Tipo: COMISIÓN BANCARIA (Egreso bancario)`);
    
    // Buscar cuenta de gasto comisión (679401)
    const cuentaGastoComision = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: '679401' }
    });
    
    if (!cuentaGastoComision) {
      console.error(`   ❌ ERROR: No se encontró la cuenta 679401 (Gasto Comisión Bancaria)`);
      return null;
    }
    
    if (!cuentaGastoComision.centroCostoId) {
      console.error(`   ❌ ERROR: La cuenta 679401 no tiene centro de costo asignado`);
      return null;
    }
    
    // Comisión es EGRESO: usa cuentaCorrienteOrigen (de donde sale el dinero)
    if (!movimiento.cuentaCorrienteOrigen?.cuentaContable) {
      console.error(`   ❌ ERROR: La cuenta origen no tiene cuenta contable asociada`);
      return null;
    }
    
    cuentaDebe = cuentaGastoComision.id;
    cuentaHaber = movimiento.cuentaCorrienteOrigen.cuentaContable.id;
    centroCostoId = cuentaGastoComision.centroCostoId;
    glosa = `POR LA COMISIÓN BANCARIA - ${movimiento.descripcion || 'TRANSFERENCIA'}`;
    
    console.log(`      ✅ DEBE: ${cuentaDebe} (Gasto Comisión 679401)`);
    console.log(`      ✅ HABER: ${cuentaHaber} (Banco)`);
    console.log(`      ✅ Centro Costo: ${centroCostoId}`);
  }
  // ========================================
  // CASO 3: TRANSFERENCIA ENTRE CUENTAS
  // ========================================
  else if (cuentaOrigen && cuentaDestino) {
    console.log(`   📋 Tipo: TRANSFERENCIA_ENTRE_CUENTAS`);
    
    // DEBE: Cuenta que RECIBE (cuentaDestino)
    // HABER: Cuenta que ENTREGA (cuentaOrigen)
    cuentaDebe = cuentaDestino.cuentaContableId;
    cuentaHaber = cuentaOrigen.cuentaContableId;
    glosa = `TRANSFERENCIA DE ${cuentaOrigen.banco?.nombre || 'CUENTA'} A ${cuentaDestino.banco?.nombre || 'CUENTA'}`;
    
    console.log(`      ✅ DEBE: ${cuentaDebe} (${cuentaDestino.banco?.nombre})`);
    console.log(`      ✅ HABER: ${cuentaHaber} (${cuentaOrigen.banco?.nombre})`);
  }
  // ========================================
  // CASO 4: PAGO A TERCERO (solo cuenta origen - egreso)
  // ========================================
  else if (cuentaOrigen && !cuentaDestino && movimiento.cuentaCorrienteDestinoId) {
    console.log(`   📋 Tipo: PAGO_A_TERCERO`);
    
    // DEBE: Terceros (461101 o 461102)
    // HABER: Cuenta bancaria que entrega
    const cuentaTerceros = monedaId === 1 ? cuentaTercerosSoles : cuentaTercerosDolares;
    cuentaDebe = cuentaTerceros?.id;
    cuentaHaber = movimiento.cuentaCorrienteDestino?.cuentaContable?.id;
    glosa = `POR LA TRANSFERENCIA ${movimiento.descripcion || 'A TERCERO'}`;
    
    console.log(`      ✅ DEBE: ${cuentaDebe} (Terceros)`);
    console.log(`      ✅ HABER: ${cuentaHaber} (Banco)`);
  }
  // ========================================
  // CASO 5: INGRESO DE TERCERO (solo cuenta destino - ingreso)
  // ========================================
  else if (!cuentaOrigen && cuentaDestino && movimiento.cuentaCorrienteOrigenId) {
    console.log(`   📋 Tipo: INGRESO_DE_TERCERO`);
    
    // DEBE: Cuenta bancaria que recibe
    // HABER: Terceros (461101 o 461102)
    const cuentaTerceros = monedaId === 1 ? cuentaTercerosSoles : cuentaTercerosDolares;
    cuentaDebe = movimiento.cuentaCorrienteOrigen?.cuentaContable?.id;
    cuentaHaber = cuentaTerceros?.id;
    glosa = `POR EL INGRESO ${movimiento.descripcion || 'DE TERCERO'}`;
    
    console.log(`      ✅ DEBE: ${cuentaDebe} (Banco)`);
    console.log(`      ✅ HABER: ${cuentaHaber} (Terceros)`);
  }
  else {
    console.warn(`   ⚠️  No se pudo determinar el tipo de asiento para movimiento ${movimiento.id}`);
    console.warn(`   Tipo: ${tipoMovNombre}`);
    console.warn(`   Contexto: cuentaOrigen=${!!cuentaOrigen}, cuentaDestino=${!!cuentaDestino}`);
    console.warn(`   Movimiento: cuentaCorrienteOrigenId=${!!movimiento.cuentaCorrienteOrigenId}, cuentaCorrienteDestinoId=${!!movimiento.cuentaCorrienteDestinoId}`);
    return null;
  }

  // ========================================
  // VALIDAR CUENTAS CONTABLES
  // ========================================
  if (!cuentaDebe || !cuentaHaber) {
    console.warn(`   ⚠️  Faltan cuentas contables (DEBE: ${cuentaDebe}, HABER: ${cuentaHaber})`);
    return null;
  }

  // ========================================
  // GENERAR CORRELATIVO Y NÚMERO DE ASIENTO
  // ========================================
  const ultimoAsiento = await tx.asientoContable.findFirst({
    where: {
      empresaId: Number(empresaId),
      periodoContableId: Number(periodoContable.id)
    },
    orderBy: { correlativo: 'desc' }
  });

  const nuevoCorrelativo = ultimoAsiento ? Number(ultimoAsiento.correlativo) + 1 : 1;
  const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(6, '0')}`;

  // ========================================
  // DETERMINAR TIPO DE LIBRO (FISCAL o GERENCIAL)
  // ========================================
  const esGerencial = false;  // Las transferencias son siempre fiscales
  const tipoLibro = esGerencial ? "GERENCIAL" : "FISCAL";

  // ========================================
  // CREAR ASIENTO CONTABLE
  // ========================================
  const asiento = await tx.asientoContable.create({
    data: {
      empresaId: Number(empresaId),
      periodoContableId: Number(periodoContable.id),
      numeroAsiento: numeroAsiento,
      correlativo: nuevoCorrelativo,
      fechaAsiento: movimiento.fechaOperacionMovCaja,
      glosa: glosa,
      tipoLibro: tipoLibro,  // ✅ "FISCAL" o "GERENCIAL"
      tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
      esGerencial: esGerencial,
      esSaldoInicial: false,
      origenAsiento: "AUTOMATICO",
      submoduloOrigenId: submodulo.id,
      procesoOrigenId: movimiento.id,  // ✅ VINCULA ASIENTO ↔ MOVIMIENTO
      estadoId: estadoPendiente.id,
      totalDebe: montoOriginal,  // ✅ Monto en moneda ORIGINAL del movimiento
      totalHaber: montoOriginal,  // ✅ Monto en moneda ORIGINAL del movimiento
      diferencia: 0,
      estaCuadrado: true,
      monedaId: monedaId,  // ✅ Moneda ORIGINAL del movimiento (USD o PEN)
      tipoCambio: tipoCambio,
      creadoPor: creadoPor,
      detalles: {
        create: [
          {
            numeroLinea: 1,
            planCuentaId: cuentaDebe,
            glosa: glosa,
            debe: monto,  // ✅ Monto convertido a SOLES para contabilidad
            haber: 0,
            monedaId: monedaId,  // ✅ Moneda ORIGINAL del movimiento
            tipoCambio: tipoCambio,
            debeMonedaExtranjera: monedaId === 2 ? montoOriginal : null,  // ✅ Monto original en USD si aplica
            haberMonedaExtranjera: null,
            centroCostoId: centroCostoId,  // ✅ Para ITF y Comisión
            entidadComercialId: null,
            tipoDocumentoOrigenId: null,
            numeroDocumentoOrigen: movimiento.numeroOperacionPagoBanco,
            fechaDocumentoOrigen: movimiento.fechaOperacionMovCaja,
            fechaVenceDocumentoOrigen: null,
            submoduloOrigenLineaId: submodulo.id,
            procesoOrigenLineaId: movimiento.id,
            creadoPor: creadoPor
          },
          {
            numeroLinea: 2,
            planCuentaId: cuentaHaber,
            glosa: glosa,
            debe: 0,
            haber: monto,  // ✅ Monto convertido a SOLES para contabilidad
            monedaId: monedaId,  // ✅ Moneda ORIGINAL del movimiento
            tipoCambio: tipoCambio,
            debeMonedaExtranjera: null,
            haberMonedaExtranjera: monedaId === 2 ? montoOriginal : null,  // ✅ Monto original en USD si aplica
            centroCostoId: null,
            entidadComercialId: null,
            tipoDocumentoOrigenId: null,
            numeroDocumentoOrigen: movimiento.numeroOperacionPagoBanco,
            fechaDocumentoOrigen: movimiento.fechaOperacionMovCaja,
            fechaVenceDocumentoOrigen: null,
            submoduloOrigenLineaId: submodulo.id,
            procesoOrigenLineaId: movimiento.id,
            creadoPor: creadoPor
          }
        ]
      }
    }
  });

  return asiento;
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: PROCESAR MOVIMIENTO DE CAJA ESPECIALIZADO
// ════════════════════════════════════════════════════════════

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PROCESAR MOVIMIENTO DE CAJA ESPECIALIZADO
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Procesa movimientos de caja especializados: transferencia interna, egreso directo o ingreso directo.
 * Crea todos los movimientos necesarios de forma atómica y actualiza saldos en cascada.
 * 
 * @pattern Sigue el patrón de pagoEspecializadoCuentaPorPagar.service.js
 * 
 * @workflow
 * 1. Validar datos según tipo de operación
 * 2. Generar correlativo único
 * 3. Crear movimiento egreso (si hay cuenta origen) + ITF/comisión opcionales
 * 4. Crear movimiento ingreso (si hay cuenta destino) + ITF/comisión opcionales
 * 5. Actualizar saldos en cascada
 * 6. Retornar IDs de movimientos creados
 * 
 * @param {Object} data - Datos del movimiento (ver validarDatosTransferenciaInterna para detalles)
 * @returns {Promise<Object>} { success, correlativo, movimientoEgresoId, movimientoIngresoId, ... }
 * @throws {ValidationError|NotFoundError|DatabaseError}
 * @transaction Toda la operación es atómica (rollback automático en errores)
 */
export async function procesarTransferenciaInterna(data) {
  return await prisma.$transaction(async (tx) => {
    try {
      // ========================================
      // PASO 1: VALIDAR DATOS
      // ========================================
      const { cuentaOrigen, cuentaDestino, saldoOrigen } = 
        await validarDatosTransferenciaInterna(data, tx);

      // ========================================
      // PASO 2: GENERAR CORRELATIVO DE OPERACIÓN
      // ========================================
      const correlativo = await correlativoService.generarCorrelativo(
        Number(data.empresaId),
        tx
      );

      // ========================================
      // PASO 3: CALCULAR DATOS CONTABLES
      // ========================================
      const fechaContable = new Date(data.fechaTransferencia);
      
      const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(
        Number(data.empresaId),
        fechaContable
      );

      // Generar descripción dinámica según el tipo de operación
      let descripcion = data.descripcion;
      if (!descripcion) {
        if (cuentaOrigen && cuentaDestino) {
          descripcion = `Transferencia de ${cuentaOrigen.banco.nombre} a ${cuentaDestino.banco.nombre}`;
        } else if (cuentaOrigen) {
          descripcion = `Egreso desde ${cuentaOrigen.banco.nombre}`;
        } else {
          descripcion = `Ingreso a ${cuentaDestino.banco.nombre}`;
        }
      }

      // ========================================
      // PASO 4: CREAR MOVIMIENTO DE CAJA - EGRESO (si hay cuenta origen)
      // ========================================
      let movimientoEgreso = null;
      let saldoDespuesEgreso = null;
      
      if (cuentaOrigen) {
        movimientoEgreso = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: Number(data.tipoMovimientoEgresoId),
            empresaId: Number(data.empresaId),
            monto: Number(data.monto),
            monedaId: Number(cuentaOrigen.monedaId),
            medioPagoId: Number(data.medioPagoOrigenId),
            cuentaCorrienteDestinoId: Number(cuentaOrigen.id),  // ✅ Para EGRESO: cuenta origen
            fechaOperacionMovCaja: new Date(data.fechaTransferencia),
            descripcion: descripcion,
            numeroOperacionPagoBanco: data.numeroOperacion || null,
            fechaOperacionPagoBanco: new Date(data.fechaTransferencia),
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            tipoCambio: Number(data.tipoCambio || 1),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: SUBMODULOS.TRANSFERENCIAS_INTERNAS,
            origenMotivoOperacionId: null
          }
        });

        // ✅ Actualizar saldo de cuenta corriente (EGRESO)
        const registroSaldo = await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: cuentaOrigen.id,
          empresaId: data.empresaId,
          fecha: fechaContable,
          ingresos: 0,
          egresos: data.monto,
          monedaMovimientoId: cuentaOrigen.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoEgreso.id
        });
        saldoDespuesEgreso = registroSaldo.saldoActual;
      }

      // ========================================
      // PASO 5: CREAR MOVIMIENTO DE CAJA - ITF ORIGEN (si aplica)
      // ========================================
      let movimientoITFOrigen = null;
      let saldoDespuesITFOrigen = null;
      
      if (cuentaOrigen && data.itfOrigen && Number(data.itfOrigen) > 0) {
        movimientoITFOrigen = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
            empresaId: Number(data.empresaId),
            monto: Number(data.itfOrigen),
            monedaId: Number(cuentaOrigen.monedaId),
            medioPagoId: Number(data.medioPagoOrigenId),
            cuentaCorrienteOrigenId: Number(cuentaOrigen.id),
            fechaOperacionMovCaja: new Date(data.fechaTransferencia),
            descripcion: `ITF - ${descripcion}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            tipoCambio: Number(data.tipoCambio || 1),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: SUBMODULOS.TRANSFERENCIAS_INTERNAS,
            origenMotivoOperacionId: null
          }
        });

        // ✅ Actualizar saldo (EGRESO por ITF)
        const registroSaldo = await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: cuentaOrigen.id,
          empresaId: data.empresaId,
          fecha: fechaContable,
          ingresos: 0,
          egresos: data.itfOrigen,
          monedaMovimientoId: cuentaOrigen.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoITFOrigen.id,
          saldoAnteriorManual: saldoDespuesEgreso
        });
        saldoDespuesITFOrigen = registroSaldo.saldoActual;
      }

      // ========================================
      // PASO 6: CREAR MOVIMIENTO DE CAJA - COMISIÓN ORIGEN (si aplica)
      // ========================================
      let movimientoComisionOrigen = null;
      let saldoDespuesComisionOrigen = null;
      
      if (cuentaOrigen && data.comisionOrigen && Number(data.comisionOrigen) > 0) {
        movimientoComisionOrigen = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
            empresaId: Number(data.empresaId),
            monto: Number(data.comisionOrigen),
            monedaId: Number(cuentaOrigen.monedaId),
            medioPagoId: Number(data.medioPagoOrigenId),
            cuentaCorrienteOrigenId: Number(cuentaOrigen.id),
            fechaOperacionMovCaja: new Date(data.fechaTransferencia),
            descripcion: `Comisión - ${descripcion}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            tipoCambio: Number(data.tipoCambio || 1),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: SUBMODULOS.TRANSFERENCIAS_INTERNAS,
            origenMotivoOperacionId: null
          }
        });

        // ✅ Actualizar saldo (EGRESO por comisión)
        const registroSaldo = await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: cuentaOrigen.id,
          empresaId: data.empresaId,
          fecha: fechaContable,
          ingresos: 0,
          egresos: data.comisionOrigen,
          monedaMovimientoId: cuentaOrigen.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoComisionOrigen.id,
          saldoAnteriorManual: saldoDespuesITFOrigen || saldoDespuesEgreso
        });
        saldoDespuesComisionOrigen = registroSaldo.saldoActual;
      }

      // ========================================
      // PASO 7: CREAR MOVIMIENTO DE CAJA - INGRESO (si hay cuenta destino)
      // ========================================
      let movimientoIngreso = null;
      let saldoDespuesIngreso = null;
      
      if (cuentaDestino) {
        const montoDestino = data.montoDestino || data.monto;
        
        movimientoIngreso = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: Number(data.tipoMovimientoIngresoId),
            empresaId: Number(data.empresaId),
            monto: Number(montoDestino),
            monedaId: Number(cuentaDestino.monedaId),
            medioPagoId: Number(data.medioPagoDestinoId),
            cuentaCorrienteOrigenId: Number(cuentaDestino.id),  // ✅ Para INGRESO: cuenta destino
            fechaOperacionMovCaja: new Date(data.fechaTransferencia),
            descripcion: descripcion,
            numeroOperacionPagoBanco: data.numeroOperacion || null,
            fechaOperacionPagoBanco: new Date(data.fechaTransferencia),
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            tipoCambio: Number(data.tipoCambio || 1),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: SUBMODULOS.TRANSFERENCIAS_INTERNAS,
            origenMotivoOperacionId: null
          }
        });

        // ✅ Actualizar saldo de cuenta corriente (INGRESO)
        const registroSaldo = await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: cuentaDestino.id,
          empresaId: data.empresaId,
          fecha: fechaContable,
          ingresos: montoDestino,
          egresos: 0,
          monedaMovimientoId: cuentaDestino.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoIngreso.id
        });
        saldoDespuesIngreso = registroSaldo.saldoActual;
      }

      // ========================================
      // PASO 8: CREAR MOVIMIENTO DE CAJA - ITF DESTINO (si aplica)
      // ========================================
      let movimientoITFDestino = null;
      let saldoDespuesITFDestino = null;
      
      if (cuentaDestino && data.itfDestino && Number(data.itfDestino) > 0) {
        movimientoITFDestino = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
            empresaId: Number(data.empresaId),
            monto: Number(data.itfDestino),
            monedaId: Number(cuentaDestino.monedaId),
            medioPagoId: Number(data.medioPagoDestinoId),
            cuentaCorrienteOrigenId: Number(cuentaDestino.id),
            fechaOperacionMovCaja: new Date(data.fechaTransferencia),
            descripcion: `ITF - ${descripcion}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            tipoCambio: Number(data.tipoCambio || 1),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: SUBMODULOS.TRANSFERENCIAS_INTERNAS,
            origenMotivoOperacionId: null
          }
        });

        // ✅ Actualizar saldo (EGRESO por ITF)
        const registroSaldo = await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: cuentaDestino.id,
          empresaId: data.empresaId,
          fecha: fechaContable,
          ingresos: 0,
          egresos: data.itfDestino,
          monedaMovimientoId: cuentaDestino.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoITFDestino.id,
          saldoAnteriorManual: saldoDespuesIngreso
        });
        saldoDespuesITFDestino = registroSaldo.saldoActual;
      }

      // ========================================
      // PASO 9: CREAR MOVIMIENTO DE CAJA - COMISIÓN DESTINO (si aplica)
      // ========================================
      let movimientoComisionDestino = null;
      if (cuentaDestino && data.comisionDestino && Number(data.comisionDestino) > 0) {
        movimientoComisionDestino = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
            empresaId: Number(data.empresaId),
            monto: Number(data.comisionDestino),
            monedaId: Number(cuentaDestino.monedaId),
            medioPagoId: Number(data.medioPagoDestinoId),
            cuentaCorrienteOrigenId: Number(cuentaDestino.id),
            fechaOperacionMovCaja: new Date(data.fechaTransferencia),
            descripcion: `Comisión - ${descripcion}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            tipoCambio: Number(data.tipoCambio || 1),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: SUBMODULOS.TRANSFERENCIAS_INTERNAS,
            origenMotivoOperacionId: null
          }
        });

        // ✅ Actualizar saldo (EGRESO por comisión)
        await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: cuentaDestino.id,
          empresaId: data.empresaId,
          fecha: fechaContable,
          ingresos: 0,
          egresos: data.comisionDestino,
          monedaMovimientoId: cuentaDestino.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoComisionDestino.id,
          saldoAnteriorManual: saldoDespuesITFDestino || saldoDespuesIngreso
        });
      }

      // ========================================
      // PASO 10: GENERAR ASIENTOS CONTABLES AUTOMÁTICAMENTE
      // ========================================
      const movimientosParaAsientos = [
        movimientoEgreso,
        movimientoITFOrigen,
        movimientoComisionOrigen,
        movimientoIngreso,
        movimientoITFDestino,
        movimientoComisionDestino
      ].filter(m => m !== null && Number(m.monto) > 0);

      let asientosGenerados = [];
      if (movimientosParaAsientos.length > 0) {
        try {
          asientosGenerados = await generarAsientosContablesTransferencia(
            movimientosParaAsientos,
            periodoContable,
            data.empresaId,
            data.usuarioId,
            cuentaOrigen,
            cuentaDestino,
            tx
          );

          // ✅ ACTUALIZAR CAMPO asientosGenerados EN CADA MOVIMIENTO
          if (asientosGenerados && asientosGenerados.length > 0) {
            console.log('\n🔄 Actualizando campo asientosGenerados en MovimientoCaja...');

            for (const movimiento of movimientosParaAsientos) {
              await tx.movimientoCaja.update({
                where: { id: movimiento.id },
                data: { asientosGenerados: true }
              });
            }

            console.log(`✅ Campo asientosGenerados actualizado en ${movimientosParaAsientos.length} movimientos\n`);
          }
        } catch (error) {
          console.error('❌ Error generando asientos contables:', error);
          // No lanzar error - continuar con la operación
          // Los asientos se pueden generar manualmente después
        }
      }

      // ========================================
      // PASO 11: OBTENER MOVIMIENTOS COMPLETOS CON RELACIONES
      // ========================================
      const todosLosMovimientos = [
        movimientoEgreso,
        movimientoITFOrigen,
        movimientoComisionOrigen,
        movimientoIngreso,
        movimientoITFDestino,
        movimientoComisionDestino
      ].filter(Boolean);

      // Obtener movimientos completos con relaciones
      const movimientosCompletos = await tx.movimientoCaja.findMany({
        where: {
          id: {
            in: todosLosMovimientos.map(m => m.id)
          }
        },
        include: {
          tipoMovimiento: true,
          moneda: true,
          medioPago: true,
          cuentaCorrienteOrigen: {
            include: {
              banco: true,
              moneda: true
            }
          },
          cuentaCorrienteDestino: {
            include: {
              banco: true,
              moneda: true
            }
          }
        }
      });

      // Mapear movimientos por ID
      const movimientosMap = {};
      movimientosCompletos.forEach(mov => {
        movimientosMap[mov.id.toString()] = mov;
      });
      
      // Debug: verificar que los movimientos tienen moneda
      console.log('🔍 DEBUG - Movimientos con moneda:');
      movimientosCompletos.forEach(mov => {
        console.log(`   Mov ${mov.id}: moneda = ${mov.moneda?.simbolo || 'undefined'}`);
      });

      // ========================================
      // PASO 12: OBTENER SALDOS DE CUENTAS CORRIENTES
      // ========================================
      const saldosCuentaCorriente = [];

      if (todosLosMovimientos.length > 0) {
        const todosSaldos = await tx.saldoCuentaCorriente.findMany({
          where: {
            movimientoCajaId: {
              in: todosLosMovimientos.map(m => m.id)
            }
          },
          orderBy: { fecha: 'asc' }
        });

        // Mapear saldos por movimiento
        const tiposMovimiento = {
          [movimientoEgreso?.id]: 'Egreso',
          [movimientoITFOrigen?.id]: 'ITF Origen',
          [movimientoComisionOrigen?.id]: 'Comisión Origen',
          [movimientoIngreso?.id]: 'Ingreso',
          [movimientoITFDestino?.id]: 'ITF Destino',
          [movimientoComisionDestino?.id]: 'Comisión Destino'
        };

        todosSaldos.forEach(saldo => {
          const tipo = tiposMovimiento[saldo.movimientoCajaId.toString()];
          if (tipo) {
            saldosCuentaCorriente.push({
              tipo,
              movimientoCajaId: saldo.movimientoCajaId,
              saldoAnterior: Number(saldo.saldoAnterior),
              ingresos: Number(saldo.ingresos),
              egresos: Number(saldo.egresos),
              saldoActual: Number(saldo.saldoActual)
            });
          }
        });
      }

      // ========================================
      // PASO 13: RETORNAR RESULTADO COMPLETO
      // ========================================
      return {
        success: true,
        correlativo,
        movimientoEgresoId: movimientoEgreso?.id || null,
        movimientoIngresoId: movimientoIngreso?.id || null,
        movimientoITFOrigenId: movimientoITFOrigen?.id || null,
        movimientoComisionOrigenId: movimientoComisionOrigen?.id || null,
        movimientoITFDestinoId: movimientoITFDestino?.id || null,
        movimientoComisionDestinoId: movimientoComisionDestino?.id || null,
        movimientos: {
          egreso: movimientosMap[movimientoEgreso?.id?.toString()] || null,
          itfOrigen: movimientosMap[movimientoITFOrigen?.id?.toString()] || null,
          comisionOrigen: movimientosMap[movimientoComisionOrigen?.id?.toString()] || null,
          ingreso: movimientosMap[movimientoIngreso?.id?.toString()] || null,
          itfDestino: movimientosMap[movimientoITFDestino?.id?.toString()] || null,
          comisionDestino: movimientosMap[movimientoComisionDestino?.id?.toString()] || null
        },
        saldosCuentaCorriente,
        asientosContables: asientosGenerados
      };
    } catch (error) {
      console.error('❌ Error en procesarTransferenciaInterna:', error);
      throw error;
    }
  });
}

// ════════════════════════════════════════════════════════════
// FUNCIONES DE ACTUALIZACIÓN DE VOUCHERS
// ════════════════════════════════════════════════════════════

/**
 * Actualizar URL del voucher consolidado
 */
export async function actualizarUrlVoucherConsolidado(movimientoId, url) {
  return await prisma.movimientoCaja.update({
    where: { id: Number(movimientoId) },
    data: { urlVoucherConsolidado: url }
  });
}

/**
 * Actualizar URL del voucher individual
 */
export async function actualizarUrlVoucherIndividual(movimientoId, url) {
  return await prisma.movimientoCaja.update({
    where: { id: Number(movimientoId) },
    data: { urlOperacionIndividualOperacionCaja: url }
  });
}

/**
 * Actualizar URL del voucher contable
 */
export async function actualizarUrlVoucherContable(movimientoId, url) {
  return await prisma.movimientoCaja.update({
    where: { id: Number(movimientoId) },
    data: { urlVoucherContable: url }
  });
}

/**
 * Actualizar URL del voucher bancario
 */
export async function actualizarUrlVoucherBancario(movimientoId, url) {
  return await prisma.movimientoCaja.update({
    where: { id: Number(movimientoId) },
    data: { urlVoucherBancario: url }
  });
}

export default {
  procesarTransferenciaInterna,
  actualizarUrlVoucherConsolidado,
  actualizarUrlVoucherIndividual,
  actualizarUrlVoucherBancario
};
