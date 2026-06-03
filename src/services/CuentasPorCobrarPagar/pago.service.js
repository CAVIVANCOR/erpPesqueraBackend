import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio para consulta consolidada de Pagos
 * Combina PagoCuentaPorCobrar y PagoCuentaPorPagar para vistas consolidadas
 * Documentado en español.
 */

const listar = async () => {
  try {
    // Obtener pagos de cuentas por cobrar
    const pagosCobrar = await prisma.pagoCuentaPorCobrar.findMany({
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
      },
      orderBy: { fechaPago: "desc" },
    });

    // Obtener pagos de cuentas por pagar
    const pagosPagar = await prisma.pagoCuentaPorPagar.findMany({
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
        prestamoBancario: {
          include: {
            banco: true,
            tipoPrestamo: true,
          },
        },
      },
      orderBy: { fechaPago: "desc" },
    });

    // Combinar ambos arrays y agregar un campo tipo
    const pagosCobrarConTipo = pagosCobrar.map((p) => ({
      ...p,
      tipoPago: "COBRAR",
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || "N/A",
      empresaNombre: p.cuentaPorCobrar?.empresa?.razonSocial || "N/A",
    }));

    const pagosPagarConTipo = pagosPagar.map((p) => ({
      ...p,
      tipoPago: "PAGAR",
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || "N/A",
      empresaNombre: p.cuentaPorPagar?.empresa?.razonSocial || "N/A",
    }));

    return [...pagosCobrarConTipo, ...pagosPagarConTipo].sort(
      (a, b) => new Date(b.fechaPago) - new Date(a.fechaPago),
    );
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar pagos",
        err.message,
      );
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    // Obtener pagos de cuentas por cobrar de la empresa
    const pagosCobrar = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        empresaId: Number(empresaId),
      },
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
      },
      orderBy: { fechaPago: "desc" },
    });

    // Obtener pagos de cuentas por pagar de la empresa
    const pagosPagar = await prisma.pagoCuentaPorPagar.findMany({
      where: {
        empresaId: Number(empresaId),
      },
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
        prestamoBancario: {
          include: {
            banco: true,
            tipoPrestamo: true,
          },
        },
      },
      orderBy: { fechaPago: "desc" },
    });

    const pagosCobrarConTipo = pagosCobrar.map((p) => ({
      ...p,
      tipoPago: "COBRAR",
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || "N/A",
      empresaNombre: p.cuentaPorCobrar?.empresa?.razonSocial || "N/A",
    }));

    const pagosPagarConTipo = pagosPagar.map((p) => ({
      ...p,
      tipoPago: "PAGAR",
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || "N/A",
      empresaNombre: p.cuentaPorPagar?.empresa?.razonSocial || "N/A",
    }));

    return [...pagosCobrarConTipo, ...pagosPagarConTipo].sort(
      (a, b) => new Date(b.fechaPago) - new Date(a.fechaPago),
    );
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar pagos por empresa",
        err.message,
      );
    }
    throw err;
  }
};

const listarPorCuentaCobrar = async (cuentaPorCobrarId) => {
  try {
    const pagos = await prisma.pagoCuentaPorCobrar.findMany({
      where: { cuentaPorCobrarId: Number(cuentaPorCobrarId) },
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
      },
      orderBy: { fechaPago: "desc" },
    });

    return pagos.map((p) => ({
      ...p,
      tipoPago: "COBRAR",
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || "N/A",
    }));
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar pagos por cuenta por cobrar",
        err.message,
      );
    }
    throw err;
  }
};

const listarPorCuentaPagar = async (cuentaPorPagarId) => {
  try {
    const pagos = await prisma.pagoCuentaPorPagar.findMany({
      where: { cuentaPorPagarId: Number(cuentaPorPagarId) },
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
        prestamoBancario: {
          include: {
            banco: true,
            tipoPrestamo: true,
          },
        },
      },
      orderBy: { fechaPago: "desc" },
    });

    return pagos.map((p) => ({
      ...p,
      tipoPago: "PAGAR",
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || "N/A",
    }));
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar pagos por cuenta por pagar",
        err.message,
      );
    }
    throw err;
  }
};

