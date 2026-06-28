import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from './correlativoOperacionCaja.service.js';
/**
 * ════════════════════════════════════════════════════════════
 * SERVICIO PROFESIONAL: PAGO DE DEUDAS AL PERSONAL
 * ════════════════════════════════════════════════════════════
 * 
 * Gestiona pagos a trabajadores con integración completa:
 * - Creación de registros de pago
 * - Generación automática de MovimientoCaja
 * - Actualización de saldos y estados
 * - Transacciones atómicas
 * - Validaciones de negocio
 * 
 * Documentado en español.
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - ESTADOS DEUDAS CON EL PERSONAL
// ════════════════════════════════════════════════════════════

const TIPO_PROVIENE_DEUDAS_PERSONAL = 26; 

const ESTADOS_DEUDA = {
  PENDIENTE: 114,      // DANGER
  PAGO_PARCIAL: 115,   // WARNING
  PAGADO: 116,         // SUCCESS
  VENCIDO: 117,        // DANGER
  ANULADO: 118,        // SECONDARY
  CANJEADO: 119        // CONTRAST
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - TIPOS DE MOVIMIENTO CAJA
// ════════════════════════════════════════════════════════════

const CATEGORIA_REMUNERACIONES = 21; // REMUNERACIONES (DEUDAS CON EL PERSONAL)
const CATEGORIA_IMPUESTOS = 24;      // IMPUESTOS (DEUDAS TRIBUTARIAS)

const TIPOS_MOVIMIENTO_REMUNERACIONES = {
  SUELDOS: 149,
  SALARIOS: 150,
  COMISIONES: 151,
  PRESTAMOS: 152,
  ADELANTOS: 153,
  INDEMNIZACIONES_CTS: 154,
  VACACIONES: 155,
  GRATIFICACIONES: 156,
  LIQUIDACIONES: 157
};

const TIPOS_MOVIMIENTO_IMPUESTOS = {
  SUNAT: 165,
  MUNICIPIOS: 166,
  RENTA_ALQUILERES: 167
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - ESTADOS MOVIMIENTOS CAJA
// ════════════════════════════════════════════════════════════

const TIPO_PROVIENE_MOVIMIENTOS_CAJA = 6;

const ESTADOS_MOVIMIENTO_CAJA = {
  PENDIENTE: 20,           // SECONDARY
  VALIDADO: 21,            // SUCCESS
  ASIENTO_GENERADO: 22     // INFO
};

// ════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════

/**
 * Validar datos de pago básico (CRUD)
 */
async function validarPagoDeudaPersonal(data) {
  if (data.deudaConPersonalId) {
    const deuda = await prisma.deudaConPersonal.findUnique({ 
      where: { id: data.deudaConPersonalId } 
    });
    if (!deuda) {
      throw new ValidationError('La deuda referenciada no existe.');
    }
  }

  if (data.medioPagoId) {
    const medioPago = await prisma.medioPago.findUnique({ 
      where: { id: data.medioPagoId } 
    });
    if (!medioPago) {
      throw new ValidationError('El medio de pago referenciado no existe.');
    }
  }

  if (data.montoPago !== undefined && data.montoPago <= 0) {
    throw new ValidationError('El monto del pago debe ser mayor a cero.');
  }

  if (data.deudaConPersonalId && data.montoPago) {
    const deuda = await prisma.deudaConPersonal.findUnique({ 
      where: { id: data.deudaConPersonalId } 
    });
    if (deuda && Number(data.montoPago) > Number(deuda.saldoPendiente)) {
      throw new ValidationError('El monto del pago no puede ser mayor al saldo pendiente de la deuda.');
    }
  }
}

/**
 * Validar datos completos para procesamiento de pago profesional
 */
