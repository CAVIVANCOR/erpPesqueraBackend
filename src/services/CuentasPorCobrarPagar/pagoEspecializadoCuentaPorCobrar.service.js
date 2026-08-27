import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from '../Tesoreria/correlativoOperacionCaja.service.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';

/**
 * ════════════════════════════════════════════════════════════
 * SERVICIO PROFESIONAL: PAGO ESPECIALIZADO CUENTA POR COBRAR
 * ════════════════════════════════════════════════════════════
 * 
 * Procesa pagos de clientes con operación especializada:
 * - Genera correlativo único de operación
 * - Crea múltiples MovimientoCaja (Ingreso, ITF, Comisión)
 * - Crea Detraccion/Retencion/Percepcion según aplique
 * - Genera vouchers PDF (consolidado + individuales)
 * - Actualiza saldos y estados
 * - Transacción atómica
 * 
 * Documentado en español.
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - ESTADOS
// ════════════════════════════════════════════════════════════

const ESTADOS_CXC = {
  PENDIENTE: 100,
  PAGO_PARCIAL: 101,
  PAGADO: 102,
  VENCIDO: 103,
  ANULADO: 104,
  CANJEADO: 105
};

const ESTADOS_MOVIMIENTO_CAJA = {
  PENDIENTE: 20,
  VALIDADO: 21,
  ASIENTO_GENERADO: 22
};

const ESTADOS_DETRACCION = {
  PENDIENTE: 126,
  VALIDADO: 127,
  ASIENTO_GENERADO: 128
};

const ESTADOS_RETENCION = {
  PENDIENTE: 129,
  VALIDADO: 130,
  ASIENTO_GENERADO: 131
};

const ESTADOS_PERCEPCION = {
  PENDIENTE: 132,
  VALIDADO: 133,
  ASIENTO_GENERADO: 134
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - TIPOS DE MOVIMIENTO
// ════════════════════════════════════════════════════════════

const TIPOS_MOVIMIENTO = {
  ITF: 163,                    // GASTOS FINANCIEROS - ITF
  COMISION_BANCARIA: 164       // GASTOS FINANCIEROS - INTERESES FINANCIEROS
};

// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - TIPOS DE DOCUMENTO
// ════════════════════════════════════════════════════════════

const TIPOS_DOCUMENTO = {
  DETRACCION: 26,
  RETENCION: 27,
  PERCEPCION: 28
};


// ════════════════════════════════════════════════════════════
// CONSTANTES DE NEGOCIO - SUBMÓDULOS
// ════════════════════════════════════════════════════════════

const SUBMODULOS = {
  PAGOS_CXC: 116,           // Pagos de Cuentas por Cobrar
  MOVIMIENTOS_CAJA: 135     // Tesorería Pendientes
};

// ════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════

/**
 * Validar datos completos para procesamiento de pago especializado
 */
async function validarDatosPagoEspecializado(data) {
  // ========================================
  // VALIDAR CAMPOS OBLIGATORIOS
  // ========================================
  const camposRequeridos = [
    'cuentaPorCobrarId',
    'empresaId',
    'fechaPago',
    'montoPagado',
    'monedaPagoId',
    'tipoCambio',
    'montoAplicadoDeuda',
    'monedaDeudaId',
    'medioPagoId',
    'tipoMovimientoIngresoId',
    'usuarioId'  // ⭐ NUEVO
  ];

  const camposFaltantes = camposRequeridos.filter(campo => !data[campo]);

  if (camposFaltantes.length > 0) {
    throw new ValidationError(
      `Faltan campos obligatorios: ${camposFaltantes.join(', ')}`
    );
  }

  // ========================================
  // VALIDAR MONTOS
  // ========================================
  if (Number(data.montoPagado) <= 0) {
    throw new ValidationError('El monto pagado debe ser mayor a cero.');
  }
  if (Number(data.tipoCambio) <= 0) {
    throw new ValidationError('El tipo de cambio debe ser mayor a cero.');
  }
  if (Number(data.montoAplicadoDeuda) <= 0) {
    throw new ValidationError('El monto aplicado a la deuda debe ser mayor a cero.');
  }
  // Validar ITF y comisión no negativos
  if (data.montoITF && Number(data.montoITF) < 0) {
    throw new ValidationError('El ITF no puede ser negativo.');
  }
  if (data.montoComision && Number(data.montoComision) < 0) {
    throw new ValidationError('La comisión no puede ser negativa.');
  }

  // ========================================
  // VALIDAR CUENTA POR COBRAR
  // ========================================
  const cuentaPorCobrar = await prisma.cuentaPorCobrar.findUnique({
    where: { id: Number(data.cuentaPorCobrarId) },
    include: {
      cliente: {
        include: {
          tipoDocumento: true  // ⭐ NUEVO: Para glosa
        }
      },
      empresa: true,
      moneda: true,
      estado: true,
      preFactura: {
        include: {
          tipoDocumento: true
        }
      }
    }
  });

  if (!cuentaPorCobrar) {
    throw new NotFoundError('Cuenta por cobrar no encontrada.');
  }

  // Validar que no esté anulada o canjeada
  if (cuentaPorCobrar.estadoId === ESTADOS_CXC.ANULADO) {
    throw new ValidationError('No se puede pagar una cuenta por cobrar anulada.');
  }

  if (cuentaPorCobrar.estadoId === ESTADOS_CXC.CANJEADO) {
    throw new ValidationError('No se puede pagar una cuenta por cobrar canjeada.');
  }

  // Validar que no esté completamente pagada
  if (Number(cuentaPorCobrar.saldoPendiente) <= 0) {
    throw new ValidationError('La cuenta por cobrar ya está completamente pagada.');
  }

  // Validar que el monto no exceda el saldo
  if (Number(data.montoAplicadoDeuda) > Number(cuentaPorCobrar.saldoPendiente)) {
    throw new ValidationError(
      `El monto aplicado a la deuda (${data.montoAplicadoDeuda}) no puede ser mayor al saldo pendiente (${cuentaPorCobrar.saldoPendiente}).`
    );
  }

  // ========================================
  // VALIDAR CUENTA CORRIENTE
  // ========================================
  if (data.cuentaBancariaId) {
    const cuentaCorriente = await prisma.cuentaCorriente.findUnique({
      where: { id: Number(data.cuentaBancariaId) },
      include: {
        banco: true,
        moneda: true
      }
    });

    if (!cuentaCorriente) {
      throw new NotFoundError('Cuenta corriente no encontrada.');
    }

    // Validar que la cuenta pertenezca a la misma empresa
    if (Number(cuentaCorriente.empresaId) !== Number(data.empresaId)) {
      throw new ValidationError('La cuenta corriente no pertenece a la empresa.');
    }
  }

  // ========================================
  // VALIDAR DETRACCIÓN
  // ========================================
  if (data.aplicaDetraccion) {
    if (!data.detraccion) {
      throw new ValidationError('Debe proporcionar los datos de la detracción.');
    }

    const det = data.detraccion;

    if (!det.numeroConstancia) {
      throw new ValidationError('Debe ingresar el número de constancia de detracción.');
    }

    if (!det.fechaDeposito) {
      throw new ValidationError('Debe ingresar la fecha de depósito de la detracción.');
    }

    if (!det.tasaDetraccion || Number(det.tasaDetraccion) <= 0) {
      throw new ValidationError('La tasa de detracción debe ser mayor a cero.');
    }

    if (!det.importeDetraido || Number(det.importeDetraido) <= 0) {
      throw new ValidationError('El importe detraído debe ser mayor a cero.');
    }

    if (!det.importeTotal || Number(det.importeTotal) <= 0) {
      throw new ValidationError('El importe total de la detracción debe ser mayor a cero.');
    }

    // Validar que el importe detraído no exceda el importe total
    if (Number(det.importeDetraido) > Number(det.importeTotal)) {
      throw new ValidationError('El importe detraído no puede ser mayor al importe total.');
    }
  }

  // ========================================
  // VALIDAR RETENCIÓN
  // ========================================
  if (data.aplicaRetencion) {
    if (!data.retencion) {
      throw new ValidationError('Debe proporcionar los datos de la retención.');
    }

    const ret = data.retencion;

    if (!ret.numeroDocumento) {
      throw new ValidationError('Debe ingresar el número de comprobante de retención.');
    }

    if (!ret.fechaEmision) {
      throw new ValidationError('Debe ingresar la fecha de emisión de la retención.');
    }

    if (!ret.tasaRetencion || Number(ret.tasaRetencion) <= 0) {
      throw new ValidationError('La tasa de retención debe ser mayor a cero.');
    }

    if (!ret.importeRetenido || Number(ret.importeRetenido) <= 0) {
      throw new ValidationError('El importe retenido debe ser mayor a cero.');
    }

    if (!ret.importeTotal || Number(ret.importeTotal) <= 0) {
      throw new ValidationError('El importe total de la retención debe ser mayor a cero.');
    }
  }

  // ========================================
  // VALIDAR PERCEPCIÓN
  // ========================================
  if (data.aplicaPercepcion) {
    if (!data.percepcion) {
      throw new ValidationError('Debe proporcionar los datos de la percepción.');
    }

    const per = data.percepcion;

    if (!per.numeroDocumento) {
      throw new ValidationError('Debe ingresar el número de comprobante de percepción.');
    }

    if (!per.fechaEmision) {
      throw new ValidationError('Debe ingresar la fecha de emisión de la percepción.');
    }

    if (!per.tasaPercepcion || Number(per.tasaPercepcion) <= 0) {
      throw new ValidationError('La tasa de percepción debe ser mayor a cero.');
    }

    if (!per.importePercibido || Number(per.importePercibido) <= 0) {
      throw new ValidationError('El importe percibido debe ser mayor a cero.');
    }

    if (!per.importeTotal || Number(per.importeTotal) <= 0) {
      throw new ValidationError('El importe total de la percepción debe ser mayor a cero.');
    }
  }

  return cuentaPorCobrar;
}

