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

// ════════════════════════════════════════════════════════════
// HELPER: COPIAR COMPROBANTE DE FACTURA A MOVIMIENTO DE CAJA
// ════════════════════════════════════════════════════════════
/**
 * Copia el PDF del comprobante de factura al directorio de comprobantes de movimiento de caja
 * @param {string} urlPreFacturaPdf - URL del PDF de la pre-factura (ej: /uploads/pdf-system/pre-facturas/PRE-FACTURA-511.pdf)
 * @param {number} movimientoId - ID del movimiento de caja
 * @returns {Promise<string>} URL del comprobante copiado
 */
async function copiarComprobanteFacturaAMovimiento(urlPreFacturaPdf, movimientoId) {
  try {
    if (!urlPreFacturaPdf) {
      return null;
    }

    // Construir rutas absolutas
    const archivoOrigen = path.join(__dirname, '../../..', urlPreFacturaPdf);
    const directorioDestino = path.join(__dirname, '../../../uploads/pdf-system/movimiento-caja-comprobante');
    const nombreArchivoDestino = `MOVIMIENTO-CAJA-COMPROBANTE-${movimientoId}.pdf`;
    const archivoDestino = path.join(directorioDestino, nombreArchivoDestino);

    // Verificar que el archivo origen existe
    try {
      await fs.access(archivoOrigen);
    } catch (error) {
      return null;
    }

    // Crear directorio destino si no existe
    await fs.mkdir(directorioDestino, { recursive: true });

    // Copiar archivo
    await fs.copyFile(archivoOrigen, archivoDestino);

    const urlDestino = `/uploads/pdf-system/movimiento-caja-comprobante/${nombreArchivoDestino}`;

    return urlDestino;
  } catch (error) {
    console.error(`❌ Error al copiar comprobante de factura al movimiento ${movimientoId}:`, error);
    // No lanzar error para no interrumpir el flujo del pago
    return null;
  }
}

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
// GENERACIÓN DE GLOSAS PROFESIONALES PARA ASIENTOS CONTABLES
// ════════════════════════════════════════════════════════════

/**
 * Genera glosa profesional para asientos contables siguiendo el estándar:
 * Línea 1: TIPO - PAGO CXC - FAC E001-2258 del 01/09/2026
 * Línea 2: Cliente: RUC 20517650871 - EXACTA OPERADOR LOGISTICO S.A.C.
 * Línea 3: Pago: 17/09/2026 | S/ 3,894.00 | T/C: 3.3610 | BCP 310-9846998-0-36 | Op: 001234567
 * Línea 4: Detalle: (1) PRODUCTO 10.00 TN x S/ 350.00 = S/ 3,500.00; (2) SERVICIO...
 * 
 * @param {Object} params - Parámetros para generar la glosa
 * @param {string} params.tipoOperacion - Tipo: 'PAGO CXC', 'AUTODETRACCIÓN', 'ITF', 'COMISIÓN BANCARIA', 'DETRACCIÓN CLIENTE'
 * @param {Object} params.cuentaPorCobrar - Cuenta por cobrar con relaciones (cliente, preFactura)
 * @param {Object} params.movimiento - Movimiento de caja con relaciones (cuentaCorriente, moneda)
 * @param {string} params.fechaPago - Fecha del pago (formato Date o string)
 * @param {number} params.tipoCambio - Tipo de cambio
 * @param {Array} params.detallesFactura - Array de detalles de la factura (opcional)
 * @param {string} params.detalleConcepto - Descripción del concepto (para ITF/Comisión)
 * @returns {string} Glosa formateada profesionalmente
 */