async function validarProcesamientoPago(deudaId, data) {
  // Validar campos obligatorios
  const camposRequeridos = ['montoPago', 'fechaPago', 'cuentaCorrienteOrigenId', 'medioPagoId'];
  const camposFaltantes = camposRequeridos.filter(campo => !data[campo]);
  
  if (camposFaltantes.length > 0) {
    throw new ValidationError(
      `Faltan campos obligatorios: ${camposFaltantes.join(', ')}`
    );
  }

  // Validar monto positivo
  if (Number(data.montoPago) <= 0) {
    throw new ValidationError('El monto del pago debe ser mayor a cero.');
  }

  // Validar ITF y comisión no negativos
  if (data.itf && Number(data.itf) < 0) {
    throw new ValidationError('El ITF no puede ser negativo.');
  }

  if (data.comision && Number(data.comision) < 0) {
    throw new ValidationError('La comisión no puede ser negativa.');
  }

  // Obtener y validar deuda
  const deuda = await prisma.deudaConPersonal.findUnique({
    where: { id: deudaId },
    include: {
      personal: {
        include: {
          entidadComercial: true
        }
      },
      tipoDeuda: true,
      moneda: true,
      empresa: true,
      estado: true
    }
  });

  if (!deuda) {
    throw new NotFoundError('Deuda no encontrada.');
  }

  // Validar que la deuda no esté anulada o canjeada
  if (deuda.estadoId === ESTADOS_DEUDA.ANULADO) {
    throw new ValidationError('No se puede pagar una deuda anulada.');
  }

  if (deuda.estadoId === ESTADOS_DEUDA.CANJEADO) {
    throw new ValidationError('No se puede pagar una deuda canjeada.');
  }

  // Validar que la deuda no esté completamente pagada
  if (Number(deuda.saldoPendiente) <= 0) {
    throw new ValidationError('La deuda ya está completamente pagada.');
  }

  // Validar que el monto no exceda el saldo
  if (Number(data.montoPago) > Number(deuda.saldoPendiente)) {
    throw new ValidationError(
      `El monto del pago (${data.montoPago}) no puede ser mayor al saldo pendiente (${deuda.saldoPendiente}).`
    );
  }

  // Obtener y validar cuenta corriente origen
  const cuentaOrigen = await prisma.cuentaCorriente.findUnique({
    where: { id: Number(data.cuentaCorrienteOrigenId) },
    include: {
      banco: true,
      moneda: true
    }
  });

  if (!cuentaOrigen) {
    throw new NotFoundError('Cuenta corriente origen no encontrada.');
  }

  // Validar que la cuenta pertenezca a la misma empresa
  if (cuentaOrigen.empresaId !== deuda.empresaId) {
    throw new ValidationError('La cuenta corriente no pertenece a la empresa de la deuda.');
  }

  // Validar que la moneda coincida
  if (cuentaOrigen.monedaId !== deuda.monedaId) {
    throw new ValidationError(
      `La moneda de la cuenta (${cuentaOrigen.moneda.codigoSunat}) no coincide con la moneda de la deuda (${deuda.moneda.codigoSunat}).`
    );
  }

  // Validar saldo suficiente
  const totalAPagar = Number(data.montoPago) + Number(data.itf || 0) + Number(data.comision || 0);
  if (Number(cuentaOrigen.saldo) < totalAPagar) {
    throw new ValidationError(
      `Saldo insuficiente en la cuenta. Disponible: ${cuentaOrigen.moneda.simbolo} ${cuentaOrigen.saldo}, Requerido: ${cuentaOrigen.moneda.simbolo} ${totalAPagar}`
    );
  }

  // Validar medio de pago
  const medioPago = await prisma.medioPago.findUnique({
    where: { id: Number(data.medioPagoId) }
  });

  if (!medioPago) {
    throw new NotFoundError('Medio de pago no encontrado.');
  }

  return { deuda, cuentaOrigen, medioPago, totalAPagar };
}

/**
 * Obtener tipo de movimiento según tipo de deuda
 */
async function obtenerTipoMovimientoParaDeuda(tipoDeudaId) {
  // Por defecto, usar el tipo de movimiento genérico de la categoría REMUNERACIONES
  // Aquí puedes agregar lógica para mapear tipos de deuda específicos a tipos de movimiento
  
  const tipoMovimiento = await prisma.tipoMovEntregaRendir.findFirst({
    where: { 
      id: TIPOS_MOVIMIENTO_REMUNERACIONES.SUELDOS, // Por defecto SUELDOS
      activo: true
    }
  });

  if (!tipoMovimiento) {
    throw new NotFoundError(
      'Tipo de movimiento para pago de deuda no encontrado. Verifique la configuración del sistema.'
    );
  }

  return tipoMovimiento;
}

/**
 * Calcular nuevo estado de la deuda según el saldo
 */