/**
 * Generar glosa completa para movimientos y asientos
 */
function generarGlosaPagoCxC(cuentaPorCobrar, data, monedaPago) {
  const formatearFecha = (fecha) => {
    const f = new Date(fecha);
    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const anio = f.getFullYear();
    return `${dia}/${mes}/${anio}`;
  };

  const formatearMonto = (monto) => {
    return Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatearTipoCambio = (tc) => {
    return Number(tc).toFixed(4);
  };

  const numeroPreFactura = cuentaPorCobrar.numeroPreFactura || '';
  const fechaEmision = formatearFecha(cuentaPorCobrar.fechaEmision);
  const tipoDoc = cuentaPorCobrar.cliente?.tipoDocumento?.codigo || '';
  const numDoc = cuentaPorCobrar.cliente?.numeroDocumento || '';
  const razonSocial = cuentaPorCobrar.cliente?.razonSocial || '';
  const simboloMoneda = monedaPago.simbolo || '';
  const montoPagado = formatearMonto(data.montoPagado);
  const fechaPago = formatearFecha(data.fechaPago);
  const tipoCambio = formatearTipoCambio(data.tipoCambio);

  return `Pago CxC de Dcmto: ${numeroPreFactura} ${fechaEmision} Cliente: ${tipoDoc} ${numDoc} ${razonSocial} Monto Pagado: ${simboloMoneda} ${montoPagado} ${fechaPago} T/C: ${tipoCambio}`;
}


/**
 * Generar asiento contable para el pago de CxC
 */
async function generarAsientoPagoCxC(data, cuentaPorCobrar, movimientoIngreso, pagoCuentaPorCobrar, glosa, tx) {
  try {
    // Buscar cuenta contable de CxC según moneda
    const codigoCuentaCxC = cuentaPorCobrar.monedaId === 1 ? '121201' : '121202'; // 1=Soles, 2=Dólares

    const cuentaCxC = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: codigoCuentaCxC,
        activo: true
      }
    });

    if (!cuentaCxC) {
      throw new ValidationError(`Cuenta contable ${codigoCuentaCxC} (Cuentas por Cobrar) no encontrada en la empresa`);
    }

    // Buscar cuenta bancaria (del movimiento de caja)
    let cuentaBancaria = null;
    if (data.cuentaBancariaId) {
      const ctaCorriente = await tx.cuentaCorriente.findUnique({
        where: { id: Number(data.cuentaBancariaId) },
        include: { cuentaContable: true }
      });

      if (ctaCorriente && ctaCorriente.cuentaContable) {
        cuentaBancaria = ctaCorriente.cuentaContable;
      }
    }

    if (!cuentaBancaria) {
      throw new ValidationError('La cuenta corriente seleccionada no tiene una cuenta contable asociada');
    }

    // Preparar detalles del asiento
    const detalles = [
      {
        numeroLinea: 1,
        planCuentaId: cuentaBancaria.id,
        glosa: glosa,
        debe: Number(data.montoPagado),
        haber: 0,
        monedaId: Number(data.monedaPagoId),
        tipoCambio: Number(data.tipoCambio),
        entidadComercialId: Number(cuentaPorCobrar.clienteId),
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.creadoPor || null
      },
      {
        numeroLinea: 2,
        planCuentaId: cuentaCxC.id,
        glosa: glosa,
        debe: 0,
        haber: Number(data.montoPagado),
        monedaId: Number(data.monedaPagoId),
        tipoCambio: Number(data.tipoCambio),
        entidadComercialId: Number(cuentaPorCobrar.clienteId),
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.creadoPor || null
      }
    ];

    // Crear asiento contable (heredando datos del pago)
    const asiento = await asientoContableService.crear({
      empresaId: Number(data.empresaId),
      periodoContableId: pagoCuentaPorCobrar.periodoContableId,  // ← HEREDADO
      fechaAsiento: pagoCuentaPorCobrar.fechaContable,            // ← HEREDADO
      glosa: glosa,
      tipoLibro: 'FISCAL',
      esGerencial: cuentaPorCobrar.esGerencial || false,
      origenAsiento: 'AUTOMATICO',
      submoduloOrigenId: SUBMODULOS.PAGOS_CXC,
      procesoOrigenId: movimientoIngreso.id,
      monedaId: pagoCuentaPorCobrar.monedaPagoId,                 // ← HEREDADO
      tipoCambio: pagoCuentaPorCobrar.tipoCambio,                 // ← HEREDADO
      totalDebe: Number(data.montoPagado),
      totalHaber: Number(data.montoPagado),
      diferencia: 0,
      estaCuadrado: true,
      detalles: detalles,
      creadoPor: data.creadoPor || null
    });

    return asiento;
  } catch (error) {
    console.error('Error generando asiento de pago CxC:', error);
    throw error;
  }
}