const obtenerPorId = async (id, tipoPago) => {
  if (!tipoPago) {
    throw new ValidationError(
      "Debe especificar el tipo de pago (COBRAR o PAGAR)",
    );
  }

  try {
    if (tipoPago === "COBRAR") {
      const pago = await prisma.pagoCuentaPorCobrar.findUnique({
        where: { id: Number(id) },
        include: {
          cuentaPorCobrar: {
            include: {
              cliente: true,
              empresa: true,
              moneda: true,
            },
          },
          medioPago: true,
          monedaPago: true,
          monedaDeuda: true,
          banco: true,
          cuentaBancaria: true,
          empresa: true,
          periodoContable: true,
          movimientoCaja: true,
        },
      });

      if (!pago) throw new NotFoundError("Pago no encontrado");

      return {
        ...pago,
        tipoPago: "COBRAR",
        entidad: pago.cuentaPorCobrar?.cliente?.razonSocial || "N/A",
      };
    }

    if (tipoPago === "PAGAR") {
      const pago = await prisma.pagoCuentaPorPagar.findUnique({
        where: { id: Number(id) },
        include: {
          cuentaPorPagar: {
            include: {
              proveedor: true,
              empresa: true,
              moneda: true,
            },
          },
          medioPago: true,
          monedaPago: true,
          monedaDeuda: true,
          banco: true,
          cuentaBancaria: true,
          empresa: true,
          periodoContable: true,
          movimientoCaja: true,
          prestamoBancario: {
            include: {
              banco: true,
              tipoPrestamo: true,
            },
          },
        },
      });

      if (!pago) throw new NotFoundError("Pago no encontrado");

      return {
        ...pago,
        tipoPago: "PAGAR",
        entidad: pago.cuentaPorPagar?.proveedor?.razonSocial || "N/A",
      };
    }

    throw new ValidationError("Tipo de pago inválido. Use COBRAR o PAGAR");
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al obtener pago",
        err.message,
      );
    }
    throw err;
  }
};

const listarPorMovimiento = async (movimientoCajaId) => {
  try {
    // Obtener pagos de cuentas por cobrar del movimiento
    const pagosCobrar = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        movimientoCajaId: Number(movimientoCajaId),
      },
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
      },
      orderBy: { fechaPago: "desc" },
    });

    // Obtener pagos de cuentas por pagar del movimiento
    const pagosPagar = await prisma.pagoCuentaPorPagar.findMany({
      where: {
        movimientoCajaId: Number(movimientoCajaId),
      },
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
            empresa: true,
            moneda: true,
          },
        },
        medioPago: true,
        monedaPago: true,
        monedaDeuda: true,
        banco: true,
        cuentaBancaria: true,
        empresa: true,
        periodoContable: true,
        movimientoCaja: true,
        prestamoBancario: {
          include: {
            banco: true,
            tipoPrestamo: true,
          },
        },
      },
      orderBy: { fechaPago: "desc" },
    });

    // Combinar ambos arrays y agregar un campo tipo
    const pagosCobrarConTipo = pagosCobrar.map((p) => ({
      ...p,
      tipoPago: "COBRAR",
      entidad: p.cuentaPorCobrar?.cliente?.razonSocial || "N/A",
      empresaNombre: p.cuentaPorCobrar?.empresa?.razonSocial || "N/A",
    }));

    const pagosPagarConTipo = pagosPagar.map((p) => ({
      ...p,
      tipoPago: "PAGAR",
      entidad: p.cuentaPorPagar?.proveedor?.razonSocial || "N/A",
      empresaNombre: p.cuentaPorPagar?.empresa?.razonSocial || "N/A",
    }));

    return [...pagosCobrarConTipo, ...pagosPagarConTipo].sort(
      (a, b) => new Date(b.fechaPago) - new Date(a.fechaPago),
    );
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar pagos por movimiento",
        err.message,
      );
    }
    throw err;
  }
};

// ============================================
// FUNCIONES CRUD PARA PAGOCUENTAPORCOBRAR
// ============================================