function generarGlosaAsientoContable({
  tipoOperacion,
  cuentaPorCobrar,
  movimiento,
  fechaPago,
  tipoCambio,
  detallesFactura = [],
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
  
  const numeroDocumento = cuentaPorCobrar.preFactura?.numeroDocumentoFinal || 
                          cuentaPorCobrar.numeroPreFactura || 
                          'S/N';
  const fechaEmisionDoc = formatearFecha(cuentaPorCobrar.preFactura?.fechaFacturacion || 
                                         cuentaPorCobrar.fechaEmision);
  
  const linea1 = `${tipoOperacion} - PAGO CXC - FAC ${numeroDocumento} del ${fechaEmisionDoc}`;

  // ========================================
  // LÍNEA 2: CLIENTE
  // ========================================
  
  const tipoDocCliente = cuentaPorCobrar.cliente?.tipoDocumento?.codigo || 'RUC';
  const numDocCliente = cuentaPorCobrar.cliente?.numeroDocumento || '';
  const razonSocialCompleta = cuentaPorCobrar.cliente?.razonSocial || '';
  const razonSocialAbreviada = abreviarRazonSocial(razonSocialCompleta);
  
  const linea2 = `Cliente: ${tipoDocCliente} ${numDocCliente} - ${razonSocialAbreviada}`;

  // ========================================
  // LÍNEA 3: DATOS FINANCIEROS Y BANCARIOS
  // ========================================
  
  const fechaPagoFormateada = formatearFecha(fechaPago);
  const simboloMoneda = movimiento.moneda?.simbolo || 'S/';
  const montoFormateado = formatearMonto(movimiento.monto);
  const tcFormateado = formatearTipoCambio(tipoCambio);
  
  // Datos bancarios del movimiento
  let infoBancaria = '';
  
  // Para movimientos con cuenta destino (ingresos)
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
  } else if (detallesFactura && detallesFactura.length > 0) {
    // Para pagos normales - mostrar productos/servicios
    const itemsDetalle = detallesFactura.map((detalle, index) => {
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
 * ⚠️ FUNCIÓN CRÍTICA: Esta es la ÚNICA VERDAD para generar asientos de MovimientoCaja
 * 
 * @param {Object} params - Parámetros necesarios
 * @param {Object} params.movimiento - MovimientoCaja básico (solo id y monto)
 * @param {Object} params.pagoCuentaPorCobrar - Pago relacionado
 * @param {Object} params.cuentaCxCSoles - Cuenta contable CxC Soles
 * @param {Object} params.cuentaCxCDolares - Cuenta contable CxC Dólares
 * @param {Object} params.cuentaBNDetraccion - Cuenta contable BN Detracción
 * @param {Object} params.submodulo - Submódulo del sistema
 * @param {Object} params.estadoPendiente - Estado pendiente
 * @param {Object} params.periodoContable - Período contable
 * @param {Number} params.empresaId - ID de la empresa
 * @param {Number} params.creadoPor - ID del usuario
 * @param {Array} params.detallesFactura - Detalles de la factura para glosa
 * @param {Object} params.tx - Transacción Prisma
 * @returns {Promise<Object|null>} - Asiento creado o null si se omite
 */
async function generarAsientoParaMovimiento({
  movimiento,
  pagoCuentaPorCobrar,
  cuentaCxCSoles,
  cuentaCxCDolares,
  cuentaBNDetraccion,
  submodulo,
  estadoPendiente,
  periodoContable,
  empresaId,
  creadoPor,
  detallesFactura,
  tx
}) {
  
  
  // Validación inicial
  if (!movimiento || Number(movimiento.monto) <= 0) {

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
      cuentaPorCobrar: {
        include: {
          cliente: {
            include: {
              tipoDocumento: true
            }
          },
          moneda: true,
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
    return null;
  }

  // ========================================
  // 2. EXTRAER DATOS DEL DOCUMENTO ORIGEN
  // ========================================
  
  const cuentaPorCobrar = movimientoCompleto.cuentaPorCobrar;
  const preFactura = cuentaPorCobrar?.preFactura;
  const clienteId = cuentaPorCobrar?.clienteId || movimientoCompleto.entidadComercialId;
  const tipoDocumentoOrigenId = preFactura?.tipoDocumentoFinalId || null;
  const numeroDocumentoOrigen = preFactura?.numeroDocumentoFinal || null;
  const fechaDocumentoOrigen = preFactura?.fechaFacturacion || null;
  const fechaVenceDocumentoOrigen = preFactura?.fechaVencimiento || null;
  
  const esGerencial = cuentaPorCobrar?.esGerencial || false;
  const tipoLibro = esGerencial ? "GERENCIAL" : "FISCAL";

  // ========================================
  // 3. DETERMINAR TIPO DE ASIENTO
  // ========================================
  
  const esIngreso = movimientoCompleto.cuentaCorrienteDestinoId && !movimientoCompleto.cuentaCorrienteOrigenId;
  const esDetraccion = Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.DETRACCION_INGRESO;
  
  // ✅ PROFESIONAL: Diferenciar ITF y Comisión por descripción (mismo tipoMovimientoId: 163)
  // Autodetracción Egreso ahora usa tipo 165 (SUNAT) igual que Autodetracción Ingreso
  const tipoMovimientoEsITFoComision = Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.ITF;
  const descripcionUpper = movimientoCompleto.descripcion ? movimientoCompleto.descripcion.toUpperCase() : '';
  const esITF = tipoMovimientoEsITFoComision && descripcionUpper.startsWith('ITF');
  const esComision = tipoMovimientoEsITFoComision && 
                     (descripcionUpper.startsWith('COMISION') || descripcionUpper.startsWith('COMISIÓN'));
  const esAutodetraccionEgreso = Number(movimientoCompleto.tipoMovimientoId) === TIPOS_MOVIMIENTO.DETRACCION_SALIDA && 
                                  descripcionUpper.startsWith('AUTODETRACCIÓN EGRESO');
  

  // ========================================
  // 4. DETERMINAR CUENTAS CONTABLES
  // ========================================
  
  let cuentaDebe, cuentaHaber;

  if (esIngreso && !esDetraccion) {
    // INGRESO: Cliente paga
    
    if (!movimientoCompleto.cuentaCorrienteDestino) {

      return null;
    }
    
    if (!movimientoCompleto.cuentaCorrienteDestino.cuentaContable) {

      return null;
    }
    
    cuentaDebe = movimientoCompleto.cuentaCorrienteDestino.cuentaContable.id;
    
    // ✅ CRÍTICO: Usar la moneda de la FACTURA, NO del movimiento
    const monedaFactura = movimientoCompleto.cuentaPorCobrar?.monedaId || movimientoCompleto.monedaId;
    cuentaHaber = Number(monedaFactura) === 1 
      ? cuentaCxCSoles.id 
      : cuentaCxCDolares.id;
    

  } else if (esAutodetraccionEgreso) {
    // Autodetracción EGRESO - Transferencia desde cuenta empresa a BN
    
    if (!movimientoCompleto.cuentaCorrienteOrigen) {

      return null;
    }
    
    if (!movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {

      return null;
    }
    
    cuentaDebe = cuentaBNDetraccion.id;
    cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;

  } else if (esDetraccion) {    
    cuentaDebe = cuentaBNDetraccion.id;
    
    if (movimientoCompleto.cuentaCorrienteOrigenId) {
      
      if (!movimientoCompleto.cuentaCorrienteOrigen) {

        return null;
      }
      
      if (!movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {

        return null;
      }
      
      cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;


    } else {
      // Cliente paga
      
      // ✅ CRÍTICO: Usar la moneda de la FACTURA, NO del movimiento
      const monedaFactura = movimientoCompleto.cuentaPorCobrar?.monedaId || movimientoCompleto.monedaId;
      cuentaHaber = Number(monedaFactura) === 1 
        ? cuentaCxCSoles.id 
        : cuentaCxCDolares.id;
      
    }
    
  } else if (esITF) {
    // ITF - Es un EGRESO (sale dinero del banco)
    
    const cuentaGastoITF = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: '641101'
      }
    });
    
    if (!cuentaGastoITF) {

      return null;
    }
    
    
    if (!cuentaGastoITF.centroCostoId) {

      return null;
    }
    
    // ✅ ITF es EGRESO: usa cuentaCorrienteOrigen (de donde sale el dinero)
    if (!movimientoCompleto.cuentaCorrienteOrigen || !movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {

      return null;
    }
    
    cuentaDebe = cuentaGastoITF.id;
    cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;
    
  } else if (esComision) {
    // Comisión Bancaria - Es un EGRESO (sale dinero del banco)
    
    const cuentaGastoComision = await tx.planCuentasContable.findFirst({
      where: {
        codigoCuenta: '679401'
      }
    });
    
    if (!cuentaGastoComision) {

      return null;
    }
    
    
    if (!cuentaGastoComision.centroCostoId) {

      return null;
    }
    
    // ✅ Comisión es EGRESO: usa cuentaCorrienteOrigen (de donde sale el dinero)
    if (!movimientoCompleto.cuentaCorrienteOrigen || !movimientoCompleto.cuentaCorrienteOrigen.cuentaContable) {
      return null;
    }
    
    cuentaDebe = cuentaGastoComision.id;
    cuentaHaber = movimientoCompleto.cuentaCorrienteOrigen.cuentaContable.id;
    
  } else {
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
  
  let tipoOperacion = 'PAGO CXC';
  let detalleConcepto = null;
  
  if (esDetraccion) {
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
    cuentaPorCobrar,
    movimiento: movimientoCompleto,
    fechaPago: pagoCuentaPorCobrar.fechaPago,
    tipoCambio: pagoCuentaPorCobrar.tipoCambio,
    detallesFactura: detallesFactura,
    detalleConcepto
  });

  // ========================================
  // 7. CALCULAR MONTOS
  // ========================================
  
  // ✅ CORRECCIÓN: Si el movimiento es en moneda extranjera, convertir a soles
  // El monto del movimiento está en la moneda del pago (USD, EUR, etc.)
  // El asiento contable siempre debe estar en soles (monedaId = 1)
  const montoSoles = Number(movimientoCompleto.monedaId) !== 1
    ? Number(movimientoCompleto.monto) * Number(movimientoCompleto.tipoCambio)
    : Number(movimientoCompleto.monto);
  
  const montoMonedaExtranjera = Number(movimientoCompleto.monedaId) !== 1
    ? Number(movimientoCompleto.monto)
    : null;

  // ========================================
  // 8. VALIDAR FOREIGN KEYS
  // ========================================
  
  const empresaExists = await tx.empresa.findUnique({ where: { id: Number(empresaId) } });
  const periodoExists = await tx.periodoContable.findUnique({ where: { id: Number(periodoContable.id) } });
  const tipoLibroExists = await tx.tipoLibroContableSunat.findUnique({ where: { id: BigInt(TIPO_LIBRO.CAJA_BANCOS) } });
  const estadoExists = await tx.estadoMultiFuncion.findUnique({ where: { id: estadoPendiente.id } });
  const submoduloExists = await tx.submoduloSistema.findUnique({ where: { id: submodulo.id } });
  const monedaExists = await tx.moneda.findUnique({ where: { id: BigInt(1) } });
  const cuentaDebeExists = await tx.planCuentasContable.findUnique({ where: { id: cuentaDebe } });
  const cuentaHaberExists = await tx.planCuentasContable.findUnique({ where: { id: cuentaHaber } });
  const entidadExists = await tx.entidadComercial.findUnique({ where: { id: clienteId } });
  const tipoDocExists = tipoDocumentoOrigenId ? await tx.tipoDocumento.findUnique({ where: { id: tipoDocumentoOrigenId } }) : null;
  
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
    throw new ValidationError(`No se puede crear el asiento para MovimientoCaja ${movimiento.id}. Faltan registros: ${faltantes.join(', ')}`);
  }

  // ========================================
  // 9. CREAR ASIENTO CONTABLE
  // ========================================
  
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
      procesoOrigenId: movimientoCompleto.id,  // ✅ ID del movimiento
      estadoId: estadoPendiente.id,
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


  
  return asiento;
}

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

    // 4. Cargar detalles de la factura para las glosas
    let detallesFactura = [];
    try {
      // Obtener el ID de la preFactura desde el primer movimiento
      const primerMovimiento = movimientos[0];
      if (primerMovimiento) {
        const movTemp = await tx.movimientoCaja.findUnique({
          where: { id: primerMovimiento.id },
          include: {
            cuentaPorCobrar: {
              include: {
                preFactura: true
              }
            }
          }
        });
        
        const preFacturaId = movTemp?.cuentaPorCobrar?.preFacturaId;
        
        if (preFacturaId) {
          detallesFactura = await tx.detallePreFactura.findMany({
            where: { preFacturaId: preFacturaId },
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

    
    for (let i = 0; i < movimientos.length; i++) {
      const movimiento = movimientos[i];
      
      // ✅ USAR FUNCIÓN HELPER - ÚNICA VERDAD
      const asiento = await generarAsientoParaMovimiento({
        movimiento,
        pagoCuentaPorCobrar,
        cuentaCxCSoles,
        cuentaCxCDolares,
        cuentaBNDetraccion,
        submodulo,
        estadoPendiente,
        periodoContable,
        empresaId,
        creadoPor,
        detallesFactura,
        tx
      });

      // Solo agregar si se creó el asiento (puede ser null si se omitió)
      if (asiento) {
        asientosCreados.push(asiento);
      } 
    }

    return asientosCreados;
  } catch (error) {
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
  centroCostoId = null
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

  // 3. Obtener último saldo de la cuenta
  const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
    where: { cuentaCorrienteId: Number(cuentaCorrienteId) },
    orderBy: { fecha: 'desc' }
  });

  const saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;

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
// CANCELACIÓN DE SOLO LA DETRACCIÓN (el neto ya fue cobrado antes)
// ════════════════════════════════════════════════════════════

/**
 * Es "solo detracción" cuando la operación no trae pago del neto (montoPagado = 0),
 * trae un monto de detracción y no es autodetracción (en la autodetracción el cliente
 * pagó el total y se registra en el flujo normal).
 */
// La detracción se deposita siempre a la cuenta del Banco de la Nación con DEPOSITO EN CUENTA, en soles
const MEDIO_PAGO_DEPOSITO_EN_CUENTA = 2;
const MONEDA_PEN = 1;

const esPagoSoloDetraccion = (data) =>
  !(Number(data.montoPagado) > 0) &&
  Number(data.montoDetraccionIngresado) > 0 &&
  !data.esAutodetraccion;

/**
 * Registra únicamente el pago de la detracción de una cuenta por cobrar:
 *   - PagoCuentaPorCobrar con el monto de la detracción aplicado a la deuda
 *   - Actualiza la Detracción (importe pagado, saldo y estado)
 *   - Movimiento de ingreso a la cuenta del Banco de la Nación (+ su saldo)
 *   - Asiento contable del movimiento (el mismo de la detracción del flujo normal)
 *   - Recalcula la cuenta por cobrar: queda PAGADA si con esto se cubre todo el documento
 * No crea ingreso del neto, ITF ni comisión. Devuelve la misma estructura que el flujo normal
 * para reutilizar su procesamiento posterior. Se ejecuta dentro de la transacción recibida.
 */
const ejecutarPagoSoloDetraccion = async (tx, data) => {
  const redondear2 = (valor) => Math.round(Number(valor) * 100) / 100;

  // Pago de solo la detracción: el medio es siempre DEPOSITO EN CUENTA (no depende del medio del neto)
  data = {
    ...data,
    medioPagoId: MEDIO_PAGO_DEPOSITO_EN_CUENTA,
    monedaPagoId: data.monedaPagoId || MONEDA_PEN
  };

  // ── Validaciones de entrada ──
  const camposRequeridos = [
    'cuentaPorCobrarId',
    'empresaId',
    'fechaPago',
    'monedaPagoId',
    'tipoCambio',
    'medioPagoId',
    'usuarioId'
  ];
  const camposFaltantes = camposRequeridos.filter((campo) => !data[campo]);
  if (camposFaltantes.length > 0) {
    throw new ValidationError(`Faltan campos obligatorios: ${camposFaltantes.join(', ')}`);
  }
  if (Number(data.tipoCambio) <= 0) {
    throw new ValidationError('El tipo de cambio debe ser mayor a cero.');
  }
  if (!data.numeroOperacionBN && !data.numeroConstanciaDetraccion) {
    throw new ValidationError('Debe ingresar el número de constancia o de operación del Banco de la Nación.');
  }
  if (Number(data.montoITF || 0) > 0 || Number(data.montoComision || 0) > 0) {
    throw new ValidationError('El ITF y la comisión corresponden al pago del neto: no aplican al pagar solo la detracción.');
  }
  if (data.aplicaRetencion || data.aplicaPercepcion) {
    throw new ValidationError('El pago de solo la detracción no admite retención ni percepción.');
  }

  // ── Cuenta por cobrar y detracción ──
  const cuentaPorCobrar = await tx.cuentaPorCobrar.findUnique({
    where: { id: Number(data.cuentaPorCobrarId) },
    include: {
      cliente: { include: { tipoDocumento: true } },
      empresa: true,
      moneda: true,
      estado: true,
      preFactura: { include: { tipoDocumento: true } }
    }
  });
  if (!cuentaPorCobrar) {
    throw new NotFoundError('Cuenta por cobrar no encontrada.');
  }
  if (Number(cuentaPorCobrar.empresaId) !== Number(data.empresaId)) {
    throw new ValidationError('La cuenta por cobrar no pertenece a la empresa indicada.');
  }
  if (cuentaPorCobrar.estadoId === ESTADOS_CXC.ANULADO) {
    throw new ValidationError('No se puede pagar una cuenta por cobrar anulada.');
  }
  if (cuentaPorCobrar.estadoId === ESTADOS_CXC.CANJEADO) {
    throw new ValidationError('No se puede pagar una cuenta por cobrar canjeada.');
  }
  if (Number(cuentaPorCobrar.saldoPendiente) <= 0) {
    throw new ValidationError('La cuenta por cobrar ya está completamente pagada.');
  }
  if (!cuentaPorCobrar.preFacturaId) {
    throw new ValidationError('El documento no tiene detracción asociada.');
  }

  const detraccionActual = await tx.detraccion.findUnique({
    where: { preFacturaId: cuentaPorCobrar.preFacturaId }
  });
  if (!detraccionActual) {
    throw new ValidationError('No se encontró la detracción del documento.');
  }
  if (Number(detraccionActual.saldoPendiente) <= 0) {
    throw new ValidationError('La detracción de este documento ya está cancelada.');
  }

  const montoDetraccion = redondear2(data.montoDetraccionIngresado);
  if (montoDetraccion > redondear2(detraccionActual.saldoPendiente)) {
    throw new ValidationError(
      `El monto de la detracción (${montoDetraccion}) supera su saldo pendiente (${redondear2(detraccionActual.saldoPendiente)}).`
    );
  }
  if (montoDetraccion > redondear2(cuentaPorCobrar.saldoPendiente)) {
    throw new ValidationError(
      `El monto de la detracción (${montoDetraccion}) supera el saldo pendiente del documento (${redondear2(cuentaPorCobrar.saldoPendiente)}).`
    );
  }

  const cuentaBN = detraccionActual.cuentaBNSunatPropiaId
    ? Number(detraccionActual.cuentaBNSunatPropiaId)
    : null;
  if (!cuentaBN) {
    throw new ValidationError('La detracción no tiene una cuenta del Banco de la Nación asociada.');
  }

  const monedaPago = await tx.moneda.findUnique({ where: { id: Number(data.monedaPagoId) } });
  if (!monedaPago) {
    throw new NotFoundError('Moneda de pago no encontrada.');
  }

  // ── Glosa ──
  const formatearFecha = (fecha) => {
    const f = new Date(fecha);
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  };
  const cliente = cuentaPorCobrar.cliente;
  const glosa =
    `Cancelación de Detracción de Dcmto: ${cuentaPorCobrar.numeroPreFactura || ''} ${formatearFecha(cuentaPorCobrar.fechaEmision)} ` +
    `Cliente: ${cliente?.tipoDocumento?.codigo || ''} ${cliente?.numeroDocumento || ''} ${cliente?.razonSocial || ''} ` +
    `Detracción: ${monedaPago.simbolo || ''} ${montoDetraccion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ` +
    `${formatearFecha(data.fechaPago)} T/C: ${Number(data.tipoCambio).toFixed(4)}`;

  // ── Correlativo y período contable ──
  const correlativo = await correlativoService.generarCorrelativo(data.empresaId, tx);
  const fechaContable = new Date(data.fechaPago);
  const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(
    Number(data.empresaId),
    fechaContable
  );

  // ── Pago de la cuenta por cobrar (el monto de la detracción se aplica a la deuda) ──
  const pagoCuentaPorCobrar = await tx.pagoCuentaPorCobrar.create({
    data: {
      cuentaPorCobrarId: Number(data.cuentaPorCobrarId),
      empresaId: Number(data.empresaId),
      fechaPago: new Date(data.fechaPago),
      montoPagado: 0,
      monedaPagoId: Number(data.monedaPagoId),
      tipoCambio: Number(data.tipoCambio),
      montoAplicadoDeuda: montoDetraccion,
      monedaDeudaId: Number(data.monedaDeudaId || cuentaPorCobrar.monedaId),
      tieneRetencion: false,
      montoRetencion: 0,
      porcentajeRetencion: null,
      numeroComprobanteRetencion: null,
      fechaRetencion: null,
      tienePercepcion: false,
      montoPercepcion: 0,
      porcentajePercepcion: null,
      numeroComprobantePercepcion: null,
      fechaPercepcion: null,
      medioPagoId: Number(data.medioPagoId),
      numeroOperacion: data.numeroOperacionBN || data.numeroConstanciaDetraccion || null,
      bancoId: null,
      cuentaBancariaId: null,
      movimientoCajaId: null,
      observaciones: data.observaciones || null,
      fechaContable: fechaContable,
      periodoContableId: Number(periodoContable.id),
      refOperacionEspecializadaMovCaja: correlativo,
      detraccionId: null,
      creadoPor: data.creadoPor || null
    }
  });

  // ── Detracción: importe pagado, saldo y estado ──
  const nuevoImportePagado = redondear2(Number(detraccionActual.importePagado) + montoDetraccion);
  const nuevoSaldoDetraccion = redondear2(Number(detraccionActual.importeRequerido) - nuevoImportePagado);
  let nuevoEstadoDetraccion = ESTADOS_DETRACCION.PENDIENTE;
  if (nuevoSaldoDetraccion <= 0) {
    nuevoEstadoDetraccion = ESTADOS_DETRACCION.VALIDADO; // PAGADO
  } else if (nuevoImportePagado > 0) {
    nuevoEstadoDetraccion = 126; // PARCIAL (igual que el flujo normal)
  }
  const detraccionActualizada = await tx.detraccion.update({
    where: { id: detraccionActual.id },
    data: {
      importePagado: nuevoImportePagado,
      saldoPendiente: nuevoSaldoDetraccion,
      estadoPagoId: nuevoEstadoDetraccion,
      numeroDocumento: data.numeroOperacionBN || data.numeroConstanciaDetraccion || detraccionActual.numeroDocumento,
      fechaEmision: new Date(data.fechaPago)
    }
  });

  // ── Movimiento de ingreso a la cuenta del Banco de la Nación ──
  const movimientoDetraccionIngreso = await tx.movimientoCaja.create({
    data: {
      refOperacionEspecializadaMovCaja: correlativo,
      tipoMovimientoId: TIPOS_MOVIMIENTO.DETRACCION_INGRESO,
      empresaId: Number(data.empresaId),
      entidadComercialId: Number(cuentaPorCobrar.clienteId),
      monto: montoDetraccion,
      monedaId: Number(data.monedaPagoId),
      medioPagoId: Number(data.medioPagoId),
      cuentaCorrienteDestinoId: cuentaBN,
      fechaOperacionMovCaja: new Date(data.fechaPago),
      descripcion: `Detracción - ${glosa}`,
      numeroOperacionPagoBancoImpuesto: data.numeroOperacionBN || data.numeroConstanciaDetraccion || null,
      fechaOperacionPagoBancoImpuesto: new Date(data.fechaPago),
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

  await actualizarSaldoCuentaCorriente({
    tx,
    cuentaCorrienteId: cuentaBN,
    empresaId: data.empresaId,
    fecha: pagoCuentaPorCobrar.fechaContable,
    ingresos: montoDetraccion,
    egresos: 0,
    monedaMovimientoId: 1, // Detracción siempre en PEN
    tipoCambio: data.tipoCambio,
    movimientoCajaId: movimientoDetraccionIngreso.id
  });

  // ── Vincular el pago con su movimiento y su detracción ──
  const pagoCuentaPorCobrarActualizado = await tx.pagoCuentaPorCobrar.update({
    where: { id: pagoCuentaPorCobrar.id },
    data: {
      movimientoCajaId: movimientoDetraccionIngreso.id,
      detraccionId: detraccionActualizada.id
    },
    include: {
      cuentaPorCobrar: { include: { cliente: true, empresa: true, moneda: true } },
      empresa: true,
      monedaPago: true,
      monedaDeuda: true,
      medioPago: true,
      banco: true,
      cuentaBancaria: { include: { banco: true, moneda: true } },
      periodoContable: true,
      movimientoCaja: true,
      detraccion: true
    }
  });

  // ── Asiento contable (mismo tratamiento que la detracción del flujo normal) ──
  let asientosGenerados = [];
  try {
    asientosGenerados = await generarAsientosContablesPagoCxC(
      pagoCuentaPorCobrar,
      [movimientoDetraccionIngreso],
      periodoContable,
      data.empresaId,
      data.creadoPor,
      tx
    );
    if (asientosGenerados && asientosGenerados.length > 0) {
      await tx.movimientoCaja.update({
        where: { id: movimientoDetraccionIngreso.id },
        data: { asientosGenerados: true }
      });
    }
  } catch (error) {
    // Igual que el flujo normal: un fallo del asiento no revierte la operación
  }

  // ── Recalcular la cuenta por cobrar ──
  const pagosRealizados = await tx.pagoCuentaPorCobrar.findMany({
    where: { cuentaPorCobrarId: Number(data.cuentaPorCobrarId) }
  });
  const totalPagado = redondear2(
    pagosRealizados.reduce((suma, pago) => suma + Number(pago.montoAplicadoDeuda || 0), 0)
  );
  const saldoPendiente = redondear2(Number(cuentaPorCobrar.montoTotal) - totalPagado);

  let nuevoEstado = ESTADOS_CXC.PENDIENTE;
  if (saldoPendiente <= 0) {
    nuevoEstado = ESTADOS_CXC.PAGADO;
  } else if (totalPagado > 0) {
    nuevoEstado = ESTADOS_CXC.PAGO_PARCIAL;
  } else if (new Date(cuentaPorCobrar.fechaVencimiento) < new Date()) {
    nuevoEstado = ESTADOS_CXC.VENCIDO;
  }
  await tx.cuentaPorCobrar.update({
    where: { id: Number(data.cuentaPorCobrarId) },
    data: { montoPagado: totalPagado, saldoPendiente, estadoId: nuevoEstado }
  });

  // ── Respuesta (misma estructura que el flujo normal) ──
  const saldoCuenta = await tx.saldoCuentaCorriente.findFirst({
    where: { movimientoCajaId: movimientoDetraccionIngreso.id },
    orderBy: { fecha: 'asc' }
  });

  return {
    success: true,
    correlativo: correlativo,
    pagoCuentaPorCobrar: pagoCuentaPorCobrarActualizado,
    movimientos: {
      ingreso: null,
      itf: null,
      comision: null,
      detraccionIngreso: movimientoDetraccionIngreso,
      autodetraccionEgreso: null,
      autodetraccionIngreso: null
    },
    conceptosSunat: {
      detraccion: detraccionActualizada,
      retencion: null,
      percepcion: null
    },
    asientosContables: asientosGenerados || [],
    saldosCuentaCorriente: saldoCuenta
      ? [
          {
            tipo: 'Detracción',
            saldoAnterior: Number(saldoCuenta.saldoAnterior),
            ingresos: Number(saldoCuenta.ingresos),
            egresos: Number(saldoCuenta.egresos),
            saldoActual: Number(saldoCuenta.saldoActual)
          }
        ]
      : [],
    resumen: {
      montoBruto: 0,
      montoITF: 0,
      montoComision: 0,
      montoDetraccion: montoDetraccion,
      montoNetoCaja: 0,
      montoAplicadoDeuda: montoDetraccion,
      saldoPendiente: saldoPendiente
    }
  };
};

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
      // Cancelación de solo la detracción (el neto ya se cobró): flujo propio, sin pago del neto
      if (esPagoSoloDetraccion(data)) {
        return await ejecutarPagoSoloDetraccion(tx, data);
      }

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

      // ✅ Copiar comprobante de factura al movimiento de ingreso
      const urlComprobanteIngreso = await copiarComprobanteFacturaAMovimiento(
        cuentaPorCobrar.preFactura?.urlPreFacturaPdf,
        movimientoIngreso.id
      );
      
      if (urlComprobanteIngreso) {
        await tx.movimientoCaja.update({
          where: { id: movimientoIngreso.id },
          data: { urlComprobanteOperacionMovCaja: urlComprobanteIngreso }
        });
      }

      // ✅ Actualizar saldo de cuenta corriente (INGRESO)
      if (data.cuentaBancariaId) {
        await actualizarSaldoCuentaCorriente({
          tx,
          cuentaCorrienteId: data.cuentaBancariaId,
          empresaId: data.empresaId,
          fecha: pagoCuentaPorCobrar.fechaContable,
          ingresos: data.montoPagado,
          egresos: 0,
          monedaMovimientoId: data.monedaPagoId,
          tipoCambio: data.tipoCambio,
          movimientoCajaId: movimientoIngreso.id
        });
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
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            cuentaPorCobrarId: cuentaPorCobrar.id,  // ✅ CRÍTICO: Asociar a la CxC para glosa
            monto: Number(data.montoITF),
            monedaId: Number(monedaITF),  // ✅ CORREGIDO: Moneda de la cuenta corriente
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

        // ✅ Copiar comprobante de factura al movimiento de ITF
        const urlComprobanteITF = await copiarComprobanteFacturaAMovimiento(
          cuentaPorCobrar.preFactura?.urlPreFacturaPdf,
          movimientoITF.id
        );
        
        if (urlComprobanteITF) {
          await tx.movimientoCaja.update({
            where: { id: movimientoITF.id },
            data: { urlComprobanteOperacionMovCaja: urlComprobanteITF }
          });
        }

        // ✅ Actualizar saldo de cuenta corriente (EGRESO por ITF)
        if (data.cuentaBancariaId) {
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: data.cuentaBancariaId,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorCobrar.fechaContable,
            ingresos: 0,
            egresos: data.montoITF,
            monedaMovimientoId: monedaITF,  // ✅ CORREGIDO: Moneda de la cuenta corriente
            tipoCambio: data.tipoCambio,
            movimientoCajaId: movimientoITF.id
          });
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
            entidadComercialId: Number(cuentaPorCobrar.clienteId),
            cuentaPorCobrarId: cuentaPorCobrar.id,  // ✅ CRÍTICO: Asociar a la CxC para glosa
            monto: Number(data.montoComision),
            monedaId: Number(monedaComision),  // ✅ CORREGIDO: Moneda de la cuenta corriente
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

        // ✅ Copiar comprobante de factura al movimiento de Comisión
        const urlComprobanteComision = await copiarComprobanteFacturaAMovimiento(
          cuentaPorCobrar.preFactura?.urlPreFacturaPdf,
          movimientoComision.id
        );
        
        if (urlComprobanteComision) {
          await tx.movimientoCaja.update({
            where: { id: movimientoComision.id },
            data: { urlComprobanteOperacionMovCaja: urlComprobanteComision }
          });
        }

        // ✅ Actualizar saldo de cuenta corriente (EGRESO por Comisión)
        if (data.cuentaBancariaId) {
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: data.cuentaBancariaId,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorCobrar.fechaContable,
            ingresos: 0,
            egresos: data.montoComision,
            monedaMovimientoId: monedaComision,  // ✅ CORREGIDO: Moneda de la cuenta corriente
            tipoCambio: data.tipoCambio,
            movimientoCajaId: movimientoComision.id
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
            medioPagoId: MEDIO_PAGO_DEPOSITO_EN_CUENTA,
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

        // ✅ Actualizar saldo Banco Nación (INGRESO)
        if (cuentaBN) {
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: cuentaBN,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorCobrar.fechaContable,
            ingresos: data.montoDetraccionIngresado,
            egresos: 0,
            monedaMovimientoId: 1, // Detracción siempre en PEN
            tipoCambio: data.tipoCambio,
            movimientoCajaId: movimientoDetraccionIngreso.id
          });
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
              tipoMovimientoId: TIPOS_MOVIMIENTO.DETRACCION_SALIDA,  // ✅ Tipo 165 (SUNAT - igual que ingreso)
              empresaId: Number(data.empresaId),
              entidadComercialId: Number(cuentaPorCobrar.clienteId),
              monto: Number(data.montoDetraccionIngresado),
              monedaId: Number(data.monedaPagoId),
              medioPagoId: MEDIO_PAGO_DEPOSITO_EN_CUENTA,
              cuentaCorrienteOrigenId: cuentaOrigenAutodet,
              cuentaCorrienteDestinoId: null,
              fechaOperacionMovCaja: new Date(data.fechaPago),
              descripcion: `Autodetracción Egreso - ${glosa}`,  // ✅ Descripción clara para diferenciarlo
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

          
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: cuentaOrigenAutodet,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorCobrar.fechaContable,
            ingresos: 0,
            egresos: data.montoDetraccionIngresado,
            monedaMovimientoId: 1, // Autodetracción siempre en PEN
            tipoCambio: data.tipoCambio,
            movimientoCajaId: movimientoAutodetraccionEgreso.id
          });
        }

        // ✅ MOVIMIENTO 2: INGRESO a Banco Nación
        if (cuentaBN) {
          movimientoAutodetraccionIngreso = await tx.movimientoCaja.create({
            data: {
              refOperacionEspecializadaMovCaja: correlativo,
              tipoMovimientoId: TIPOS_MOVIMIENTO.DETRACCION_INGRESO,
              empresaId: Number(data.empresaId),
              entidadComercialId: Number(cuentaPorCobrar.clienteId),
              monto: Number(data.montoDetraccionIngresado),
              monedaId: Number(data.monedaPagoId),
              medioPagoId: MEDIO_PAGO_DEPOSITO_EN_CUENTA,
              cuentaCorrienteOrigenId: null,
              cuentaCorrienteDestinoId: cuentaBN,
              fechaOperacionMovCaja: new Date(data.fechaPago),
              descripcion: `Autodetracción (Ingreso BN) - ${glosa}`,
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

          // Actualizar saldo cuenta DESTINO (INGRESO BN)
          await actualizarSaldoCuentaCorriente({
            tx,
            cuentaCorrienteId: cuentaBN,
            empresaId: data.empresaId,
            fecha: pagoCuentaPorCobrar.fechaContable,
            ingresos: data.montoDetraccionIngresado,
            egresos: 0,
            monedaMovimientoId: 1, // Autodetracción siempre en PEN
            tipoCambio: data.tipoCambio,
            movimientoCajaId: movimientoAutodetraccionIngreso.id
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
        movimientoAutodetraccionEgreso,   // ✅ Egreso de cuenta empresa
        movimientoAutodetraccionIngreso   // ✅ Ingreso a Banco Nación
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
 
          // ✅ ACTUALIZAR CAMPO asientosGenerados EN CADA MOVIMIENTO
          if (asientosGenerados && asientosGenerados.length > 0) {
            
            for (const movimiento of movimientosParaAsientos) {
              await tx.movimientoCaja.update({
                where: { id: movimiento.id },
                data: { asientosGenerados: true }
              });
            }
          }
          
        } catch (error) {
         
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
      // ✅ ENFOQUE ESTÁNDAR: Obtener TODOS los saldos de TODOS los movimientos en UNA consulta
      const saldosCuentaCorriente = [];
      
      // Recopilar IDs de todos los movimientos creados
      const todosLosMovimientos = [
        movimientoIngreso,
        movimientoITF,
        movimientoComision,
        movimientoDetraccionIngreso,
        movimientoAutodetraccionEgreso,   // ✅ Egreso de cuenta empresa
        movimientoAutodetraccionIngreso   // ✅ Ingreso a Banco Nación
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

        // Mapear cada saldo a su tipo de movimiento
        todosSaldos.forEach((saldo) => {
          let tipo = 'Desconocido';
          
          if (saldo.movimientoCajaId === movimientoIngreso.id) {
            tipo = 'Ingreso';
          } else if (movimientoITF && saldo.movimientoCajaId === movimientoITF.id) {
            tipo = 'ITF';
          } else if (movimientoComision && saldo.movimientoCajaId === movimientoComision.id) {
            tipo = 'Comisión';
          } else if (movimientoDetraccionIngreso && saldo.movimientoCajaId === movimientoDetraccionIngreso.id) {
            tipo = 'Detracción';
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
        pagoCuentaPorCobrar: pagoCuentaPorCobrarActualizado,
        movimientos: {
          ingreso: movimientoIngreso,
          itf: movimientoITF,
          comision: movimientoComision,
          detraccionIngreso: movimientoDetraccionIngreso,
          autodetraccionEgreso: movimientoAutodetraccionEgreso,    // ✅ Egreso cuenta empresa
          autodetraccionIngreso: movimientoAutodetraccionIngreso   // ✅ Ingreso Banco Nación
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
          montoBruto: Number(movimientoIngreso.monto),
          montoITF: movimientoITF ? Number(movimientoITF.monto) : 0,
          montoComision: movimientoComision ? Number(movimientoComision.monto) : 0,
          montoDetraccion: movimientoAutodetraccionEgreso ? Number(movimientoAutodetraccionEgreso.monto) : 0,
          montoNetoCaja: Number(movimientoIngreso.monto) -
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
    
   
    // Esperar un momento para que Prisma actualice las relaciones inversas
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const movimientosConAsientos = [
      resultado.movimientos.ingreso,
      resultado.movimientos.itf,
      resultado.movimientos.comision,
      resultado.movimientos.detraccionIngreso,
      resultado.movimientos.autodetraccionEgreso,    // ✅ Egreso cuenta empresa
      resultado.movimientos.autodetraccionIngreso    // ✅ Ingreso Banco Nación
    ].filter(m => m !== null && m !== undefined);


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
    

    
    const exitosos = vouchersResultados.filter(v => v.success).length;
    const fallidos = vouchersResultados.filter(v => !v.success).length;
    

  

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
// FUNCIONES AUXILIARES: GENERACIÓN DE VOUCHERS CONTABLES
// ════════════════════════════════════════════════════════════

/**
 * Generar y guardar voucher contable para un movimiento
 * @param {Object} movimiento - MovimientoCaja con asientos contables
 * @returns {Promise<string>} - URL del PDF generado
 */
const generarYGuardarVoucherContable = async (movimientoId) => {

  
  try {
    // 0. Verificar que el movimiento tenga asientos contables
    const movimientoConAsientos = await prisma.movimientoCaja.findUnique({
      where: { id: Number(movimientoId) },
      include: {
        asientosContables: true
      }
    });
    
    if (!movimientoConAsientos) {
      throw new Error(`Movimiento ${movimientoId} no encontrado`);
    }
    
    // 1. Generar PDF del voucher contable
    const pdfBuffer = await generarVoucherContableMovimientoCaja(movimientoId);

    // 2. Definir directorio y nombre del archivo (✅ RUTA ESTÁNDAR)
    const uploadDir = path.join(__dirname, '../../../uploads/pdf-system/movimiento-caja-voucher-contable');
    const fileName = `MOVIMIENTO-CAJA-VOUCHER-CONTABLE-${movimientoId}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    
 
    await fs.mkdir(uploadDir, { recursive: true });

    // 3. Guardar archivo

    await fs.writeFile(filePath, pdfBuffer);

    // 4. Construir URL relativa (✅ RUTA ESTÁNDAR)
    const urlRelativa = `/uploads/pdf-system/movimiento-caja-voucher-contable/${fileName}`;


    // 5. Actualizar MovimientoCaja con la URL
    await prisma.movimientoCaja.update({
      where: { id: Number(movimientoId) },
      data: { urlDocumentoMovCaja: urlRelativa }
    });
   

    return urlRelativa;
  } catch (error) {
   
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