/**
 * Generar asiento contable para ITF
 */
async function generarAsientoITF(data, movimientoITF, pagoCuentaPorCobrar, glosa, tx) {
  try {
    // Buscar cuenta de gasto ITF (641101)
    const cuentaGastoITF = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: '641101',
        activo: true
      },
      include: { centroCosto: true }
    });

    if (!cuentaGastoITF) {
      throw new ValidationError('Cuenta contable 641101 (Gasto ITF) no encontrada en la empresa');
    }

    // Validar centro de costo
    if (!cuentaGastoITF.centroCostoId) {
      throw new ValidationError('Cuenta contable 641101 (Gasto ITF) no tiene centro de costo asignado');
    }

    // Buscar cuenta bancaria
    let cuentaBancaria = null;
    if (data.cuentaBancariaId) {
      const ctaCorriente = await tx.cuentaCorriente.findUnique({
        where: { id: Number(data.cuentaBancariaId) },
        include: { cuentaContable: true }
      });

      if (ctaCorriente && ctaCorriente.cuentaContable) {
        cuentaBancaria = ctaCorriente.cuentaContable;
      }
    }

    if (!cuentaBancaria) {
      throw new ValidationError('La cuenta corriente seleccionada no tiene una cuenta contable asociada');
    }

    const glosaITF = `ITF - ${glosa}`;

    // Preparar detalles del asiento
    const detalles = [
      {
        numeroLinea: 1,
        planCuentaId: cuentaGastoITF.id,
        glosa: glosaITF,
        debe: Number(data.montoITF),
        haber: 0,
        monedaId: Number(data.monedaPagoId),
        tipoCambio: Number(data.tipoCambio),
        centroCostoId: cuentaGastoITF.centroCostoId,
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.creadoPor || null
      },
      {
        numeroLinea: 2,
        planCuentaId: cuentaBancaria.id,
        glosa: glosaITF,
        debe: 0,
        haber: Number(data.montoITF),
        monedaId: Number(data.monedaPagoId),
        tipoCambio: Number(data.tipoCambio),
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.creadoPor || null
      }
    ];

    // Crear asiento contable (heredando datos del pago)
    const asiento = await asientoContableService.crear({
      empresaId: Number(data.empresaId),
      periodoContableId: pagoCuentaPorCobrar.periodoContableId,  // ← HEREDADO
      fechaAsiento: pagoCuentaPorCobrar.fechaContable,            // ← HEREDADO
      glosa: glosaITF,
      tipoLibro: 'FISCAL',
      esGerencial: false,
      origenAsiento: 'AUTOMATICO',
      submoduloOrigenId: SUBMODULOS.MOVIMIENTOS_CAJA,
      procesoOrigenId: movimientoITF.id,
      monedaId: pagoCuentaPorCobrar.monedaPagoId,                 // ← HEREDADO
      tipoCambio: pagoCuentaPorCobrar.tipoCambio,                 // ← HEREDADO
      totalDebe: Number(data.montoITF),
      totalHaber: Number(data.montoITF),
      diferencia: 0,
      estaCuadrado: true,
      detalles: detalles,
      creadoPor: data.creadoPor || null
    });

    return asiento;
  } catch (error) {
    console.error('Error generando asiento ITF:', error);
    throw error;
  }
}


/**
 * Generar asiento contable para Comisión Bancaria
 */
