import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio para registrar MovimientoCaja + Pago en una transacción atómica
 * Para vista de Tesorería - Pendientes
 * Documentado en español.
 */

/**
 * Registrar pago de CxC con creación automática de MovimientoCaja
 * @param {Object} datos - Datos del pago
 * @returns {Object} MovimientoCaja y PagoCuentaPorCobrar creados
 */
const registrarPagoCuentaPorCobrar = async (datos) => {
  try {
    const {
      // Datos de la CxC
      cuentaPorCobrarId,
      empresaId,

      // Datos del pago
      fechaPago,
      montoPagado,
      monedaPagoId,
      tipoCambio,
      montoAplicadoDeuda,
      monedaDeudaId,

      // Detracción/Retención/Percepción
      tieneDetraccion = false,
      montoDetraccion = 0,
      porcentajeDetraccion = null,
      numeroConstanciaDetraccion = null,
      fechaDetraccion = null,

      tieneRetencion = false,
      montoRetencion = 0,
      porcentajeRetencion = null,
      numeroComprobanteRetencion = null,
      fechaRetencion = null,

      tienePercepcion = false,
      montoPercepcion = 0,
      porcentajePercepcion = null,
      numeroComprobantePercepcion = null,
      fechaPercepcion = null,

      // Medio de pago
      medioPagoId,
      numeroOperacion = null,
      bancoId = null,
      cuentaBancariaId, // Cuenta corriente DESTINO (donde entra el dinero)

      // Observaciones
      observaciones = null,

      // Usuario
      usuarioId,
    } = datos;

    // ========================================
    // VALIDACIONES PREVIAS
    // ========================================

    // Validar que la CxC existe y tiene saldo pendiente
    const cuentaPorCobrar = await prisma.cuentaPorCobrar.findUnique({
      where: { id: Number(cuentaPorCobrarId) },
      include: {
        cliente: true,
        moneda: true,
      },
    });

    if (!cuentaPorCobrar) {
      throw new NotFoundError('Cuenta por Cobrar no encontrada');
    }

    if (cuentaPorCobrar.saldoPendiente <= 0) {
      throw new ValidationError('La Cuenta por Cobrar no tiene saldo pendiente');
    }

    if (Number(montoAplicadoDeuda) > Number(cuentaPorCobrar.saldoPendiente)) {
      throw new ValidationError('El monto aplicado excede el saldo pendiente');
    }

    // Validar que la cuenta bancaria existe y tiene saldo suficiente (si es necesario)
    const cuentaBancaria = await prisma.cuentaCorriente.findUnique({
      where: { id: Number(cuentaBancariaId) },
    });

    if (!cuentaBancaria) {
      throw new NotFoundError('Cuenta Corriente no encontrada');
    }

    // Obtener tipo de movimiento para INGRESO
    const tipoMovimientoIngreso = await prisma.tipoMovEntregaRendir.findFirst({
      where: { esIngreso: true },
    });

    if (!tipoMovimientoIngreso) {
      throw new NotFoundError('Tipo de Movimiento INGRESO no encontrado en la base de datos');
    }

    // Obtener estado CONFIRMADO
    const estadoConfirmado = await prisma.estadoMultiFuncion.findFirst({
      where: { 
        descripcion: 'CONFIRMADO',
        // Puedes agregar filtro por módulo si es necesario
      },
    });

    if (!estadoConfirmado) {
      throw new NotFoundError('Estado CONFIRMADO no encontrado en la base de datos');
    }

    // ========================================
    // TRANSACCIÓN ATÓMICA
    // ========================================
    const resultado = await prisma.$transaction(async (tx) => {
      // 1️⃣ CREAR MOVIMIENTO DE CAJA
      const movimientoCaja = await tx.movimientoCaja.create({
        data: {
          empresaDestinoId: Number(empresaId), // Empresa que recibe el dinero
          tipoMovimientoId: tipoMovimientoIngreso.id,
          entidadComercialId: cuentaPorCobrar.clienteId,
          monto: Number(montoPagado),
          monedaId: Number(monedaPagoId),
          descripcion: `Cobro de ${cuentaPorCobrar.numeroPreFactura} - ${cuentaPorCobrar.cliente.razonSocial}`,
          medioPagoId: Number(medioPagoId),
          usuarioId: Number(usuarioId),
          estadoId: estadoConfirmado.id,
          cuentaCorrienteDestinoId: Number(cuentaBancariaId),
          fechaOperacionMovCaja: new Date(fechaPago),
          generarAsientoContable: true,
          asientosGenerados: false,
        },
      });

      // 2️⃣ CREAR PAGO DE CUENTA POR COBRAR
      const pagoCuentaPorCobrar = await tx.pagoCuentaPorCobrar.create({
        data: {
          cuentaPorCobrarId: Number(cuentaPorCobrarId),
          empresaId: Number(empresaId),
          fechaPago: new Date(fechaPago),
          montoPagado: Number(montoPagado),
          monedaPagoId: Number(monedaPagoId),
          tipoCambio: Number(tipoCambio),
          montoAplicadoDeuda: Number(montoAplicadoDeuda),
          monedaDeudaId: Number(monedaDeudaId),

          // Detracción
          tieneDetraccion,
          montoDetraccion: Number(montoDetraccion),
          porcentajeDetraccion: porcentajeDetraccion ? Number(porcentajeDetraccion) : null,
          numeroConstanciaDetraccion,
          fechaDetraccion: fechaDetraccion ? new Date(fechaDetraccion) : null,

          // Retención
          tieneRetencion,
          montoRetencion: Number(montoRetencion),
          porcentajeRetencion: porcentajeRetencion ? Number(porcentajeRetencion) : null,
          numeroComprobanteRetencion,
          fechaRetencion: fechaRetencion ? new Date(fechaRetencion) : null,

          // Percepción
          tienePercepcion,
          montoPercepcion: Number(montoPercepcion),
          porcentajePercepcion: porcentajePercepcion ? Number(porcentajePercepcion) : null,
          numeroComprobantePercepcion,
          fechaPercepcion: fechaPercepcion ? new Date(fechaPercepcion) : null,

          // Medio de pago
          medioPagoId: Number(medioPagoId),
          numeroOperacion,
          bancoId: bancoId ? Number(bancoId) : null,
          cuentaBancariaId: Number(cuentaBancariaId),

          // Vinculación con MovimientoCaja
          movimientoCajaId: movimientoCaja.id,

          observaciones,
          creadoPor: Number(usuarioId),
        },
      });

      // 3️⃣ ACTUALIZAR CUENTA POR COBRAR
      const nuevoMontoPagado = Number(cuentaPorCobrar.montoPagado) + Number(montoAplicadoDeuda);
      const nuevoSaldoPendiente = Number(cuentaPorCobrar.montoTotal) - nuevoMontoPagado;

      // Determinar nuevo estado
      let nuevoEstadoId = cuentaPorCobrar.estadoId;
      if (nuevoSaldoPendiente <= 0) {
        // Buscar estado PAGADO
        const estadoPagado = await tx.estadoMultiFuncion.findFirst({
          where: { descripcion: 'PAGADO' },
        });
        if (estadoPagado) {
          nuevoEstadoId = estadoPagado.id;
        }
      } else if (nuevoMontoPagado > 0 && nuevoSaldoPendiente > 0) {
        // Buscar estado PARCIAL
        const estadoParcial = await tx.estadoMultiFuncion.findFirst({
          where: { descripcion: 'PARCIAL' },
        });
        if (estadoParcial) {
          nuevoEstadoId = estadoParcial.id;
        }
      }

      await tx.cuentaPorCobrar.update({
        where: { id: Number(cuentaPorCobrarId) },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId,
          actualizadoPor: Number(usuarioId),
        },
      });

      // 4️⃣ CREAR SALDO DE CUENTA CORRIENTE
      await tx.saldoCuentaCorriente.create({
        data: {
          cuentaCorrienteId: Number(cuentaBancariaId),
          movimientoCajaId: movimientoCaja.id,
          saldo: Number(montoPagado), // Incrementa el saldo (INGRESO)
          fechaMovimiento: new Date(fechaPago),
        },
      });

      return {
        movimientoCaja,
        pagoCuentaPorCobrar,
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) {
      throw err;
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al registrar pago de cuenta por cobrar",
        err.message,
      );
    }
    throw err;
  }
};