function calcularNuevoEstadoDeuda(saldoPendiente) {
  if (Number(saldoPendiente) === 0) {
    return ESTADOS_DEUDA.PAGADO;
  } else if (Number(saldoPendiente) > 0) {
    return ESTADOS_DEUDA.PAGO_PARCIAL;
  }
  return ESTADOS_DEUDA.PENDIENTE;
}

/**
 * Obtener descripción del estado por ID
 */
function obtenerDescripcionEstado(estadoId) {
  const mapaEstados = {
    [ESTADOS_DEUDA.PENDIENTE]: 'PENDIENTE',
    [ESTADOS_DEUDA.PAGO_PARCIAL]: 'PAGO PARCIAL',
    [ESTADOS_DEUDA.PAGADO]: 'PAGADO',
    [ESTADOS_DEUDA.VENCIDO]: 'VENCIDO',
    [ESTADOS_DEUDA.ANULADO]: 'ANULADO',
    [ESTADOS_DEUDA.CANJEADO]: 'CANJEADO'
  };
  return mapaEstados[estadoId] || 'DESCONOCIDO';
}

// ════════════════════════════════════════════════════════════
// FUNCIONES CRUD BÁSICAS
// ════════════════════════════════════════════════════════════

/**
 * Listar todos los pagos de deuda personal
 */
const listar = async () => {
  try {
    return await prisma.pagoDeudaPersonal.findMany({
      include: {
        deudaConPersonal: {
          include: {
            personal: true,
            empresa: true,
            tipoDeuda: true,
            moneda: true
          }
        },
        medioPago: true,
        movimientoCaja: {
          include: {
            tipoMovimiento: true,
            moneda: true,
            estado: true
          }
        }
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos', err.message);
    }
    throw err;
  }
};

/**
 * Obtener pago por ID
 */
const obtenerPorId = async (id) => {
  try {
    const pago = await prisma.pagoDeudaPersonal.findUnique({
      where: { id },
      include: {
        deudaConPersonal: {
          include: {
            personal: true,
            empresa: true,
            tipoDeuda: true,
            moneda: true
          }
        },
        medioPago: true,
        movimientoCaja: {
          include: {
            tipoMovimiento: true,
            moneda: true,
            estado: true
          }
        }
      }
    });
    
    if (!pago) {
      throw new NotFoundError('Pago de deuda personal no encontrado');
    }
    
    return pago;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener pago', err.message);
    }
    throw err;
  }
};

/**
 * Crear pago básico (CRUD simple)
 */
const crear = async (data) => {
  try {
    if (!data.deudaConPersonalId || !data.fechaPago || !data.montoPago) {
      throw new ValidationError('Faltan campos obligatorios: deudaConPersonalId, fechaPago, montoPago');
    }

    await validarPagoDeudaPersonal(data);

    const pagoData = {
      ...data,
      medioPagoId: data.medioPagoId || null,
      numeroOperacion: data.numeroOperacion || null,
      movimientoCajaId: data.movimientoCajaId || null,
      observaciones: data.observaciones || null,
      creadoPor: data.creadoPor || null
    };

    // Transacción: Crear pago y actualizar deuda
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pagoDeudaPersonal.create({ data: pagoData });

      const deuda = await tx.deudaConPersonal.findUnique({
        where: { id: data.deudaConPersonalId }
      });

      const nuevoMontoPagado = Number(deuda.montoPagado) + Number(data.montoPago);
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - nuevoMontoPagado;
      const nuevoEstadoId = calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      await tx.deudaConPersonal.update({
        where: { id: data.deudaConPersonalId },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId
        }
      });

      return nuevoPago;
    });

    return resultado;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al crear pago', err.message);
    }
    throw err;
  }
};

