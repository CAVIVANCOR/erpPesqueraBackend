import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import correlativoService from '../Tesoreria/correlativoOperacionCaja.service.js';
import asientoContableService from '../Contabilidad/asientoContable.service.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';
import { TIPO_LIBRO } from '../../utils/tiposLibroContable.js';
import { ESTADO_ASIENTO_CONTABLE } from '../../utils/estados.constants.js';
import { generarVoucherContableMovimientoCaja } from '../FlujoCaja/voucherContableMovimientoCaja.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ════════════════════════════════════════════════════════════
 * SERVICIO PROFESIONAL: PAGO ESPECIALIZADO CUENTA POR PAGAR
 * ════════════════════════════════════════════════════════════
 * 
 * Procesa pagos a proveedores con operación especializada:
 * - Genera correlativo único de operación
 * - Crea múltiples MovimientoCaja (Egreso, ITF, Comisión)
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

const ESTADOS_CXP = {
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
  DETRACCION_EGRESO: 165,     // ✅ SUNAT (para Detracción, Retención, Percepción - EGRESO)
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
  PAGOS_CXP: 117,           // Pagos de Cuentas por Pagar
  MOVIMIENTOS_CAJA: 135     // Tesorería Pendientes
};

// ════════════════════════════════════════════════════════════
// CONSTANTES CONTABLES - CÓDIGOS DE CUENTAS
// ════════════════════════════════════════════════════════════

