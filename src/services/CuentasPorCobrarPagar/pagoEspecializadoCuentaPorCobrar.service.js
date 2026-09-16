import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from '../Tesoreria/correlativoOperacionCaja.service.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';
import { TIPO_LIBRO } from '../../utils/tiposLibroContable.js';
import { ESTADO_ASIENTO_CONTABLE } from '../../utils/estados.constants.js';

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
  ITF: 163,                    // ✅ ITF PORTES EMBARGOS MANTENIMIENTO DE CUENTAS COMISIONES
  COMISION_BANCARIA: 163,      // ✅ ITF PORTES EMBARGOS MANTENIMIENTO DE CUENTAS COMISIONES (mismo que ITF)
  DETRACCION_INGRESO: 165,     // ✅ SUNAT (para Detracción, Retención, Percepción - INGRESO)
  DETRACCION_SALIDA: 165       // ✅ SUNAT (para Detracción, Retención, Percepción - SALIDA)
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
// CONSTANTES CONTABLES - CÓDIGOS DE CUENTAS
// ════════════════════════════════════════════════════════════

const CODIGOS_CUENTAS_CONTABLES = {
  FACTURAS_POR_COBRAR_SOLES: '121201',      // FACTURAS POR COBRAR SOLES
  FACTURAS_POR_COBRAR_DOLARES: '121202',    // FACTURAS POR COBRAR DÓLARES
  BN_DETRACCION: '107111'                    // CUENTA DETRACCION DL 940 - BANCO DE LA NACIÓN
};

// ════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════

/**
 * Validar datos completos para procesamiento de pago especializado
 * @param {Object} data - Datos del pago
 * @param {Object} tx - Transacción de Prisma (opcional, usa prisma si no se proporciona)
 */
