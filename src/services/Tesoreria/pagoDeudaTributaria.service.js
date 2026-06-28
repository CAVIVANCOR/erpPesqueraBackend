import prisma from '../../config/prismaClient.js';
import { ValidationError, NotFoundError, DatabaseError } from '../../utils/errors.js';
import correlativoService from './correlativoOperacionCaja.service.js';
/**
 * Estados de deudas tributarias (tipoProvieneDeId = 27)
 * - 120: PENDIENTE (danger)
 * - 121: PAGO PARCIAL (warning)
 * - 122: PAGADO (success)
 * - 123: VENCIDO (danger)
 * - 124: ANULADO (secondary)
 * - 125: CANJEADO (contrast)
 */
const ESTADOS_DEUDA_TRIBUTARIA = {
  PENDIENTE: 120,
  PAGO_PARCIAL: 121,
  PAGADO: 122,
  VENCIDO: 123,
  ANULADO: 124,
  CANJEADO: 125,
};
// Constantes de MovimientoCaja
const TIPO_PROVIENE_MOVIMIENTOS_CAJA = 6;
 
const ESTADOS_MOVIMIENTO_CAJA = {
  PENDIENTE: 20,
  VALIDADO: 21,
  ASIENTO_GENERADO: 22
};
 
const CATEGORIA_IMPUESTOS = 24;
 
const TIPOS_MOVIMIENTO_IMPUESTOS = {
  SUNAT: 165,
  MUNICIPIOS: 166,
  RENTA_ALQUILERES: 167
};

async function validarPagoDeudaTributaria(data) {
  if (data.deudaTributariaId) {
    const deuda = await prisma.deudaTributaria.findUnique({ where: { id: data.deudaTributariaId } });
    if (!deuda) throw new ValidationError('La deuda referenciada no existe.');
  }

  if (data.medioPagoId) {
    const medioPago = await prisma.medioPago.findUnique({ where: { id: data.medioPagoId } });s
    if (!medioPago) throw new ValidationError('El medio de pago referenciado no existe.');
  }

  if (data.montoPago !== undefined && data.montoPago <= 0) {
    throw new ValidationError('El monto del pago debe ser mayor a cero.');
  }

  // Validar que el pago no exceda el saldo pendiente
  if (data.deudaTributariaId && data.montoPago) {
    const deuda = await prisma.deudaTributaria.findUnique({ where: { id: data.deudaTributariaId } });
    if (deuda && Number(data.montoPago) > Number(deuda.saldoPendiente)) {
      throw new ValidationError('El monto del pago no puede ser mayor al saldo pendiente de la deuda.');
    }
  }
}