const CODIGOS_CUENTAS_CONTABLES = {
  FACTURAS_POR_PAGAR_SOLES: '421201',      // ✅ FACTURAS EMITIDAS POR PAGAR M.N. TERCEROS
  FACTURAS_POR_PAGAR_DOLARES: '421202',    // ✅ FACTURAS EMITIDAS POR PAGAR M.E. TERCEROS
  BN_DETRACCION: '107111',                 // ✅ CUENTA DETRACCION DL 940 (Banco de la Nación)
  HONORARIOS_POR_PAGAR_SOLES: '424101',    // ✅ HONORARIOS POR PAGAR MN
  HONORARIOS_POR_PAGAR_DOLARES: '424102',  // ✅ HONORARIOS POR PAGAR ME
  GASTOS_SUMINISTROS: '656101',            // ✅ SUMINISTROS (cuenta por defecto para gastos sin factura)
  ITF: '641101',                           // ✅ ITF
  COMISIONES_BANCARIAS: '679401'           // ✅ COMISIONES BANCARIAS
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
    'cuentaPorPagarId',
    'empresaId',
    'fechaPago',
    'montoPagado',
    'monedaPagoId',
    'tipoCambio',
    'montoAplicadoDeuda',
    'monedaDeudaId',
    'medioPagoId',
    'tipoMovimientoEgresoId',
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
  const cuentaPorPagar = await db.cuentaPorPagar.findUnique({
    where: { id: Number(data.cuentaPorPagarId) },
    include: {
      proveedor: {
        include: {
          tipoDocumento: true  // ⭐ Para glosa
        }
      },
      empresa: true,
      moneda: true,
      estado: true,
      ordenCompra: {
        include: {
          tipoDocumento: true
        }
      }
    }
  });

  if (!cuentaPorPagar) {
    throw new NotFoundError('Cuenta por cobrar no encontrada.');
  }

  // Validar que no esté anulada o canjeada
  if (cuentaPorPagar.estadoId === ESTADOS_CXP.ANULADO) {
    throw new ValidationError('No se puede pagar una cuenta por cobrar anulada.');
  }

  if (cuentaPorPagar.estadoId === ESTADOS_CXP.CANJEADO) {
    throw new ValidationError('No se puede pagar una cuenta por cobrar canjeada.');
  }

  // Validar que no esté completamente pagada
  if (Number(cuentaPorPagar.saldoPendiente) <= 0) {
    throw new ValidationError('La cuenta por cobrar ya está completamente pagada.');
  }

  // Advertencia de sobrepago (no bloquea la operación)
  if (Number(data.montoAplicadoDeuda) > Number(cuentaPorPagar.saldoPendiente)) {
    console.warn(
      `⚠️ SOBREPAGO DETECTADO: Monto aplicado (${data.montoAplicadoDeuda}) > Saldo pendiente (${cuentaPorPagar.saldoPendiente})`
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

  return cuentaPorPagar;
}

/**
 * Generar glosa completa para movimientos y asientos de CxP
 */
function generarGlosaPagoCxP(cuentaPorPagar, data, monedaPago) {
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

  const numeroPreFactura = cuentaPorPagar.numeroPreFactura || '';
  const fechaEmision = formatearFecha(cuentaPorPagar.fechaEmision);
  const tipoDoc = cuentaPorPagar.proveedor?.tipoDocumento?.codigo || '';
  const numDoc = cuentaPorPagar.proveedor?.numeroDocumento || '';
  const razonSocial = cuentaPorPagar.proveedor?.razonSocial || '';
  const simboloMoneda = monedaPago.simbolo || '';
  
  // Monto a mostrar en glosa: solo el monto neto pagado (no incluye detracción)
  const montoPagado = formatearMonto(data.montoPagado);
  
  const fechaPago = formatearFecha(data.fechaPago);
  const tipoCambio = formatearTipoCambio(data.tipoCambio);

  return `Pago CxP de Dcmto: ${numeroPreFactura} ${fechaEmision} Proveedor: ${tipoDoc} ${numDoc} ${razonSocial} Monto Neto: ${simboloMoneda} ${montoPagado} ${fechaPago} T/C: ${tipoCambio}`;
}

// ════════════════════════════════════════════════════════════
// GENERACIÓN DE GLOSAS PROFESIONALES PARA ASIENTOS CONTABLES
// ════════════════════════════════════════════════════════════

/**
 * Genera glosa profesional para asientos contables siguiendo el estándar:
 * Línea 1: TIPO - PAGO CXP - FAC E001-2258 del 01/09/2026
 * Línea 2: Proveedor: RUC 20517650871 - EXACTA OPERADOR LOGISTICO S.A.C.
 * Línea 3: Pago: 17/09/2026 | S/ 3,894.00 | T/C: 3.3610 | BCP 310-9846998-0-36 | Op: 001234567
 * Línea 4: Detalle: (1) PRODUCTO 10.00 TN x S/ 350.00 = S/ 3,500.00; (2) SERVICIO...
 * 
 * @param {Object} params - Parámetros para generar la glosa
 * @param {string} params.tipoOperacion - Tipo: 'PAGO CXP', 'AUTODETRACCIÓN', 'ITF', 'COMISIÓN BANCARIA', 'DETRACCIÓN CLIENTE'
 * @param {Object} params.cuentaPorPagar - Cuenta por pagar con relaciones (proveedor, ordenCompra)
 * @param {Object} params.movimiento - Movimiento de caja con relaciones (cuentaCorriente, moneda)
 * @param {string} params.fechaPago - Fecha del pago (formato Date o string)
 * @param {number} params.tipoCambio - Tipo de cambio
 * @param {Array} params.detallesOrdenCompra - Array de detalles de la orden de compra (opcional)
 * @param {string} params.detalleConcepto - Descripción del concepto (para ITF/Comisión)
 * @returns {string} Glosa formateada profesionalmente
 */
function generarGlosaAsientoContable({
  tipoOperacion,
  cuentaPorPagar,
  movimiento,
  fechaPago,
  tipoCambio,
  detallesOrdenCompra = [],
  detalleConcepto = null
}) {
  
  // ========================================
  // HELPERS DE FORMATO
  // ========================================
  
  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  };

  const formatearMonto = (monto) => {
    return Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatearTipoCambio = (tc) => {
    return Number(tc).toFixed(4);
  };

  const abreviarRazonSocial = (razonSocial) => {
    if (!razonSocial) return '';
    return razonSocial
      .replace(/SOCIEDAD ANONIMA CERRADA/gi, 'S.A.C.')
      .replace(/SOCIEDAD ANONIMA/gi, 'S.A.')
      .replace(/EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA/gi, 'E.I.R.L.')
      .replace(/SOCIEDAD COMERCIAL DE RESPONSABILIDAD LIMITADA/gi, 'S.R.L.')
      .trim();
  };

  // ========================================
  // LÍNEA 1: ENCABEZADO
  // ========================================
  
  const numeroDocumento = cuentaPorPagar.ordenCompra?.numeroDocumento || 
                          cuentaPorPagar.numeroDocumento || 
                          'S/N';
  const fechaEmisionDoc = formatearFecha(cuentaPorPagar.ordenCompra?.fechaEmision || 
                                         cuentaPorPagar.fechaEmision);
  
  const linea1 = `${tipoOperacion} - PAGO CXP - FAC ${numeroDocumento} del ${fechaEmisionDoc}`;

  // ========================================
  // LÍNEA 2: CLIENTE
  // ========================================
  
  const tipoDocProveedor = cuentaPorPagar.proveedor?.tipoDocumento?.codigo || 'RUC';
  const numDocProveedor = cuentaPorPagar.proveedor?.numeroDocumento || '';
  const razonSocialCompleta = cuentaPorPagar.proveedor?.razonSocial || '';
  const razonSocialAbreviada = abreviarRazonSocial(razonSocialCompleta);
  
  const linea2 = `Proveedor: ${tipoDocProveedor} ${numDocProveedor} - ${razonSocialAbreviada}`;

  // ========================================
  // LÍNEA 3: DATOS FINANCIEROS Y BANCARIOS
  // ========================================
  
  const fechaPagoFormateada = formatearFecha(fechaPago);
  const simboloMoneda = movimiento.moneda?.simbolo || 'S/';
  const montoFormateado = formatearMonto(movimiento.monto);
  const tcFormateado = formatearTipoCambio(tipoCambio);
  
  // Datos bancarios del movimiento
  let infoBancaria = '';
  
  // Para movimientos con cuenta destino (egresos)
  if (movimiento.cuentaCorrienteDestino) {
    const banco = movimiento.cuentaCorrienteDestino.banco?.nombre || 'BANCO';
    const numeroCuenta = movimiento.cuentaCorrienteDestino.numeroCuenta || '';
    infoBancaria = `${banco} ${numeroCuenta}`;
  }
  // Para movimientos con cuenta origen (egresos como autodetracción)
  else if (movimiento.cuentaCorrienteOrigen) {
    const banco = movimiento.cuentaCorrienteOrigen.banco?.nombre || 'BANCO';
    const numeroCuenta = movimiento.cuentaCorrienteOrigen.numeroCuenta || '';
    infoBancaria = `${banco} ${numeroCuenta}`;
  }
  
  const numeroOperacion = movimiento.numeroOperacion || 'S/N';
  
  const linea3 = `Pago: ${fechaPagoFormateada} | ${simboloMoneda} ${montoFormateado} | T/C: ${tcFormateado} | ${infoBancaria} | Op: ${numeroOperacion}`;

  // ========================================
  // LÍNEA 4: DETALLE
  // ========================================
  
  let linea4 = '';
  
  if (detalleConcepto) {
    // Para ITF, Comisión, etc. - usar descripción del concepto
    linea4 = `Detalle: ${detalleConcepto}`;
  } else if (detallesOrdenCompra && detallesOrdenCompra.length > 0) {
    // Para pagos normales - mostrar productos/servicios
    const itemsDetalle = detallesOrdenCompra.map((detalle, index) => {
      const numero = index + 1;
      const descripcion = detalle.descripcion || detalle.producto?.descripcionArmada || 'PRODUCTO/SERVICIO';
      const cantidad = formatearMonto(detalle.cantidad || 0);
      const unidad = detalle.unidadMedida?.simbolo || detalle.producto?.unidadMedida?.simbolo || '';
      const precioUnitario = formatearMonto(detalle.precioUnitario || 0);
      const subtotal = formatearMonto(detalle.subtotal || (detalle.cantidad * detalle.precioUnitario) || 0);
      
      return `(${numero}) ${descripcion} ${cantidad} ${unidad} x ${simboloMoneda} ${precioUnitario} = ${simboloMoneda} ${subtotal}`.trim();
    });
    
    linea4 = `Detalle: ${itemsDetalle.join('; ')}`;
  } else {
    // Sin detalle disponible
    linea4 = `Detalle: Pago de factura ${numeroDocumento}`;
  }

  // ========================================
  // GLOSA COMPLETA
  // ========================================
  
  return `${linea1}\n${linea2}\n${linea3}\n${linea4}`;
}


// ════════════════════════════════════════════════════════════
// GENERACIÓN DE ASIENTOS CONTABLES PARA MOVIMIENTOS DE CAJA
// ════════════════════════════════════════════════════════════

/**
 * Función helper privada: Genera un asiento contable para UN movimiento de caja específico
 * 
 * ⚠️ FUNCIÓN CRÍTICA: Esta es la ÚNICA VERDAD para generar asientos de MovimientoCaja (CxP)
 * 
 * @param {Object} params - Parámetros necesarios
 * @param {Object} params.movimiento - MovimientoCaja básico (solo id y monto)
 * @param {Object} params.pagoCuentaPorPagar - Pago relacionado
 * @param {Object} params.cuentaCxPSoles - Cuenta contable CxP Soles (421201)
 * @param {Object} params.cuentaCxPDolares - Cuenta contable CxP Dólares (421202)
 * @param {Object} params.cuentaBNDetraccion - Cuenta contable BN Detracción (104201)
 * @param {Object} params.submodulo - Submódulo del sistema
 * @param {Object} params.estadoPendiente - Estado pendiente
 * @param {Object} params.periodoContable - Período contable
 * @param {Number} params.empresaId - ID de la empresa
 * @param {Number} params.creadoPor - ID del usuario
 * @param {Array} params.detallesOrdenCompra - Detalles de la orden de compra para glosa
 * @param {Object} params.tx - Transacción Prisma
 * @returns {Promise<Object|null>} - Asiento creado o null si se omite
 */
async function generarAsientoParaMovimiento({
  movimiento,
  pagoCuentaPorPagar,
  cuentaCxPSoles,
  cuentaCxPDolares,
  cuentaBNDetraccion,
  submodulo,
  estadoPendiente,
  periodoContable,
  empresaId,
  creadoPor,
  detallesOrdenCompra,
  tx
}) {
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║ ASIENTO CONTABLE - MOVIMIENTO #${movimiento.id}`.padEnd(61) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Validación inicial
  if (!movimiento || Number(movimiento.monto) <= 0) {
    console.log(`⏭️  OMITIDO: Monto <= 0 (${movimiento?.monto || 'N/A'})\n`);
    return null;
  }

  // ========================================
  // 1. CARGAR MOVIMIENTO CON RELACIONES
  // ========================================
  
  const movimientoCompleto = await tx.movimientoCaja.findUnique({
    where: { id: movimiento.id },
    include: {
      cuentaCorrienteOrigen: {
        include: { 
          cuentaContable: true,
          banco: true
        }
      },
      cuentaCorrienteDestino: {
        include: { 
          cuentaContable: true,
          banco: true
        }
      },
      moneda: true,
      tipoMovimiento: true,
      cuentaPorPagar: {
        include: {
          proveedor: {
            include: {
              tipoDocumento: true
            }
          },
          moneda: true,
          ordenCompra: {
            include: {
              tipoDocumento: true
            }
          }
        }
      }
    }
  });

  if (!movimientoCompleto) {
    console.error(`❌ ERROR: Movimiento no encontrado en BD\n`);
    return null;
  }

  console.log(`📊 Datos básicos:`);
  console.log(`   Tipo Mov: ${movimientoCompleto.tipoMovimientoId} | Monto: ${movimientoCompleto.monto} | Moneda: ${movimientoCompleto.monedaId}`);
  console.log(`   Cta Origen: ${movimientoCompleto.cuentaCorrienteOrigenId || 'N/A'} | Cta Destino: ${movimientoCompleto.cuentaCorrienteDestinoId || 'N/A'}`);

  // ========================================
  // 2. EXTRAER DATOS DEL DOCUMENTO ORIGEN
  // ========================================
  
  const cuentaPorPagar = movimientoCompleto.cuentaPorPagar;
  const ordenCompra = cuentaPorPagar?.ordenCompra;
  const proveedorId = cuentaPorPagar?.proveedorId || movimientoCompleto.entidadComercialId;
  const tipoDocumentoOrigenId = ordenCompra?.tipoDocumentoId || null;
  const numeroDocumentoOrigen = ordenCompra?.numeroDocumento || null;
  const fechaDocumentoOrigen = ordenCompra?.fechaEmision || null;
  const fechaVenceDocumentoOrigen = ordenCompra?.fechaVencimiento || null;
  
  const esGerencial = cuentaPorPagar?.esGerencial || false;
  const tipoLibro = esGerencial ? "GERENCIAL" : "FISCAL";

  // ========================================
  // 3. DETERMINAR TIPO DE ASIENTO
  // ========================================
  
  const esEgreso = movimientoCompleto.cuentaCorrienteDestinoId && !movimientoCompleto.cuentaCorrienteOrigenId;
  const esDetraccion = Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.DETRACCION_EGRESO;
  
  // ✅ PROFESIONAL: Diferenciar ITF y Comisión por descripción (mismo tipoMovimientoId: 163)
  // Autodetracción Egreso ahora usa tipo 165 (SUNAT) igual que Autodetracción Egreso
  const tipoMovimientoEsITFoComision = Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.ITF;
  const descripcionUpper = movimientoCompleto.descripcion ? movimientoCompleto.descripcion.toUpperCase() : '';
  const esITF = tipoMovimientoEsITFoComision && descripcionUpper.startsWith('ITF');
  const esComision = tipoMovimientoEsITFoComision && 
                     (descripcionUpper.startsWith('COMISION') || descripcionUpper.startsWith('COMISIÓN'));
  const esAutodetraccionEgreso = Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.DETRACCION_SALIDA && 
                                  descripcionUpper.startsWith('AUTODETRACCIÓN EGRESO');
  
  // ✅ NUEVO: Detectar HONORARIOS por tipoDocumentoFinalId = 3 (Recibo por Honorarios)
  const tipoDocumentoFinalId = ordenCompra?.tipoDocumentoFinalId || null;
  const esHonorarios = tipoDocumentoFinalId ? Number(tipoDocumentoFinalId) === 3 : false; // ID 3 = RECIBO POR HONORARIOS
  
  // ✅ NUEVO: Detectar GASTOS SIN FACTURA por CuentaPorPagar.esGerencial = true (Compra Negra/Gerencial/No SUNAT)
  const esGerencialCxP = Boolean(cuentaPorPagar?.esGerencial);
  const esGastoSinFactura = esGerencialCxP && esEgreso && !esDetraccion && !esHonorarios;
  
  const tipoAsiento = esHonorarios ? 'HONORARIOS' :
                      esGastoSinFactura ? 'GASTO SIN FACTURA' :
                      esDetraccion ? 'DETRACCIÓN' :
                      esAutodetraccionEgreso ? 'AUTODETRACCIÓN EGRESO' :
                      esITF ? 'ITF' :
                      esComision ? 'COMISIÓN' :
                      esEgreso ? 'PAGO FACTURA' : 'OTRO';
  
  console.log(`\n🎯 Tipo de asiento: ${tipoAsiento}`);

  // ========================================
  // 4. DETERMINAR CUENTAS CONTABLES
  // ========================================
  
  console.log(`\n📖 Referencia: asientos-contables-referencia.json`);
  console.log(`   Grupo: ${tipoAsiento}`);
  console.log(`   Moneda Factura: ${cuentaPorPagar?.monedaId === 1 ? 'PEN' : cuentaPorPagar?.monedaId === 2 ? 'USD' : 'N/A'}`);
  console.log(`   Moneda Pago: ${movimientoCompleto.monedaId === 1 ? 'PEN' : 'USD'}`);
  
  let cuentaDebe, cuentaHaber;
  let cuentasDebeMultiples = null; // Para gastos sin factura (múltiples líneas DEBE)

  // ✅ CRÍTICO: Evaluar casos ESPECÍFICOS primero, luego el genérico
  if (esHonorarios && esEgreso) {
    if (!movimientoCompleto.cuentaCorrienteDestino?.cuentaContable) {
      console.error(`❌ ERROR: Cuenta destino sin cuenta contable\n`);
      return null;
    }
    
    const monedaFactura = movimientoCompleto.cuentaPorPagar?.monedaId || movimientoCompleto.monedaId;
    const codigoCuentaHonorarios = Number(monedaFactura) === 1 
      ? CODIGOS_CUENTAS_CONTABLES.HONORARIOS_POR_PAGAR_SOLES 
      : CODIGOS_CUENTAS_CONTABLES.HONORARIOS_POR_PAGAR_DOLARES;
    
    const cuentaHonorarios = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: codigoCuentaHonorarios }
    });
    
    if (!cuentaHonorarios) {
      console.error(`❌ ERROR: Cuenta ${codigoCuentaHonorarios} no encontrada\n`);
      return null;
    }
    
    cuentaDebe = cuentaHonorarios.id;
    cuentaHaber = movimientoCompleto.cuentaCorrienteDestino.cuentaContable.id;

  } else if (esGastoSinFactura && esEgreso) {
    // ═══════════════════════════════════════════════════════════
    // GASTOS SIN FACTURA: Compra Negra/Gerencial
    // Asiento con MÚLTIPLES DEBE (uno por cada cuenta diferente)
    // ═══════════════════════════════════════════════════════════
    console.log(`\n   🛒 Procesando GASTO SIN FACTURA (Compra Negra)`);
    
    if (!movimientoCompleto.cuentaCorrienteDestino?.cuentaContable) {
      console.error(`   ❌ ERROR: La cuenta destino no tiene cuenta contable asociada`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    // ✅ HABER: Banco destino (una sola línea)
    cuentaHaber = movimientoCompleto.cuentaCorrienteDestino.cuentaContable.id;
    
    // ✅ DEBE: Múltiples cuentas de gasto (agrupar por cuenta)
    if (!ordenCompra?.id) {
      console.error(`   ❌ ERROR: No hay orden de compra asociada`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    // Cargar TODOS los detalles de la orden de compra
    const detalles = await tx.detalleOrdenCompra.findMany({
      where: { ordenCompraId: ordenCompra.id },
      include: {
        producto: true
      },
      orderBy: { id: 'asc' }
    });
    
    if (!detalles || detalles.length === 0) {
      console.error(`   ❌ ERROR: No hay detalles en la orden de compra`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    console.log(`      📦 Total detalles encontrados: ${detalles.length}`);
    
    // Agrupar por cuenta contable y sumar montos
    const cuentasAgrupadas = new Map();
    
    for (const detalle of detalles) {
      let cuentaId = null;
      let origen = '';
      
      // Prioridad 1: DetalleOrdenCompra.cuentaContableId
      if (detalle.cuentaContableId) {
        cuentaId = detalle.cuentaContableId;
        origen = 'DetalleOC';
      }
      // Prioridad 2: Producto.cuentaComprasId
      else if (detalle.producto?.cuentaComprasId) {
        cuentaId = detalle.producto.cuentaComprasId;
        origen = 'Producto.cuentaComprasId';
      }
      // Prioridad 3: Cuenta por defecto (656101)
      else {
        const cuentaDefecto = await tx.planCuentasContable.findFirst({
          where: { codigoCuenta: CODIGOS_CUENTAS_CONTABLES.GASTOS_SUMINISTROS }
        });
        if (cuentaDefecto) {
          cuentaId = cuentaDefecto.id;
          origen = 'Defecto (656101)';
        }
      }
      
      if (cuentaId) {
        const monto = Number(detalle.subtotal || 0);
        const cuentaKey = String(cuentaId); // Convertir BigInt a String para usar como clave
        
        if (cuentasAgrupadas.has(cuentaKey)) {
          cuentasAgrupadas.get(cuentaKey).monto += monto;
        } else {
          cuentasAgrupadas.set(cuentaKey, { cuentaId, monto, origen });
        }
      }
    }
    
    // Convertir a array para usar en la creación del asiento
    cuentasDebeMultiples = Array.from(cuentasAgrupadas.values());
    
    console.log(`      ✅ Cuentas agrupadas: ${cuentasDebeMultiples.length}`);
    cuentasDebeMultiples.forEach((cuenta, index) => {
      console.log(`         ${index + 1}. Cuenta ID: ${cuenta.cuentaId}, Monto: S/ ${cuenta.monto.toFixed(2)}, Origen: ${cuenta.origen}`);
    });
    console.log(`      ✅ HABER: Banco (${movimientoCompleto.cuentaCorrienteDestino.banco?.nombre || 'N/A'})`);

  } else if (esEgreso && !esDetraccion) {
    // ═══════════════════════════════════════════════════════════
    // EGRESO NORMAL: Pago de factura estándar
    // Este es el caso GENÉRICO que se aplica cuando NO es:
    // - Honorarios
    // - Gasto sin factura
    // - Detracción
    // - ITF
    // - Comisión
    // ═══════════════════════════════════════════════════════════
    console.log(`\n   💰 Procesando EGRESO NORMAL (Pago de factura)`);
    
    if (!movimientoCompleto.cuentaCorrienteDestino) {
      console.error(`   ❌ ERROR: No hay cuenta destino en el movimiento`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    if (!movimientoCompleto.cuentaCorrienteDestino.cuentaContable) {
      console.error(`   ❌ ERROR: La cuenta destino no tiene cuenta contable asociada`);
      console.error(`      Cuenta Destino ID: ${movimientoCompleto.cuentaCorrienteDestinoId}`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    // ✅ CRÍTICO: Usar la moneda de la FACTURA, NO del movimiento
    const monedaFactura = movimientoCompleto.cuentaPorPagar?.monedaId || movimientoCompleto.monedaId;
    
    // ✅ DEBE: Cuenta por Pagar (disminuye pasivo)
    cuentaDebe = Number(monedaFactura) === 1 
      ? cuentaCxPSoles.id 
      : cuentaCxPDolares.id;
    
    // ✅ HABER: Banco destino (disminuye activo)
    cuentaHaber = movimientoCompleto.cuentaCorrienteDestino.cuentaContable.id;
    
    console.log(`      ✅ Cuenta DEBE: ${cuentaDebe} (CxP ${Number(monedaFactura) === 1 ? 'Soles' : 'Dólares'})`);
    console.log(`      ✅ Cuenta HABER: ${cuentaHaber} (Banco)`);
    console.log(`      🔍 Moneda Factura: ${monedaFactura}, Moneda Movimiento: ${movimientoCompleto.monedaId}`);

  } else if (esAutodetraccionEgreso) {
    // Autodetracción EGRESO - Transferencia desde cuenta empresa a BN
    console.log(`\n   📤 Procesando AUTODETRACCIÓN EGRESO (Transferencia)`);
    
    if (!movimientoCompleto.cuentaCorrienteOrigen) {
      console.error(`   ❌ ERROR: No hay cuenta origen en el movimiento`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    if (!movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {
      console.error(`   ❌ ERROR: La cuenta origen no tiene cuenta contable asociada`);
      console.error(`      Cuenta Origen ID: ${movimientoCompleto.cuentaCorrienteOrigenId}`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    cuentaDebe = cuentaBNDetraccion.id;
    cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;
    
    console.log(`      ✅ Cuenta DEBE: ${cuentaDebe} (BN Detracción)`);
    console.log(`      ✅ Cuenta HABER: ${cuentaHaber} (Banco Empresa)`);

  } else if (esDetraccion) {
    console.log(`\n   🏦 Procesando DETRACCIÓN EGRESO`);
    
    if (movimientoCompleto.cuentaCorrienteOrigenId) {
      // Este caso ya no debería ocurrir porque ahora usamos 2 movimientos separados
      console.warn(`   ⚠️ ADVERTENCIA: Detracción con cuenta origen (debería ser autodetracción egreso)`);
      
      if (!movimientoCompleto.cuentaCorrienteOrigen) {
        console.error(`   ❌ ERROR: No hay cuenta origen en el movimiento`);
        console.log(`════════════════════════════════════════════════════════════\n`);
        return null;
      }
      
      if (!movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {
        console.error(`   ❌ ERROR: La cuenta origen no tiene cuenta contable asociada`);
        console.error(`      Cuenta Origen ID: ${movimientoCompleto.cuentaCorrienteOrigenId}`);
        console.log(`════════════════════════════════════════════════════════════\n`);
        return null;
      }
      
      // ✅ DEBE: Banco de la Nación (aumenta activo)
      cuentaDebe = cuentaBNDetraccion.id;
      // ✅ HABER: Banco empresa (disminuye activo)
      cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;
      
      console.log(`      ✅ Cuenta DEBE: ${cuentaDebe} (BN Detracción)`);
      console.log(`      ✅ Cuenta HABER: ${cuentaHaber} (Banco Empresa)`);

    } else {
      // Proveedor paga la detracción
      console.log(`      📥 Tipo: DETRACCIÓN PROVEEDOR (Proveedor paga)`);
      
      // ✅ CRÍTICO: Usar la moneda de la FACTURA, NO del movimiento
      const monedaFactura = movimientoCompleto.cuentaPorPagar?.monedaId || movimientoCompleto.monedaId;
      
      // ✅ DEBE: Cuenta por Pagar (disminuye pasivo)
      cuentaDebe = Number(monedaFactura) === 1 
        ? cuentaCxPSoles.id 
        : cuentaCxPDolares.id;
      
      // ✅ HABER: Banco de la Nación (aumenta activo)
      cuentaHaber = cuentaBNDetraccion.id;
      
      console.log(`      ✅ Cuenta DEBE: ${cuentaDebe} (CxP ${Number(monedaFactura) === 1 ? 'Soles' : 'Dólares'})`);
      console.log(`      ✅ Cuenta HABER: ${cuentaHaber} (BN Detracción)`);
    }
    
  } else if (esITF) {
    // ITF - Es un EGRESO (sale dinero del banco)
    console.log(`\n   💸 Procesando ITF (Egreso bancario)`);
    
    const cuentaGastoITF = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: CODIGOS_CUENTAS_CONTABLES.ITF
      }
    });
    
    if (!cuentaGastoITF) {
      console.error(`   ❌ ERROR: No se encontró la cuenta contable ${CODIGOS_CUENTAS_CONTABLES.ITF} (Gasto ITF)`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    console.log(`      ✅ Cuenta Gasto ITF encontrada: ${cuentaGastoITF.id}`);
    
    if (!cuentaGastoITF.centroCostoId) {
      console.error(`   ❌ ERROR: La cuenta ${CODIGOS_CUENTAS_CONTABLES.ITF} no tiene centro de costo asignado`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    // ✅ ITF es EGRESO: usa cuentaCorrienteOrigen (de donde sale el dinero)
    if (!movimientoCompleto.cuentaCorrienteOrigen || !movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {
      console.error(`   ❌ ERROR: La cuenta origen no tiene cuenta contable asociada`);
      console.error(`      Cuenta Origen ID: ${movimientoCompleto.cuentaCorrienteOrigenId || 'N/A'}`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    cuentaDebe = cuentaGastoITF.id;
    cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;
    
    console.log(`      ✅ Cuenta DEBE: ${cuentaDebe} (Gasto ITF ${CODIGOS_CUENTAS_CONTABLES.ITF})`);
    console.log(`      ✅ Cuenta HABER: ${cuentaHaber} (Banco)`);
    console.log(`      ✅ Centro Costo: ${cuentaGastoITF.centroCostoId}`);
    
  } else if (esComision) {
    // Comisión Bancaria - Es un EGRESO (sale dinero del banco)
    console.log(`\n   💳 Procesando COMISIÓN BANCARIA (Egreso bancario)`);
    
    const cuentaGastoComision = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS
      }
    });
    
    if (!cuentaGastoComision) {
      console.error(`   ❌ ERROR: No se encontró la cuenta contable ${CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS} (Gasto Comisión Bancaria)`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    console.log(`      ✅ Cuenta Gasto Comisión encontrada: ${cuentaGastoComision.id}`);
    
    if (!cuentaGastoComision.centroCostoId) {
      console.error(`   ❌ ERROR: La cuenta ${CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS} no tiene centro de costo asignado`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    // ✅ Comisión es EGRESO: usa cuentaCorrienteOrigen (de donde sale el dinero)
    if (!movimientoCompleto.cuentaCorrienteOrigen || !movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {
      console.error(`   ❌ ERROR: La cuenta origen no tiene cuenta contable asociada`);
      console.error(`      Cuenta Origen ID: ${movimientoCompleto.cuentaCorrienteOrigenId || 'N/A'}`);
      console.log(`════════════════════════════════════════════════════════════\n`);
      return null;
    }
    
    cuentaDebe = cuentaGastoComision.id;
    cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;
    
    console.log(`      ✅ Cuenta DEBE: ${cuentaDebe} (Gasto Comisión ${CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS})`);
    console.log(`      ✅ Cuenta HABER: ${cuentaHaber} (Banco)`);
    console.log(`      ✅ Centro Costo: ${cuentaGastoComision.centroCostoId}`);
    
  } else {
    // Otros movimientos - omitir
    console.error(`   ⏭️ OMITIDO: Tipo de movimiento no soportado`);
    console.error(`      Tipo Movimiento ID: ${movimientoCompleto.tipoMovimientoId}`);
    console.error(`      Descripción: ${movimientoCompleto.descripcion}`);
    console.error(`      Tipo Documento Final ID: ${tipoDocumentoFinalId || 'N/A'}`);
    console.error(`      CuentaPorPagar.esGerencial: ${esGerencialCxP}`);
    console.error(`      Tipos soportados:`);
    console.error(`        - EGRESO (Facturas normales - CuentaPorPagar.esGerencial=false)`);
    console.error(`        - HONORARIOS (OrdenCompra.tipoDocumentoFinalId=3)`);
    console.error(`        - GASTOS SIN FACTURA (CuentaPorPagar.esGerencial=true - Compra Negra)`);
    console.error(`        - DETRACCIÓN (${TIPOS_MOVIMIENTO.DETRACCION_EGRESO})`);
    console.error(`        - ITF (${TIPOS_MOVIMIENTO.ITF})`);
    console.error(`        - COMISIÓN (${TIPOS_MOVIMIENTO.COMISION_BANCARIA})`);
    console.log(`════════════════════════════════════════════════════════════\n`);
    return null;
  }

  // ========================================
  // 5. GENERAR CORRELATIVO Y NÚMERO
  // ========================================
  
  const ultimoAsiento = await tx.asientoContable.findFirst({
    where: {
      empresaId: Number(empresaId),
      periodoContableId: Number(periodoContable.id)
    },
    orderBy: { correlativo: "desc" }
  });

  const nuevoCorrelativo = ultimoAsiento ? ultimoAsiento.correlativo + 1 : 1;
  const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(5, "0")}`;

  // ========================================
  // 6. GENERAR GLOSA PROFESIONAL
  // ========================================
  
  let tipoOperacion = 'PAGO CXP';
  let detalleConcepto = null;
  
  if (esHonorarios) {
    tipoOperacion = 'PAGO HONORARIOS';
    detalleConcepto = 'Pago de Recibo por Honorarios';
  } else if (esGastoSinFactura) {
    tipoOperacion = 'GASTO SIN FACTURA';
    detalleConcepto = 'Compra Negra/Gerencial';
  } else if (esDetraccion) {
    if (movimientoCompleto.cuentaCorrienteOrigenId) {
      tipoOperacion = 'AUTODETRACCIÓN';
    } else {
      tipoOperacion = 'DETRACCIÓN CLIENTE';
    }
  } else if (esITF) {
    tipoOperacion = 'ITF';
    detalleConcepto = 'Impuesto a las Transacciones Financieras';
  } else if (esComision) {
    tipoOperacion = 'COMISIÓN BANCARIA';
    detalleConcepto = 'Comisión por transferencia bancaria';
  }
  
  const glosa = generarGlosaAsientoContable({
    tipoOperacion,
    cuentaPorPagar,
    movimiento: movimientoCompleto,
    fechaPago: pagoCuentaPorPagar.fechaPago,
    tipoCambio: pagoCuentaPorPagar.tipoCambio,
    detallesOrdenCompra: detallesOrdenCompra,
    detalleConcepto
  });

  // ========================================
  // 7. CALCULAR MONTOS
  // ========================================
  
  // ✅ CRÍTICO: Para asientos contables, usar la moneda de la FACTURA, NO del movimiento
  // El movimiento puede estar en PEN pero la factura en USD
  const monedaFactura = movimientoCompleto.cuentaPorPagar?.monedaId || movimientoCompleto.monedaId;
  const tipoCambioAsiento = Number(movimientoCompleto.tipoCambio) || 1;
  
  let montoSoles, montoMonedaExtranjera;
  
  if (Number(monedaFactura) === 1) {
    // Factura en SOLES
    montoSoles = Number(movimientoCompleto.monto);
    montoMonedaExtranjera = null;
  } else {
    // Factura en DÓLARES
    // Si el movimiento está en soles, convertir a dólares
    if (Number(movimientoCompleto.monedaId) === 1) {
      montoSoles = Number(movimientoCompleto.monto);
      montoMonedaExtranjera = montoSoles / tipoCambioAsiento;
    } else {
      // Si el movimiento está en dólares, convertir a soles
      montoMonedaExtranjera = Number(movimientoCompleto.monto);
      montoSoles = montoMonedaExtranjera * tipoCambioAsiento;
    }
  }
  
  console.log(`\n   💰 Cálculo de montos para asiento:`);
  console.log(`      Moneda Factura: ${monedaFactura} (${Number(monedaFactura) === 1 ? 'PEN' : 'USD'})`);
  console.log(`      Moneda Movimiento: ${movimientoCompleto.monedaId} (${Number(movimientoCompleto.monedaId) === 1 ? 'PEN' : 'USD'})`);
  console.log(`      Monto Movimiento: ${movimientoCompleto.monto}`);
  console.log(`      Tipo Cambio: ${tipoCambioAsiento}`);
  console.log(`      Monto Soles (asiento): ${montoSoles}`);
  console.log(`      Monto ME (asiento): ${montoMonedaExtranjera || 'N/A'}`);

  // ========================================
  // 8. VALIDAR FOREIGN KEYS
  // ========================================
  
  const empresaExists = await tx.empresa.findUnique({ where: { id: Number(empresaId) } });
  const periodoExists = await tx.periodoContable.findUnique({ where: { id: Number(periodoContable.id) } });
  const tipoLibroExists = await tx.tipoLibroContableSunat.findUnique({ where: { id: BigInt(TIPO_LIBRO.CAJA_BANCOS) } });
  const estadoExists = await tx.estadoMultiFuncion.findUnique({ where: { id: estadoPendiente.id } });
  const submoduloExists = await tx.submoduloSistema.findUnique({ where: { id: submodulo.id } });
  const monedaExists = await tx.moneda.findUnique({ where: { id: BigInt(1) } });
  const cuentaHaberExists = await tx.planCuentasContable.findUnique({ where: { id: cuentaHaber } });
  const entidadExists = await tx.entidadComercial.findUnique({ where: { id: proveedorId } });
  const tipoDocExists = tipoDocumentoOrigenId ? await tx.tipoDocumento.findUnique({ where: { id: tipoDocumentoOrigenId } }) : null;
  
  // Validar cuenta DEBE solo si no hay múltiples cuentas
  const cuentaDebeExists = cuentasDebeMultiples ? true : await tx.planCuentasContable.findUnique({ where: { id: cuentaDebe } });
  
  const faltantes = [];
  if (!empresaExists) faltantes.push(`empresaId: ${Number(empresaId)}`);
  if (!periodoExists) faltantes.push(`periodoContableId: ${Number(periodoContable.id)}`);
  if (!tipoLibroExists) faltantes.push(`tipoLibroId: ${TIPO_LIBRO.CAJA_BANCOS}`);
  if (!estadoExists) faltantes.push(`estadoId: ${estadoPendiente.id}`);
  if (!submoduloExists) faltantes.push(`submoduloOrigenId: ${submodulo.id}`);
  if (!monedaExists) faltantes.push(`monedaId: 1`);
  if (!cuentasDebeMultiples && !cuentaDebeExists) faltantes.push(`planCuentaId DEBE: ${cuentaDebe}`);
  if (!cuentaHaberExists) faltantes.push(`planCuentaId HABER: ${cuentaHaber}`);
  if (!entidadExists) faltantes.push(`entidadComercialId: ${proveedorId}`);
  if (tipoDocumentoOrigenId && !tipoDocExists) faltantes.push(`tipoDocumentoOrigenId: ${tipoDocumentoOrigenId}`);
  
  if (faltantes.length > 0) {
    throw new ValidationError(`No se puede crear el asiento para MovimientoCaja ${movimiento.id}. Faltan registros: ${faltantes.join(', ')}`);
  }

  // ========================================
  // 9. CREAR ASIENTO CONTABLE
  // ========================================
  
  // Preparar detalles del asiento
  let detallesAsiento = [];
  let numeroLinea = 1;
  
  if (cuentasDebeMultiples) {
    // ═══════════════════════════════════════════════════════════
    // CASO: GASTOS SIN FACTURA - Múltiples líneas DEBE
    // ═══════════════════════════════════════════════════════════
    console.log(`\n   📝 Creando asiento con ${cuentasDebeMultiples.length} líneas DEBE`);
    
    for (const cuentaDebe of cuentasDebeMultiples) {
      let montoLineaSoles, montoLineaME;
      
      if (Number(monedaFactura) === 1) {
        // Factura en SOLES
        montoLineaSoles = Number(cuentaDebe.monto);
        montoLineaME = null;
      } else {
        // Factura en DÓLARES
        if (Number(movimientoCompleto.monedaId) === 1) {
          montoLineaSoles = Number(cuentaDebe.monto);
          montoLineaME = montoLineaSoles / tipoCambioAsiento;
        } else {
          montoLineaME = Number(cuentaDebe.monto);
          montoLineaSoles = montoLineaME * tipoCambioAsiento;
        }
      }
      
      detallesAsiento.push({
        numeroLinea: numeroLinea++,
        planCuentaId: cuentaDebe.cuentaId,
        glosa: glosa,
        debe: montoLineaSoles,
        haber: 0,
        monedaId: 1,
        tipoCambio: tipoCambioAsiento,
        debeMonedaExtranjera: montoLineaME,
        haberMonedaExtranjera: null,
        centroCostoId: null,
        entidadComercialId: proveedorId,
        tipoDocumentoOrigenId: tipoDocumentoOrigenId,
        numeroDocumentoOrigen: numeroDocumentoOrigen,
        fechaDocumentoOrigen: fechaDocumentoOrigen,
        fechaVenceDocumentoOrigen: fechaVenceDocumentoOrigen,
        submoduloOrigenLineaId: submodulo.id,
        procesoOrigenLineaId: pagoCuentaPorPagar.id,
        creadoPor: creadoPor
      });
    }
    
    // Línea HABER (banco)
    detallesAsiento.push({
      numeroLinea: numeroLinea++,
      planCuentaId: cuentaHaber,
      glosa: glosa,
      debe: 0,
      haber: montoSoles,
      monedaId: 1,
      tipoCambio: tipoCambioAsiento,
      debeMonedaExtranjera: null,
      haberMonedaExtranjera: montoMonedaExtranjera,
      centroCostoId: null,
      entidadComercialId: proveedorId,
      tipoDocumentoOrigenId: tipoDocumentoOrigenId,
      numeroDocumentoOrigen: numeroDocumentoOrigen,
      fechaDocumentoOrigen: fechaDocumentoOrigen,
      fechaVenceDocumentoOrigen: fechaVenceDocumentoOrigen,
      submoduloOrigenLineaId: submodulo.id,
      procesoOrigenLineaId: pagoCuentaPorPagar.id,
      creadoPor: creadoPor
    });
    
  } else {
    // ═══════════════════════════════════════════════════════════
    // CASO: ASIENTO SIMPLE - Una línea DEBE, una línea HABER
    // ═══════════════════════════════════════════════════════════
    detallesAsiento = [
      {
        numeroLinea: 1,
        planCuentaId: cuentaDebe,
        glosa: glosa,
        debe: montoSoles,
        haber: 0,
        monedaId: 1,
        tipoCambio: tipoCambioAsiento,
        debeMonedaExtranjera: montoMonedaExtranjera,
        haberMonedaExtranjera: null,
        centroCostoId: null,
        entidadComercialId: proveedorId,
        tipoDocumentoOrigenId: tipoDocumentoOrigenId,
        numeroDocumentoOrigen: numeroDocumentoOrigen,
        fechaDocumentoOrigen: fechaDocumentoOrigen,
        fechaVenceDocumentoOrigen: fechaVenceDocumentoOrigen,
        submoduloOrigenLineaId: submodulo.id,
        procesoOrigenLineaId: pagoCuentaPorPagar.id,
        creadoPor: creadoPor
      },
      {
        numeroLinea: 2,
        planCuentaId: cuentaHaber,
        glosa: glosa,
        debe: 0,
        haber: montoSoles,
        monedaId: 1,
        tipoCambio: tipoCambioAsiento,
        debeMonedaExtranjera: null,
        haberMonedaExtranjera: montoMonedaExtranjera,
        centroCostoId: null,
        entidadComercialId: proveedorId,
        tipoDocumentoOrigenId: tipoDocumentoOrigenId,
        numeroDocumentoOrigen: numeroDocumentoOrigen,
        fechaDocumentoOrigen: fechaDocumentoOrigen,
        fechaVenceDocumentoOrigen: fechaVenceDocumentoOrigen,
        submoduloOrigenLineaId: submodulo.id,
        procesoOrigenLineaId: pagoCuentaPorPagar.id,
        creadoPor: creadoPor
      }
    ];
  }
  
  // Crear asiento contable
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
      submoduloOrigenId: submodulo.id,
      procesoOrigenId: movimientoCompleto.id,
      estadoId: estadoPendiente.id,
      totalDebe: montoSoles,
      totalHaber: montoSoles,
      diferencia: 0,
      estaCuadrado: true,
      monedaId: 1,
      tipoCambio: tipoCambioAsiento,
      creadoPor: creadoPor,
      detalles: {
        create: detallesAsiento
      }
    }
  });

  // Mostrar asiento creado
  console.log(`\n✅ ASIENTO CREADO: ${numeroAsiento} (ID: ${asiento.id})`);
  console.log(`   Fecha: ${new Date(movimientoCompleto.fechaOperacionMovCaja).toLocaleDateString()}`);
  console.log(`   Glosa: ${glosa.substring(0, 60)}${glosa.length > 60 ? '...' : ''}`);
  console.log(`\n   DEBE                                  HABER`);
  console.log(`   ────────────────────────────────────  ────────────────────────────────────`);
  
  for (const detalle of detallesAsiento) {
    const planCuenta = await tx.planCuentasContable.findUnique({ where: { id: detalle.planCuentaId } });
    const debe = detalle.debe > 0 ? `S/ ${detalle.debe.toFixed(2)}`.padEnd(15) : ''.padEnd(15);
    const haber = detalle.haber > 0 ? `S/ ${detalle.haber.toFixed(2)}` : '';
    const cuenta = `${planCuenta.codigoCuenta} ${planCuenta.nombreCuenta}`.substring(0, 35);
    
    if (detalle.debe > 0) {
      console.log(`   ${cuenta.padEnd(35)} ${debe}`);
    } else {
      console.log(`   ${' '.repeat(35)}                      ${cuenta.padEnd(35)} ${haber}`);
    }
  }
  
  console.log(`   ────────────────────────────────────  ────────────────────────────────────`);
  console.log(`   TOTAL: S/ ${montoSoles.toFixed(2)}`.padEnd(38) + `S/ ${montoSoles.toFixed(2)}`);
  if (montoMonedaExtranjera) {
    console.log(`   (USD ${montoMonedaExtranjera.toFixed(2)} × TC ${tipoCambioAsiento})`);
  }
  console.log('');
  
  return asiento;
}

/**
 * Genera asientos contables para todos los movimientos de caja de un pago
 * Patrón: Igual a ordenCompra.guardarAsientoContable()
 * 
 * @param {Object} pagoCuentaPorPagar - Pago creado
 * @param {Array} movimientos - Array de MovimientoCaja creados
 * @param {Object} periodoContable - Período contable
 * @param {Number} empresaId - ID empresa
 * @param {Number} creadoPor - ID usuario
 * @param {Object} tx - Transacción Prisma
 * @returns {Promise<Array>} - Array de asientos creados
 */
async function generarAsientosContablesPagoCxC(
  pagoCuentaPorPagar,
  movimientos,
  periodoContable,
  empresaId,
  creadoPor,
  tx
) {
  try {
  
    // 1. Buscar submódulo "MovimientoCaja" (origen del asiento contable)
    const submodulo = await tx.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "MovimientoCaja",
        activo: true
      }
    });

    if (!submodulo) {
      throw new ValidationError('No se encontró el submódulo "MovimientoCaja"');
    }
    
    // 2. Buscar estado PENDIENTE para asientos contables (siguiendo patrón de ordenCompra)
    const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) }
    });

    if (!estadoPendiente) {
      throw new ValidationError('No se encontró el estado PENDIENTE para asientos contables');
    }

    // 3. Buscar cuentas contables por código (CxP - Cuentas por Pagar)
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║ PASO 1: CARGAR CUENTAS CONTABLES BASE                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📋 Códigos a buscar:`);
    console.log(`   - CxP Soles:     ${CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_SOLES}`);
    console.log(`   - CxP Dólares:   ${CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_DOLARES}`);
    console.log(`   - BN Detracción: ${CODIGOS_CUENTAS_CONTABLES.BN_DETRACCION}`);
    
    const cuentaCxPSoles = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_SOLES }
    });
    
    const cuentaCxPDolares = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_DOLARES }
    });
    
    const cuentaBNDetraccion = await tx.planCuentasContable.findFirst({
      where: { codigoCuenta: CODIGOS_CUENTAS_CONTABLES.BN_DETRACCION }
    });

    console.log(`\n✅ Resultados:`);
    console.log(`   - CxP Soles:     ${cuentaCxPSoles ? `ID ${cuentaCxPSoles.id} - ${cuentaCxPSoles.nombreCuenta}` : '❌ NO ENCONTRADA'}`);
    console.log(`   - CxP Dólares:   ${cuentaCxPDolares ? `ID ${cuentaCxPDolares.id} - ${cuentaCxPDolares.nombreCuenta}` : '❌ NO ENCONTRADA'}`);
    console.log(`   - BN Detracción: ${cuentaBNDetraccion ? `ID ${cuentaBNDetraccion.id} - ${cuentaBNDetraccion.nombreCuenta}` : '❌ NO ENCONTRADA'}`);

    if (!cuentaCxPSoles) {
      throw new ValidationError(`No se encontró la cuenta contable con código ${CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_SOLES}`);
    }
    if (!cuentaCxPDolares) {
      throw new ValidationError(`No se encontró la cuenta contable con código ${CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_DOLARES}`);
    }
    if (!cuentaBNDetraccion) {
      throw new ValidationError(`No se encontró la cuenta contable con código ${CODIGOS_CUENTAS_CONTABLES.BN_DETRACCION}`);
    }

    // 4. Cargar detalles de la orden de compra para las glosas
    let detallesOrdenCompra = [];
    try {
      // Obtener el ID de la ordenCompra desde el primer movimiento
      const primerMovimiento = movimientos[0];
      if (primerMovimiento) {
        const movTemp = await tx.movimientoCaja.findUnique({
          where: { id: primerMovimiento.id },
          include: {
            cuentaPorPagar: {
              include: {
                ordenCompra: true
              }
            }
          }
        });
        
        const ordenCompraId = movTemp?.cuentaPorPagar?.ordenCompraId;
        
        if (ordenCompraId) {
          detallesOrdenCompra = await tx.detalleOrdenCompra.findMany({
            where: { ordenCompraId: ordenCompraId },
            include: {
              producto: {
                include: {
                  unidadMedida: true
                }
              }
            },
            orderBy: { id: 'asc' }
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar los detalles de la factura para la glosa:', error.message);
      // Continuar sin detalles - la glosa usará descripción genérica
    }

    const asientosCreados = [];

    // 5. Por cada movimiento con monto > 0, generar asiento usando la función helper
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║  INICIANDO GENERACIÓN DE ASIENTOS CONTABLES               ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    console.log(`📊 Total de movimientos a procesar: ${movimientos.length}`);
    console.log(`📋 IDs de movimientos: ${movimientos.map(m => m.id).join(', ')}`);
    
    for (let i = 0; i < movimientos.length; i++) {
      const movimiento = movimientos[i];
      console.log(`\n[${i + 1}/${movimientos.length}] Procesando movimiento...`);
      
      // ✅ USAR FUNCIÓN HELPER - ÚNICA VERDAD
      const asiento = await generarAsientoParaMovimiento({
        movimiento,
        pagoCuentaPorPagar,
        cuentaCxPSoles,
        cuentaCxPDolares,
        cuentaBNDetraccion,
        submodulo,
        estadoPendiente,
        periodoContable,
        empresaId,
        creadoPor,
        detallesOrdenCompra,
        tx
      });

      // Solo agregar si se creó el asiento (puede ser null si se omitió)
      if (asiento) {
        asientosCreados.push(asiento);
        console.log(`✅ Asiento agregado al array (Total: ${asientosCreados.length})`);
      } else {
        console.log(`⚠️ No se generó asiento para este movimiento`);
      }
    }
    
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║  RESUMEN FINAL DE GENERACIÓN DE ASIENTOS                  ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    console.log(`📊 Movimientos procesados: ${movimientos.length}`);
    console.log(`✅ Asientos generados: ${asientosCreados.length}`);
    console.log(`❌ Movimientos omitidos: ${movimientos.length - asientosCreados.length}`);
    if (asientosCreados.length > 0) {
      console.log(`📝 IDs de asientos creados: ${asientosCreados.map(a => a.id).join(', ')}`);
    }
    console.log(`════════════════════════════════════════════════════════════\n`);

    return asientosCreados;
  } catch (error) {
    console.error('❌ Error generando asientos contables:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN HELPER: ACTUALIZAR SALDO DE CUENTA CORRIENTE
// ════════════════════════════════════════════════════════════
/**
 * ✅ UNA SOLA VERDAD: Actualizar saldo de cuenta corriente CON CONVERSIÓN DE MONEDA
 * @param {Object} params - Parámetros
 * @param {Object} params.tx - Transacción Prisma
 * @param {Number} params.cuentaCorrienteId - ID de la cuenta
 * @param {Number} params.empresaId - ID de la empresa
 * @param {Date} params.fecha - Fecha del movimiento
 * @param {Number} params.ingresos - Monto de ingresos EN LA MONEDA DEL MOVIMIENTO
 * @param {Number} params.egresos - Monto de egresos EN LA MONEDA DEL MOVIMIENTO
 * @param {Number} params.monedaMovimientoId - ID de la moneda del movimiento
 * @param {Number} params.tipoCambio - Tipo de cambio (si aplica conversión)
 * @param {Number} params.movimientoCajaId - ID del movimiento de caja
 * @param {Number} params.centroCostoId - ID del centro de costo (opcional)
 * @returns {Promise<Object>} - Saldo creado
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
  saldoAnteriorManual = null  // ✅ NUEVO: Permite pasar el saldo anterior manualmente
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
    // Para otras monedas, se podría extender la lógica aquí
  }

  // 3. Obtener saldo anterior
  let saldoAnterior;
  
  if (saldoAnteriorManual !== null) {
    // ✅ Usar saldo manual si se proporciona (para movimientos secuenciales)
    saldoAnterior = Number(saldoAnteriorManual);
  } else {
    // Buscar último saldo en la BD
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
      const cuentaPorPagar = await validarDatosPagoEspecializado(data, tx);

      // Cargar moneda de pago para glosa
      const monedaPago = await tx.moneda.findUnique({
        where: { id: Number(data.monedaPagoId) }
      });

      if (!monedaPago) {
        throw new NotFoundError('Moneda de pago no encontrada.');
      }

      // ✅ Cargar cuenta corriente con su moneda (para ITF y Comisión)
      let cuentaCorriente = null;
      let monedaCuentaCorriente = null;
      if (data.cuentaBancariaId) {
        cuentaCorriente = await tx.cuentaCorriente.findUnique({
          where: { id: Number(data.cuentaBancariaId) },
          include: { moneda: true }
        });
        monedaCuentaCorriente = cuentaCorriente?.moneda;
      }

      // Generar glosa completa
      const glosa = generarGlosaPagoCxP(cuentaPorPagar, data, monedaPago);

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
      const pagoCuentaPorPagar = await tx.pagoCuentaPorPagar.create({
        data: {
          cuentaPorPagarId: Number(data.cuentaPorPagarId),
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
          // ✅ CAMPOS DE DETRACCIÓN AGREGADOS
          tieneDetraccion: data.aplicaDetraccion || false,
          montoDetraccion: data.aplicaDetraccion && data.detraccion ? Number(data.detraccion.montoDetraccion) : 0,
          porcentajeDetraccion: data.aplicaDetraccion && data.detraccion ? Number(data.detraccion.tasaDetraccion) : null,
          numeroConstanciaDetraccion: data.aplicaDetraccion && data.detraccion ? data.detraccion.numeroConstancia : null,
          fechaDetraccion: data.aplicaDetraccion && data.detraccion && data.detraccion.fechaDeposito ? new Date(data.detraccion.fechaDeposito) : null,
          medioPagoId: Number(data.medioPagoId),
          numeroOperacion: data.numeroOperacion || null,
          bancoId: data.bancoId ? Number(data.bancoId) : null,
          cuentaBancariaId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
          movimientoCajaId: null,  // Se actualizará después
          observaciones: data.observaciones || null,
          fechaContable: fechaContable,                    // ← CALCULADO
          periodoContableId: Number(periodoContable.id),   // ← CALCULADO
          refOperacionEspecializadaMovCaja: correlativo,
          detraccionId: null,  // ✅ Se actualizará después si aplica
          creadoPor: data.creadoPor || null
        }
      });

      // ════════════════════════════════════════════════════════════
      // PASO 3: CREAR MOVIMIENTO DE CAJA - EGRESO
      // ════════════════════════════════════════════════════════════
      const movimientoEgreso = await tx.movimientoCaja.create({
        data: {
          refOperacionEspecializadaMovCaja: correlativo,
          tipoMovimientoId: Number(data.tipoMovimientoEgresoId),
          empresaId: Number(data.empresaId),
          entidadComercialId: Number(cuentaPorPagar.proveedorId),
          monto: Number(data.montoPagado),
          monedaId: Number(data.monedaPagoId),
          medioPagoId: Number(data.medioPagoId),
          cuentaCorrienteDestinoId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
          fechaOperacionMovCaja: new Date(data.fechaPago),
          descripcion: glosa,
          numeroOperacionPagoBanco: data.numeroOperacion || null,
          fechaOperacionPagoBanco: data.fechaPago ? new Date(data.fechaPago) : null,
          urlComprobanteOperacionMovCaja: cuentaPorPagar.ordenCompra?.urlOrdenCompraPdf || null,  // ✅ URL del PDF de la Orden de Compra
          estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
          esGerencial: cuentaPorPagar.esGerencial || false,
          tipoCambio: Number(data.tipoCambio),
          usuarioId: Number(data.usuarioId),
          moduloOrigenMotivoOperacionId: 116,
          origenMotivoOperacionId: pagoCuentaPorPagar.id,
          cuentaPorPagarId: cuentaPorPagar.id
        }
      });

      // ✅ Variables para rastrear saldos en cascada (PAGO PRINCIPAL)
      let saldoDespuesEgreso = null;
      let saldoDespuesITF = null;

      // ✅ Actualizar saldo de cuenta corriente (EGRESO)
      if (data.cuentaBancariaId) {
        const registroSaldo = await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: data.cuentaBancariaId,
          empresaId: data.empresaId,
          fecha: pagoCuentaPorPagar.fechaContable,
          ingresos: 0,
          egresos: data.montoPagado,
          monedaMovimientoId: data.monedaPagoId,
          tipoCambio: data.tipoCambio,
          movimientoCajaId: movimientoEgreso.id
        });
        saldoDespuesEgreso = registroSaldo.saldoActual;
      }

      // ════════════════════════════════════════════════════════════
      // PASO 4: CREAR MOVIMIENTO DE CAJA - ITF (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoITF = null;
      if (data.montoITF && Number(data.montoITF) > 0) {
        // ✅ CORRECCIÓN: ITF usa la moneda de la cuenta corriente, NO la moneda de pago
        const monedaITF = monedaCuentaCorriente?.id || data.monedaPagoId;
        
        movimientoITF = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
            empresaId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorPagar.proveedorId),
            cuentaPorPagarId: cuentaPorPagar.id,  // ✅ CRÍTICO: Asociar a la CxC para glosa
            monto: Number(data.montoITF),
            monedaId: Number(monedaITF),  // ✅ CORREGIDO: Moneda de la cuenta corriente
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteOrigenId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
            fechaOperacionMovCaja: new Date(data.fechaPago),
            descripcion: `ITF - ${glosa}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            esGerencial: cuentaPorPagar.esGerencial || false,
            tipoCambio: Number(data.tipoCambio),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: 116,  // ✅ PAGOS_CXP (todos los movimientos del pago)
            origenMotivoOperacionId: pagoCuentaPorPagar.id
          }
        });

        // ✅ Actualizar saldo de cuenta corriente (EGRESO por ITF)
        if (data.cuentaBancariaId) {
          const registroSaldo = await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: data.cuentaBancariaId,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorPagar.fechaContable,
            ingresos: 0,
            egresos: data.montoITF,
            monedaMovimientoId: monedaITF,  // ✅ CORREGIDO: Moneda de la cuenta corriente
            tipoCambio: data.tipoCambio,
            movimientoCajaId: movimientoITF.id,
            saldoAnteriorManual: saldoDespuesEgreso  // ✅ Usar saldo del movimiento anterior
          });
          saldoDespuesITF = registroSaldo.saldoActual;
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5: CREAR MOVIMIENTO DE CAJA - COMISIÓN (si aplica)
      // ════════════════════════════════════════════════════════════
      let movimientoComision = null;
      if (data.montoComision && Number(data.montoComision) > 0) {
        // ✅ CORRECCIÓN: Comisión usa la moneda de la cuenta corriente, NO la moneda de pago
        const monedaComision = monedaCuentaCorriente?.id || data.monedaPagoId;
        
        movimientoComision = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
            empresaId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorPagar.proveedorId),
            cuentaPorPagarId: cuentaPorPagar.id,  // ✅ CRÍTICO: Asociar a la CxC para glosa
            monto: Number(data.montoComision),
            monedaId: Number(monedaComision),  // ✅ CORREGIDO: Moneda de la cuenta corriente
            medioPagoId: Number(data.medioPagoId),
            cuentaCorrienteOrigenId: data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null,
            fechaOperacionMovCaja: new Date(data.fechaPago),
            descripcion: `Comisión Bancaria - ${glosa}`,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            esGerencial: cuentaPorPagar.esGerencial || false,
            tipoCambio: Number(data.tipoCambio),
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: 116,  // ✅ PAGOS_CXP (todos los movimientos del pago)
            origenMotivoOperacionId: pagoCuentaPorPagar.id
          }
        });

        // ✅ Actualizar saldo de cuenta corriente (EGRESO por Comisión)
        if (data.cuentaBancariaId) {
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: data.cuentaBancariaId,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorPagar.fechaContable,
            ingresos: 0,
            egresos: data.montoComision,
            monedaMovimientoId: monedaComision,  // ✅ CORREGIDO: Moneda de la cuenta corriente
            tipoCambio: data.tipoCambio,
            movimientoCajaId: movimientoComision.id,
            saldoAnteriorManual: saldoDespuesITF || saldoDespuesEgreso  // ✅ Usar saldo del ITF o del egreso si no hay ITF
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5.0: BUSCAR/ACTUALIZAR DETRACCIÓN PRIMERO (para obtener el ID)
      // ════════════════════════════════════════════════════════════
      let detraccionActualizada = null;
      
      if (cuentaPorPagar.ordenCompraId && data.montoDetraccionIngresado && Number(data.montoDetraccionIngresado) > 0) {
        // Buscar la detracción por ordenCompraId
        const detraccionActual = await tx.detraccion.findUnique({
          where: { ordenCompraId: cuentaPorPagar.ordenCompraId }
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
        } else {
          console.warn('⚠️ No se encontró detracción para OrdenCompra ID:', cuentaPorPagar.ordenCompraId);
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5.1: MOVIMIENTO DETRACCIÓN - EGRESO DE MI CUENTA (solo si NO es autodetracción)
      // ════════════════════════════════════════════════════════════
      let movimientoDetraccionEgreso = null;
      let movimientoITFDetraccion = null;
      let movimientoComisionDetraccion = null;
      
      if (!data.esAutodetraccion && detraccionActualizada && data.detraccion) {
        const det = data.detraccion;
        
        // ✅ USAR CAMPOS ESPECÍFICOS DE DETRACCIÓN
        const cuentaBancariaDetraccion = det.cuentaBancariaDetraccionId ? Number(det.cuentaBancariaDetraccionId) : null;
        const medioPagoDetraccion = det.medioPagoDetraccionId ? Number(det.medioPagoDetraccionId) : null;
        
        // ✅ CORRECCIÓN: Obtener moneda de la cuenta corriente de detracción
        let monedaDetraccion = Number(data.monedaPagoId);
        if (cuentaBancariaDetraccion) {
          const cuentaCorrienteDetraccion = await tx.cuentaCorriente.findUnique({
            where: { id: cuentaBancariaDetraccion },
            include: { moneda: true }
          });
          monedaDetraccion = cuentaCorrienteDetraccion?.moneda?.id || monedaDetraccion;
        }
        
        const tipoMovimientoDetraccion = det.tipoMovimientoDetraccionId ? Number(det.tipoMovimientoDetraccionId) : TIPOS_MOVIMIENTO.DETRACCION_EGRESO;
        const fechaDepositoDetraccion = det.fechaDeposito ? new Date(det.fechaDeposito) : new Date(data.fechaPago);
        const tipoCambioDetraccion = det.tipoCambioDetraccion ? Number(det.tipoCambioDetraccion) : Number(data.tipoCambio);
        
        movimientoDetraccionEgreso = await tx.movimientoCaja.create({
          data: {
            refOperacionEspecializadaMovCaja: correlativo,
            tipoMovimientoId: tipoMovimientoDetraccion,
            empresaId: Number(data.empresaId),
            entidadComercialId: Number(cuentaPorPagar.proveedorId),
            monto: Number(det.montoDetraccion),
            monedaId: monedaDetraccion,
            medioPagoId: medioPagoDetraccion,
            cuentaCorrienteOrigenId: cuentaBancariaDetraccion,
            fechaOperacionMovCaja: fechaDepositoDetraccion,
            descripcion: `Detracción - ${glosa}`,
            numeroOperacionPagoBancoImpuesto: det.numeroConstancia || det.numeroOperacionDetraccion || null,
            fechaOperacionPagoBancoImpuesto: fechaDepositoDetraccion,
            estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
            esGerencial: cuentaPorPagar.esGerencial || false,
            tipoCambio: tipoCambioDetraccion,
            usuarioId: Number(data.usuarioId),
            moduloOrigenMotivoOperacionId: 116,
            origenMotivoOperacionId: pagoCuentaPorPagar.id,
            cuentaPorPagarId: cuentaPorPagar.id,
            detraccionId: detraccionActualizada.id
          }
        });

        // ✅ Variables para rastrear saldos en cascada (DETRACCIÓN)
        let saldoDespuesDetraccion = null;
        let saldoDespuesITFDetraccion = null;

        // ✅ Actualizar saldo de la cuenta bancaria de detracción (EGRESO)
        if (cuentaBancariaDetraccion) {
          const registroSaldo = await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: cuentaBancariaDetraccion,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorPagar.fechaContable,
            ingresos: 0,
            egresos: det.montoDetraccion,
            monedaMovimientoId: monedaDetraccion,
            tipoCambio: tipoCambioDetraccion,
            movimientoCajaId: movimientoDetraccionEgreso.id
          });
          saldoDespuesDetraccion = registroSaldo.saldoActual;
        }
        
        // ✅ CREAR MOVIMIENTO ITF DE DETRACCIÓN (si aplica)
        if (det.itfDetraccion && Number(det.itfDetraccion) > 0) {
          movimientoITFDetraccion = await tx.movimientoCaja.create({
            data: {
              refOperacionEspecializadaMovCaja: correlativo,
              tipoMovimientoId: TIPOS_MOVIMIENTO.ITF,
              empresaId: Number(data.empresaId),
              entidadComercialId: Number(cuentaPorPagar.proveedorId),
              monto: Number(det.itfDetraccion),
              monedaId: monedaDetraccion,
              medioPagoId: medioPagoDetraccion,
              cuentaCorrienteOrigenId: cuentaBancariaDetraccion,
              fechaOperacionMovCaja: fechaDepositoDetraccion,
              descripcion: `ITF Detracción - ${glosa}`,
              estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
              esGerencial: cuentaPorPagar.esGerencial || false,
              tipoCambio: tipoCambioDetraccion,
              usuarioId: Number(data.usuarioId),
              moduloOrigenMotivoOperacionId: 116,
              origenMotivoOperacionId: pagoCuentaPorPagar.id,
              cuentaPorPagarId: cuentaPorPagar.id
            }
          });

          // Actualizar saldo (EGRESO por ITF)
          if (cuentaBancariaDetraccion) {
            const registroSaldo = await actualizarSaldoCuentaCorriente({
              tx,
              cuentaCorrienteId: cuentaBancariaDetraccion,
              empresaId: data.empresaId,
              fecha: pagoCuentaPorPagar.fechaContable,
              ingresos: 0,
              egresos: det.itfDetraccion,
              monedaMovimientoId: monedaDetraccion,
              tipoCambio: tipoCambioDetraccion,
              movimientoCajaId: movimientoITFDetraccion.id,
              saldoAnteriorManual: saldoDespuesDetraccion  // ✅ Usar saldo después de detracción
            });
            saldoDespuesITFDetraccion = registroSaldo.saldoActual;
          }
        }
        
        // ✅ CREAR MOVIMIENTO COMISIÓN DE DETRACCIÓN (si aplica)
        if (det.comisionDetraccion && Number(det.comisionDetraccion) > 0) {
          movimientoComisionDetraccion = await tx.movimientoCaja.create({
            data: {
              refOperacionEspecializadaMovCaja: correlativo,
              tipoMovimientoId: TIPOS_MOVIMIENTO.COMISION_BANCARIA,
              empresaId: Number(data.empresaId),
              entidadComercialId: Number(cuentaPorPagar.proveedorId),
              monto: Number(det.comisionDetraccion),
              monedaId: monedaDetraccion,
              medioPagoId: medioPagoDetraccion,
              cuentaCorrienteOrigenId: cuentaBancariaDetraccion,
              fechaOperacionMovCaja: fechaDepositoDetraccion,
              descripcion: `Comisión Bancaria Detracción - ${glosa}`,
              estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
              esGerencial: cuentaPorPagar.esGerencial || false,
              tipoCambio: tipoCambioDetraccion,
              usuarioId: Number(data.usuarioId),
              moduloOrigenMotivoOperacionId: 116,
              origenMotivoOperacionId: pagoCuentaPorPagar.id,
              cuentaPorPagarId: cuentaPorPagar.id
            }
          });

          // Actualizar saldo (EGRESO por Comisión)
          if (cuentaBancariaDetraccion) {
            await actualizarSaldoCuentaCorriente({
              tx,
              cuentaCorrienteId: cuentaBancariaDetraccion,
              empresaId: data.empresaId,
              fecha: pagoCuentaPorPagar.fechaContable,
              ingresos: 0,
              egresos: det.comisionDetraccion,
              monedaMovimientoId: monedaDetraccion,
              tipoCambio: tipoCambioDetraccion,
              movimientoCajaId: movimientoComisionDetraccion.id,
              saldoAnteriorManual: saldoDespuesITFDetraccion || saldoDespuesDetraccion  // ✅ Usar saldo del ITF o detracción
            });
          }
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 5.2: AUTODETRACCIÓN - DOS MOVIMIENTOS SEPARADOS (si aplica)
      // ════════════════════════════════════════════════════════════
      // ✅ PROFESIONAL: 1 MovimientoCaja = 1 AsientoContable
      // Una transferencia necesita 2 movimientos (egreso + ingreso)
      let movimientoAutodetraccionEgreso = null;
      let movimientoAutodetraccionIngreso = null;

      if (data.esAutodetraccion && detraccionActualizada) {
        const cuentaOrigenAutodet = data.cuentaBancariaOrigenAutodetraccion 
          ? Number(data.cuentaBancariaOrigenAutodetraccion)
          : (data.cuentaBancariaId ? Number(data.cuentaBancariaId) : null);

        // ✅ MOVIMIENTO 1: EGRESO de la cuenta empresa
        if (cuentaOrigenAutodet) {
          movimientoAutodetraccionEgreso = await tx.movimientoCaja.create({
            data: {
              refOperacionEspecializadaMovCaja: correlativo,
              tipoMovimientoId: TIPOS_MOVIMIENTO.DETRACCION_SALIDA,  // ✅ Tipo 165 (SUNAT - igual que egreso)
              empresaId: Number(data.empresaId),
              entidadComercialId: Number(cuentaPorPagar.proveedorId),
              monto: Number(data.montoDetraccionIngresado),
              monedaId: Number(data.monedaPagoId),
              medioPagoId: Number(data.medioPagoId),
              cuentaCorrienteOrigenId: cuentaOrigenAutodet,
              cuentaCorrienteDestinoId: null,
              fechaOperacionMovCaja: new Date(data.fechaPago),
              descripcion: `Autodetracción Egreso - ${glosa}`,  // ✅ Descripción clara para diferenciarlo
              numeroOperacionPagoBancoImpuesto: data.numeroConstanciaDetraccion || data.numeroOperacionBN || null,
              fechaOperacionPagoBancoImpuesto: data.fechaPago ? new Date(data.fechaPago) : null,
              estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
              esGerencial: cuentaPorPagar.esGerencial || false,
              tipoCambio: Number(data.tipoCambio),
              usuarioId: Number(data.usuarioId),
              moduloOrigenMotivoOperacionId: 116,
              origenMotivoOperacionId: pagoCuentaPorPagar.id,
              cuentaPorPagarId: cuentaPorPagar.id,
              detraccionId: detraccionActualizada.id
            }
          });

          // Actualizar saldo cuenta ORIGEN (EGRESO)
          console.log('\n🔍 DEBUG Creando saldo Autodetracción Egreso:');
          console.log('  cuentaCorrienteId:', cuentaOrigenAutodet);
          console.log('  movimientoCajaId:', movimientoAutodetraccionEgreso.id);
          console.log('  egresos:', data.montoDetraccionIngresado);
          
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: cuentaOrigenAutodet,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorPagar.fechaContable,
            ingresos: 0,
            egresos: data.montoDetraccionIngresado,
            monedaMovimientoId: 1, // Autodetracción siempre en soles
            tipoCambio: 1,
            movimientoCajaId: movimientoAutodetraccionEgreso.id
          });
        }

        // ✅ MOVIMIENTO 2: EGRESO a Banco Nación
        if (cuentaBN) {
          movimientoAutodetraccionEgreso = await tx.movimientoCaja.create({
            data: {
              refOperacionEspecializadaMovCaja: correlativo,
              tipoMovimientoId: TIPOS_MOVIMIENTO.DETRACCION_EGRESO,
              empresaId: Number(data.empresaId),
              entidadComercialId: Number(cuentaPorPagar.proveedorId),
              monto: Number(data.montoDetraccionIngresado),
              monedaId: Number(data.monedaPagoId),
              medioPagoId: Number(data.medioPagoId),
              cuentaCorrienteOrigenId: null,
              cuentaCorrienteDestinoId: cuentaBN,
              fechaOperacionMovCaja: new Date(data.fechaPago),
              descripcion: `Autodetracción (Egreso BN) - ${glosa}`,
              numeroOperacionPagoBancoImpuesto: data.numeroConstanciaDetraccion || data.numeroOperacionBN || null,
              fechaOperacionPagoBancoImpuesto: data.fechaPago ? new Date(data.fechaPago) : null,
              estadoId: ESTADOS_MOVIMIENTO_CAJA.VALIDADO,
              esGerencial: cuentaPorPagar.esGerencial || false,
              tipoCambio: Number(data.tipoCambio),
              usuarioId: Number(data.usuarioId),
              moduloOrigenMotivoOperacionId: 116,
              origenMotivoOperacionId: pagoCuentaPorPagar.id,
              cuentaPorPagarId: cuentaPorPagar.id,
              detraccionId: detraccionActualizada.id
            }
          });

          // Actualizar saldo cuenta DESTINO (INGRESO BN)
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: cuentaBN,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorPagar.fechaContable,
            ingresos: data.montoDetraccionIngresado,
            egresos: 0,
            monedaMovimientoId: 1, // Autodetracción siempre en soles
            tipoCambio: 1,
            movimientoCajaId: movimientoAutodetraccionEgreso.id
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
            proveedorId: Number(cuentaPorPagar.proveedorId),
            tipoDocProveedorId: Number(cuentaPorPagar.proveedor.tipoDocumentoId),
            numeroDocProveedor: cuentaPorPagar.proveedor.numeroDocumento,
            razonSocialProveedor: cuentaPorPagar.proveedor.razonSocial,
            tipoRetencionId: ret.tipoRetencionId ? Number(ret.tipoRetencionId) : null,
            tasaRetencion: Number(ret.tasaRetencion),
            monedaId: Number(data.monedaPagoId),
            importeTotal: Number(ret.importeTotal),
            importeRetenido: Number(ret.importeRetenido),
            importeNeto: Number(ret.importeTotal) - Number(ret.importeRetenido),
            cuentaPorPagarId: null,
            movimientoCajaId: movimientoEgreso.id,
            nubefactEnviado: false,
            estadoId: ESTADOS_RETENCION.VALIDADO,
            declarado: false,
            creadoPor: data.creadoPor || null
          }
        });

        if (cuentaPorPagar.ordenCompra) {
          await tx.detalleRetencion.create({
            data: {
              retencionId: retencion.id,
              tipoDocumentoId: cuentaPorPagar.ordenCompra.tipoDocumentoId,
              numeroDocumento: cuentaPorPagar.numeroDocumento,
              fechaEmision: cuentaPorPagar.fechaEmision,
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
            proveedorId: Number(cuentaPorPagar.proveedorId),
            tipoDocProveedorId: Number(cuentaPorPagar.proveedor.tipoDocumentoId),
            numeroDocProveedor: cuentaPorPagar.proveedor.numeroDocumento,
            razonSocialProveedor: cuentaPorPagar.proveedor.razonSocial,
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

        if (cuentaPorPagar.ordenCompra) {
          await tx.detallePercepcion.create({
            data: {
              percepcionId: percepcion.id,
              tipoDocumentoId: cuentaPorPagar.ordenCompra.tipoDocumentoId,
              numeroDocumento: cuentaPorPagar.numeroDocumento,
              fechaEmision: cuentaPorPagar.fechaEmision,
              importeTotal: Number(per.importeTotal),
              importePercibido: Number(per.importePercibido)
            }
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 9: ACTUALIZAR PAGO CON REFERENCIAS
      // ════════════════════════════════════════════════════════════
      const pagoCuentaPorPagarActualizado = await tx.pagoCuentaPorPagar.update({
        where: { id: pagoCuentaPorPagar.id },
        data: {
          movimientoCajaId: movimientoEgreso.id,
          detraccionId: detraccionActualizada ? detraccionActualizada.id : null  // ✅ Vincula con Detraccion
        },
        include: {
          cuentaPorPagar: {
            include: {
              proveedor: true,
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
        movimientoEgreso,
        movimientoITF,
        movimientoComision,
        movimientoDetraccionEgreso,
        movimientoITFDetraccion,          // ✅ ITF de detracción
        movimientoComisionDetraccion,     // ✅ Comisión de detracción
        movimientoAutodetraccionEgreso,   // ✅ Egreso de cuenta empresa
        movimientoAutodetraccionIngreso   // ✅ Ingreso a Banco Nación
      ].filter(m => m !== null && Number(m.monto) > 0);



      let asientosGenerados = [];
      if (movimientosParaAsientos.length > 0) {
        try {
          asientosGenerados = await generarAsientosContablesPagoCxC(
            pagoCuentaPorPagar,
            movimientosParaAsientos,
            periodoContable,
            data.empresaId,
            data.creadoPor,
            tx
          );
 
          // ✅ ACTUALIZAR CAMPO asientosGenerados EN CADA MOVIMIENTO
          if (asientosGenerados && asientosGenerados.length > 0) {
            console.log('\n🔄 Actualizando campo asientosGenerados en MovimientoCaja...');
            
            for (const movimiento of movimientosParaAsientos) {
              await tx.movimientoCaja.update({
                where: { id: movimiento.id },
                data: { asientosGenerados: true }
              });
              console.log(`   ✅ MovimientoCaja ${movimiento.id}: asientosGenerados = true`);
            }
          }
          
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

      const pagosRealizados = await tx.pagoCuentaPorPagar.findMany({
        where: { cuentaPorPagarId: Number(data.cuentaPorPagarId) }
      });

      const totalPagado = pagosRealizados.reduce(
        (sum, pago) => sum + Number(pago.montoAplicadoDeuda || 0),
        0
      );

      const saldoPendiente = Number(cuentaPorPagar.montoTotal) - totalPagado;

      let nuevoEstado = ESTADOS_CXP.PENDIENTE;
      if (saldoPendiente <= 0) {
        nuevoEstado = ESTADOS_CXP.PAGADO;
      } else if (totalPagado > 0 && saldoPendiente > 0) {
        nuevoEstado = ESTADOS_CXP.PAGO_PARCIAL;
      } else if (new Date(cuentaPorPagar.fechaVencimiento) < new Date() && saldoPendiente > 0) {
        nuevoEstado = ESTADOS_CXP.VENCIDO;
      }

      await tx.cuentaPorPagar.update({
        where: { id: Number(data.cuentaPorPagarId) },
        data: {
          montoPagado: totalPagado,
          saldoPendiente: saldoPendiente,
          estadoId: nuevoEstado
        }
      });

      // ════════════════════════════════════════════════════════════
      // PASO 12: PREPARAR RESPUESTA
      // ════════════════════════════════════════════════════════════
      // ✅ ENFOQUE ESTÁNDAR: Obtener TODOS los saldos de TODOS los movimientos en UNA consulta
      const saldosCuentaCorriente = [];
      
      // Recopilar IDs de todos los movimientos creados
      const todosLosMovimientos = [
        movimientoEgreso,
        movimientoITF,
        movimientoComision,
        movimientoDetraccionEgreso,
        movimientoITFDetraccion,          // ✅ AGREGADO
        movimientoComisionDetraccion,     // ✅ AGREGADO
        movimientoAutodetraccionEgreso,   // ✅ Egreso de cuenta empresa
        movimientoAutodetraccionIngreso   // ✅ CORREGIDO: Ingreso a Banco Nación
      ].filter(Boolean);

      if (todosLosMovimientos.length > 0) {
        // ✅ UNA SOLA CONSULTA para obtener TODOS los saldos
        const todosSaldos = await tx.saldoCuentaCorriente.findMany({
          where: {
            movimientoCajaId: {
              in: todosLosMovimientos.map(m => m.id)
            }
          },
          orderBy: { fecha: 'asc' }
        });

        console.log('\n📊 DEBUG SALDOS:');
        console.log('  Total saldos encontrados:', todosSaldos.length);
        console.log('  Movimientos buscados:', todosLosMovimientos.map(m => m.id));
        todosSaldos.forEach(s => {
          console.log(`  Saldo: movimientoId=${s.movimientoCajaId}, ingresos=${s.ingresos}, egresos=${s.egresos}`);
        });

        // Mapear cada saldo a su tipo de movimiento
        todosSaldos.forEach((saldo) => {
          let tipo = 'Desconocido';
          
          if (saldo.movimientoCajaId === movimientoEgreso.id) {
            tipo = 'Egreso';
          } else if (movimientoITF && saldo.movimientoCajaId === movimientoITF.id) {
            tipo = 'ITF';
          } else if (movimientoComision && saldo.movimientoCajaId === movimientoComision.id) {
            tipo = 'Comisión';
          } else if (movimientoDetraccionEgreso && saldo.movimientoCajaId === movimientoDetraccionEgreso.id) {
            tipo = 'Detracción';
          } else if (movimientoITFDetraccion && saldo.movimientoCajaId === movimientoITFDetraccion.id) {
            tipo = 'ITF Detracción';
          } else if (movimientoComisionDetraccion && saldo.movimientoCajaId === movimientoComisionDetraccion.id) {
            tipo = 'Comisión Detracción';
          } else if (movimientoAutodetraccionEgreso && saldo.movimientoCajaId === movimientoAutodetraccionEgreso.id) {
            tipo = 'Autodetracción (Egreso)';
          } else if (movimientoAutodetraccionIngreso && saldo.movimientoCajaId === movimientoAutodetraccionIngreso.id) {
            tipo = 'Autodetracción (Ingreso)';
          }

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
        pagoCuentaPorPagar: pagoCuentaPorPagarActualizado,
        movimientos: {
          egreso: movimientoEgreso,
          itf: movimientoITF,
          comision: movimientoComision,
          detraccionEgreso: movimientoDetraccionEgreso,
          itfDetraccion: movimientoITFDetraccion,                  // ✅ AGREGADO
          comisionDetraccion: movimientoComisionDetraccion,        // ✅ AGREGADO
          autodetraccionEgreso: movimientoAutodetraccionEgreso,    // ✅ Egreso cuenta empresa
          autodetraccionIngreso: movimientoAutodetraccionIngreso   // ✅ CORREGIDO: Ingreso Banco Nación
        },
        conceptosSunat: {
          detraccion: detraccionActualizada, // ← Usar la detracción actualizada en lugar de la legacy
          retencion: retencion,
          percepcion: percepcion
        },
        asientosContables: asientosGenerados || [],
        saldosCuentaCorriente: saldosCuentaCorriente,  // ← AGREGADO
        resumen: {
          // ✅ CALCULADO DINÁMICAMENTE DESDE MOVIMIENTOS CREADOS
          montoBruto: Number(movimientoEgreso.monto),
          montoITF: movimientoITF ? Number(movimientoITF.monto) : 0,
          montoComision: movimientoComision ? Number(movimientoComision.monto) : 0,
          montoDetraccion: movimientoAutodetraccionEgreso ? Number(movimientoAutodetraccionEgreso.monto) : 0,
          montoNetoCaja: Number(movimientoEgreso.monto) -
            (movimientoITF ? Number(movimientoITF.monto) : 0) -
            (movimientoComision ? Number(movimientoComision.monto) : 0),
          montoAplicadoDeuda: Number(data.montoAplicadoDeuda),
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
          moneda: true,
          tipoCuentaCorriente: true  // ✅ AGREGADO
        }
      },
      cuentaCorrienteDestino: {
        include: {
          banco: true,
          moneda: true,
          tipoCuentaCorriente: true  // ✅ AGREGADO
        }
      }
    };

    // Recargar movimientos con relaciones


    if (resultado.movimientos.egreso) {
      const movimientoRecargado = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.egreso.id },
        include: includeMovimiento
      });
 
      resultado.movimientos.egreso = movimientoRecargado;

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

    if (resultado.movimientos.detraccionEgreso) {
      resultado.movimientos.detraccionEgreso = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.detraccionEgreso.id },
        include: includeMovimiento
      });
    }

    if (resultado.movimientos.itfDetraccion) {
      resultado.movimientos.itfDetraccion = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.itfDetraccion.id },
        include: includeMovimiento
      });
    }

    if (resultado.movimientos.comisionDetraccion) {
      resultado.movimientos.comisionDetraccion = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.comisionDetraccion.id },
        include: includeMovimiento
      });
    }

    if (resultado.movimientos.autodetraccionEgreso) {
      resultado.movimientos.autodetraccionEgreso = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.autodetraccionEgreso.id },
        include: includeMovimiento
      });
    }

    if (resultado.movimientos.autodetraccionIngreso) {
      resultado.movimientos.autodetraccionIngreso = await prisma.movimientoCaja.findUnique({
        where: { id: resultado.movimientos.autodetraccionIngreso.id },
        include: includeMovimiento
      });
    }

    // ════════════════════════════════════════════════════════════
    // GENERAR VOUCHERS CONTABLES PARA CADA MOVIMIENTO
    // ════════════════════════════════════════════════════════════
    
    console.log('\n🎯 ════════════════════════════════════════════════════════');
    console.log('🎯 INICIANDO GENERACIÓN DE VOUCHERS CONTABLES');
    console.log('🎯 ════════════════════════════════════════════════════════');
    console.log('⏳ Esperando 500ms para que Prisma actualice las relaciones...');
    
    // Esperar un momento para que Prisma actualice las relaciones inversas
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const movimientosConAsientos = [
      resultado.movimientos.egreso,
      resultado.movimientos.itf,
      resultado.movimientos.comision,
      resultado.movimientos.detraccionEgreso,
      resultado.movimientos.itfDetraccion,           // ✅ AGREGADO
      resultado.movimientos.comisionDetraccion,      // ✅ AGREGADO
      resultado.movimientos.autodetraccionEgreso,    // ✅ Egreso cuenta empresa
      resultado.movimientos.autodetraccionIngreso    // ✅ CORREGIDO: Ingreso Banco Nación
    ].filter(m => m !== null && m !== undefined);

    console.log(`🎯 Total de movimientos a procesar: ${movimientosConAsientos.length}`);
    movimientosConAsientos.forEach((m, index) => {
      console.log(`   ${index + 1}. Movimiento ID: ${m.id}`);
    });

    // Generar vouchers contables en paralelo
    const vouchersPromises = movimientosConAsientos.map(async (movimiento) => {
      try {
        const urlVoucher = await generarYGuardarVoucherContable(movimiento.id);
        return {
          movimientoId: movimiento.id,
          urlVoucher,
          success: urlVoucher !== null
        };
      } catch (error) {
        console.error(`❌ Error generando voucher para movimiento ${movimiento.id}:`, error);
        return {
          movimientoId: movimiento.id,
          urlVoucher: null,
          success: false,
          error: error.message
        };
      }
    });

    const vouchersResultados = await Promise.all(vouchersPromises);
    
    console.log('\n🎯 ════════════════════════════════════════════════════════');
    console.log('🎯 RESUMEN DE GENERACIÓN DE VOUCHERS CONTABLES');
    console.log('🎯 ════════════════════════════════════════════════════════');
    
    const exitosos = vouchersResultados.filter(v => v.success).length;
    const fallidos = vouchersResultados.filter(v => !v.success).length;
    
    console.log(`   ✅ Exitosos: ${exitosos}`);
    console.log(`   ❌ Fallidos: ${fallidos}`);
    console.log(`   📊 Total: ${vouchersResultados.length}`);
    console.log('\n   Detalle:');
    
    vouchersResultados.forEach((v, index) => {
      if (v.success) {
        console.log(`   ${index + 1}. ✅ Movimiento ${v.movimientoId}: ${v.urlVoucher}`);
      } else {
        console.log(`   ${index + 1}. ❌ Movimiento ${v.movimientoId}: ${v.error || 'Error desconocido'}`);
      }
    });
    
    console.log('🎯 ════════════════════════════════════════════════════════\n');

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
    const pago = await prisma.pagoCuentaPorPagar.findUnique({
      where: { id: Number(pagoId) },
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
            empresa: true,
            moneda: true,
            estado: true,
            ordenCompra: {
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
                ordenCompraOrigen: true
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
    const pagos = await prisma.pagoCuentaPorPagar.findMany({
      where: {
        empresaId: Number(empresaId),
        refOperacionEspecializadaMovCaja: Number(correlativo)
      },
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
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
        cuentaCorrienteDestino: {  // ✅ AGREGADO para Egreso, Autodetracción Egreso
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

    if (filtros.proveedorId) {
      where.cuentaPorPagar = {
        proveedorId: Number(filtros.proveedorId)
      };
    }

    if (filtros.monedaId) {
      where.monedaPagoId = Number(filtros.monedaId);
    }

    const pagos = await prisma.pagoCuentaPorPagar.findMany({
      where,
      include: {
        cuentaPorPagar: {
          include: {
            proveedor: true,
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
    const movimientoEgreso = operacion.movimientos.find(
      m => m.origenMovimiento === 'PAGO_CXP_ESPECIALIZADO' &&
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
        egreso: movimientoEgreso,
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
// FUNCIONES AUXILIARES: GENERACIÓN DE VOUCHERS CONTABLES
// ════════════════════════════════════════════════════════════

/**
 * Generar y guardar voucher contable para un movimiento
 * @param {Object} movimiento - MovimientoCaja con asientos contables
 * @returns {Promise<string>} - URL del PDF generado
 */
const generarYGuardarVoucherContable = async (movimientoId) => {
  console.log('\n📄 ════════════════════════════════════════════════════════');
  console.log(`📄 GENERANDO VOUCHER CONTABLE - Movimiento ID: ${movimientoId}`);
  console.log('📄 ════════════════════════════════════════════════════════');
  
  try {
    // 0. Verificar que el movimiento tenga asientos contables
    console.log('  ⏳ Paso 0: Verificando asientos contables...');
    const movimientoConAsientos = await prisma.movimientoCaja.findUnique({
      where: { id: Number(movimientoId) },
      include: {
        asientosContables: true
      }
    });
    
    if (!movimientoConAsientos) {
      throw new Error(`Movimiento ${movimientoId} no encontrado`);
    }
    
    console.log(`     Asientos encontrados: ${movimientoConAsientos.asientosContables?.length || 0}`);
    
    if (!movimientoConAsientos.asientosContables || movimientoConAsientos.asientosContables.length === 0) {
      console.log('  ⚠️  ADVERTENCIA: No hay asientos contables para este movimiento');
      console.log('     El voucher se generará sin tabla de asientos');
    }
    
    // 1. Generar PDF del voucher contable
    console.log('  ⏳ Paso 1: Generando PDF del voucher contable...');
    const pdfBuffer = await generarVoucherContableMovimientoCaja(movimientoId);
    console.log(`  ✅ PDF generado exitosamente (${pdfBuffer.length} bytes)`);

    // 2. Definir directorio y nombre del archivo (✅ RUTA ESTÁNDAR)
    const uploadDir = path.join(__dirname, '../../../uploads/pdf-system/movimiento-caja-voucher-contable');
    const fileName = `MOVIMIENTO-CAJA-VOUCHER-CONTABLE-${movimientoId}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    
    console.log('  ⏳ Paso 2: Creando directorio...');
    console.log(`     Directorio: ${uploadDir}`);
    await fs.mkdir(uploadDir, { recursive: true });
    console.log('  ✅ Directorio verificado/creado');

    // 3. Guardar archivo
    console.log('  ⏳ Paso 3: Guardando archivo PDF...');
    console.log(`     Archivo: ${fileName}`);
    console.log(`     Ruta completa: ${filePath}`);
    await fs.writeFile(filePath, pdfBuffer);
    console.log('  ✅ Archivo guardado exitosamente');

    // 4. Construir URL relativa (✅ RUTA ESTÁNDAR)
    const urlRelativa = `/uploads/pdf-system/movimiento-caja-voucher-contable/${fileName}`;
    console.log('  ⏳ Paso 4: URL relativa construida');
    console.log(`     URL: ${urlRelativa}`);

    // 5. Actualizar MovimientoCaja con la URL
    console.log('  ⏳ Paso 5: Actualizando MovimientoCaja en BD...');
    await prisma.movimientoCaja.update({
      where: { id: Number(movimientoId) },
      data: { urlDocumentoMovCaja: urlRelativa }
    });
    console.log('  ✅ MovimientoCaja.urlDocumentoMovCaja actualizado');

    console.log('📄 ════════════════════════════════════════════════════════');
    console.log(`📄 ✅ VOUCHER CONTABLE GENERADO EXITOSAMENTE`);
    console.log(`📄    Movimiento: ${movimientoId}`);
    console.log(`📄    URL: ${urlRelativa}`);
    console.log('📄 ════════════════════════════════════════════════════════\n');

    return urlRelativa;
  } catch (error) {
    console.log('📄 ════════════════════════════════════════════════════════');
    console.log(`📄 ❌ ERROR GENERANDO VOUCHER CONTABLE`);
    console.log(`📄    Movimiento: ${movimientoId}`);
    console.log(`📄    Error: ${error.message}`);
    console.log(`📄    Stack: ${error.stack}`);
    console.log('📄 ════════════════════════════════════════════════════════\n');
    // No fallar el proceso completo si falla la generación del PDF
    return null;
  }
};

// ════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES
// ════════════════════════════════════════════════════════════

/**
 * Actualizar URL del voucher consolidado en MovimientoCaja
 */
const actualizarUrlVoucherConsolidado = async (movimientoEgresoId, urlPdf) => {
  try {
    await prisma.movimientoCaja.update({
      where: { id: Number(movimientoEgresoId) },
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
 * Actualizar URL del voucher consolidado en PagoCuentaPorPagar
 */
const actualizarUrlVoucherConsolidadoPago = async (pagoId, urlPdf) => {
  try {
    await prisma.pagoCuentaPorPagar.update({
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
 * Actualizar URL del comprobante de impuesto en PagoCuentaPorPagar
 */
const actualizarUrlComprobanteImpuesto = async (pagoId, urlPdf) => {
  try {
    await prisma.pagoCuentaPorPagar.update({
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