async function generarAsientoComision(data, movimientoComision, pagoCuentaPorCobrar, glosa, tx) {
  try {
    // Buscar cuenta de gasto Comisión (679401)
    const cuentaGastoComision = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: '679401',
        activo: true
      },
      include: { centroCosto: true }
    });

    if (!cuentaGastoComision) {
      throw new ValidationError('Cuenta contable 679401 (Gasto Comisión Bancaria) no encontrada en la empresa');
    }

    // Validar centro de costo
    if (!cuentaGastoComision.centroCostoId) {
      throw new ValidationError('Cuenta contable 679401 (Gasto Comisión Bancaria) no tiene centro de costo asignado');
    }

    // Buscar cuenta bancaria
    let cuentaBancaria = null;
    if (data.cuentaBancariaId) {
      const ctaCorriente = await tx.cuentaCorriente.findUnique({
        where: { id: Number(data.cuentaBancariaId) },
        include: { cuentaContable: true }
      });

      if (ctaCorriente && ctaCorriente.cuentaContable) {
        cuentaBancaria = ctaCorriente.cuentaContable;
      }
    }

    if (!cuentaBancaria) {
      throw new ValidationError('La cuenta corriente seleccionada no tiene una cuenta contable asociada');
    }

    const glosaComision = `Comisión Bancaria - ${glosa}`;

    // Preparar detalles del asiento
    const detalles = [
      {
        numeroLinea: 1,
        planCuentaId: cuentaGastoComision.id,
        glosa: glosaComision,
        debe: Number(data.montoComision),
        haber: 0,
        monedaId: Number(data.monedaPagoId),
        tipoCambio: Number(data.tipoCambio),
        centroCostoId: cuentaGastoComision.centroCostoId,
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.creadoPor || null
      },
      {
        numeroLinea: 2,
        planCuentaId: cuentaBancaria.id,
        glosa: glosaComision,
        debe: 0,
        haber: Number(data.montoComision),
        monedaId: Number(data.monedaPagoId),
        tipoCambio: Number(data.tipoCambio),
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.creadoPor || null
      }
    ];

    // Crear asiento contable (heredando datos del pago)
    const asiento = await asientoContableService.crear({
      empresaId: Number(data.empresaId),
      periodoContableId: pagoCuentaPorCobrar.periodoContableId,  // ← HEREDADO
      fechaAsiento: pagoCuentaPorCobrar.fechaContable,            // ← HEREDADO
      glosa: glosaComision,
      tipoLibro: 'FISCAL',
      esGerencial: false,
      origenAsiento: 'AUTOMATICO',
      submoduloOrigenId: SUBMODULOS.MOVIMIENTOS_CAJA,
      procesoOrigenId: movimientoComision.id,
      monedaId: pagoCuentaPorCobrar.monedaPagoId,                 // ← HEREDADO
      tipoCambio: pagoCuentaPorCobrar.tipoCambio,                 // ← HEREDADO
      totalDebe: Number(data.montoComision),
      totalHaber: Number(data.montoComision),
      diferencia: 0,
      estaCuadrado: true,
      detalles: detalles,
      creadoPor: data.creadoPor || null
    });

    return asiento;
  } catch (error) {
    console.error('Error generando asiento Comisión:', error);
    throw error;
  }
}


// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: PROCESAR PAGO ESPECIALIZADO
// ════════════════════════════════════════════════════════════

/**
 * Procesar pago especializado de cuenta por cobrar
 * Crea todos los registros necesarios en una transacción atómica
 */