/**
 * Actualizar pago
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.pagoDeudaPersonal.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundError('Pago de deuda personal no encontrado');
    }

    await validarPagoDeudaPersonal({ ...data, id });

    const pagoData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    // Transacción: Actualizar pago y recalcular deuda
    const resultado = await prisma.$transaction(async (tx) => {
      const pagoActualizado = await tx.pagoDeudaPersonal.update({
        where: { id },
        data: pagoData
      });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaConPersonalId;
      const pagos = await tx.pagoDeudaPersonal.findMany({
        where: { deudaConPersonalId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaConPersonal.findUnique({ where: { id: deudaId } });
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;
      const nuevoEstadoId = calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      await tx.deudaConPersonal.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId
        }
      });

      return pagoActualizado;
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al actualizar pago', err.message);
    }
    throw err;
  }
};

/**
 * Eliminar pago
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.pagoDeudaPersonal.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundError('Pago de deuda personal no encontrado');
    }

    // Transacción: Eliminar pago y recalcular deuda
    await prisma.$transaction(async (tx) => {
      await tx.pagoDeudaPersonal.delete({ where: { id } });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaConPersonalId;
      const pagos = await tx.pagoDeudaPersonal.findMany({
        where: { deudaConPersonalId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaConPersonal.findUnique({ where: { id: deudaId } });
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;
      const nuevoEstadoId = calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      await tx.deudaConPersonal.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId
        }
      });
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al eliminar pago', err.message);
    }
    throw err;
  }
};

/**
 * Listar pagos por deuda
 */