async function validarPagoCuentaPorCobrar(data) {
  if (data.cuentaPorCobrarId) {
    const cuenta = await prisma.cuentaPorCobrar.findUnique({
      where: { id: data.cuentaPorCobrarId },
    });
    if (!cuenta)
      throw new ValidationError("La cuenta por cobrar referenciada no existe.");
  }

  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa)
      throw new ValidationError("La empresa referenciada no existe.");
  }

  if (data.montoPagado !== undefined && data.montoPagado < 0) {
    throw new ValidationError("El monto pagado no puede ser negativo.");
  }

  if (data.tipoCambio !== undefined && data.tipoCambio <= 0) {
    throw new ValidationError("El tipo de cambio debe ser mayor a 0.");
  }
}

const crearPagoCobrar = async (data) => {
  await validarPagoCuentaPorCobrar(data);

  try {
    const nuevoPago = await prisma.pagoCuentaPorCobrar.create({
      data: {
        cuentaPorCobrarId: data.cuentaPorCobrarId,
        empresaId: data.empresaId,
        fechaPago: data.fechaPago,
        montoPagado: data.montoPagado,
        monedaPagoId: data.monedaPagoId,
        tipoCambio: data.tipoCambio,
        montoAplicadoDeuda: data.montoAplicadoDeuda,
        monedaDeudaId: data.monedaDeudaId,
        tieneDetraccion: data.tieneDetraccion || false,
        montoDetraccion: data.montoDetraccion || 0,
        porcentajeDetraccion: data.porcentajeDetraccion || null,
        numeroConstanciaDetraccion: data.numeroConstanciaDetraccion || null,
        fechaDetraccion: data.fechaDetraccion || null,
        tieneRetencion: data.tieneRetencion || false,
        montoRetencion: data.montoRetencion || 0,
        porcentajeRetencion: data.porcentajeRetencion || null,
        numeroComprobanteRetencion: data.numeroComprobanteRetencion || null,
        fechaRetencion: data.fechaRetencion || null,
        tienePercepcion: data.tienePercepcion || false,
        montoPercepcion: data.montoPercepcion || 0,
        porcentajePercepcion: data.porcentajePercepcion || null,
        numeroComprobantePercepcion: data.numeroComprobantePercepcion || null,
        fechaPercepcion: data.fechaPercepcion || null,
        medioPagoId: data.medioPagoId,
        numeroOperacion: data.numeroOperacion || null,
        bancoId: data.bancoId || null,
        cuentaBancariaId: data.cuentaBancariaId || null,
        movimientoCajaId: data.movimientoCajaId || null,
        observaciones: data.observaciones || null,
        fechaContable: data.fechaContable || new Date(),
        periodoContableId: data.periodoContableId || null,
        creadoPor: data.creadoPor || null,
      },
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true,
          },
        },
        empresa: true,
        monedaPago: true,
        monedaDeuda: true,
        medioPago: true,
        banco: true,
        cuentaBancaria: true,
        periodoContable: true,
      },
    });

    await actualizarCuentaPorCobrar(data.cuentaPorCobrarId);

    return nuevoPago;
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const actualizarPagoCobrar = async (id, data) => {
  await validarPagoCuentaPorCobrar(data);

  try {
    const pagoActualizado = await prisma.pagoCuentaPorCobrar.update({
      where: { id },
      data: {
        fechaPago: data.fechaPago,
        montoPagado: data.montoPagado,
        monedaPagoId: data.monedaPagoId,
        tipoCambio: data.tipoCambio,
        montoAplicadoDeuda: data.montoAplicadoDeuda,
        monedaDeudaId: data.monedaDeudaId,
        tieneDetraccion: data.tieneDetraccion,
        montoDetraccion: data.montoDetraccion,
        porcentajeDetraccion: data.porcentajeDetraccion,
        numeroConstanciaDetraccion: data.numeroConstanciaDetraccion,
        fechaDetraccion: data.fechaDetraccion,
        tieneRetencion: data.tieneRetencion,
        montoRetencion: data.montoRetencion,
        porcentajeRetencion: data.porcentajeRetencion,
        numeroComprobanteRetencion: data.numeroComprobanteRetencion,
        fechaRetencion: data.fechaRetencion,
        tienePercepcion: data.tienePercepcion,
        montoPercepcion: data.montoPercepcion,
        porcentajePercepcion: data.porcentajePercepcion,
        numeroComprobantePercepcion: data.numeroComprobantePercepcion,
        fechaPercepcion: data.fechaPercepcion,
        medioPagoId: data.medioPagoId,
        numeroOperacion: data.numeroOperacion,
        bancoId: data.bancoId,
        cuentaBancariaId: data.cuentaBancariaId,
        movimientoCajaId: data.movimientoCajaId,
        observaciones: data.observaciones,
        fechaContable: data.fechaContable,
        periodoContableId: data.periodoContableId,
        actualizadoPor: data.actualizadoPor || null,
      },
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true,
          },
        },
        empresa: true,
        monedaPago: true,
        monedaDeuda: true,
        medioPago: true,
        banco: true,
        cuentaBancaria: true,
        periodoContable: true,
      },
    });

    const pagoOriginal = await prisma.pagoCuentaPorCobrar.findUnique({
      where: { id },
      select: { cuentaPorCobrarId: true },
    });
    if (pagoOriginal) {
      await actualizarCuentaPorCobrar(pagoOriginal.cuentaPorCobrarId);
    }

    return pagoActualizado;
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Pago de cuenta por cobrar no encontrado.");
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const eliminarPagoCobrar = async (id) => {
  try {
    const pago = await prisma.pagoCuentaPorCobrar.findUnique({
      where: { id },
      select: { cuentaPorCobrarId: true },
    });

    if (!pago) {
      throw new NotFoundError("Pago de cuenta por cobrar no encontrado.");
    }

    await prisma.pagoCuentaPorCobrar.delete({
      where: { id },
    });

    await actualizarCuentaPorCobrar(pago.cuentaPorCobrarId);

    return { eliminado: true, id };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code === "P2025") {
      throw new NotFoundError("Pago de cuenta por cobrar no encontrado.");
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

async function actualizarCuentaPorCobrar(cuentaPorCobrarId) {
  try {
    const pagos = await prisma.pagoCuentaPorCobrar.findMany({
      where: { cuentaPorCobrarId },
    });

    const montoPagado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
      0,
    );
    const montoDetraccionTotal = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoDetraccion || 0),
      0,
    );
    const montoRetencionTotal = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoRetencion || 0),
      0,
    );
    const montoPercepcionTotal = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoPercepcion || 0),
      0,
    );

    const cuenta = await prisma.cuentaPorCobrar.findUnique({
      where: { id: cuentaPorCobrarId },
    });

    if (!cuenta) {
      throw new NotFoundError("Cuenta por cobrar no encontrada.");
    }

    const montoTotal = Number(cuenta.montoTotal || 0);
    const saldoPendiente = montoTotal - montoPagado;

    const estadoId = calcularEstadoCxC(
      montoTotal,
      montoPagado,
      saldoPendiente,
      cuenta.fechaVencimiento,
      cuenta.estadoId,
    );

    await prisma.cuentaPorCobrar.update({
      where: { id: cuentaPorCobrarId },
      data: {
        montoPagado,
        saldoPendiente,
        montoDetraccionTotal,
        montoRetencionTotal,
        montoPercepcionTotal,
        tieneDetraccion: montoDetraccionTotal > 0,
        tieneRetencion: montoRetencionTotal > 0,
        tienePercepcion: montoPercepcionTotal > 0,
        estadoId,
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
}

const calcularEstadoCxC = (
  montoTotal,
  montoPagado,
  saldoPendiente,
  fechaVencimiento,
  estadoActual = null,
) => {
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

  if (vencimiento && vencimiento < hoy && saldo > 0) {
    return BigInt(103);
  }

  if (saldo === 0 && pagado >= total) {
    return BigInt(102);
  }

  if (pagado > 0 && saldo > 0) {
    return BigInt(101);
  }

  return BigInt(100);
};

// ============================================
// FUNCIONES CRUD PARA PAGOCUENTAPORPAGAR
// ============================================

async function validarPagoCuentaPorPagar(data) {
  if (data.cuentaPorPagarId) {
    const cuenta = await prisma.cuentaPorPagar.findUnique({
      where: { id: data.cuentaPorPagarId },
    });
    if (!cuenta)
      throw new ValidationError("La cuenta por pagar referenciada no existe.");
  }

  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa)
      throw new ValidationError("La empresa referenciada no existe.");
  }

  if (data.montoPagado !== undefined && data.montoPagado < 0) {
    throw new ValidationError("El monto pagado no puede ser negativo.");
  }

  if (data.tipoCambio !== undefined && data.tipoCambio <= 0) {
    throw new ValidationError("El tipo de cambio debe ser mayor a 0.");
  }
}