const procesarPagoEspecializado = async (data) => {
  // Validar datos
  const cuentaPorCobrar = await validarDatosPagoEspecializado(data);

  // Cargar moneda de pago para glosa
  const monedaPago = await prisma.moneda.findUnique({
    where: { id: Number(data.monedaPagoId) }
  });

  if (!monedaPago) {
    throw new NotFoundError('Moneda de pago no encontrada.');
  }

  // Generar glosa completa
  const glosa = generarGlosaPagoCxC(cuentaPorCobrar, data, monedaPago);

  try {
    return await prisma.$transaction(async (tx) => {
      // ════════════════════════════════════════════════════════════
      // PASO 1: GENERAR CORRELATIVO DE OPERACIÓN
      // ════════════════════════════════════════════════════════════
      const correlativo = await correlativoService.generarCorrelativo(data.empresaId, tx);

      // ════════════════════════════════════════════════════════════
      // PASO 2: CALCULAR DATOS CONTABLES (UNA SOLA VEZ)
      // ════════════════════════════════════════════════════════════
      const fechaContable = new Date(data.fechaPago);

      const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(
        Number(data.empresaId),
        fechaContable
      );

      // ════════════════════════════════════════════════════════════
      // PASO 3: CREAR PAGO CUENTA POR COBRAR (FUENTE DE VERDAD)
      // ════════════════════════════════════════════════════════════
      const pagoCuentaPorCobrar = await tx.pagoCuentaPorCobrar.create({
        data: {
          cuentaPorCobrarId: Number(data.cuentaPorCobrarId),
          empresaId: Number(data.empresaId),
          fechaPago: new Date(data.fechaPago),
          montoPagado: Number(data.montoPagado),
          monedaPagoId: Number(data.monedaPagoId),
          tipoCambio: Number(data.tipoCambio),
          montoAplicadoDeuda: Number(data.montoAplicadoDeuda),
          monedaDeudaId: Number(data.monedaDeudaId),
          tieneRetencion: data.aplicaRetencion || false,
          montoRetencion: data.aplicaRetencion ? Number(data.retencion.importeRetenido) : 0,
          porcentajeRetencion: data.aplicaRetencion ? Number(data.retencion.tasaRetencion) : null,
          numeroComprobanteRetencion: data.aplicaRetencion ? data.retencion.numeroDocumento : null,
          fechaRetencion: data.aplicaRetencion ? new Date(data.retencion.fechaEmision) : null,
          tienePercepcion: data.aplicaPercepcion || false,
          montoPercepcion: data.aplicaPercepcion ? Number(data.percepcion.importePercibido) : 0,
          porcentajePercepcion: data.aplicaPercepcion ? Number(data.percepcion.tasaPercepcion) : null,
          numeroComprobantePercepcion: data.aplicaPercepcion ? data.percepcion.numeroDocumento : null,
          fechaPercepcion: data.aplicaPercepcion ? new Date(data.percepcion.fechaEmision) : null,
          medioPagoId: Number(data.medioPagoId),
          numeroOperacion: data.numeroOperacion || null,
          bancoId: data.bancoId ? Number(data.bancoId) : null,
          cuentaBancariaId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
          movimientoCajaId: null,  // Se actualizará después
          observaciones: data.observaciones || null,
          fechaContable: fechaContable,                    // ← CALCULADO
          periodoContableId: Number(periodoContable.id),   // ← CALCULADO
          refOperacionEspecializadaMovCaja: correlativo,
          detraccionId: null,  // Se actualizará después si aplica
          creadoPor: data.creadoPor || null
        }
      });

      // ════════════════════════════════════════════════════════════
      // PASO 3: CREAR MOVIMIENTO DE CAJA - INGRESO
      // ════════════════════════════════════════════════════════════
      const movimientoIngreso = await tx.movimientoCaja.create({
        data: {
          refOperacionEspecializadaMovCaja: correlativo,
          tipoMovimientoId: Number(data.tipoMovimientoIngresoId),
          empresaId: Number(data.empresaId),
          entidadComercialId: Number(cuentaPorCobrar.clienteId),
          monto: Number(data.montoPagado),
          monedaId: Number(data.monedaPagoId),
          medioPagoId: Number(data.medioPagoId),
          cuentaCorrienteDestinoId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
          fechaOperacionMovCaja: new Date(data.fechaPago),
          descripcion: glosa,
          estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
          esGerencial: cuentaPorCobrar.esGerencial || false,
          tipoCambio: Number(data.tipoCambio),
          usuarioId: Number(data.usuarioId),
          moduloOrigenMotivoOperacionId: 116,
          origenMotivoOperacionId: pagoCuentaPorCobrar.id  // ⭐ AHORA SÍ EXISTE
        }
      });

      // Actualizar saldo de cuenta corriente (INGRESO)
      if (data.cuentaBancariaId) {
        const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
          where: { cuentaCorrienteId: Number(data.cuentaBancariaId) },
          orderBy: { fecha: 'desc' }
        });

        const saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;
        const montoIngreso = Number(data.montoPagado);
        const nuevoSaldoActual = saldoAnterior + montoIngreso;

        await tx.saldoCuentaCorriente.create({
          data: {
            cuentaCorrienteId: Number(data.cuentaBancariaId),
            empresaId: Number(data.empresaId),
            fecha: pagoCuentaPorCobrar.fechaContable,
            saldoAnterior,
            ingresos: montoIngreso,
            egresos: 0,
            saldoActual: nuevoSaldoActual,
            movimientoCajaId: movimientoIngreso.id,
            centroCostoId: null,
            conciliado: false
          }
        });
      }

      // ════════════════════════════════════════════════════════════
      // PASO 4: CREAR MOVIMIENTO DE CAJA - ITF (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoITF = null;
      if (data.montoITF && Number(data.montoITF) > 0) {
        movimientoITF = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
            empresaId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            monto: Number(data.montoITF),
            monedaId: Number(data.monedaPagoId),
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteOrigenId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
            fechaOperacionMovCaja: new Date(data.fechaPago),
            descripcion: `ITF - ${glosa}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            esGerencial: cuentaPorCobrar.esGerencial || false,
            tipoCambio: Number(data.tipoCambio),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: 135,
            origenMotivoOperacionId: pagoCuentaPorCobrar.id  // ⭐ AHORA SÍ EXISTE
          }
        });

        // Actualizar saldo de cuenta corriente (EGRESO por ITF)
        if (data.cuentaBancariaId) {
          const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
            where: { cuentaCorrienteId: Number(data.cuentaBancariaId) },
            orderBy: { fecha: 'desc' }
          });

          const saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;
          const montoEgreso = Number(data.montoITF);
          const nuevoSaldoActual = saldoAnterior - montoEgreso;

          await tx.saldoCuentaCorriente.create({
            data: {
              cuentaCorrienteId: Number(data.cuentaBancariaId),
              empresaId: Number(data.empresaId),
              fecha: pagoCuentaPorCobrar.fechaContable,
              saldoAnterior,
              ingresos: 0,
              egresos: montoEgreso,
              saldoActual: nuevoSaldoActual,
              movimientoCajaId: movimientoITF.id,
              centroCostoId: null,
              conciliado: false
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5: CREAR MOVIMIENTO DE CAJA - COMISIÓN (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoComision = null;
      if (data.montoComision && Number(data.montoComision) > 0) {
        movimientoComision = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
            empresaId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            monto: Number(data.montoComision),
            monedaId: Number(data.monedaPagoId),
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteOrigenId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
            fechaOperacionMovCaja: new Date(data.fechaPago),
            descripcion: `Comisión Bancaria - ${glosa}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            esGerencial: cuentaPorCobrar.esGerencial || false,
            tipoCambio: Number(data.tipoCambio),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: 135,
            origenMotivoOperacionId: pagoCuentaPorCobrar.id  // ⭐ AHORA SÍ EXISTE
          }
        });

        // Actualizar saldo de cuenta corriente (EGRESO por Comisión)
        if (data.cuentaBancariaId) {
          const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
            where: { cuentaCorrienteId: Number(data.cuentaBancariaId) },
            orderBy: { fecha: 'desc' }
          });

          const saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;
          const montoEgreso = Number(data.montoComision);
          const nuevoSaldoActual = saldoAnterior - montoEgreso;

          await tx.saldoCuentaCorriente.create({
            data: {
              cuentaCorrienteId: Number(data.cuentaBancariaId),
              empresaId: Number(data.empresaId),
              fecha: pagoCuentaPorCobrar.fechaContable,
              saldoAnterior,
              ingresos: 0,
              egresos: montoEgreso,
              saldoActual: nuevoSaldoActual,
              movimientoCajaId: movimientoComision.id,
              centroCostoId: null,
              conciliado: false
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 6: CREAR DETRACCIÓN (si aplica)
      // ════════════════════════════════════════════════════════════
      let detraccion = null;
      if (data.aplicaDetraccion && data.detraccion) {
        const det = data.detraccion;

        detraccion = await tx.detraccion.create({
          data: {
            empresaId: Number(data.empresaId),
            numeroConstancia: det.numeroConstancia,
            fechaDeposito: new Date(det.fechaDeposito),
            clienteId: Number(cuentaPorCobrar.clienteId),
            tipoDetraccionId: det.tipoDetraccionId ? Number(det.tipoDetraccionId) : null,
            tasaDetraccion: Number(det.tasaDetraccion),
            monedaId: Number(data.monedaPagoId),
            importeTotal: Number(det.importeTotal),
            importeDetraido: Number(det.importeDetraido),
            cuentaSunatId: det.cuentaSunatId ? Number(det.cuentaSunatId) : null,
            estadoId: ESTADOS_DETRACCION.VALIDADO,
            aplicado: false,
            observaciones: det.observaciones || `Detracción - Operación #${correlativo}`,
            fechaContable: new Date(data.fechaPago),
            periodoContableId: data.periodoContableId ? Number(data.periodoContableId) : null,
            refOperacionEspecializadaMovCaja: correlativo,
            creadoPor: data.creadoPor || null
          }
        });

        if (cuentaPorCobrar.preFacturaId) {
          await tx.detalleDetraccion.create({
            data: {
              detraccionId: detraccion.id,
              preFacturaOrigenId: cuentaPorCobrar.preFacturaId,
              importeTotal: Number(det.importeTotal),
              importeDetraido: Number(det.importeDetraido)
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 7: CREAR RETENCIÓN (si aplica)
      // ════════════════════════════════════════════════════════════
      let retencion = null;
      if (data.aplicaRetencion && data.retencion) {
        const ret = data.retencion;

        retencion = await tx.retencion.create({
          data: {
            empresaId: Number(data.empresaId),
            tipoDocumentoId: TIPOS_DOCUMENTO.RETENCION,
            numeroDocumento: ret.numeroDocumento,
            fechaEmision: new Date(ret.fechaEmision),
            fechaPago: new Date(data.fechaPago),
            proveedorId: Number(cuentaPorCobrar.clienteId),
            tipoDocProveedorId: Number(cuentaPorCobrar.cliente.tipoDocumentoId),
            numeroDocProveedor: cuentaPorCobrar.cliente.numeroDocumento,
            razonSocialProveedor: cuentaPorCobrar.cliente.razonSocial,
            tipoRetencionId: ret.tipoRetencionId ? Number(ret.tipoRetencionId) : null,
            tasaRetencion: Number(ret.tasaRetencion),
            monedaId: Number(data.monedaPagoId),
            importeTotal: Number(ret.importeTotal),
            importeRetenido: Number(ret.importeRetenido),
            importeNeto: Number(ret.importeTotal) - Number(ret.importeRetenido),
            cuentaPorPagarId: null,
            movimientoCajaId: movimientoIngreso.id,
            nubefactEnviado: false,
            estadoId: ESTADOS_RETENCION.VALIDADO,
            declarado: false,
            creadoPor: data.creadoPor || null
          }
        });

        if (cuentaPorCobrar.preFactura) {
          await tx.detalleRetencion.create({
            data: {
              retencionId: retencion.id,
              tipoDocumentoId: cuentaPorCobrar.preFactura.tipoDocumentoId,
              numeroDocumento: cuentaPorCobrar.numeroPreFactura,
              fechaEmision: cuentaPorCobrar.fechaEmision,
              importeTotal: Number(ret.importeTotal),
              importeRetenido: Number(ret.importeRetenido),
              importeNeto: Number(ret.importeTotal) - Number(ret.importeRetenido),
              fechaPago: new Date(data.fechaPago),
              numeroPago: `OP-${correlativo}`
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 8: CREAR PERCEPCIÓN (si aplica)
      // ════════════════════════════════════════════════════════════
      let percepcion = null;
      if (data.aplicaPercepcion && data.percepcion) {
        const per = data.percepcion;

        percepcion = await tx.percepcion.create({
          data: {
            empresaId: Number(data.empresaId),
            tipoDocumentoId: TIPOS_DOCUMENTO.PERCEPCION,
            numeroDocumento: per.numeroDocumento,
            fechaEmision: new Date(per.fechaEmision),
            fechaCobro: new Date(data.fechaPago),
            proveedorId: Number(cuentaPorCobrar.clienteId),
            tipoDocProveedorId: Number(cuentaPorCobrar.cliente.tipoDocumentoId),
            numeroDocProveedor: cuentaPorCobrar.cliente.numeroDocumento,
            razonSocialProveedor: cuentaPorCobrar.cliente.razonSocial,
            tipoPercepcionId: per.tipoPercepcionId ? Number(per.tipoPercepcionId) : null,
            tasaPercepcion: Number(per.tasaPercepcion),
            monedaId: Number(data.monedaPagoId),
            importeTotal: Number(per.importeTotal),
            importePercibido: Number(per.importePercibido),
            importePagado: Number(per.importeTotal) + Number(per.importePercibido),
            ordenCompraId: null,
            cuentaPorPagarId: null,
            estadoId: ESTADOS_PERCEPCION.VALIDADO,
            aplicadaCredito: false,
            observaciones: per.observaciones || `Percepción - Operación #${correlativo}`,
            creadoPor: data.creadoPor || null
          }
        });

        if (cuentaPorCobrar.preFactura) {
          await tx.detallePercepcion.create({
            data: {
              percepcionId: percepcion.id,
              tipoDocumentoId: cuentaPorCobrar.preFactura.tipoDocumentoId,
              numeroDocumento: cuentaPorCobrar.numeroPreFactura,
              fechaEmision: cuentaPorCobrar.fechaEmision,
              importeTotal: Number(per.importeTotal),
              importePercibido: Number(per.importePercibido)
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 9: ACTUALIZAR PAGO CON REFERENCIAS
      // ════════════════════════════════════════════════════════════
      const pagoCuentaPorCobrarActualizado = await tx.pagoCuentaPorCobrar.update({
        where: { id: pagoCuentaPorCobrar.id },
        data: {
          movimientoCajaId: movimientoIngreso.id,
          detraccionId: detraccion ? detraccion.id : null
        },
        include: {
          cuentaPorCobrar: {
            include: {
              cliente: true,
              empresa: true,
              moneda: true
            }
          },
          empresa: true,
          monedaPago: true,
          monedaDeuda: true,
          medioPago: true,
          banco: true,
          cuentaBancaria: {
            include: {
              banco: true,
              moneda: true
            }
          },
          periodoContable: true,
          movimientoCaja: true,
          detraccion: true
        }
      });


      // ════════════════════════════════════════════════════════════
      // PASO 10: GENERAR ASIENTOS CONTABLES
      // ════════════════════════════════════════════════════════════

      // Asiento #1: Pago CxC (SIEMPRE se genera)
      const asientoPagoCxC = await generarAsientoPagoCxC(
        data,
        cuentaPorCobrar,
        movimientoIngreso,
        pagoCuentaPorCobrar,  // ← AGREGADO
        glosa,
        tx
      );

      // Asiento #2: ITF (si aplica)
      let asientoITF = null;
      if (movimientoITF && data.montoITF && Number(data.montoITF) > 0) {
        asientoITF = await generarAsientoITF(
          data,
          movimientoITF,
          pagoCuentaPorCobrar,  // ← AGREGADO
          glosa,
          tx
        );
      }

      // Asiento #3: Comisión (si aplica)
      let asientoComision = null;
      if (movimientoComision && data.montoComision && Number(data.montoComision) > 0) {
        asientoComision = await generarAsientoComision(
          data,
          movimientoComision,
          pagoCuentaPorCobrar,  // ← AGREGADO
          glosa,
          tx
        );
      }
      // ════════════════════════════════════════════════════════════
      // PASO 11: ACTUALIZAR SALDO DE CUENTA POR COBRAR
      // ════════════════════════════════════════════════════════════

      const pagosRealizados = await tx.pagoCuentaPorCobrar.findMany({
        where: { cuentaPorCobrarId: Number(data.cuentaPorCobrarId) }
      });

      const totalPagado = pagosRealizados.reduce(
        (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
        0
      );

      const saldoPendiente = Number(cuentaPorCobrar.montoTotal) - totalPagado;

      let nuevoEstado = ESTADOS_CXC.PENDIENTE;
      if (saldoPendiente <= 0) {
        nuevoEstado = ESTADOS_CXC.PAGADO;
      } else if (totalPagado > 0 && saldoPendiente > 0) {
        nuevoEstado = ESTADOS_CXC.PAGO_PARCIAL;
      } else if (new Date(cuentaPorCobrar.fechaVencimiento) < new Date() && saldoPendiente > 0) {
        nuevoEstado = ESTADOS_CXC.VENCIDO;
      }

      await tx.cuentaPorCobrar.update({
        where: { id: Number(data.cuentaPorCobrarId) },
        data: {
          montoPagado: totalPagado,
          saldoPendiente: saldoPendiente,
          estadoId: nuevoEstado
        }
      });

      // ════════════════════════════════════════════════════════════
      // PASO 12: PREPARAR RESPUESTA
      // ════════════════════════════════════════════════════════════
      // Obtener saldos actualizados de cuenta corriente
      const saldosCuentaCorriente = [];
      if (data.cuentaBancariaId) {
        const saldosDB = await tx.saldoCuentaCorriente.findMany({
          where: {
            cuentaCorrienteId: Number(data.cuentaBancariaId),
            movimientoCajaId: {
              in: [
                movimientoIngreso.id,
                movimientoITF?.id,
                movimientoComision?.id
              ].filter(Boolean)
            }
          },
          orderBy: { fecha: 'asc' }
        });

        saldosDB.forEach((saldo) => {
          let tipo = 'Desconocido';
          if (saldo.movimientoCajaId === movimientoIngreso.id) tipo = 'Ingreso';
          else if (movimientoITF && saldo.movimientoCajaId === movimientoITF.id) tipo = 'ITF';
          else if (movimientoComision && saldo.movimientoCajaId === movimientoComision.id) tipo = 'Comisión';

          saldosCuentaCorriente.push({
            tipo,
            saldoAnterior: Number(saldo.saldoAnterior),
            ingresos: Number(saldo.ingresos),
            egresos: Number(saldo.egresos),
            saldoActual: Number(saldo.saldoActual)
          });
        });
      }

      return {
        success: true,
        correlativo: correlativo,
        pagoCuentaPorCobrar: pagoCuentaPorCobrarActualizado,
        movimientos: {
          ingreso: movimientoIngreso,
          itf: movimientoITF,
          comision: movimientoComision
        },
        conceptosSunat: {
          detraccion: detraccion,
          retencion: retencion,
          percepcion: percepcion
        },
        asientosContables: {
          pagoCxC: asientoPagoCxC,
          itf: asientoITF,
          comision: asientoComision
        },
        saldosCuentaCorriente: saldosCuentaCorriente,  // ← AGREGADO
        resumen: {
          montoBruto: Number(data.montoPagado),
          montoITF: movimientoITF ? Number(data.montoITF) : 0,
          montoComision: movimientoComision ? Number(data.montoComision) : 0,
          montoDetraccion: detraccion ? Number(data.detraccion.importeDetraido) : 0,
          montoRetencion: retencion ? Number(data.retencion.importeRetenido) : 0,
          montoPercepcion: percepcion ? Number(data.percepcion.importePercibido) : 0,
          montoNetoCaja: Number(data.montoPagado) -
            (movimientoITF ? Number(data.montoITF) : 0) -
            (movimientoComision ? Number(data.montoComision) : 0),
          deudaCancelada: Number(data.montoAplicadoDeuda),
          saldoPendiente: saldoPendiente
        }
      };
    });
  } catch (err) {
    console.error('❌ Error en procesarPagoEspecializado:', err);

    if (err instanceof ValidationError || err instanceof NotFoundError) {
      throw err;
    }

    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al procesar pago', err.message);
    }

    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES: CONSULTA Y OBTENCIÓN DE DATOS
// ════════════════════════════════════════════════════════════

/**
 * Obtener detalle completo de un pago especializado
 */
const obtenerDetallePago = async (pagoId) => {
  try {
    const pago = await prisma.pagoCuentaPorCobrar.findUnique({
      where: { id: Number(pagoId) },
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true,
            estado: true,
            preFactura: {
              include: {
                tipoDocumento: true
              }
            }
          }
        },
        empresa: true,
        monedaPago: true,
        monedaDeuda: true,
        medioPago: true,
        banco: true,
        cuentaBancaria: {
          include: {
            banco: true,
            moneda: true
          }
        },
        periodoContable: true,
        movimientoCaja: true,
        detraccion: {
          include: {
            tipoDetraccion: true,
            moneda: true,
            estado: true,
            detalles: {
              include: {
                preFacturaOrigen: true
              }
            }
          }
        }
      }
    });

    if (!pago) {
      throw new NotFoundError('Pago no encontrado.');
    }

    // Obtener todos los movimientos de la operación
    let movimientos = [];
    if (pago.refOperacionEspecializadaMovCaja) {
      movimientos = await prisma.movimientoCaja.findMany({
        where: {
          refOperacionEspecializadaMovCaja: pago.refOperacionEspecializadaMovCaja
        },
        include: {
          tipoMovimiento: true,
          moneda: true,
          medioPago: true,
          estado: true
        },
        orderBy: {
          id: 'asc'
        }
      });
    }

    // Obtener retención si existe
    let retencion = null;
    if (pago.tieneRetencion && pago.numeroComprobanteRetencion) {
      retencion = await prisma.retencion.findFirst({
        where: {
          numeroDocumento: pago.numeroComprobanteRetencion,
          empresaId: pago.empresaId
        },
        include: {
          tipoRetencion: true,
          moneda: true,
          estado: true,
          detalles: true
        }
      });
    }

    // Obtener percepción si existe
    let percepcion = null;
    if (pago.tienePercepcion && pago.numeroComprobantePercepcion) {
      percepcion = await prisma.percepcion.findFirst({
        where: {
          numeroDocumento: pago.numeroComprobantePercepcion,
          empresaId: pago.empresaId
        },
        include: {
          tipoPercepcion: true,
          moneda: true,
          estado: true,
          detalles: true
        }
      });
    }

    return {
      pago,
      movimientos,
      conceptosSunat: {
        detraccion: pago.detraccion,
        retencion,
        percepcion
      }
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;

    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener detalle de pago', err.message);
    }

    throw err;
  }
};

/**
 * Obtener todos los pagos de una operación por correlativo
 */
const obtenerPagosPorCorrelativo = async (empresaId, correlativo) => {
  try {
    const pagos = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        empresaId: Number(empresaId),
        refOperacionEspecializadaMovCaja: Number(correlativo)
      },
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            moneda: true
          }
        },
        monedaPago: true,
        monedaDeuda: true,
        medioPago: true,
        movimientoCaja: true,
        detraccion: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    // Obtener movimientos de la operación
    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        refOperacionEspecializadaMovCaja: Number(correlativo),
        empresaId: Number(empresaId)
      },
      include: {
        tipoMovimiento: true,
        moneda: true,
        medioPago: true,
        estado: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    return {
      correlativo: Number(correlativo),
      empresaId: Number(empresaId),
      pagos,
      movimientos,
      totalPagos: pagos.length,
      totalMovimientos: movimientos.length
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener pagos por correlativo', err.message);
    }

    throw err;
  }
};

/**
 * Listar pagos especializados por empresa
 */
const listarPagosEspecializados = async (empresaId, filtros = {}) => {
  try {
    const where = {
      empresaId: Number(empresaId),
      refOperacionEspecializadaMovCaja: {
        not: null
      }
    };

    // Aplicar filtros opcionales
    if (filtros.fechaDesde) {
      where.fechaPago = {
        ...where.fechaPago,
        gte: new Date(filtros.fechaDesde)
      };
    }

    if (filtros.fechaHasta) {
      where.fechaPago = {
        ...where.fechaPago,
        lte: new Date(filtros.fechaHasta)
      };
    }

    if (filtros.clienteId) {
      where.cuentaPorCobrar = {
        clienteId: Number(filtros.clienteId)
      };
    }

    if (filtros.monedaId) {
      where.monedaPagoId = Number(filtros.monedaId);
    }

    const pagos = await prisma.pagoCuentaPorCobrar.findMany({
      where,
      include: {
        cuentaPorCobrar: {
          include: {
            cliente: true,
            moneda: true
          }
        },
        empresa: true,
        monedaPago: true,
        monedaDeuda: true,
        medioPago: true,
        movimientoCaja: true,
        detraccion: true
      },
      orderBy: {
        fechaPago: 'desc'
      }
    });

    return pagos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar pagos especializados', err.message);
    }

    throw err;
  }
};

/**
 * Obtener resumen de operación por correlativo
 */
const obtenerResumenOperacion = async (empresaId, correlativo) => {
  try {
    const operacion = await obtenerPagosPorCorrelativo(empresaId, correlativo);

    // Calcular totales
    const totalMontoPagado = operacion.pagos.reduce(
      (sum, pago) => sum + Number(pago.montoPagado || 0),
      0
    );

    const totalMontoAplicado = operacion.pagos.reduce(
      (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
      0
    );

    const totalDetraccion = operacion.pagos.reduce(
      (sum, pago) => sum + Number(pago.detraccion?.importeDetraido || 0),
      0
    );

    const totalRetencion = operacion.pagos.reduce(
      (sum, pago) => sum + Number(pago.montoRetencion || 0),
      0
    );

    const totalPercepcion = operacion.pagos.reduce(
      (sum, pago) => sum + Number(pago.montoPercepcion || 0),
      0
    );

    // Separar movimientos por tipo
    const movimientoIngreso = operacion.movimientos.find(
      m => m.origenMovimiento === 'PAGO_CXC_ESPECIALIZADO' &&
        m.tipoMovimientoId !== TIPOS_MOVIMIENTO.ITF &&
        m.tipoMovimientoId !== TIPOS_MOVIMIENTO.COMISION_BANCARIA
    );

    const movimientoITF = operacion.movimientos.find(
      m => m.tipoMovimientoId === TIPOS_MOVIMIENTO.ITF
    );

    const movimientoComision = operacion.movimientos.find(
      m => m.tipoMovimientoId === TIPOS_MOVIMIENTO.COMISION_BANCARIA
    );

    return {
      correlativo: operacion.correlativo,
      empresaId: operacion.empresaId,
      totalPagos: operacion.totalPagos,
      totalMovimientos: operacion.totalMovimientos,
      resumen: {
        montoBruto: totalMontoPagado,
        montoITF: movimientoITF ? Number(movimientoITF.monto) : 0,
        montoComision: movimientoComision ? Number(movimientoComision.monto) : 0,
        montoDetraccion: totalDetraccion,
        montoRetencion: totalRetencion,
        montoPercepcion: totalPercepcion,
        montoNetoCaja: totalMontoPagado -
          (movimientoITF ? Number(movimientoITF.monto) : 0) -
          (movimientoComision ? Number(movimientoComision.monto) : 0),
        deudaCancelada: totalMontoAplicado
      },
      pagos: operacion.pagos,
      movimientos: {
        ingreso: movimientoIngreso,
        itf: movimientoITF,
        comision: movimientoComision
      }
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener resumen de operación', err.message);
    }

    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES
// ════════════════════════════════════════════════════════════

/**
 * Actualizar URL del voucher consolidado en MovimientoCaja
 */
const actualizarUrlVoucherConsolidado = async (movimientoIngresoId, urlPdf) => {
  try {
    await prisma.movimientoCaja.update({
      where: { id: Number(movimientoIngresoId) },
      data: { urlComprobanteOperacionMovCaja: urlPdf }
    });
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar URL voucher consolidado:', error);
    throw new DatabaseError('Error al actualizar URL del voucher consolidado');
  }
};

/**
 * Actualizar URL del voucher individual en MovimientoCaja
 */
const actualizarUrlVoucherIndividual = async (movimientoId, urlPdf) => {
  try {
    await prisma.movimientoCaja.update({
      where: { id: Number(movimientoId) },
      data: { urlOperacionIndividualOperacionCaja: urlPdf }
    });
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar URL voucher individual:', error);
    throw new DatabaseError('Error al actualizar URL del voucher individual');
  }
};

export default {
  procesarPagoEspecializado,
  obtenerDetallePago,
  obtenerPagosPorCorrelativo,
  listarPagosEspecializados,
  obtenerResumenOperacion,
  actualizarUrlVoucherConsolidado,
  actualizarUrlVoucherIndividual
};