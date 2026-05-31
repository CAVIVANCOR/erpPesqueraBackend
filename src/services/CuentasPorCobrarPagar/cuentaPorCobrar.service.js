import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para CuentaPorCobrar
 * Gestiona las cuentas por cobrar a clientes.
 * Documentado en español.
 */

async function validarCuentaPorCobrar(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa)
      throw new ValidationError("La empresa referenciada no existe.");
  }

  if (data.clienteId) {
    const cliente = await prisma.entidadComercial.findUnique({
      where: { id: data.clienteId },
    });
    if (!cliente)
      throw new ValidationError("El cliente referenciado no existe.");
  }

  if (data.comprobanteElectronicoId) {
    const comprobante = await prisma.comprobanteElectronico.findUnique({
      where: { id: data.comprobanteElectronicoId },
    });
    if (!comprobante)
      throw new ValidationError(
        "El comprobante electrónico referenciado no existe.",
      );
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) throw new ValidationError("La moneda referenciada no existe.");
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: data.estadoId },
    });
    if (!estado) throw new ValidationError("El estado referenciado no existe.");
  }

  if (data.montoTotal !== undefined && data.montoTotal < 0) {
    throw new ValidationError("El monto total no puede ser negativo.");
  }

  if (data.montoPagado !== undefined && data.montoPagado < 0) {
    throw new ValidationError("El monto pagado no puede ser negativo.");
  }

  if (
    data.montoPagado !== undefined &&
    data.montoTotal !== undefined &&
    data.montoPagado > data.montoTotal
  ) {
    throw new ValidationError(
      "El monto pagado no puede ser mayor al monto total.",
    );
  }

  if (
    data.montoDetraccionTotal !== undefined &&
    data.montoDetraccionTotal < 0
  ) {
    throw new ValidationError(
      "El monto total de detracción no puede ser negativo.",
    );
  }

  if (data.montoRetencionTotal !== undefined && data.montoRetencionTotal < 0) {
    throw new ValidationError(
      "El monto total de retención no puede ser negativo.",
    );
  }

  if (
    data.montoPercepcionTotal !== undefined &&
    data.montoPercepcionTotal < 0
  ) {
    throw new ValidationError(
      "El monto total de percepción no puede ser negativo.",
    );
  }

  if (
    data.porcentajeDetraccion !== undefined &&
    (data.porcentajeDetraccion < 0 || data.porcentajeDetraccion > 100)
  ) {
    throw new ValidationError(
      "El porcentaje de detracción debe estar entre 0 y 100.",
    );
  }

  if (
    data.porcentajePercepcion !== undefined &&
    (data.porcentajePercepcion < 0 || data.porcentajePercepcion > 100)
  ) {
    throw new ValidationError(
      "El porcentaje de percepción debe estar entre 0 y 100.",
    );
  }

  if (
    data.porcentajeRetencion !== undefined &&
    (data.porcentajeRetencion < 0 || data.porcentajeRetencion > 100)
  ) {
    throw new ValidationError(
      "El porcentaje de retención debe estar entre 0 y 100.",
    );
  }
}

/**
 * Calcula el estado automático de una Cuenta por Cobrar
 * Estados automáticos: 100, 101, 102, 103
 * Estados manuales (se respetan): 104 (ANULADO), 105 (CANJEADO)
 */
const calcularEstadoCxC = (
  montoTotal,
  montoPagado,
  saldoPendiente,
  fechaVencimiento,
  estadoActual = null,
) => {
  // Si el estado actual es ANULADO (104) o CANJEADO (105), NO recalcular
  if (
    estadoActual &&
    (Number(estadoActual) === 104 || Number(estadoActual) === 105)
  ) {
    return estadoActual;
  }

  const total = Number(montoTotal || 0);
  const pagado = Number(montoPagado || 0);
  const saldo = Number(saldoPendiente || 0);
  const hoy = new Date();
  const vencimiento = fechaVencimiento ? new Date(fechaVencimiento) : null;

  // 103 - VENCIDO: Ya pasó la fecha de vencimiento y aún hay saldo pendiente
  if (vencimiento && vencimiento < hoy && saldo > 0) {
    return BigInt(103);
  }

  // 102 - PAGADO: Saldo pendiente es 0 y se pagó al menos el total
  if (saldo === 0 && pagado >= total) {
    return BigInt(102);
  }

  // 101 - PAGO PARCIAL: Hay al menos un pago pero aún queda saldo
  if (pagado > 0 && saldo > 0) {
    return BigInt(101);
  }

  // 100 - PENDIENTE DE PAGO: No hay ningún pago (estado por defecto)
  return BigInt(100);
};