async function validarDatosPagoEspecializado(data, tx = null) {
  const db = tx || prisma;
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
  const cuentaPorCobrar = await db.cuentaPorCobrar.findUnique({
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

  // Advertencia de sobrepago (no bloquea la operación)
  if (Number(data.montoAplicadoDeuda) > Number(cuentaPorCobrar.saldoPendiente)) {
    console.warn(
      `⚠️ SOBREPAGO DETECTADO: Monto aplicado (${data.montoAplicadoDeuda}) > Saldo pendiente (${cuentaPorCobrar.saldoPendiente})`
    );
    // No lanzar error, permitir sobrepagos
  }

  // ========================================
  // VALIDAR CUENTA CORRIENTE
  // ========================================
  if (data.cuentaBancariaId) {
    const cuentaCorriente = await db.cuentaCorriente.findUnique({
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
  
  // Monto a mostrar en glosa: solo el monto neto pagado (no incluye detracción)
  const montoPagado = formatearMonto(data.montoPagado);
  
  const fechaPago = formatearFecha(data.fechaPago);
  const tipoCambio = formatearTipoCambio(data.tipoCambio);

  return `Pago CxC de Dcmto: ${numeroPreFactura} ${fechaEmision} Cliente: ${tipoDoc} ${numDoc} ${razonSocial} Monto Neto: ${simboloMoneda} ${montoPagado} ${fechaPago} T/C: ${tipoCambio}`;
}


// ════════════════════════════════════════════════════════════
// GENERACIÓN DE ASIENTOS CONTABLES PARA MOVIMIENTOS DE CAJA
// ════════════════════════════════════════════════════════════

/**
 * Genera asientos contables para todos los movimientos de caja de un pago
 * Patrón: Igual a preFactura.guardarAsientoContable()
 * 
 * @param {Object} pagoCuentaPorCobrar - Pago creado
 * @param {Array} movimientos - Array de MovimientoCaja creados
 * @param {Object} periodoContable - Período contable
 * @param {Number} empresaId - ID empresa
 * @param {Number} creadoPor - ID usuario
 * @param {Object} tx - Transacción Prisma
 * @returns {Promise<Array>} - Array de asientos creados
 */
async function generarAsientosContablesPagoCxC(
  pagoCuentaPorCobrar,
  movimientos,
  periodoContable,
  empresaId,
  creadoPor,
  tx
) {
  try {
  
    // 1. Buscar submódulo "PagoCuentaPorCobrar"
    const submodulo = await tx.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "PagoCuentaPorCobrar",
        activo: true
      }
    });

    if (!submodulo) {
      throw new ValidationError('No se encontró el submódulo "PagoCuentaPorCobrar"');
    }
    
    // 2. Buscar estado PENDIENTE para asientos contables (siguiendo patrón de preFactura)
    const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) }
    });

    if (!estadoPendiente) {
      throw new ValidationError('No se encontró el estado PENDIENTE para asientos contables');
    }

    // 3. Buscar cuentas contables por código
    const cuentaCxCSoles = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_COBRAR_SOLES }
    });
    
    const cuentaCxCDolares = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_COBRAR_DOLARES }
    });
    
    const cuentaBNDetraccion = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: CODIGOS_CUENTAS_CONTABLES.BN_DETRACCION }
    });

    if (!cuentaCxCSoles) {
      throw new ValidationError(`No se encontró la cuenta contable con código ${CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_COBRAR_SOLES}`);
    }
    if (!cuentaCxCDolares) {
      throw new ValidationError(`No se encontró la cuenta contable con código ${CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_COBRAR_DOLARES}`);
    }
    if (!cuentaBNDetraccion) {
      throw new ValidationError(`No se encontró la cuenta contable con código ${CODIGOS_CUENTAS_CONTABLES.BN_DETRACCION}`);
    }

    const asientosCreados = [];

    // 3. Por cada movimiento con monto > 0, generar asiento
    for (const movimiento of movimientos) {
      
      if (!movimiento || Number(movimiento.monto) <= 0) {
        continue;
      }

      // Cargar movimiento con relaciones completas
      const movimientoCompleto = await tx.movimientoCaja.findUnique({
        where: { id: movimiento.id },
        include: {
          cuentaCorrienteOrigen: {
            include: { cuentaContable: true }
          },
          cuentaCorrienteDestino: {
            include: { cuentaContable: true }
          },
          moneda: true,
          tipoMovimiento: true,
          cuentaPorCobrar: {
            include: {
              cliente: true,
              preFactura: {
                include: {
                  tipoDocumento: true
                }
              }
            }
          }
        }
      });

      if (!movimientoCompleto) {
        console.warn(`⚠️ Movimiento ${movimiento.id} no encontrado, saltando asiento`);
        continue;
      }

      // Obtener datos del documento origen (factura) y CuentaPorCobrar
      const cuentaPorCobrar = movimientoCompleto.cuentaPorCobrar;
      const preFactura = cuentaPorCobrar?.preFactura;
      const clienteId = cuentaPorCobrar?.clienteId || movimientoCompleto.entidadComercialId;
      const tipoDocumentoOrigenId = preFactura?.tipoDocumentoFinalId || null;
      const numeroDocumentoOrigen = preFactura?.numeroDocumentoFinal || null;
      const fechaDocumentoOrigen = preFactura?.fechaFacturacion || null;
      const fechaVenceDocumentoOrigen = preFactura?.fechaVencimiento || null;
      
      // Determinar tipoLibro según esGerencial (siguiendo patrón de preFactura)
      const esGerencial = cuentaPorCobrar?.esGerencial || false;
      const tipoLibro = esGerencial ? "GERENCIAL" : "FISCAL";
    
      // Determinar tipo de asiento según el movimiento
      const esIngreso = movimientoCompleto.cuentaCorrienteDestinoId && !movimientoCompleto.cuentaCorrienteOrigenId;
      const esDetraccion = Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.DETRACCION_INGRESO;



      // Determinar cuentas contables
      let cuentaDebe, cuentaHaber;


      if (esIngreso && !esDetraccion) {
        // INGRESO: Cliente paga

        
        if (!movimientoCompleto.cuentaCorrienteDestino) {
          console.error(`   ❌ ERROR: No hay cuenta destino en el movimiento`);
          continue;
        }
        
        if (!movimientoCompleto.cuentaCorrienteDestino.cuentaContable) {
          console.error(`   ❌ ERROR: La cuenta destino no tiene cuenta contable asociada`);
          console.error(`   Cuenta Destino ID: ${movimientoCompleto.cuentaCorrienteDestinoId}`);
          continue;
        }
        
        cuentaDebe = movimientoCompleto.cuentaCorrienteDestino.cuentaContable.id;
        cuentaHaber = movimientoCompleto.monedaId === 1 
          ? cuentaCxCSoles.id 
          : cuentaCxCDolares.id;
  
      } else if (esDetraccion) {
        
        cuentaDebe = cuentaBNDetraccion.id;
        
        if (movimientoCompleto.cuentaCorrienteOrigenId) {
          // Empresa paga (autodetracción)

          if (!movimientoCompleto.cuentaCorrienteOrigen) {
            console.error(`   ❌ ERROR: No hay cuenta origen en el movimiento`);
            continue;
          }
          
          if (!movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {
            console.error(`   ❌ ERROR: La cuenta origen no tiene cuenta contable asociada`);
            console.error(`   Cuenta Origen ID: ${movimientoCompleto.cuentaCorrienteOrigenId}`);
            continue;
          }
          
          cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;

        } else {
          // Cliente paga

          
          cuentaHaber = movimientoCompleto.monedaId === 1 
            ? cuentaCxCSoles.id 
            : cuentaCxCDolares.id;
          
        }
      } else if (Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.ITF) {
        // ITF

        
        // Buscar cuenta de gasto ITF
        const cuentaGastoITF = await tx.planCuentasContable.findFirst({
          where: {
            codigoCuenta: '641101',
            empresaId: Number(empresaId)
          }
        });
        
        if (!cuentaGastoITF) {
          console.error(`   ❌ ERROR: No se encontró la cuenta contable 641101 (Gasto ITF)`);
          continue;
        }
        
        if (!cuentaGastoITF.centroCostoId) {
          console.error(`   ❌ ERROR: La cuenta 641101 no tiene centro de costo asignado`);
          continue;
        }
        
        if (!movimientoCompleto.cuentaCorrienteDestino || !movimientoCompleto.cuentaCorrienteDestino.cuentaContable) {
          console.error(`   ❌ ERROR: La cuenta destino no tiene cuenta contable asociada`);
          continue;
        }
        
        cuentaDebe = cuentaGastoITF.id;
        cuentaHaber = movimientoCompleto.cuentaCorrienteDestino.cuentaContable.id;
        

        
      } else if (Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.COMISION_BANCARIA) {
        // Comisión Bancaria
   
        
        // Buscar cuenta de gasto Comisión
        const cuentaGastoComision = await tx.planCuentasContable.findFirst({
          where: {
            codigoCuenta: '679401',
            empresaId: Number(empresaId)
          }
        });
        
        if (!cuentaGastoComision) {
          console.error(`   ❌ ERROR: No se encontró la cuenta contable 679401 (Gasto Comisión Bancaria)`);
          continue;
        }
        
        if (!cuentaGastoComision.centroCostoId) {
          console.error(`   ❌ ERROR: La cuenta 679401 no tiene centro de costo asignado`);
          continue;
        }
        
        if (!movimientoCompleto.cuentaCorrienteDestino || !movimientoCompleto.cuentaCorrienteDestino.cuentaContable) {
          console.error(`   ❌ ERROR: La cuenta destino no tiene cuenta contable asociada`);
          continue;
        }
        
        cuentaDebe = cuentaGastoComision.id;
        cuentaHaber = movimientoCompleto.cuentaCorrienteDestino.cuentaContable.id;
        
        
      } else {
        // Otros movimientos - saltar
        continue;
      }
      

      // Obtener último correlativo del período
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: {
          empresaId: Number(empresaId),
          periodoContableId: Number(periodoContable.id)
        },
        orderBy: { correlativo: "desc" }
      });

      const nuevoCorrelativo = ultimoAsiento ? ultimoAsiento.correlativo + 1 : 1;
      const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(5, "0")}`;

      // Glosa del asiento
      const glosa = movimientoCompleto.descripcion || `Movimiento de caja ${movimiento.id}`;

      // Calcular montos en moneda extranjera si aplica
      const montoSoles = Number(movimientoCompleto.monto);
      const montoMonedaExtranjera = movimientoCompleto.monedaId !== 1 
        ? montoSoles / Number(movimientoCompleto.tipoCambio)
        : null;

      
      // Preparar datos del asiento para debug (sin convertir BigInt a Number)
      const asientoDebugData = {
        empresaId: Number(empresaId),
        periodoContableId: Number(periodoContable.id),
        numeroAsiento: numeroAsiento,
        correlativo: nuevoCorrelativo,
        tipoLibro: tipoLibro,
        tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
        esGerencial: esGerencial,
        esSaldoInicial: false,
        origenAsiento: "AUTOMATICO",
        submoduloOrigenId: `${submodulo.id}`,
        procesoOrigenId: `${movimientoCompleto.id}`,  // ✅ ID del movimiento, NO del pago
        estadoId: `${estadoPendiente.id}`,
        totalDebe: montoSoles,
        totalHaber: montoSoles,
        monedaId: 1,
        tipoCambio: Number(movimientoCompleto.tipoCambio),
        creadoPor: creadoPor
      };

      
      // ═══════════════════════════════════════════════════════════
      // DEBUG EXHAUSTIVO: VERIFICAR CADA FK UNO POR UNO
      // ═══════════════════════════════════════════════════════════
      
      // 1. Verificar empresaId
      const empresaExists = await tx.empresa.findUnique({ where: { id: Number(empresaId) } });
      
      // 2. Verificar periodoContableId
      const periodoExists = await tx.periodoContable.findUnique({ where: { id: Number(periodoContable.id) } });
      
      // 3. Verificar tipoLibroId
      const tipoLibroExists = await tx.tipoLibroContableSunat.findUnique({ where: { id: BigInt(TIPO_LIBRO.CAJA_BANCOS) } });
      
      // 4. Verificar estadoId
      const estadoExists = await tx.estadoMultiFuncion.findUnique({ where: { id: estadoPendiente.id } });
      
      // 5. Verificar submoduloOrigenId
      const submoduloExists = await tx.submoduloSistema.findUnique({ where: { id: submodulo.id } });
      
      // 6. Verificar monedaId
      const monedaExists = await tx.moneda.findUnique({ where: { id: BigInt(1) } });
      
      // 7. Verificar planCuentaId (DEBE)
      const cuentaDebeExists = await tx.planCuentasContable.findUnique({ where: { id: cuentaDebe } });
      
      // 8. Verificar planCuentaId (HABER)
      const cuentaHaberExists = await tx.planCuentasContable.findUnique({ where: { id: cuentaHaber } });
      
      // 9. Verificar entidadComercialId
      const entidadExists = await tx.entidadComercial.findUnique({ where: { id: clienteId } });
      
      // 10. Verificar tipoDocumentoOrigenId
      const tipoDocExists = tipoDocumentoOrigenId ? await tx.tipoDocumento.findUnique({ where: { id: tipoDocumentoOrigenId } }) : null;
      
      
      // Verificar si alguno no existe
      const faltantes = [];
      if (!empresaExists) faltantes.push(`empresaId: ${Number(empresaId)}`);
      if (!periodoExists) faltantes.push(`periodoContableId: ${Number(periodoContable.id)}`);
      if (!tipoLibroExists) faltantes.push(`tipoLibroId: ${TIPO_LIBRO.CAJA_BANCOS}`);
      if (!estadoExists) faltantes.push(`estadoId: ${estadoPendiente.id}`);
      if (!submoduloExists) faltantes.push(`submoduloOrigenId: ${submodulo.id}`);
      if (!monedaExists) faltantes.push(`monedaId: 1`);
      if (!cuentaDebeExists) faltantes.push(`planCuentaId DEBE: ${cuentaDebe}`);
      if (!cuentaHaberExists) faltantes.push(`planCuentaId HABER: ${cuentaHaber}`);
      if (!entidadExists) faltantes.push(`entidadComercialId: ${clienteId}`);
      if (tipoDocumentoOrigenId && !tipoDocExists) faltantes.push(`tipoDocumentoOrigenId: ${tipoDocumentoOrigenId}`);
      
      if (faltantes.length > 0) {
        throw new ValidationError(`No se puede crear el asiento. Faltan registros: ${faltantes.join(', ')}`);
      }
      
      
      // Crear asiento contable (siguiendo patrón de preFactura.service.js)
      const asiento = await tx.asientoContable.create({
        data: {
          empresaId: Number(empresaId),
          periodoContableId: Number(periodoContable.id),
          numeroAsiento: numeroAsiento,
          correlativo: nuevoCorrelativo,
          fechaAsiento: movimientoCompleto.fechaOperacionMovCaja,
          glosa: glosa,
          tipoLibro: tipoLibro,
          tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
          esGerencial: esGerencial,
          esSaldoInicial: false,
          origenAsiento: "AUTOMATICO",
          submoduloOrigenId: submodulo.id,  // BigInt directo, sin convertir
          procesoOrigenId: movimientoCompleto.id,  // ✅ ID del movimiento, no del pago
          estadoId: estadoPendiente.id,  // BigInt directo, sin convertir
          totalDebe: montoSoles,
          totalHaber: montoSoles,
          diferencia: 0,
          estaCuadrado: true,
          monedaId: 1,
          tipoCambio: Number(movimientoCompleto.tipoCambio),
          creadoPor: creadoPor,
          detalles: {
            create: [
              {
                numeroLinea: 1,
                planCuentaId: cuentaDebe,
                glosa: glosa,
                debe: montoSoles,
                haber: 0,
                monedaId: 1,
                tipoCambio: Number(movimientoCompleto.tipoCambio),
                debeMonedaExtranjera: montoMonedaExtranjera,
                haberMonedaExtranjera: null,
                centroCostoId: null,
                entidadComercialId: clienteId,
                tipoDocumentoOrigenId: tipoDocumentoOrigenId,
                numeroDocumentoOrigen: numeroDocumentoOrigen,
                fechaDocumentoOrigen: fechaDocumentoOrigen,
                fechaVenceDocumentoOrigen: fechaVenceDocumentoOrigen,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: pagoCuentaPorCobrar.id,
                creadoPor: creadoPor
              },
              {
                numeroLinea: 2,
                planCuentaId: cuentaHaber,
                glosa: glosa,
                debe: 0,
                haber: montoSoles,
                monedaId: 1,
                tipoCambio: Number(movimientoCompleto.tipoCambio),
                debeMonedaExtranjera: null,
                haberMonedaExtranjera: montoMonedaExtranjera,
                centroCostoId: null,
                entidadComercialId: clienteId,
                tipoDocumentoOrigenId: tipoDocumentoOrigenId,
                numeroDocumentoOrigen: numeroDocumentoOrigen,
                fechaDocumentoOrigen: fechaDocumentoOrigen,
                fechaVenceDocumentoOrigen: fechaVenceDocumentoOrigen,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: pagoCuentaPorCobrar.id,
                creadoPor: creadoPor
              }
            ]
          }
        }
      });

      asientosCreados.push(asiento);

    }

    return asientosCreados;
  } catch (error) {
    console.error('❌ Error generando asientos contables:', error);
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
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // ════════════════════════════════════════════════════════════
      // VALIDACIONES DENTRO DE LA TRANSACCIÓN
      // ════════════════════════════════════════════════════════════
      // Validar datos (dentro de la transacción para lectura consistente)
      const cuentaPorCobrar = await validarDatosPagoEspecializado(data, tx);

      // Cargar moneda de pago para glosa
      const monedaPago = await tx.moneda.findUnique({
        where: { id: Number(data.monedaPagoId) }
      });

      if (!monedaPago) {
        throw new NotFoundError('Moneda de pago no encontrada.');
      }

      // Generar glosa completa
      const glosa = generarGlosaPagoCxC(cuentaPorCobrar, data, monedaPago);
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
          numeroOperacionPagoBanco: data.numeroOperacion || null,
          fechaOperacionPagoBanco: data.fechaPago ? new Date(data.fechaPago) : null,
          urlComprobanteOperacionMovCaja: cuentaPorCobrar.preFactura?.urlPreFacturaPdf || null,  // ✅ URL del PDF de la PreFactura
          estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
          esGerencial: cuentaPorCobrar.esGerencial || false,
          tipoCambio: Number(data.tipoCambio),
          usuarioId: Number(data.usuarioId),
          moduloOrigenMotivoOperacionId: 116,
          origenMotivoOperacionId: pagoCuentaPorCobrar.id,
          cuentaPorCobrarId: cuentaPorCobrar.id
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
            moduloOrigenMotivoOperacionId: 116,  // ✅ PAGOS_CXC (todos los movimientos del pago)
            origenMotivoOperacionId: pagoCuentaPorCobrar.id
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
            moduloOrigenMotivoOperacionId: 116,  // ✅ PAGOS_CXC (todos los movimientos del pago)
            origenMotivoOperacionId: pagoCuentaPorCobrar.id
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
      // PASO 5.0: BUSCAR/ACTUALIZAR DETRACCIÓN PRIMERO (para obtener el ID)
      // ════════════════════════════════════════════════════════════
      let detraccionActualizada = null;
      let cuentaBN = null;
      
      if (cuentaPorCobrar.preFacturaId && data.montoDetraccionIngresado && Number(data.montoDetraccionIngresado) > 0) {
        // Buscar la detracción por preFacturaId
        const detraccionActual = await tx.detraccion.findUnique({
          where: { preFacturaId: cuentaPorCobrar.preFacturaId }
        });

        if (detraccionActual) {


          const nuevoImportePagado = Number(detraccionActual.importePagado) + Number(data.montoDetraccionIngresado);
          const nuevoSaldoPendiente = Number(detraccionActual.importeRequerido) - nuevoImportePagado;

 

          // Determinar nuevo estado
          let nuevoEstadoDetraccion = ESTADOS_DETRACCION.PENDIENTE;
          if (nuevoSaldoPendiente <= 0) {
            nuevoEstadoDetraccion = ESTADOS_DETRACCION.VALIDADO; // PAGADO
          } else if (nuevoImportePagado > 0) {
            nuevoEstadoDetraccion = 126; // PARCIAL (ajustar según tu catálogo)
          }


          detraccionActualizada = await tx.detraccion.update({
            where: { id: detraccionActual.id },
            data: {
              importePagado: nuevoImportePagado,
              saldoPendiente: nuevoSaldoPendiente,
              estadoPagoId: nuevoEstadoDetraccion,
              numeroDocumento: data.numeroOperacionBN || data.numeroConstanciaDetraccion || detraccionActual.numeroDocumento,
              fechaEmision: data.fechaPago ? new Date(data.fechaPago) : detraccionActual.fechaEmision
            }
          });
          
          // Guardar cuenta BN para los movimientos
          cuentaBN = detraccionActual.cuentaBNSunatPropiaId ? Number(detraccionActual.cuentaBNSunatPropiaId) : null;
        } else {
          console.warn('⚠️ No se encontró detracción para PreFactura ID:', cuentaPorCobrar.preFacturaId);
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5.1: MOVIMIENTO DETRACCIÓN - INGRESO BANCO NACIÓN (solo si NO es autodetracción)
      // ════════════════════════════════════════════════════════════
      let movimientoDetraccionIngreso = null;
      if (!data.esAutodetraccion && detraccionActualizada) {
        movimientoDetraccionIngreso = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.DETRACCION_INGRESO,
            empresaId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            monto: Number(data.montoDetraccionIngresado),
            monedaId: Number(data.monedaPagoId),
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteDestinoId: cuentaBN,
            fechaOperacionMovCaja: new Date(data.fechaPago),
            descripcion: `Detracción - ${glosa}`,
            numeroOperacionPagoBancoImpuesto: data.numeroOperacionBN || null,  // ← Número de constancia SUNAT
            fechaOperacionPagoBancoImpuesto: data.fechaPago ? new Date(data.fechaPago) : null,  // ← Fecha depósito impuesto
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            esGerencial: cuentaPorCobrar.esGerencial || false,
            tipoCambio: Number(data.tipoCambio),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: 116,
            origenMotivoOperacionId: pagoCuentaPorCobrar.id,
            cuentaPorCobrarId: cuentaPorCobrar.id,
            detraccionId: detraccionActualizada.id
          }
        });

        // Actualizar saldo Banco Nación (INGRESO)
        if (cuentaBN) {
          const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
            where: { cuentaCorrienteId: cuentaBN },
            orderBy: { fecha: 'desc' }
          });

          const saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;
          const montoIngreso = Number(data.montoDetraccionIngresado);
          const nuevoSaldoActual = saldoAnterior + montoIngreso;

          await tx.saldoCuentaCorriente.create({
            data: {
              cuentaCorrienteId: cuentaBN,
              empresaId: Number(data.empresaId),
              fecha: pagoCuentaPorCobrar.fechaContable,
              saldoAnterior,
              ingresos: montoIngreso,
              egresos: 0,
              saldoActual: nuevoSaldoActual,
              movimientoCajaId: movimientoDetraccionIngreso.id,
              centroCostoId: null,
              conciliado: false
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5.2: AUTODETRACCIÓN - TRANSFERENCIA ÚNICA (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoAutodetraccion = null;

      if (data.esAutodetraccion && detraccionActualizada) {
        // ✅ NUEVO: 1 solo movimiento con origen y destino (transferencia)
        // Cuenta origen: puede ser diferente a donde cliente depositó
        const cuentaOrigenAutodet = data.cuentaBancariaOrigenAutodetraccion 
          ? Number(data.cuentaBancariaOrigenAutodetraccion)
          : (data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null);

        movimientoAutodetraccion = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.DETRACCION_INGRESO,
            empresaId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            monto: Number(data.montoDetraccionIngresado),
            monedaId: Number(data.monedaPagoId),
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteOrigenId: cuentaOrigenAutodet,  // ✅ Cuenta empresa (origen)
            cuentaCorrienteDestinoId: cuentaBN,             // ✅ Banco Nación (destino)
            fechaOperacionMovCaja: new Date(data.fechaPago),
            descripcion: `Autodetracción - ${glosa}`,
            numeroOperacionPagoBancoImpuesto: data.numeroConstanciaDetraccion || data.numeroOperacionBN || null,
            fechaOperacionPagoBancoImpuesto: data.fechaPago ? new Date(data.fechaPago) : null,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            esGerencial: cuentaPorCobrar.esGerencial || false,
            tipoCambio: Number(data.tipoCambio),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: 116,
            origenMotivoOperacionId: pagoCuentaPorCobrar.id,
            cuentaPorCobrarId: cuentaPorCobrar.id,
            detraccionId: detraccionActualizada.id
          }
        });

        // Actualizar saldo cuenta ORIGEN (EGRESO)
        if (cuentaOrigenAutodet) {
          const ultimoSaldoOrigen = await tx.saldoCuentaCorriente.findFirst({
            where: { cuentaCorrienteId: cuentaOrigenAutodet },
            orderBy: { fecha: 'desc' }
          });

          const saldoAnteriorOrigen = ultimoSaldoOrigen ? Number(ultimoSaldoOrigen.saldoActual) : 0;
          const montoEgreso = Number(data.montoDetraccionIngresado);
          const nuevoSaldoOrigen = saldoAnteriorOrigen - montoEgreso;

          await tx.saldoCuentaCorriente.create({
            data: {
              cuentaCorrienteId: cuentaOrigenAutodet,
              empresaId: Number(data.empresaId),
              fecha: pagoCuentaPorCobrar.fechaContable,
              saldoAnterior: saldoAnteriorOrigen,
              ingresos: 0,
              egresos: montoEgreso,
              saldoActual: nuevoSaldoOrigen,
              movimientoCajaId: movimientoAutodetraccion.id,
              centroCostoId: null,
              conciliado: false
            }
          });
        }

        // Actualizar saldo cuenta DESTINO (INGRESO BN)
        if (cuentaBN) {
          const ultimoSaldoDestino = await tx.saldoCuentaCorriente.findFirst({
            where: { cuentaCorrienteId: cuentaBN },
            orderBy: { fecha: 'desc' }
          });

          const saldoAnteriorDestino = ultimoSaldoDestino ? Number(ultimoSaldoDestino.saldoActual) : 0;
          const montoIngreso = Number(data.montoDetraccionIngresado);
          const nuevoSaldoDestino = saldoAnteriorDestino + montoIngreso;

          await tx.saldoCuentaCorriente.create({
            data: {
              cuentaCorrienteId: cuentaBN,
              empresaId: Number(data.empresaId),
              fecha: pagoCuentaPorCobrar.fechaContable,
              saldoAnterior: saldoAnteriorDestino,
              ingresos: montoIngreso,
              egresos: 0,
              saldoActual: nuevoSaldoDestino,
              movimientoCajaId: movimientoAutodetraccion.id,
              centroCostoId: null,
              conciliado: false
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 6: CREAR DETRACCIÓN (si aplica) - LEGACY - DESHABILITADO
      // ════════════════════════════════════════════════════════════
      // NOTA: Este código legacy ya no se usa porque las detracciones
      // se generan automáticamente al crear la PreFactura/CxC.
      // El PASO 5.0 actualiza la detracción existente en lugar de crear una nueva.
      // Código legacy comentado - no crear nuevas detracciones aquí

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
          detraccionId: detraccionActualizada ? detraccionActualizada.id : null
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
      // PASO 10: GENERAR ASIENTOS CONTABLES PARA TODOS LOS MOVIMIENTOS
      // ════════════════════════════════════════════════════════════
      
      const movimientosParaAsientos = [
        movimientoIngreso,
        movimientoITF,
        movimientoComision,
        movimientoDetraccionIngreso,
        movimientoAutodetraccion
      ].filter(m => m !== null && Number(m.monto) > 0);



      let asientosGenerados = [];
      if (movimientosParaAsientos.length > 0) {
        try {
          asientosGenerados = await generarAsientosContablesPagoCxC(
            pagoCuentaPorCobrar,
            movimientosParaAsientos,
            periodoContable,
            data.empresaId,
            data.creadoPor,
            tx
          );
 
          
        } catch (error) {
          console.error('\n❌ ════════════════════════════════════════════════════════');
          console.error('❌ ERROR GENERANDO ASIENTOS CONTABLES');
          console.error('❌ ════════════════════════════════════════════════════════');
          console.error('Error:', error.message);
          console.error('Stack:', error.stack);
          // No fallar la transacción por error en asientos
        }
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
                movimientoComision?.id,
                movimientoDetraccionIngreso?.id,
                movimientoAutodetraccion?.id
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
          else if (movimientoDetraccionIngreso && saldo.movimientoCajaId === movimientoDetraccionIngreso.id) tipo = 'Detracción Ingreso';
          else if (movimientoAutodetraccion && saldo.movimientoCajaId === movimientoAutodetraccion.id) tipo = 'Autodetracción';

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
          comision: movimientoComision,
          detraccionIngreso: movimientoDetraccionIngreso,
          autodetraccion: movimientoAutodetraccion  // ✅ NUEVO: 1 solo movimiento
        },
        conceptosSunat: {
          detraccion: detraccionActualizada, // ← Usar la detracción actualizada en lugar de la legacy
          retencion: retencion,
          percepcion: percepcion
        },
        asientosContables: asientosGenerados || [],
        saldosCuentaCorriente: saldosCuentaCorriente,  // ← AGREGADO
        resumen: {
          montoBruto: Number(data.montoPagado),
          itf: movimientoITF ? Number(data.montoITF) : 0,
          comision: movimientoComision ? Number(data.montoComision) : 0,
          montoNetoCaja: Number(data.montoPagado) -
            (movimientoITF ? Number(data.montoITF) : 0) -
            (movimientoComision ? Number(data.montoComision) : 0),
          detraccion: data.montoDetraccionIngresado ? Number(data.montoDetraccionIngresado) : 0,
          deudaCancelada: Number(data.montoAplicadoDeuda),
          saldoPendiente: saldoPendiente
        }
      };
    });

    // ════════════════════════════════════════════════════════════
    // RECARGAR MOVIMIENTOS CON RELACIONES COMPLETAS
    // (Después de la transacción para evitar problemas de aislamiento)
    // ════════════════════════════════════════════════════════════
    const includeMovimiento = {
      tipoMovimiento: true,
      moneda: true,
      medioPago: true,
      estadoMovimientoCaja: true,
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
    };

    // Recargar movimientos con relaciones


    if (resultado.movimientos.ingreso) {
      const movimientoRecargado = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.ingreso.id },
        include: includeMovimiento
      });
 
      resultado.movimientos.ingreso = movimientoRecargado;

    }

    if (resultado.movimientos.itf) {
      resultado.movimientos.itf = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.itf.id },
        include: includeMovimiento
      });
    }

    if (resultado.movimientos.comision) {
      resultado.movimientos.comision = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.comision.id },
        include: includeMovimiento
      });
    }

    if (resultado.movimientos.detraccionIngreso) {
      resultado.movimientos.detraccionIngreso = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.detraccionIngreso.id },
        include: includeMovimiento
      });
    }

    if (resultado.movimientos.autodetraccion) {
      resultado.movimientos.autodetraccion = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.autodetraccion.id },
        include: includeMovimiento
      });
      
    }

    // ════════════════════════════════════════════════════════════
    // RESUMEN FINAL DEL PROCESO
    // ════════════════════════════════════════════════════════════
     
    return resultado;

  } catch (err) {
    // console.error('❌ Error en procesarPagoEspecializado:', err);

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
        estado: true,
        cuentaCorrienteOrigen: {  // ✅ AGREGADO para ITF, Comisión, Autodetracción Salida
          include: {
            banco: true,
            moneda: true
          }
        },
        cuentaCorrienteDestino: {  // ✅ AGREGADO para Ingreso, Autodetracción Ingreso
          include: {
            banco: true,
            moneda: true
          }
        }
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
    // console.error('Error al actualizar URL voucher consolidado:', error);
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
    // console.error('Error al actualizar URL voucher individual:', error);
    throw new DatabaseError('Error al actualizar URL del voucher individual');
  }
};

/**
 * Actualizar URL del voucher consolidado en PagoCuentaPorCobrar
 */
const actualizarUrlVoucherConsolidadoPago = async (pagoId, urlPdf) => {
  try {
    await prisma.pagoCuentaPorCobrar.update({
      where: { id: Number(pagoId) },
      data: { urlVoucherOperacionConsolidado: urlPdf }
    });
    return { success: true };
  } catch (error) {
    // console.error('Error al actualizar URL voucher consolidado en pago:', error);
    throw new DatabaseError('Error al actualizar URL del voucher consolidado en el pago');
  }
};

/**
 * Actualizar URL del voucher contable en MovimientoCaja
 */
const actualizarUrlVoucherContable = async (movimientoId, urlPdf) => {
  try {
    await prisma.movimientoCaja.update({
      where: { id: Number(movimientoId) },
      data: { urlDocumentoMovCaja: urlPdf }
    });
    return { success: true };
  } catch (error) {
    // console.error('Error al actualizar URL voucher contable:', error);
    throw new DatabaseError('Error al actualizar URL del voucher contable');
  }
};

/**
 * Actualizar URL del comprobante de impuesto en PagoCuentaPorCobrar
 */
const actualizarUrlComprobanteImpuesto = async (pagoId, urlPdf) => {
  try {
    await prisma.pagoCuentaPorCobrar.update({
      where: { id: Number(pagoId) },
      data: { urlPagoImpuesto: urlPdf }
    });
    return { success: true };
  } catch (error) {
    // console.error('Error al actualizar URL comprobante impuesto:', error);
    throw new DatabaseError('Error al actualizar URL del comprobante de impuesto');
  }
};

export default {
  procesarPagoEspecializado,
  obtenerDetallePago,
  obtenerPagosPorCorrelativo,
  listarPagosEspecializados,
  obtenerResumenOperacion,
  actualizarUrlVoucherConsolidado,
  actualizarUrlVoucherIndividual,
  actualizarUrlVoucherConsolidadoPago,
  actualizarUrlComprobanteImpuesto,
  actualizarUrlVoucherContable
};