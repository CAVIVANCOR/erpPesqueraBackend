import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CuentaPorPagar
 * Gestiona las cuentas por pagar a proveedores.
 * Documentado en español.
 */

// ========================================
// CONSTANTES DE ESTADOS - CUENTAS POR PAGAR
// ========================================
const ESTADO_CXP_PENDIENTE = 106;
const ESTADO_CXP_PAGO_PARCIAL = 107;
const ESTADO_CXP_PAGADO = 108;
const ESTADO_CXP_VENCIDO = 109;
const ESTADO_CXP_ANULADO = 110;
const ESTADO_CXP_CANJEADO = 111;

async function validarCuentaPorPagar(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }

  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) throw new ValidationError('El proveedor referenciado no existe.');
  }

  if (data.ordenCompraId) {
    const orden = await prisma.ordenCompra.findUnique({ where: { id: data.ordenCompraId } });
    if (!orden) throw new ValidationError('La orden de compra referenciada no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } });
    if (!estado) throw new ValidationError('El estado referenciado no existe.');
  }

  if (data.montoTotal !== undefined && data.montoTotal < 0) {
    throw new ValidationError('El monto total no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoPagado < 0) {
    throw new ValidationError('El monto pagado no puede ser negativo.');
  }

  if (data.montoPagado !== undefined && data.montoTotal !== undefined && data.montoPagado > data.montoTotal) {
    throw new ValidationError('El monto pagado no puede ser mayor al monto total.');
  }

  if (data.montoDetraccionTotal !== undefined && data.montoDetraccionTotal < 0) {
    throw new ValidationError('El monto total de detracción no puede ser negativo.');
  }

  if (data.montoRetencionTotal !== undefined && data.montoRetencionTotal < 0) {
    throw new ValidationError('El monto total de retención no puede ser negativo.');
  }

  if (data.montoPercepcionTotal !== undefined && data.montoPercepcionTotal < 0) {
    throw new ValidationError('El monto total de percepción no puede ser negativo.');
  }

  if (data.porcentajeRetencion !== undefined && (data.porcentajeRetencion < 0 || data.porcentajeRetencion > 100)) {
    throw new ValidationError('El porcentaje de retención debe estar entre 0 y 100.');
  }

  if (data.porcentajeDetraccion !== undefined && (data.porcentajeDetraccion < 0 || data.porcentajeDetraccion > 100)) {
    throw new ValidationError('El porcentaje de detracción debe estar entre 0 y 100.');
  }

  if (data.porcentajePercepcion !== undefined && (data.porcentajePercepcion < 0 || data.porcentajePercepcion > 100)) {
    throw new ValidationError('El porcentaje de percepción debe estar entre 0 y 100.');
  }
}


/**
 * Calcula el estado automático de una Cuenta por Pagar
 * Estados automáticos: 106, 107, 108, 109
 * Estados manuales (se respetan): 110 (ANULADO), 111 (CANJEADO)
 * 
 * @param {number} montoTotal - Monto total de la deuda
 * @param {number} montoPagado - Monto ya pagado
 * @param {number} saldoPendiente - Saldo pendiente de pago
 * @param {Date} fechaVencimiento - Fecha de vencimiento
 * @param {BigInt|null} estadoActual - Estado actual (para respetar manuales)
 * @returns {BigInt} Estado calculado
 */
const calcularEstadoCxP = (
  montoTotal,
  montoPagado,
  saldoPendiente,
  fechaVencimiento,
  estadoActual = null,
) => {
  // Si el estado actual es ANULADO (110) o CANJEADO (111), NO recalcular
  if (
    estadoActual &&
    (Number(estadoActual) === ESTADO_CXP_ANULADO || Number(estadoActual) === ESTADO_CXP_CANJEADO)
  ) {
    return estadoActual;
  }

  const total = Number(montoTotal || 0);
  const pagado = Number(montoPagado || 0);
  const saldo = Number(saldoPendiente || 0);
  const hoy = new Date();
  const vencimiento = fechaVencimiento ? new Date(fechaVencimiento) : null;

  // 109 - VENCIDO: Ya pasó la fecha de vencimiento y aún hay saldo pendiente
  if (vencimiento && vencimiento < hoy && saldo > 0) {
    return Number(ESTADO_CXP_VENCIDO);
  }

  // 108 - PAGADO: Saldo pendiente es 0 y se pagó al menos el total
  if (saldo === 0 && pagado >= total) {
    return Number(ESTADO_CXP_PAGADO);
  }

  // 107 - PAGO PARCIAL: Hay al menos un pago pero aún queda saldo
  if (pagado > 0 && saldo > 0) {
    return Number(ESTADO_CXP_PAGO_PARCIAL);
  }

  // 106 - PENDIENTE: No hay ningún pago (estado por defecto)
  return Number(ESTADO_CXP_PENDIENTE);
};



const listar = async () => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      include: {
        empresa: true,
        proveedor: true,
        ordenCompra: {
          include: {
            tipoDocumento: true,
          },
        },
        moneda: true,
        estado: true,
        pagos: true,
        periodoContable: true,
      },
      orderBy: { fechaEmision: 'desc' }
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
    const cuenta = await prisma.cuentaPorPagar.findUnique({
      where: { id },
      include: {
        empresa: true,
        proveedor: true,
        ordenCompra: true,
        moneda: true,
        estado: true,
        pagos: {
          include: {
            medioPago: true
          },
          orderBy: { fechaPago: 'desc' }
        }
      }
    });
    if (!cuenta) throw new NotFoundError('Cuenta por pagar no encontrada');
    return cuenta;
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
    if (!data.empresaId || !data.proveedorId || !data.fechaEmision || !data.montoTotal || !data.monedaId) {
      throw new ValidationError('Faltan campos obligatorios.');
    }

    await validarCuentaPorPagar(data);

    const montoPagado = data.montoPagado || 0;
    const saldoPendiente = (data.montoTotal || 0) - montoPagado;

    // Calcular estado automáticamente (solo si no es ANULADO o CANJEADO)
    const estadoCalculado = calcularEstadoCxP(
      data.montoTotal,
      montoPagado,
      saldoPendiente,
      data.fechaVencimiento,
      data.estadoId,
    );

    const cuentaData = {
      ...data,
      montoPagado,
      saldoPendiente,
      estadoId: estadoCalculado,
      esGerencial: data.esGerencial !== undefined ? data.esGerencial : false,
      tieneDetraccion: data.tieneDetraccion || false,
      montoDetraccionTotal: data.montoDetraccionTotal || 0,
      porcentajeDetraccion: data.porcentajeDetraccion || null,
      tieneRetencion: data.tieneRetencion || false,
      montoRetencionTotal: data.montoRetencionTotal || 0,
      porcentajeRetencion: data.porcentajeRetencion || null,
      tienePercepcion: data.tienePercepcion || false,
      montoPercepcionTotal: data.montoPercepcionTotal || 0,
      porcentajePercepcion: data.porcentajePercepcion || null,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      creadoPor: data.creadoPor || null,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };

    return await prisma.cuentaPorPagar.create({ data: cuentaData });
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
    const existente = await prisma.cuentaPorPagar.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cuenta por pagar no encontrada');

    await validarCuentaPorPagar({ ...data, id });

    // ✅ RECALCULAR montoPagado desde los pagos reales
    const pagos = await prisma.pagoCuentaPorPagar.findMany({
      where: { cuentaPorPagarId: id },
    });

    const montoPagadoRecalculado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
      0
    );

    // Calcular saldo pendiente
    const montoTotal =
      data.montoTotal !== undefined ? data.montoTotal : existente.montoTotal;

    // ✅ USAR montoPagado recalculado, NO el que viene en data
    const montoPagado = montoPagadoRecalculado;

    const saldoPendiente = Number(montoTotal) - Number(montoPagado);
    const fechaVencimiento =
      data.fechaVencimiento !== undefined
        ? data.fechaVencimiento
        : existente.fechaVencimiento;

    // Calcular estado automáticamente (respetando ANULADO y CANJEADO)
    const estadoActual =
      data.estadoId !== undefined ? data.estadoId : existente.estadoId;
    const estadoCalculado = calcularEstadoCxP(
      montoTotal,
      montoPagado,
      saldoPendiente,
      fechaVencimiento,
      estadoActual,
    );

    const cuentaData = {
      ...data,
      montoPagado, // ✅ Forzar el montoPagado recalculado
      saldoPendiente,
      estadoId: estadoCalculado,
      esGerencial: data.esGerencial,
      actualizadoPor: data.actualizadoPor || null,
      fechaActualizacion: new Date()
    };

    return await prisma.cuentaPorPagar.update({
      where: { id },
      data: cuentaData
    });
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
    const existente = await prisma.cuentaPorPagar.findUnique({
      where: { id },
      include: { pagos: true }
    });

    if (!existente) throw new NotFoundError('Cuenta por pagar no encontrada');

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError('No se puede eliminar la cuenta porque tiene pagos asociados.');
    }

    await prisma.cuentaPorPagar.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      where: { empresaId },
      include: {
        proveedor: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorProveedor = async (proveedorId) => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      where: { proveedorId },
      include: {
        empresa: true,
        moneda: true,
        estado: true,
        pagos: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPendientes = async (empresaId) => {
  try {
    return await prisma.cuentaPorPagar.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 }
      },
      include: {
        proveedor: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarVencidas = async (empresaId) => {
  try {
    const hoy = new Date();
    return await prisma.cuentaPorPagar.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 }
      },
      include: {
        proveedor: true,
        moneda: true,
        estado: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorOrdenCompraId = async (ordenCompraId) => {
  try {
    const cuenta = await prisma.cuentaPorPagar.findUnique({
      where: { ordenCompraId },
      include: {
        empresa: true,
        proveedor: true,
        moneda: true,
        estado: true,
        periodoContable: true,
        ordenCompra: {
          include: {
            tipoDocumento: true,
          },
        },
        pagos: {
          include: {
            medioPago: true,
          },
          orderBy: { fechaPago: "desc" },
        },
      },
    });

    return cuenta;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
  listarPorEmpresa,
  listarPorProveedor,
  listarPendientes,
  listarVencidas,
  obtenerPorOrdenCompraId

};
