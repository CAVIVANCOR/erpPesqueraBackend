import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from './correlativoOperacionCaja.service.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';
import { TIPO_LIBRO } from '../../utils/tiposLibroContable.js';
import { ESTADO_ASIENTO_CONTABLE } from '../../utils/estados.constants.js';
import { entidadDeBanco } from '../../utils/entidadBanco.js';
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
  
  // ════════════════════════════════════════════════════════════
  // VALIDAR CAMPOS BÁSICOS OBLIGATORIOS
  // ════════════════════════════════════════════════════════════
  //
  // NOTA: empresaId ya NO es obligatorio
  // La empresa se obtiene automáticamente de las cuentas seleccionadas
  //
  const camposBasicos = ['fechaTransferencia', 'monto', 'usuarioId'];
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
        empresaId: Number(cuentaOrigen.empresaId) // ✅ Usar empresa de la cuenta
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
 * ✅ LÓGICA DE MISMA EMPRESA:
 * - Si ambas cuentas son de la MISMA empresa:
 *   → El asiento del egreso incluye directamente la cuenta destino (DEBE)
 *   → El movimiento ingreso NO genera asiento (ya está reflejado)
 * - Si las cuentas son de DIFERENTES empresas:
 *   → Cada movimiento genera su propio asiento en su empresa
 * 
 * @pattern
 * - Un asiento por cada movimiento con monto > 0
 * - Vinculación por procesoOrigenId = MovimientoCaja.id
 * - Usa referencia de asientos-contables-referencia.json
 * 
 * @tipos_operacion
 * - esGerencial = false: Operación FISCAL (visible SUNAT, declarable, blanca)
 * - esGerencial = true:  Operación GERENCIAL (solo interno, no declarable, negra)
 * 
 * @param {Array} movimientos - Array de MovimientoCaja creados
 * @param {Object} periodoContable - Período contable
 * @param {Number} creadoPor - ID usuario
 * @param {Object} cuentaOrigen - Cuenta corriente origen (puede ser null)
 * @param {Object} cuentaDestino - Cuenta corriente destino (puede ser null)
 * @param {Boolean} esGerencial - Flag operación gerencial (default: false)
 * @param {Boolean} esMismaEmpresa - Flag si origen y destino son misma empresa
 * @param {Object} tx - Transacción Prisma
 * @returns {Promise<Array>} Array de asientos creados
 */
async function generarAsientosContablesTransferencia(
  movimientos,
  periodoContable,
  creadoPor,
  cuentaOrigen,
  cuentaDestino,
  esGerencial = false,
  esMismaEmpresa = false,
  tx
) {
  try {


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
          creadoPor,
          submodulo,
          estadoPendiente,
          cuentaOrigen,
          cuentaDestino,
          cuentaTercerosSoles,
          cuentaTercerosDolares,
          esGerencial,
          esMismaEmpresa,
          tx
        );

        if (asiento) {
          asientosCreados.push(asiento);
        }
      } catch (error) {
        console.error(`❌ Error generando asiento para movimiento ${movimiento.id}:`, error.message);
        // Continuar con el siguiente movimiento
      }
    }

    // ✅ Recargar asientos con relaciones para el frontend
    const asientosConRelaciones = await tx.asientoContable.findMany({
      where: {
        id: { in: asientosCreados.map(a => a.id) }
      },
      include: {
        moneda: true,
        empresa: true // ✅ Incluir empresa del asiento
      }
    });

    return asientosConRelaciones;
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
 * - EGRESO_DIRECTO: Si solo hay cuenta origen (salida sin destino registrado)
 * - INGRESO_DIRECTO: Si solo hay cuenta destino (entrada sin origen registrado)
 * - ITF y Comisión: Generan asientos de gasto
 * 
 * ✅ LÓGICA DE MISMA EMPRESA:
 * - Si esMismaEmpresa = true: El egreso usa directamente la cuenta destino (DEBE)
 * - Si esMismaEmpresa = false: El egreso usa cuenta transitoria o cuentas por cobrar
 * 
 * @param {Boolean} esGerencial - Flag para operaciones gerenciales (negras)
 * @param {Boolean} esMismaEmpresa - Flag si origen y destino son misma empresa
 */
