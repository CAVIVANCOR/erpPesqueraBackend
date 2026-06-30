import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from '../Tesoreria/correlativoOperacionCaja.service.js';

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
    'tipoMovimientoIngresoId'
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

  try {
    return await prisma.$transaction(async (tx) => {
      // ════════════════════════════════════════════════════════════
      // PASO 1: GENERAR CORRELATIVO DE OPERACIÓN
      // ════════════════════════════════════════════════════════════
      const correlativo = await correlativoService.generarCorrelativo(data.empresaId, tx);

      console.log(`✅ Correlativo generado: #${correlativo}`);

      // ════════════════════════════════════════════════════════════
      // PASO 2: CREAR MOVIMIENTO DE CAJA - INGRESO
      // ════════════════════════════════════════════════════════════
      const movimientoIngreso = await tx.movimientoCaja.create({
        data: {
          refOperacionEspecializadaMovCaja: correlativo,
          tipoMovimientoId: Number(data.tipoMovimientoIngresoId),
          empresaOrigenId: Number(data.empresaId),
          entidadComercialId: Number(cuentaPorCobrar.clienteId),
          monto: Number(data.montoPagado),
          monedaId: Number(data.monedaPagoId),
          medioPagoId: Number(data.medioPagoId),
          cuentaCorrienteDestinoId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
          fechaOperacion: new Date(data.fechaPago),
          numeroOperacion: data.numeroOperacion || null,
          observaciones: `Pago de ${cuentaPorCobrar.numeroPreFactura} - Cliente: ${cuentaPorCobrar.cliente.razonSocial}`,
          estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
          origenMovimiento: 'PAGO_CXC_ESPECIALIZADO',
          creadoPor: data.creadoPor || null
        }
      });

      console.log(`✅ MovimientoCaja Ingreso creado: #${movimientoIngreso.id}`);

      // ════════════════════════════════════════════════════════════
      // PASO 3: CREAR MOVIMIENTO DE CAJA - ITF (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoITF = null;
      if (data.montoITF && Number(data.montoITF) > 0) {
        movimientoITF = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
            empresaOrigenId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            monto: Number(data.montoITF),
            monedaId: Number(data.monedaPagoId),
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteOrigenId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
            fechaOperacion: new Date(data.fechaPago),
            observaciones: `ITF - Operación #${correlativo} - ${cuentaPorCobrar.numeroPreFactura}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            origenMovimiento: 'PAGO_CXC_ESPECIALIZADO',
            creadoPor: data.creadoPor || null
          }
        });

        console.log(`✅ MovimientoCaja ITF creado: #${movimientoITF.id}`);
      }

      // ════════════════════════════════════════════════════════════
      // PASO 4: CREAR MOVIMIENTO DE CAJA - COMISIÓN (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoComision = null;
      if (data.montoComision && Number(data.montoComision) > 0) {
        movimientoComision = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
            empresaOrigenId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            monto: Number(data.montoComision),
            monedaId: Number(data.monedaPagoId),
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteOrigenId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
            fechaOperacion: new Date(data.fechaPago),
            observaciones: `Comisión Bancaria - Operación #${correlativo} - ${cuentaPorCobrar.numeroPreFactura}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            origenMovimiento: 'PAGO_CXC_ESPECIALIZADO',
            creadoPor: data.creadoPor || null
          }
        });

        console.log(`✅ MovimientoCaja Comisión creado: #${movimientoComision.id}`);
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5: CREAR DETRACCIÓN (si aplica)
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

        console.log(`✅ Detracción creada: #${detraccion.id} - ${detraccion.numeroConstancia}`);

        // Crear DetalleDetraccion vinculando con la PreFactura
        if (cuentaPorCobrar.preFacturaId) {
          await tx.detalleDetraccion.create({
            data: {
              detraccionId: detraccion.id,
              preFacturaOrigenId: cuentaPorCobrar.preFacturaId,
              importeTotal: Number(det.importeTotal),
              importeDetraido: Number(det.importeDetraido)
            }
          });

          console.log(`✅ DetalleDetraccion creado para PreFactura #${cuentaPorCobrar.preFacturaId}`);
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 6: CREAR RETENCIÓN (si aplica)
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
            cuentaPorPagarId: null, // Es CxC, no CxP
            movimientoCajaId: movimientoIngreso.id,
            nubefactEnviado: false,
            estadoId: ESTADOS_RETENCION.VALIDADO,
            declarado: false,
            creadoPor: data.creadoPor || null
          }
        });

        console.log(`✅ Retención creada: #${retencion.id} - ${retencion.numeroDocumento}`);

        // Crear DetalleRetencion
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

          console.log(`✅ DetalleRetencion creado`);
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 7: CREAR PERCEPCIÓN (si aplica)
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

        console.log(`✅ Percepción creada: #${percepcion.id} - ${percepcion.numeroDocumento}`);

        // Crear DetallePercepcion
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

          console.log(`✅ DetallePercepcion creado`);
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 8: CREAR PAGO CUENTA POR COBRAR
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
          movimientoCajaId: movimientoIngreso.id,
          observaciones: data.observaciones || null,
          fechaContable: new Date(data.fechaPago),
          periodoContableId: data.periodoContableId ? Number(data.periodoContableId) : null,
          refOperacionEspecializadaMovCaja: correlativo,
          detraccionId: detraccion ? detraccion.id : null,
          creadoPor: data.creadoPor || null
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
          cuentaBancaria: true,
          periodoContable: true,
          movimientoCaja: true,
          detraccion: true
        }
      });

      console.log(`✅ PagoCuentaPorCobrar creado: #${pagoCuentaPorCobrar.id}`);

      // ════════════════════════════════════════════════════════════
      // PASO 9: ACTUALIZAR TRAZABILIDAD EN MOVIMIENTOS DE CAJA
      // ════════════════════════════════════════════════════════════
      await tx.movimientoCaja.update({
        where: { id: movimientoIngreso.id },
        data: {
          origenMotivoOperacionId: pagoCuentaPorCobrar.id
        }
      });

      if (movimientoITF) {
        await tx.movimientoCaja.update({
          where: { id: movimientoITF.id },
          data: {
            origenMotivoOperacionId: pagoCuentaPorCobrar.id
          }
        });
      }

      if (movimientoComision) {
        await tx.movimientoCaja.update({
          where: { id: movimientoComision.id },
          data: {
            origenMotivoOperacionId: pagoCuentaPorCobrar.id
          }
        });
      }

      console.log(`✅ Trazabilidad actualizada en MovimientoCaja`);

      // ════════════════════════════════════════════════════════════
      // PASO 10: ACTUALIZAR SALDO DE CUENTA POR COBRAR
      // ════════════════════════════════════════════════════════════
      const pagosRealizados = await tx.pagoCuentaPorCobrar.findMany({
        where: { cuentaPorCobrarId: Number(data.cuentaPorCobrarId) }
      });

      const totalPagado = pagosRealizados.reduce(
        (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
        0
      );

      const saldoPendiente = Number(cuentaPorCobrar.montoTotal) - totalPagado;

      // Calcular estado
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

      console.log(`✅ CuentaPorCobrar actualizada - Saldo: ${saldoPendiente}`);

      // ════════════════════════════════════════════════════════════
      // PASO 11: PREPARAR RESPUESTA
      // ════════════════════════════════════════════════════════════
      return {
        success: true,
        correlativo: correlativo,
        pagoCuentaPorCobrar: pagoCuentaPorCobrar,
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
        OR: [
          { empresaOrigenId: Number(empresaId) },
          { empresaDestinoId: Number(empresaId) }
        ]
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

export default {
  procesarPagoEspecializado,
  obtenerDetallePago,
  obtenerPagosPorCorrelativo,
  listarPagosEspecializados,
  obtenerResumenOperacion
};