const listar = async () => {
  try {
    return await prisma.cuentaPorCobrar.findMany({
      include: {
        empresa: true,
        cliente: true,
        comprobanteElectronico: true,
        moneda: true,
        estado: true,
        pagos: true,
        periodoContable: true, // ✅ AGREGADO
      },
      orderBy: { fechaEmision: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const cuenta = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        comprobanteElectronico: true,
        moneda: true,
        estado: true,
        periodoContable: true, // ✅ AGREGADO
        pagos: {
          include: {
            medioPago: true,
          },
          orderBy: { fechaPago: "desc" },
        },
      },
    });
    if (!cuenta) throw new NotFoundError("Cuenta por cobrar no encontrada");
    return cuenta;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (
      !data.empresaId ||
      !data.clienteId ||
      !data.fechaEmision ||
      !data.montoTotal ||
      !data.monedaId
    ) {
      throw new ValidationError("Faltan campos obligatorios.");
    }

    await validarCuentaPorCobrar(data);

    const montoPagado = data.montoPagado || 0;
    const saldoPendiente = (data.montoTotal || 0) - montoPagado;

    // Calcular estado automáticamente (solo si no es ANULADO o CANJEADO)
    const estadoCalculado = calcularEstadoCxC(
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
      tieneDetraccion: data.tieneDetraccion || false,
      montoDetraccionTotal: data.montoDetraccionTotal || 0,
      tieneRetencion: data.tieneRetencion || false,
      montoRetencionTotal: data.montoRetencionTotal || 0,
      porcentajeRetencion: data.porcentajeRetencion || null,
      tienePercepcion: data.tienePercepcion || false,
      montoPercepcionTotal: data.montoPercepcionTotal || 0,
      fechaContable: data.fechaContable || new Date(),
      periodoContableId: data.periodoContableId || null,
      creadoPor: data.creadoPor || null,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    };

    return await prisma.cuentaPorCobrar.create({ data: cuentaData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Cuenta por cobrar no encontrada");

    await validarCuentaPorCobrar({ ...data, id });

    // Calcular saldo pendiente
    const montoTotal =
      data.montoTotal !== undefined ? data.montoTotal : existente.montoTotal;
    const montoPagado =
      data.montoPagado !== undefined ? data.montoPagado : existente.montoPagado;
    const saldoPendiente = Number(montoTotal) - Number(montoPagado);
    const fechaVencimiento =
      data.fechaVencimiento !== undefined
        ? data.fechaVencimiento
        : existente.fechaVencimiento;

    // Calcular estado automáticamente (respetando ANULADO y CANJEADO)
    const estadoActual =
      data.estadoId !== undefined ? data.estadoId : existente.estadoId;
    const estadoCalculado = calcularEstadoCxC(
      montoTotal,
      montoPagado,
      saldoPendiente,
      fechaVencimiento,
      estadoActual,
    );

    const cuentaData = {
      ...data,
      saldoPendiente,
      estadoId: estadoCalculado,
      actualizadoPor: data.actualizadoPor || null,
      fechaActualizacion: new Date(),
    };

    return await prisma.cuentaPorCobrar.update({
      where: { id },
      data: cuentaData,
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: { pagos: true },
    });

    if (!existente) throw new NotFoundError("Cuenta por cobrar no encontrada");

    if (existente.pagos && existente.pagos.length > 0) {
      throw new ConflictError(
        "No se puede eliminar la cuenta porque tiene pagos asociados.",
      );
    }

    await prisma.cuentaPorCobrar.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.cuentaPorCobrar.findMany({
      where: { empresaId },
      include: {
        cliente: true,
        moneda: true,
        estado: true,
        pagos: true,
        periodoContable: true, // ✅ AGREGADO
      },
      orderBy: { fechaEmision: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const listarPorCliente = async (clienteId) => {
  try {
    return await prisma.cuentaPorCobrar.findMany({
      where: { clienteId },
      include: {
        empresa: true,
        moneda: true,
        estado: true,
        pagos: true,
        periodoContable: true, // ✅ AGREGADO
      },
      orderBy: { fechaEmision: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const listarPendientes = async (empresaId) => {
  try {
    return await prisma.cuentaPorCobrar.findMany({
      where: {
        empresaId,
        saldoPendiente: { gt: 0 },
      },
      include: {
        cliente: true,
        moneda: true,
        estado: true,
        periodoContable: true, // ✅ AGREGADO
      },
      orderBy: { fechaVencimiento: "asc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const listarVencidas = async (empresaId) => {
  try {
    const hoy = new Date();
    return await prisma.cuentaPorCobrar.findMany({
      where: {
        empresaId,
        fechaVencimiento: { lt: hoy },
        saldoPendiente: { gt: 0 },
      },
      include: {
        cliente: true,
        moneda: true,
        estado: true,
        periodoContable: true, // ✅ AGREGADO
      },
      orderBy: { fechaVencimiento: "asc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
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
  listarPorCliente,
  listarPendientes,
  listarVencidas,
};