const listarPorDeuda = async (deudaConPersonalId) => {
  try {
    return await prisma.pagoDeudaPersonal.findMany({
      where: { deudaConPersonalId },
      include: {
        medioPago: true,
        movimientoCaja: {
          include: {
            tipoMovimiento: true,
            moneda: true,
            estado: true
          }
        }
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos por deuda', err.message);
    }
    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// FUNCIÓN PROFESIONAL: PROCESAR PAGO COMPLETO
// ════════════════════════════════════════════════════════════

/**
 * Procesar pago completo de deuda personal
 * 
 * Esta función realiza una transacción atómica que:
 * 1. Crea el registro de PagoDeudaPersonal
 * 2. Crea MovimientoCaja principal (monto del pago)
 * 3. Crea MovimientoCaja para ITF (si aplica)
 * 4. Crea MovimientoCaja para Comisión (si aplica)
 * 5. Actualiza el saldo y estado de la DeudaConPersonal
 * 6. Actualiza el saldo de la CuentaCorriente
 * 
 * @param {BigInt} deudaId - ID de la deuda a pagar
 * @param {Object} data - Datos del pago
 * @param {Number} data.montoPago - Monto principal del pago
 * @param {Date} data.fechaPago - Fecha del pago
 * @param {BigInt} data.cuentaCorrienteOrigenId - ID de la cuenta origen
 * @param {BigInt} data.medioPagoId - ID del medio de pago
 * @param {Number} [data.itf=0] - Monto de ITF
 * @param {Number} [data.comision=0] - Monto de comisión
 * @param {String} [data.numeroOperacion] - Número de operación bancaria
 * @param {String} [data.observaciones] - Observaciones del pago
 * @param {BigInt} [data.usuarioId] - ID del usuario que realiza el pago
 * @returns {Promise<Object>} Resultado del pago con todos los registros creados
 */
const procesarPago = async (deudaId, data) => {
  try {
    // Validar datos completos
    const { deuda, cuentaOrigen, medioPago, totalAPagar } = await validarProcesamientoPago(deudaId, data);

    // Obtener tipo de movimiento para la deuda
    const tipoMovimiento = await obtenerTipoMovimientoParaDeuda(deuda.tipoDeudaId);

    // Transacción atómica completa
    const resultado = await prisma.$transaction(async (tx) => {
      // Generar correlativo de operación
      const correlativo = await correlativoService.generarCorrelativo(deuda.empresaId, tx);

      // Crear movimiento caja principal (monto del pago)
      const movCajaPrincipal = await tx.movimientoCaja.create({
        data: {
          empresaOrigenId: deuda.empresaId,
          tipoMovimientoId: tipoMovimiento.id,
          entidadComercialId: deuda.personal.entidadComercialId,
          monto: Number(data.montoPago),
          monedaId: deuda.monedaId,
          descripcion: `Pago deuda personal - ${deuda.personal.nombre} ${deuda.personal.apellidos} - ${deuda.tipoDeuda.nombre}`,
          medioPagoId: Number(data.medioPagoId),
          estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
          cuentaCorrienteOrigenId: Number(data.cuentaCorrienteOrigenId),
          fechaOperacionMovCaja: new Date(data.fechaPago),
          numeroOperacion: data.numeroOperacion || null,
          operacionSinFactura: deuda.esGerencial,
          observaciones: data.observaciones || null,
          creadoPor: data.usuarioId || null,
          refOperacionEspecializadaMovCaja: Number(correlativo)
        }
      });

      // Crear movimiento caja ITF (si aplica)
      let movCajaITF = null;
      if (data.itf && Number(data.itf) > 0) {
        movCajaITF = await tx.movimientoCaja.create({
          data: {
            empresaOrigenId: deuda.empresaId,
            tipoMovimientoId: tipoMovimiento.id,
            monto: Number(data.itf),
            monedaId: deuda.monedaId,
            descripcion: `ITF - Pago deuda personal - ${deuda.personal.nombre} ${deuda.personal.apellidos}`,
            medioPagoId: Number(data.medioPagoId),
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            cuentaCorrienteOrigenId: Number(data.cuentaCorrienteOrigenId),
            fechaOperacionMovCaja: new Date(data.fechaPago),
            numeroOperacion: data.numeroOperacion || null,
            operacionSinFactura: true,
            observaciones: 'ITF generado automáticamente',
            creadoPor: data.usuarioId || null,
            refOperacionEspecializadaMovCaja: Number(correlativo)
          }
        });
      }

      // Crear movimiento caja comisión (si aplica)
      let movCajaComision = null;
      if (data.comision && Number(data.comision) > 0) {
        movCajaComision = await tx.movimientoCaja.create({
          data: {
            empresaOrigenId: deuda.empresaId,
            tipoMovimientoId: tipoMovimiento.id,
            monto: Number(data.comision),
            monedaId: deuda.monedaId,
            descripcion: `Comisión bancaria - Pago deuda personal - ${deuda.personal.nombre} ${deuda.personal.apellidos}`,
            medioPagoId: Number(data.medioPagoId),
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            cuentaCorrienteOrigenId: Number(data.cuentaCorrienteOrigenId),
            fechaOperacionMovCaja: new Date(data.fechaPago),
            numeroOperacion: data.numeroOperacion || null,
            operacionSinFactura: true,
            observaciones: 'Comisión bancaria generada automáticamente',
            creadoPor: data.usuarioId || null,
            refOperacionEspecializadaMovCaja: Number(correlativo)
          }
        });
      }

      // Crear registro de pago deuda personal
      const pago = await tx.pagoDeudaPersonal.create({
        data: {
          deudaConPersonalId: deudaId,
          fechaPago: new Date(data.fechaPago),
          montoPago: Number(data.montoPago),
          medioPagoId: Number(data.medioPagoId),
          numeroOperacion: data.numeroOperacion || null,
          movimientoCajaId: movCajaPrincipal.id,
          observaciones: data.observaciones || null,
          creadoPor: data.usuarioId || null,
          refOperacionEspecializadaMovCaja: Number(correlativo)
        }
      });

      // Actualizar deuda con personal
      const nuevoMontoPagado = Number(deuda.montoPagado) + Number(data.montoPago);
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - nuevoMontoPagado;
      const nuevoEstadoId = calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      const deudaActualizada = await tx.deudaConPersonal.update({
        where: { id: deudaId },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId,
          actualizadoPor: data.usuarioId || null
        }
      });

      // Actualizar saldo de cuenta corriente
      await tx.cuentaCorriente.update({
        where: { id: Number(data.cuentaCorrienteOrigenId) },
        data: {
          saldo: {
            decrement: totalAPagar
          }
        }
      });

      // Retornar resultado completo
      return {
        success: true,
        correlativo: Number(correlativo),
        pago,
        movimientoCajaPrincipal: movCajaPrincipal,
        movimientoCajaITF: movCajaITF,
        movimientoCajaComision: movCajaComision,
        deudaActualizada,
        resumen: {
          numeroOperacion: Number(correlativo),
          montoPagado: Number(data.montoPago),
          itf: Number(data.itf || 0),
          comision: Number(data.comision || 0),
          totalDescontado: totalAPagar,
          nuevoSaldoDeuda: nuevoSaldoPendiente,
          nuevoEstadoId: nuevoEstadoId,
          nuevoEstadoDescripcion: obtenerDescripcionEstado(nuevoEstadoId),
          movimientosCreados: 1 + (movCajaITF ? 1 : 0) + (movCajaComision ? 1 : 0)
        }
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al procesar pago', err.message);
    }
    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES
// ════════════════════════════════════════════════════════════

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorDeuda,
  procesarPago
};