const crearPagoPagar = async (data) => {
  await validarPagoCuentaPorPagar(data);

  try {
    const nuevoPago = await prisma.pagoCuentaPorPagar.create({
      data: {
        cuentaPorPagarId: data.cuentaPorPagarId,
        empresaId: data.empresaId,
        fechaPago: data.fechaPago,
        montoPagado: data.montoPagado,
        monedaPagoId: data.monedaPagoId,
        tipoCambio: data.tipoCambio,
        montoAplicadoDeuda: data.montoAplicadoDeuda,
        monedaDeudaId: data.monedaDeudaId,
        tieneDetraccion: data.tieneDetraccion || false,
        montoDetraccion: data.montoDetraccion || 0,
        porcentajeDetraccion: data.porcentajeDetraccion || null,
        numeroConstanciaDetraccion: data.numeroConstanciaDetraccion || null,
        fechaDetraccion: data.fechaDetraccion || null,
        tieneRetencion: data.tieneRetencion || false,
        montoRetencion: data.montoRetencion || 0,
        porcentajeRetencion: data.porcentajeRetencion || null,
        numeroComprobanteRetencion: data.numeroComprobanteRetencion || null,
        fechaRetencion: data.fechaRetencion || null,
        tienePercepcion: data.tienePercepcion || false,
        montoPercepcion: data.montoPercepcion || 0,
        porcentajePercepcion: data.porcentajePercepcion || null,
        numeroComprobantePercepcion: data.numeroComprobantePercepcion || null,
        fechaPercepcion: data.fechaPercepcion || null,
        medioPagoId: data.medioPagoId,
        numeroOperacion: data.numeroOperacion || null,
        bancoId: data.bancoId || null,
        cuentaBancariaId: data.cuentaBancariaId || null,
        prestamoBancarioId: data.prestamoBancarioId || null,
        movimientoCajaId: data.movimientoCajaId || null,
        observaciones: data.observaciones || null,
        fechaContable: data.fechaContable || new Date(),
        periodoContableId: data.periodoContableId || null,
        creadoPor: data.creadoPor || null,
      },
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
            empresa: true,
            moneda: true,
          },
        },
        empresa: true,
        monedaPago: true,
        monedaDeuda: true,
        medioPago: true,
        banco: true,
        cuentaBancaria: true,
        prestamoBancario: {
          include: {
            banco: true,
            tipoPrestamo: true,
          },
        },
        periodoContable: true,
      },
    });

    await actualizarCuentaPorPagar(data.cuentaPorPagarId);

    return nuevoPago;
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const actualizarPagoPagar = async (id, data) => {
  await validarPagoCuentaPorPagar(data);

  try {
    const pagoActualizado = await prisma.pagoCuentaPorPagar.update({
      where: { id },
      data: {
        fechaPago: data.fechaPago,
        montoPagado: data.montoPagado,
        monedaPagoId: data.monedaPagoId,
        tipoCambio: data.tipoCambio,
        montoAplicadoDeuda: data.montoAplicadoDeuda,
        monedaDeudaId: data.monedaDeudaId,
        tieneDetraccion: data.tieneDetraccion,
        montoDetraccion: data.montoDetraccion,
        porcentajeDetraccion: data.porcentajeDetraccion,
        numeroConstanciaDetraccion: data.numeroConstanciaDetraccion,
        fechaDetraccion: data.fechaDetraccion,
        tieneRetencion: data.tieneRetencion,
        montoRetencion: data.montoRetencion,
        porcentajeRetencion: data.porcentajeRetencion,
        numeroComprobanteRetencion: data.numeroComprobanteRetencion,
        fechaRetencion: data.fechaRetencion,
        tienePercepcion: data.tienePercepcion,
        montoPercepcion: data.montoPercepcion,
        porcentajePercepcion: data.porcentajePercepcion,
        numeroComprobantePercepcion: data.numeroComprobantePercepcion,
        fechaPercepcion: data.fechaPercepcion,
        medioPagoId: data.medioPagoId,
        numeroOperacion: data.numeroOperacion,
        bancoId: data.bancoId,
        cuentaBancariaId: data.cuentaBancariaId,
        prestamoBancarioId: data.prestamoBancarioId,
        movimientoCajaId: data.movimientoCajaId,
        observaciones: data.observaciones,
        fechaContable: data.fechaContable,
        periodoContableId: data.periodoContableId,
        actualizadoPor: data.actualizadoPor || null,
      },
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
            empresa: true,
            moneda: true,
          },
        },
        empresa: true,
        monedaPago: true,
        monedaDeuda: true,
        medioPago: true,
        banco: true,
        cuentaBancaria: true,
        prestamoBancario: {
          include: {
            banco: true,
            tipoPrestamo: true,
          },
        },
        periodoContable: true,
      },
    });

    const pagoOriginal = await prisma.pagoCuentaPorPagar.findUnique({
      where: { id },
      select: { cuentaPorPagarId: true },
    });
    if (pagoOriginal) {
      await actualizarCuentaPorPagar(pagoOriginal.cuentaPorPagarId);
    }

    return pagoActualizado;
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Pago de cuenta por pagar no encontrado.");
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const eliminarPagoPagar = async (id) => {
  try {
    const pago = await prisma.pagoCuentaPorPagar.findUnique({
      where: { id },
      select: { cuentaPorPagarId: true },
    });

    if (!pago) {
      throw new NotFoundError("Pago de cuenta por pagar no encontrado.");
    }

    await prisma.pagoCuentaPorPagar.delete({
      where: { id },
    });

    await actualizarCuentaPorPagar(pago.cuentaPorPagarId);

    return { eliminado: true, id };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code === "P2025") {
      throw new NotFoundError("Pago de cuenta por pagar no encontrado.");
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

async function actualizarCuentaPorPagar(cuentaPorPagarId) {
  try {
    const pagos = await prisma.pagoCuentaPorPagar.findMany({
      where: { cuentaPorPagarId },
    });

    const montoPagado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
      0,
    );
    const montoDetraccionTotal = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoDetraccion || 0),
      0,
    );
    const montoRetencionTotal = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoRetencion || 0),
      0,
    );
    const montoPercepcionTotal = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoPercepcion || 0),
      0,
    );

    const cuenta = await prisma.cuentaPorPagar.findUnique({
      where: { id: cuentaPorPagarId },
    });

    if (!cuenta) {
      throw new NotFoundError("Cuenta por pagar no encontrada.");
    }

    const montoTotal = Number(cuenta.montoTotal || 0);
    const saldoPendiente = montoTotal - montoPagado;

    const estadoId = calcularEstadoCxP(
      montoTotal,
      montoPagado,
      saldoPendiente,
      cuenta.fechaVencimiento,
      cuenta.estadoId,
    );

    await prisma.cuentaPorPagar.update({
      where: { id: cuentaPorPagarId },
      data: {
        montoPagado,
        saldoPendiente,
        montoDetraccionTotal,
        montoRetencionTotal,
        montoPercepcionTotal,
        tieneDetraccion: montoDetraccionTotal > 0,
        tieneRetencion: montoRetencionTotal > 0,
        tienePercepcion: montoPercepcionTotal > 0,
        estadoId,
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
}

const calcularEstadoCxP = (
  montoTotal,
  montoPagado,
  saldoPendiente,
  fechaVencimiento,
  estadoActual = null,
) => {
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

  if (vencimiento && vencimiento < hoy && saldo > 0) {
    return BigInt(103);
  }

  if (saldo === 0 && pagado >= total) {
    return BigInt(102);
  }

  if (pagado > 0 && saldo > 0) {
    return BigInt(101);
  }

  return BigInt(100);
};

export default {
  listar,
  obtenerPorId,
  listarPorEmpresa,
  listarPorCuentaCobrar,
  listarPorCuentaPagar,
  listarPorMovimiento,
  crearPagoCobrar,
  actualizarPagoCobrar,
  eliminarPagoCobrar,
  crearPagoPagar,
  actualizarPagoPagar,
  eliminarPagoPagar,
};