async function crearAsientoSegunTipo(
  movimiento,
  periodoContable,
  creadoPor,
  submodulo,
  estadoPendiente,
  cuentaOrigen,
  cuentaDestino,
  cuentaTercerosSoles,
  cuentaTercerosDolares,
  esGerencial = false,
  esMismaEmpresa = false,
  tx
) {
  
  
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

  // ════════════════════════════════════════════════════════════
  // CASO 1: ITF (Impuesto a las Transacciones Financieras)
  // ════════════════════════════════════════════════════════════
  if (esITF) {
    
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
    
  }
  // ════════════════════════════════════════════════════════════
  // CASO 2: COMISIÓN BANCARIA
  // ════════════════════════════════════════════════════════════
  else if (esComision) {
    
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
    

  }
  // ════════════════════════════════════════════════════════════
  // BIFURCACIÓN 1: TRANSFERENCIA INTERNA (MISMA EMPRESA)
  // ════════════════════════════════════════════════════════════
  //
  // Condición: Hay cuenta origen Y destino, y ambas son de la MISMA empresa
  //
  // Asiento:
  //   DEBE:  Cuenta Destino (la que recibe el dinero)
  //   HABER: Cuenta Origen (la que entrega el dinero)
  //
  // Nota: Este es el ÚNICO asiento para toda la transferencia
  //       El movimiento de ingreso NO generará asiento adicional
  //
  else if (cuentaOrigen && cuentaDestino && esMismaEmpresa) {
    
    
    cuentaDebe = cuentaDestino.cuentaContableId;
    cuentaHaber = cuentaOrigen.cuentaContableId;
    glosa = `TRANSFERENCIA DE ${cuentaOrigen.banco?.nombre || 'CUENTA'} A ${cuentaDestino.banco?.nombre || 'CUENTA'}`;
    

  }
  // ════════════════════════════════════════════════════════════
  // BIFURCACIÓN 2: EGRESO INTER-EMPRESARIAL
  // ════════════════════════════════════════════════════════════
  //
  // Condición: Hay cuenta origen Y destino, son DIFERENTES empresas,
  //            y este movimiento es el EGRESO (tiene cuentaCorrienteDestinoId)
  //
  // Asiento (en empresa ORIGEN):
  //   DEBE:  Cuenta Destino (la que recibe el dinero)
  //   HABER: Cuenta Origen (la que entrega el dinero)
  //
  // Nota: Usa la MISMA lógica que transferencia interna
  //       El movimiento de ingreso generará otro asiento en la empresa DESTINO
  //
  else if (cuentaOrigen && cuentaDestino && !esMismaEmpresa && movimiento.cuentaCorrienteDestinoId) {

    
    cuentaDebe = cuentaDestino.cuentaContableId;
    cuentaHaber = cuentaOrigen.cuentaContableId;
    glosa = `TRANSFERENCIA A ${cuentaDestino.empresa?.razonSocial || cuentaDestino.banco?.nombre || 'CUENTA DESTINO'}`;
    
 
  }
  // ════════════════════════════════════════════════════════════
  // BIFURCACIÓN 3: INGRESO INTER-EMPRESARIAL
  // ════════════════════════════════════════════════════════════
  //
  // Condición: Hay cuenta origen Y destino, son DIFERENTES empresas,
  //            y este movimiento es el INGRESO (tiene cuentaCorrienteOrigenId)
  //
  // Asiento (en empresa DESTINO):
  //   DEBE:  Cuenta Destino (la que recibe el dinero)
  //   HABER: Cuenta Origen (la que entrega el dinero)
  //
  // Nota: Usa la MISMA lógica que transferencia interna
  //       El movimiento de egreso ya generó su asiento en la empresa ORIGEN
  //
  else if (cuentaOrigen && cuentaDestino && !esMismaEmpresa && movimiento.cuentaCorrienteOrigenId && !movimiento.cuentaCorrienteDestinoId) {

    
    cuentaDebe = cuentaDestino.cuentaContableId;
    cuentaHaber = cuentaOrigen.cuentaContableId;
    glosa = `TRANSFERENCIA DE ${cuentaOrigen.empresa?.razonSocial || cuentaOrigen.banco?.nombre || 'CUENTA ORIGEN'}`;
    

  }
  // ════════════════════════════════════════════════════════════
  // BIFURCACIÓN 4: EGRESO DIRECTO (sin cuenta destino)
  // ════════════════════════════════════════════════════════════
  //
  // Condición: Solo hay cuenta origen, NO hay cuenta destino
  //
  // Asiento:
  //   DEBE:  461101/461102 Reclamaciones de Terceros (según moneda)
  //   HABER: Cuenta Origen (la que entrega el dinero)
  //
  else if (cuentaOrigen && !cuentaDestino && movimiento.cuentaCorrienteDestinoId) {
    
    const cuentaTerceros = monedaId === 1 ? cuentaTercerosSoles : cuentaTercerosDolares;
    cuentaDebe = cuentaTerceros?.id;
    cuentaHaber = movimiento.cuentaCorrienteDestino?.cuentaContable?.id;
    glosa = `POR LA TRANSFERENCIA ${movimiento.descripcion || 'A TERCERO'}`;
    

  }
  // ════════════════════════════════════════════════════════════
  // BIFURCACIÓN 5: INGRESO DIRECTO (sin cuenta origen)
  // ════════════════════════════════════════════════════════════
  //
  // Condición: Solo hay cuenta destino, NO hay cuenta origen
  //
  // Asiento:
  //   DEBE:  Cuenta Destino (la que recibe el dinero)
  //   HABER: 461101/461102 Reclamaciones de Terceros (según moneda)
  //
  else if (!cuentaOrigen && cuentaDestino && movimiento.cuentaCorrienteOrigenId) {
    
    const cuentaTerceros = monedaId === 1 ? cuentaTercerosSoles : cuentaTercerosDolares;
    cuentaDebe = movimiento.cuentaCorrienteOrigen?.cuentaContable?.id;
    cuentaHaber = cuentaTerceros?.id;
    glosa = `POR EL INGRESO ${movimiento.descripcion || 'DE TERCERO'}`;

  }
  else {

    return null;
  }

  // ========================================
  // VALIDAR CUENTAS CONTABLES
  // ========================================
  if (!cuentaDebe || !cuentaHaber) {
    return null;
  }

  // ════════════════════════════════════════════════════════════
  // GENERAR CORRELATIVO Y NÚMERO DE ASIENTO
  // ════════════════════════════════════════════════════════════
  //
  // ✅ IMPORTANTE: Usar la empresaId del MOVIMIENTO, no del parámetro
  // Esto permite que cada empresa genere sus propios asientos con sus correlativos
  //
  const empresaIdMovimiento = Number(movimiento.empresaId);
  
  const ultimoAsiento = await tx.asientoContable.findFirst({
    where: {
      empresaId: empresaIdMovimiento,
      periodoContableId: Number(periodoContable.id)
    },
    orderBy: { correlativo: 'desc' }
  });

  const nuevoCorrelativo = ultimoAsiento ? Number(ultimoAsiento.correlativo) + 1 : 1;
  const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(6, '0')}`;

  // ════════════════════════════════════════════════════════════
  // DETERMINAR TIPO DE LIBRO (FISCAL o GERENCIAL)
  // ════════════════════════════════════════════════════════════
  // esGerencial viene como parámetro de la función
  // false = Operación FISCAL (visible SUNAT, declarable, blanca)
  // true  = Operación GERENCIAL (solo interno, no declarable, negra)
  const tipoLibro = esGerencial ? "GERENCIAL" : "FISCAL";

  // ════════════════════════════════════════════════════════════
  // CREAR ASIENTO CONTABLE
  // ════════════════════════════════════════════════════════════
  const asiento = await tx.asientoContable.create({
    data: {
      empresaId: empresaIdMovimiento,  // ✅ EMPRESA DEL MOVIMIENTO
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
            monedaId: 1,  // ✅ SIEMPRE PEN (1) - Los asientos contables son en soles
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
            monedaId: 1,  // ✅ SIEMPRE PEN (1) - Los asientos contables son en soles
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
 * Procesa movimientos de caja especializados con 3 flujos posibles:
 * 
 * FLUJO 1: TRANSFERENCIA ENTRE CUENTAS (origen + destino)
 *   - 6 movimientos: egreso principal, ITF origen, comisión origen,
 *                    ingreso principal, ITF destino, comisión destino
 *   - 6 asientos contables automáticos
 * 
 * FLUJO 2: INGRESO DIRECTO (solo destino, sin origen)
 *   - 3 movimientos: ingreso principal, ITF destino, comisión destino
 *   - 3 asientos contables automáticos
 *   - Ejemplo: Préstamo de cambista → Caja dólares
 * 
 * FLUJO 3: EGRESO DIRECTO (solo origen, sin destino)
 *   - 3 movimientos: egreso principal, ITF origen, comisión origen
 *   - 3 asientos contables automáticos
 *   - Ejemplo: Devolución a cambista, pago coimas (si esGerencial=true)
 * 
 * @pattern Sigue el patrón de pagoEspecializadoCuentaPorPagar.service.js
 * 
 * @workflow
 * 1. Validar datos según tipo de operación
 * 2. Generar correlativo único
 * 3. Crear movimientos según flujo (egreso/ingreso/ambos) + ITF/comisión
 * 4. Generar asientos contables automáticos (fiscal o gerencial)
 * 5. Actualizar saldos en cascada
 * 6. Retornar IDs de movimientos y asientos creados
 * 
 * @param {Object} data - Datos del movimiento
 * @param {Number} data.empresaId - ID de la empresa
 * @param {Number} [data.cuentaOrigenId] - ID cuenta origen (opcional para ingreso directo)
 * @param {Number} [data.cuentaDestinoId] - ID cuenta destino (opcional para egreso directo)
 * @param {Number} data.monto - Monto principal de la operación
 * @param {Boolean} [data.esGerencial=false] - Flag operación gerencial (negra, no declarable)
 * @param {Number} [data.itfOrigen=0] - ITF cuenta origen
 * @param {Number} [data.comisionOrigen=0] - Comisión cuenta origen
 * @param {Number} [data.itfDestino=0] - ITF cuenta destino
 * @param {Number} [data.comisionDestino=0] - Comisión cuenta destino
 * @param {String} data.descripcion - Descripción de la operación
 * @param {Date} data.fechaTransferencia - Fecha de la operación
 * @param {Number} data.usuarioId - ID del usuario que ejecuta
 * 
 * @returns {Promise<Object>} { success, correlativo, movimientoEgresoId, movimientoIngresoId, asientosContables, ... }
 * @throws {ValidationError|NotFoundError|DatabaseError}
 * @transaction Toda la operación es atómica (rollback automático en errores)
 */
export async function procesarTransferenciaInterna(data) {
  return await prisma.$transaction(async (tx) => {
    try {
      // ════════════════════════════════════════════════════════════
      // PASO 1: VALIDAR DATOS
      // ════════════════════════════════════════════════════════════
      const { cuentaOrigen, cuentaDestino, saldoOrigen } = 
        await validarDatosTransferenciaInterna(data, tx);

      // ════════════════════════════════════════════════════════════
      // PASO 2: DETERMINAR EMPRESA PRINCIPAL PARA CORRELATIVO
      // ════════════════════════════════════════════════════════════
      //
      // El correlativo se genera en la empresa que INICIA la operación:
      // - Si hay cuenta origen: usa empresa de cuenta origen
      // - Si solo hay cuenta destino (ingreso directo): usa empresa de cuenta destino
      //
      const empresaPrincipal = cuentaOrigen ? cuentaOrigen.empresaId : cuentaDestino.empresaId;

      // ════════════════════════════════════════════════════════════
      // PASO 3: GENERAR CORRELATIVO DE OPERACIÓN
      // ════════════════════════════════════════════════════════════
      const correlativo = await correlativoService.generarCorrelativo(
        Number(empresaPrincipal),
        tx
      );

      // ════════════════════════════════════════════════════════════
      // PASO 4: CALCULAR DATOS CONTABLES
      // ════════════════════════════════════════════════════════════
      const fechaContable = new Date(data.fechaTransferencia);
      
      const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(
        Number(empresaPrincipal),
        fechaContable
      );

      // La descripción/glosa es obligatoria y viene del frontend
      let descripcion = data.descripcion;

      // Agregar número de cheque a la descripción si aplica
      if (data.numeroChequeOrigen) {
        descripcion += ` N° CHEQUE: ${data.numeroChequeOrigen}`;
      }
      if (data.numeroChequeDestino) {
        descripcion += ` N° CHEQUE: ${data.numeroChequeDestino}`;
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5: DETERMINAR SI ES TRANSFERENCIA INTER-EMPRESARIAL
      // ════════════════════════════════════════════════════════════
      // 
      // ✅ LÓGICA DE NEGOCIO:
      // - Si ambas cuentas pertenecen a la MISMA empresa → Transferencia Interna
      // - Si las cuentas pertenecen a DIFERENTES empresas → Transferencia Inter-Empresarial
      // 
      // IMPACTO CONTABLE:
      // - Misma empresa: 1 solo asiento (Cuenta Destino DEBE / Cuenta Origen HABER)
      // - Diferentes empresas: 2 asientos (uno en cada empresa con cuentas por cobrar/pagar relacionadas)
      //
      const esMismaEmpresa = cuentaOrigen && cuentaDestino && 
                             Number(cuentaOrigen.empresaId) === Number(cuentaDestino.empresaId);

      // ════════════════════════════════════════════════════════════
      // PASO 6: CREAR MOVIMIENTO DE CAJA - EGRESO (si hay cuenta origen)
      // ════════════════════════════════════════════════════════════
      //
      // ✅ IMPORTANTE: El movimiento usa la empresaId de la CUENTA ORIGEN
      // ✅ Esto permite que cada empresa registre sus propios movimientos
      //
      let movimientoEgreso = null;
      let saldoDespuesEgreso = null;
      
      if (cuentaOrigen) {
        movimientoEgreso = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: Number(data.tipoMovimientoEgresoId),
            empresaId: Number(cuentaOrigen.empresaId),  // ✅ EMPRESA DE LA CUENTA ORIGEN
            entidadComercialId: entidadDeBanco(cuentaOrigen.banco),  // Banco de la cuenta origen (null si no tiene enlace)
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
          empresaId: cuentaOrigen.empresaId,  // ✅ EMPRESA DE LA CUENTA ORIGEN
          fecha: fechaContable,
          ingresos: 0,
          egresos: data.monto,
          monedaMovimientoId: cuentaOrigen.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoEgreso.id
        });
        saldoDespuesEgreso = registroSaldo.saldoActual;
      }

      // ════════════════════════════════════════════════════════════
      // PASO 7: CREAR MOVIMIENTO DE CAJA - ITF ORIGEN (si aplica)
      // ════════════════════════════════════════════════════════════
      //
      // ✅ IMPORTANTE: El ITF usa la empresaId de la CUENTA ORIGEN
      // ✅ Siempre genera asiento contable (es un gasto independiente)
      //
      let movimientoITFOrigen = null;
      let saldoDespuesITFOrigen = null;
      
      if (cuentaOrigen && data.itfOrigen && Number(data.itfOrigen) > 0) {
        movimientoITFOrigen = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
            empresaId: Number(cuentaOrigen.empresaId),  // ✅ EMPRESA DE LA CUENTA ORIGEN
            entidadComercialId: entidadDeBanco(cuentaOrigen.banco),  // Banco de la cuenta origen (null si no tiene enlace)
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
          empresaId: cuentaOrigen.empresaId,  // ✅ EMPRESA DE LA CUENTA ORIGEN
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

      // ════════════════════════════════════════════════════════════
      // PASO 8: CREAR MOVIMIENTO DE CAJA - COMISIÓN ORIGEN (si aplica)
      // ════════════════════════════════════════════════════════════
      //
      // ✅ IMPORTANTE: La comisión usa la empresaId de la CUENTA ORIGEN
      // ✅ Siempre genera asiento contable (es un gasto independiente)
      //
      let movimientoComisionOrigen = null;
      let saldoDespuesComisionOrigen = null;
      
      if (cuentaOrigen && data.comisionOrigen && Number(data.comisionOrigen) > 0) {
        movimientoComisionOrigen = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
            empresaId: Number(cuentaOrigen.empresaId),  // ✅ EMPRESA DE LA CUENTA ORIGEN
            entidadComercialId: entidadDeBanco(cuentaOrigen.banco),  // Banco de la cuenta origen (null si no tiene enlace)
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
          empresaId: cuentaOrigen.empresaId,  // ✅ EMPRESA DE LA CUENTA ORIGEN
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

      // ════════════════════════════════════════════════════════════
      // PASO 9: CREAR MOVIMIENTO DE CAJA - INGRESO (si hay cuenta destino)
      // ════════════════════════════════════════════════════════════
      //
      // ✅ IMPORTANTE: El movimiento usa la empresaId de la CUENTA DESTINO
      // ✅ REGLA CONTABLE:
      //    - Si es MISMA empresa: NO genera asiento (ya está en el asiento del egreso)
      //    - Si es DIFERENTE empresa: SÍ genera asiento (cada empresa registra su parte)
      //
      let movimientoIngreso = null;
      let saldoDespuesIngreso = null;
      
      if (cuentaDestino) {
        const montoDestino = data.montoDestino || data.monto;
        
        movimientoIngreso = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: Number(data.tipoMovimientoIngresoId),
            empresaId: Number(cuentaDestino.empresaId),  // ✅ EMPRESA DE LA CUENTA DESTINO
            entidadComercialId: entidadDeBanco(cuentaDestino.banco),  // Banco de la cuenta destino (null si no tiene enlace)
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
          empresaId: cuentaDestino.empresaId,  // ✅ EMPRESA DE LA CUENTA DESTINO
          fecha: fechaContable,
          ingresos: montoDestino,
          egresos: 0,
          monedaMovimientoId: cuentaDestino.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoIngreso.id
        });
        saldoDespuesIngreso = registroSaldo.saldoActual;
      }

      // ════════════════════════════════════════════════════════════
      // PASO 10: CREAR MOVIMIENTO DE CAJA - ITF DESTINO (si aplica)
      // ════════════════════════════════════════════════════════════
      //
      // ✅ IMPORTANTE: El ITF usa la empresaId de la CUENTA DESTINO
      // ✅ Siempre genera asiento contable (es un gasto independiente)
      //
      let movimientoITFDestino = null;
      let saldoDespuesITFDestino = null;
      
      if (cuentaDestino && data.itfDestino && Number(data.itfDestino) > 0) {
        movimientoITFDestino = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
            empresaId: Number(cuentaDestino.empresaId),  // ✅ EMPRESA DE LA CUENTA DESTINO
            entidadComercialId: entidadDeBanco(cuentaDestino.banco),  // Banco de la cuenta destino (null si no tiene enlace)
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
          empresaId: cuentaDestino.empresaId,  // ✅ EMPRESA DE LA CUENTA DESTINO
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

      // ════════════════════════════════════════════════════════════
      // PASO 11: CREAR MOVIMIENTO DE CAJA - COMISIÓN DESTINO (si aplica)
      // ════════════════════════════════════════════════════════════
      //
      // ✅ IMPORTANTE: La comisión usa la empresaId de la CUENTA DESTINO
      // ✅ Siempre genera asiento contable (es un gasto independiente)
      //
      let movimientoComisionDestino = null;
      if (cuentaDestino && data.comisionDestino && Number(data.comisionDestino) > 0) {
        movimientoComisionDestino = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
            empresaId: Number(cuentaDestino.empresaId),  // ✅ EMPRESA DE LA CUENTA DESTINO
            entidadComercialId: entidadDeBanco(cuentaDestino.banco),  // Banco de la cuenta destino (null si no tiene enlace)
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
          empresaId: cuentaDestino.empresaId,  // ✅ EMPRESA DE LA CUENTA DESTINO
          fecha: fechaContable,
          ingresos: 0,
          egresos: data.comisionDestino,
          monedaMovimientoId: cuentaDestino.monedaId,
          tipoCambio: data.tipoCambio || 1,
          movimientoCajaId: movimientoComisionDestino.id,
          saldoAnteriorManual: saldoDespuesITFDestino || saldoDespuesIngreso
        });
      }

      // ════════════════════════════════════════════════════════════
      // PASO 12: GENERAR ASIENTOS CONTABLES AUTOMÁTICAMENTE
      // ════════════════════════════════════════════════════════════
      //
      // ✅ LÓGICA DE GENERACIÓN DE ASIENTOS:
      //
      // 1️⃣ TRANSFERENCIA MISMA EMPRESA:
      //    - Egreso Origen: SÍ genera asiento (único para la transferencia)
      //    - Ingreso Destino: NO genera asiento (ya está en el asiento del egreso)
      //    - ITF/Comisión Origen: SÍ generan asientos (gastos independientes)
      //    - ITF/Comisión Destino: SÍ generan asientos (gastos independientes)
      //
      // 2️⃣ TRANSFERENCIA INTER-EMPRESARIAL:
      //    - Egreso Origen: SÍ genera asiento (en empresa origen)
      //    - Ingreso Destino: SÍ genera asiento (en empresa destino)
      //    - ITF/Comisión Origen: SÍ generan asientos (en empresa origen)
      //    - ITF/Comisión Destino: SÍ generan asientos (en empresa destino)
      //
      // 3️⃣ EGRESO/INGRESO DIRECTO:
      //    - Todos los movimientos generan asientos
      //
      
      // Construir lista de movimientos que deben generar asientos
      const movimientosParaAsientos = [
        movimientoEgreso,
        movimientoITFOrigen,
        movimientoComisionOrigen,
        // ⚠️ IMPORTANTE: Solo incluir movimiento ingreso si NO es misma empresa
        esMismaEmpresa ? null : movimientoIngreso,
        movimientoITFDestino,
        movimientoComisionDestino
      ].filter(m => m !== null && Number(m.monto) > 0);


      let asientosGenerados = [];
      if (movimientosParaAsientos.length > 0) {
        try {
          asientosGenerados = await generarAsientosContablesTransferencia(
            movimientosParaAsientos,
            periodoContable,
            data.usuarioId,
            cuentaOrigen,
            cuentaDestino,
            data.esGerencial || false,
            esMismaEmpresa,  // ✅ Pasar flag de misma empresa
            tx
          );

          // ✅ ACTUALIZAR CAMPO asientosGenerados EN CADA MOVIMIENTO
          // IMPORTANTE: Actualizar TODOS los movimientos, incluso el ingreso que no generó asiento
          const todosLosMovimientos = [
            movimientoEgreso,
            movimientoITFOrigen,
            movimientoComisionOrigen,
            movimientoIngreso,  // ✅ Incluir siempre para marcar como procesado
            movimientoITFDestino,
            movimientoComisionDestino
          ].filter(m => m !== null && Number(m.monto) > 0);

          if (asientosGenerados && asientosGenerados.length > 0) {

            for (const movimiento of todosLosMovimientos) {
              await tx.movimientoCaja.update({
                where: { id: movimiento.id },
                data: { asientosGenerados: true }
              });
            }
          }
        } catch (error) {
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
          empresa: true, // ✅ Incluir empresa del movimiento
          cuentaCorrienteOrigen: {
            include: {
              banco: true,
              moneda: true,
              empresa: true // ✅ Incluir empresa de la cuenta
            }
          },
          cuentaCorrienteDestino: {
            include: {
              banco: true,
              moneda: true,
              empresa: true // ✅ Incluir empresa de la cuenta
            }
          }
        }
      });

      // Mapear movimientos por ID
      const movimientosMap = {};
      movimientosCompletos.forEach(mov => {
        movimientosMap[mov.id.toString()] = mov;
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