/**
 * Registrar pago de CxP con creación automática de MovimientoCaja
 * @param {Object} datos - Datos del pago
 * @returns {Object} MovimientoCaja y PagoCuentaPorPagar creados
 */
const registrarPagoCuentaPorPagar = async (datos) => {
  try {
    const {
      // Datos de la CxP
      cuentaPorPagarId,
      empresaId,

      // Datos del pago
      fechaPago,
      montoPagado,
      monedaPagoId,
      tipoCambio,
      montoAplicadoDeuda,
      monedaDeudaId,

      // Detracción/Retención/Percepción
      tieneDetraccion = false,
      montoDetraccion = 0,
      porcentajeDetraccion = null,
      numeroConstanciaDetraccion = null,
      fechaDetraccion = null,

      tieneRetencion = false,
      montoRetencion = 0,
      porcentajeRetencion = null,
      numeroComprobanteRetencion = null,
      fechaRetencion = null,

      tienePercepcion = false,
      montoPercepcion = 0,
      porcentajePercepcion = null,
      numeroComprobantePercepcion = null,
      fechaPercepcion = null,

      // Medio de pago
      medioPagoId,
      numeroOperacion = null,
      bancoId = null,
      cuentaBancariaId, // Cuenta corriente ORIGEN (de donde sale el dinero)

      // Observaciones
      observaciones = null,

      // Usuario
      usuarioId,
    } = datos;

    // ========================================
    // VALIDACIONES PREVIAS
    // ========================================

    // Validar que la CxP existe y tiene saldo pendiente
    const cuentaPorPagar = await prisma.cuentaPorPagar.findUnique({
      where: { id: Number(cuentaPorPagarId) },
      include: {
        proveedor: true,
        moneda: true,
      },
    });

    if (!cuentaPorPagar) {
      throw new NotFoundError('Cuenta por Pagar no encontrada');
    }

    if (cuentaPorPagar.saldoPendiente <= 0) {
      throw new ValidationError('La Cuenta por Pagar no tiene saldo pendiente');
    }

    if (Number(montoAplicadoDeuda) > Number(cuentaPorPagar.saldoPendiente)) {
      throw new ValidationError('El monto aplicado excede el saldo pendiente');
    }

    // Validar que la cuenta bancaria existe y tiene saldo suficiente
    const cuentaBancaria = await prisma.cuentaCorriente.findUnique({
      where: { id: Number(cuentaBancariaId) },
      include: {
        saldos: {
          orderBy: { fechaMovimiento: 'desc' },
          take: 1,
        },
      },
    });

    if (!cuentaBancaria) {
      throw new NotFoundError('Cuenta Corriente no encontrada');
    }

    const saldoActual = cuentaBancaria.saldos?.[0]?.saldo || 0;
    if (Number(saldoActual) < Number(montoPagado)) {
      throw new ValidationError(
        `Saldo insuficiente en la cuenta. Saldo actual: ${saldoActual}, Monto a pagar: ${montoPagado}`
      );
    }

    // Obtener tipo de movimiento para EGRESO
    const tipoMovimientoEgreso = await prisma.tipoMovEntregaRendir.findFirst({
      where: { esIngreso: false, esTransferencia: false },
    });

    if (!tipoMovimientoEgreso) {
      throw new NotFoundError('Tipo de Movimiento EGRESO no encontrado en la base de datos');
    }

    // Obtener estado CONFIRMADO
    const estadoConfirmado = await prisma.estadoMultiFuncion.findFirst({
      where: { descripcion: 'CONFIRMADO' },
    });

    if (!estadoConfirmado) {
      throw new NotFoundError('Estado CONFIRMADO no encontrado en la base de datos');
    }

    // ========================================
    // TRANSACCIÓN ATÓMICA
    // ========================================
    const resultado = await prisma.$transaction(async (tx) => {
      // 1️⃣ CREAR MOVIMIENTO DE CAJA
      const movimientoCaja = await tx.movimientoCaja.create({
        data: {
          empresaOrigenId: Number(empresaId), // Empresa que paga
          tipoMovimientoId: tipoMovimientoEgreso.id,
          entidadComercialId: cuentaPorPagar.proveedorId,
          monto: Number(montoPagado),
          monedaId: Number(monedaPagoId),
          descripcion: `Pago de ${cuentaPorPagar.numeroOrdenCompra} - ${cuentaPorPagar.proveedor.razonSocial}`,
          medioPagoId: Number(medioPagoId),
          usuarioId: Number(usuarioId),
          estadoId: estadoConfirmado.id,
          cuentaCorrienteOrigenId: Number(cuentaBancariaId),
          fechaOperacionMovCaja: new Date(fechaPago),
          generarAsientoContable: true,
          asientosGenerados: false,
        },
      });

      // 2️⃣ CREAR PAGO DE CUENTA POR PAGAR
      const pagoCuentaPorPagar = await tx.pagoCuentaPorPagar.create({
        data: {
          cuentaPorPagarId: Number(cuentaPorPagarId),
          empresaId: Number(empresaId),
          fechaPago: new Date(fechaPago),
          montoPagado: Number(montoPagado),
          monedaPagoId: Number(monedaPagoId),
          tipoCambio: Number(tipoCambio),
          montoAplicadoDeuda: Number(montoAplicadoDeuda),
          monedaDeudaId: Number(monedaDeudaId),

          // Detracción
          tieneDetraccion,
          montoDetraccion: Number(montoDetraccion),
          porcentajeDetraccion: porcentajeDetraccion ? Number(porcentajeDetraccion) : null,
          numeroConstanciaDetraccion,
          fechaDetraccion: fechaDetraccion ? new Date(fechaDetraccion) : null,

          // Retención
          tieneRetencion,
          montoRetencion: Number(montoRetencion),
          porcentajeRetencion: porcentajeRetencion ? Number(porcentajeRetencion) : null,
          numeroComprobanteRetencion,
          fechaRetencion: fechaRetencion ? new Date(fechaRetencion) : null,

          // Percepción
          tienePercepcion,
          montoPercepcion: Number(montoPercepcion),
          porcentajePercepcion: porcentajePercepcion ? Number(porcentajePercepcion) : null,
          numeroComprobantePercepcion,
          fechaPercepcion: fechaPercepcion ? new Date(fechaPercepcion) : null,

          // Medio de pago
          medioPagoId: Number(medioPagoId),
          numeroOperacion,
          bancoId: bancoId ? Number(bancoId) : null,
          cuentaBancariaId: Number(cuentaBancariaId),

          // Vinculación con MovimientoCaja
          movimientoCajaId: movimientoCaja.id,

          observaciones,
          creadoPor: Number(usuarioId),
        },
      });

      // 3️⃣ ACTUALIZAR CUENTA POR PAGAR
      const nuevoMontoPagado = Number(cuentaPorPagar.montoPagado) + Number(montoAplicadoDeuda);
      const nuevoSaldoPendiente = Number(cuentaPorPagar.montoTotal) - nuevoMontoPagado;

      // Determinar nuevo estado
      let nuevoEstadoId = cuentaPorPagar.estadoId;
      if (nuevoSaldoPendiente <= 0) {
        const estadoPagado = await tx.estadoMultiFuncion.findFirst({
          where: { descripcion: 'PAGADO' },
        });
        if (estadoPagado) {
          nuevoEstadoId = estadoPagado.id;
        }
      } else if (nuevoMontoPagado > 0 && nuevoSaldoPendiente > 0) {
        const estadoParcial = await tx.estadoMultiFuncion.findFirst({
          where: { descripcion: 'PARCIAL' },
        });
        if (estadoParcial) {
          nuevoEstadoId = estadoParcial.id;
        }
      }

      await tx.cuentaPorPagar.update({
        where: { id: Number(cuentaPorPagarId) },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoId: nuevoEstadoId,
          actualizadoPor: Number(usuarioId),
        },
      });

      // 4️⃣ CREAR SALDO DE CUENTA CORRIENTE (NEGATIVO porque es EGRESO)
      await tx.saldoCuentaCorriente.create({
        data: {
          cuentaCorrienteId: Number(cuentaBancariaId),
          movimientoCajaId: movimientoCaja.id,
          saldo: -Number(montoPagado), // Decrementa el saldo (EGRESO)
          fechaMovimiento: new Date(fechaPago),
        },
      });

      return {
        movimientoCaja,
        pagoCuentaPorPagar,
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) {
      throw err;
    }
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al registrar pago de cuenta por pagar",
        err.message,
      );
    }
    throw err;
  }
};

export default {
  registrarPagoCuentaPorCobrar,
  registrarPagoCuentaPorPagar,
};