const listar = async () => {
  try {
    return await prisma.pagoDeudaTributaria.findMany({
      include: {
        deudaTributaria: {
          include: {
            empresa: true,
            tipoDeuda: {
              include: {
                entidadRecaudadora: true
              }
            }
          }
        },
        medioPago: true,
        movimientoCaja: true
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const pago = await prisma.pagoDeudaTributaria.findUnique({
      where: { id },
      include: {
        deudaTributaria: {
          include: {
            empresa: true,
            tipoDeuda: {
              include: {
                entidadRecaudadora: true
              }
            },
            moneda: true
          }
        },
        medioPago: true,
        movimientoCaja: true
      }
    });
    if (!pago) throw new NotFoundError('Pago de deuda tributaria no encontrado');
    return pago;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.deudaTributariaId || !data.fechaPago || !data.montoPago) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarPagoDeudaTributaria(data);

    const pagoData = {
      ...data,
      medioPagoId: data.medioPagoId || null,
      numeroOperacion: data.numeroOperacion || null,
      numeroConstancia: data.numeroConstancia || null,
      movimientoCajaId: data.movimientoCajaId || null,
      observaciones: data.observaciones || null,
      creadoPor: data.creadoPor || null
    };

    // ✅ TRANSACCIÓN: Crear pago y actualizar deuda
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el pago
      const nuevoPago = await tx.pagoDeudaTributaria.create({ data: pagoData });

      // Recalcular montoPagado y saldoPendiente de la deuda
      const deuda = await tx.deudaTributaria.findUnique({
        where: { id: data.deudaTributariaId }
      });

      const nuevoMontoPagado = Number(deuda.montoPagado) + Number(data.montoPago);
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - nuevoMontoPagado;

      await tx.deudaTributaria.update({
        where: { id: data.deudaTributariaId },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente
        }
      });

      return nuevoPago;
    });

    return resultado;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.pagoDeudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de deuda tributaria no encontrado');

    await validarPagoDeudaTributaria({ ...data, id });

    const pagoData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    // ✅ TRANSACCIÓN: Actualizar pago y recalcular deuda
    const resultado = await prisma.$transaction(async (tx) => {
      const pagoActualizado = await tx.pagoDeudaTributaria.update({
        where: { id },
        data: pagoData
      });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaTributariaId;
      const pagos = await tx.pagoDeudaTributaria.findMany({
        where: { deudaTributariaId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaTributaria.findUnique({ where: { id: deudaId } });
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;

      await tx.deudaTributaria.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente
        }
      });

      return pagoActualizado;
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.pagoDeudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Pago de deuda tributaria no encontrado');

    // ✅ TRANSACCIÓN: Eliminar pago y recalcular deuda
    await prisma.$transaction(async (tx) => {
      await tx.pagoDeudaTributaria.delete({ where: { id } });

      // Recalcular totales de la deuda
      const deudaId = existente.deudaTributariaId;
      const pagos = await tx.pagoDeudaTributaria.findMany({
        where: { deudaTributariaId: deudaId }
      });

      const montoPagadoTotal = pagos.reduce((sum, p) => sum + Number(p.montoPago), 0);
      const deuda = await tx.deudaTributaria.findUnique({ where: { id: deudaId } });
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - montoPagadoTotal;

      await tx.deudaTributaria.update({
        where: { id: deudaId },
        data: {
          montoPagado: montoPagadoTotal,
          saldoPendiente: nuevoSaldoPendiente
        }
      });
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Calcular nuevo estado de la deuda según saldo pendiente
 */
function calcularNuevoEstadoDeuda(saldoPendiente) {
  if (saldoPendiente <= 0) {
    return ESTADOS_DEUDA_TRIBUTARIA.PAGADO;
  } else if (saldoPendiente > 0) {
    return ESTADOS_DEUDA_TRIBUTARIA.PAGO_PARCIAL;
  }
  return ESTADOS_DEUDA_TRIBUTARIA.PENDIENTE;
}

/**
 * Obtener descripción del estado
 */
function obtenerDescripcionEstado(estadoId) {
  const estados = {
    [ESTADOS_DEUDA_TRIBUTARIA.PENDIENTE]: 'Pendiente',
    [ESTADOS_DEUDA_TRIBUTARIA.PAGO_PARCIAL]: 'Pago Parcial',
    [ESTADOS_DEUDA_TRIBUTARIA.PAGADO]: 'Pagado',
    [ESTADOS_DEUDA_TRIBUTARIA.VENCIDO]: 'Vencido',
    [ESTADOS_DEUDA_TRIBUTARIA.ANULADO]: 'Anulado',
    [ESTADOS_DEUDA_TRIBUTARIA.CANJEADO]: 'Canjeado'
  };
  return estados[estadoId] || 'Desconocido';
}

/**
 * Obtener tipo de movimiento para la deuda tributaria
 */
async function obtenerTipoMovimientoParaDeuda(tipoDeudaId) {
  const tipoDeuda = await prisma.tipoDeudaTributaria.findUnique({
    where: { id: tipoDeudaId },
    include: { entidadRecaudadora: true }
  });

  if (!tipoDeuda) {
    throw new ValidationError('Tipo de deuda no encontrado');
  }

  // Determinar tipo de movimiento según entidad recaudadora
  let tipoMovimientoId = TIPOS_MOVIMIENTO_IMPUESTOS.SUNAT; // Por defecto SUNAT

  const entidadNombre = tipoDeuda.entidadRecaudadora?.nombre?.toLowerCase() || '';
  
  if (entidadNombre.includes('municipal') || entidadNombre.includes('municipio')) {
    tipoMovimientoId = TIPOS_MOVIMIENTO_IMPUESTOS.MUNICIPIOS;
  } else if (entidadNombre.includes('renta') || entidadNombre.includes('alquiler')) {
    tipoMovimientoId = TIPOS_MOVIMIENTO_IMPUESTOS.RENTA_ALQUILERES;
  }

  const tipoMovimiento = await prisma.tipoMovimientoCaja.findUnique({
    where: { id: tipoMovimientoId }
  });

  if (!tipoMovimiento) {
    throw new ValidationError('Tipo de movimiento no encontrado');
  }

  return tipoMovimiento;
}

/**
 * Validar datos completos para procesamiento de pago
 */
async function validarProcesamientoPago(deudaId, data) {
  // Validar deuda
  const deuda = await prisma.deudaTributaria.findUnique({
    where: { id: deudaId },
    include: {
      empresa: true,
      tipoDeuda: {
        include: {
          entidadRecaudadora: true
        }
      },
      moneda: true,
      estado: true
    }
  });

  if (!deuda) {
    throw new NotFoundError('Deuda tributaria no encontrada');
  }

  // Validar cuenta corriente
  const cuentaOrigen = await prisma.cuentaCorriente.findUnique({
    where: { id: Number(data.cuentaCorrienteOrigenId) }
  });

  if (!cuentaOrigen) {
    throw new ValidationError('Cuenta corriente origen no encontrada');
  }

  // Validar medio de pago
  const medioPago = await prisma.medioPago.findUnique({
    where: { id: Number(data.medioPagoId) }
  });

  if (!medioPago) {
    throw new ValidationError('Medio de pago no encontrado');
  }

  // Validar montos
  const montoPago = Number(data.montoPago || 0);
  const itf = Number(data.itf || 0);
  const comision = Number(data.comision || 0);
  const totalAPagar = montoPago + itf + comision;

  if (montoPago <= 0) {
    throw new ValidationError('El monto del pago debe ser mayor a cero');
  }

  if (montoPago > Number(deuda.saldoPendiente)) {
    throw new ValidationError('El monto del pago no puede ser mayor al saldo pendiente');
  }

  if (Number(cuentaOrigen.saldo) < totalAPagar) {
    throw new ValidationError('Saldo insuficiente en la cuenta origen');
  }

  return { deuda, cuentaOrigen, medioPago, totalAPagar };
}

/**
 * Procesar pago completo de deuda tributaria
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
          monto: Number(data.montoPago),
          monedaId: deuda.monedaId,
          descripcion: `Pago deuda tributaria - ${deuda.tipoDeuda.nombre} - Periodo ${deuda.periodo}`,
          medioPagoId: Number(data.medioPagoId),
          estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
          cuentaCorrienteOrigenId: Number(data.cuentaCorrienteOrigenId),
          fechaOperacionMovCaja: new Date(data.fechaPago),
          numeroOperacion: data.numeroOperacion || null,
          operacionSinFactura: false,
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
            descripcion: `ITF - Pago deuda tributaria - ${deuda.tipoDeuda.nombre}`,
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
            descripcion: `Comisión bancaria - Pago deuda tributaria - ${deuda.tipoDeuda.nombre}`,
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

      // Crear registro de pago deuda tributaria
      const pago = await tx.pagoDeudaTributaria.create({
        data: {
          deudaTributariaId: deudaId,
          fechaPago: new Date(data.fechaPago),
          montoPago: Number(data.montoPago),
          medioPagoId: Number(data.medioPagoId),
          numeroOperacion: data.numeroOperacion || null,
          numeroConstancia: data.numeroConstancia || null,
          movimientoCajaId: movCajaPrincipal.id,
          observaciones: data.observaciones || null,
          creadoPor: data.usuarioId || null,
          refOperacionEspecializadaMovCaja: Number(correlativo)
        }
      });

      // Actualizar deuda tributaria
      const nuevoMontoPagado = Number(deuda.montoPagado) + Number(data.montoPago);
      const nuevoSaldoPendiente = Number(deuda.montoOriginal) - nuevoMontoPagado;
      const nuevoEstadoId = calcularNuevoEstadoDeuda(nuevoSaldoPendiente);

      const deudaActualizada = await tx.deudaTributaria.update({
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

const listarPorDeuda = async (deudaTributariaId) => {
  try {
    return await prisma.pagoDeudaTributaria.findMany({
      where: { deudaTributariaId },
      include: {
        medioPago: true,
        movimientoCaja: true
      },
      orderBy: { fechaPago: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorDeuda,
  procesarPago
};