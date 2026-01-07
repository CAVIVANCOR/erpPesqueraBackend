import { ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio de integración con Nubefact
 * Maneja el envío de comprobantes electrónicos a SUNAT vía Nubefact
 * Documentado en español según manual Nubefact API JSON V1
 * Usa fetch nativo de Node.js (v18+)
 */

const getNubefactConfig = () => {
  return {
    url: process.env.NUBEFACT_URL || 'https://api.nubefact.com/api/v1/',
    ruta: process.env.NUBEFACT_RUTA || '',
    token: process.env.NUBEFACT_TOKEN || ''
  };
};

const enviarPeticionNubefact = async (data) => {
  const config = getNubefactConfig();
  
  if (!config.ruta || !config.token) {
    throw new ValidationError('Configuración de Nubefact incompleta. Verificar NUBEFACT_RUTA y NUBEFACT_TOKEN en .env');
  }

  const url = `${config.url}${config.ruta}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const resultado = await response.json();

    if (!response.ok) {
      throw new ConflictError(resultado.errors || 'Error al comunicarse con Nubefact', resultado);
    }
    
    return resultado;
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ConflictError('No se pudo conectar con Nubefact. Verificar conexión a internet.');
    }
    throw error;
  }
};

/**
 * Convierte un ComprobanteElectronico a formato JSON de Nubefact
 * @param {Object} comprobante - ComprobanteElectronico con todas sus relaciones
 * @param {Array} detalles - DetalleComprobante[]
 * @param {Number} porcentajeIgv - Porcentaje de IGV desde PreFactura (ej: 18.00, 0.00)
 */
const convertirComprobanteANubefact = (comprobante, detalles, porcentajeIgv = 18.00) => {
  const tipoComprobanteMap = {
    '01': 1,
    '03': 2,
    '07': 3,
    '08': 4
  };

  const totales = calcularTotalesPorAfectacion(detalles);

  const jsonNubefact = {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: tipoComprobanteMap[comprobante.tipoComprobante.codigo] || 1,
    serie: comprobante.numeroSerie,
    numero: parseInt(comprobante.numeroCorrelativo),
    sunat_transaction: comprobante.nubefactSunatTransaction || 1,
    cliente_tipo_de_documento: comprobante.tipoDocumentoCliente.codigo === '6' ? 6 : 1,
    cliente_numero_de_documento: comprobante.numeroDocumentoCliente,
    cliente_denominacion: comprobante.razonSocialCliente,
    cliente_direccion: comprobante.direccionCliente || '',
    cliente_email: comprobante.emailCliente || '',
    cliente_email_1: '',
    cliente_email_2: '',
    fecha_de_emision: formatearFecha(comprobante.fechaEmision),
    fecha_de_vencimiento: comprobante.fechaVencimiento ? formatearFecha(comprobante.fechaVencimiento) : '',
    moneda: comprobante.moneda.codigo === 'USD' ? 2 : 1,
    tipo_de_cambio: Number(comprobante.tipoCambio) || 1,
    porcentaje_de_igv: Number(porcentajeIgv),
    descuento_global: '',
    total_descuento: totales.totalDescuentos > 0 ? Number(totales.totalDescuentos).toFixed(2) : '',
    total_anticipo: '',
    total_gravada: Number(totales.totalGravada).toFixed(2),
    total_inafecta: totales.totalInafecta > 0 ? Number(totales.totalInafecta).toFixed(2) : '',
    total_exonerada: totales.totalExonerada > 0 ? Number(totales.totalExonerada).toFixed(2) : '',
    total_igv: Number(totales.totalIGV).toFixed(2),
    total_gratuita: '',
    total_otros_cargos: '',
    total: Number(totales.total).toFixed(2),
    percepcion_tipo: comprobante.sujetoPercepcion ? (comprobante.codigoPercepcion || '') : '',
    percepcion_base_imponible: comprobante.sujetoPercepcion && comprobante.montoPercepcion ? Number(totales.total).toFixed(2) : '',
    total_percepcion: comprobante.sujetoPercepcion && comprobante.montoPercepcion ? Number(comprobante.montoPercepcion).toFixed(2) : '',
    total_incluido_percepcion: comprobante.sujetoPercepcion && comprobante.montoPercepcion ? (Number(totales.total) + Number(comprobante.montoPercepcion)).toFixed(2) : '',
    detraccion: comprobante.sujetoDetraccion || false,
    observaciones: comprobante.observaciones || '',
    documento_que_se_modifica_tipo: '',
    documento_que_se_modifica_serie: '',
    documento_que_se_modifica_numero: '',
    tipo_de_nota_de_credito: '',
    tipo_de_nota_de_debito: '',
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: comprobante.emailCliente ? true : false,
    codigo_unico: '',
    condiciones_de_pago: comprobante.formaPago?.nombre || '',
    medio_de_pago: comprobante.formaPago?.codigo || '',
    placa_vehiculo: '',
    orden_compra_servicio: comprobante.ordenCompra || '',
    tabla_personalizada_codigo: '',
    formato_de_pdf: 'A4',
    generado_por_contingencia: '',
    items: detalles.map((detalle, index) => ({
      unidad_de_medida: detalle.codigoUnidadSUNAT || 'NIU',
      codigo: detalle.codigoProducto || '',
      codigo_producto_sunat: detalle.codigoProductoSunat || '',
      descripcion: detalle.descripcion,
      cantidad: Number(detalle.cantidad),
      valor_unitario: Number(detalle.valorUnitario).toFixed(6),
      precio_unitario: Number(detalle.precioUnitario).toFixed(6),
      descuento: detalle.descuento ? Number(detalle.descuento).toFixed(2) : '',
      subtotal: Number(detalle.subtotal).toFixed(2),
      tipo_de_igv: obtenerTipoIGVNubefact(detalle.tipoAfectacionIGV),
      igv: Number(detalle.igv).toFixed(2),
      total: Number(detalle.total).toFixed(2),
      anticipo_regularizacion: detalle.anticipo || false,
      anticipo_documento_serie: '',
      anticipo_documento_numero: ''
    })),
    guias: comprobante.guiaRemision ? [{
      guia_tipo: '09',
      guia_serie_numero: comprobante.guiaRemision
    }] : []
  };

  if (comprobante.sujetoDetraccion) {
    jsonNubefact.detraccion_tipo = comprobante.codigoDetraccion || '';
    jsonNubefact.detraccion_total = comprobante.montoDetraccion ? Number(comprobante.montoDetraccion).toFixed(2) : '';
    jsonNubefact.detraccion_porcentaje = comprobante.porcentajeDetraccion ? Number(comprobante.porcentajeDetraccion).toFixed(2) : '';
  }

  return jsonNubefact;
};

const obtenerTipoIGVNubefact = (tipoAfectacionIGV) => {
  if (!tipoAfectacionIGV) return 1;
  
  const mapeoTipoIGV = {
    '10': 1,
    '11': 2,
    '12': 3,
    '13': 4,
    '14': 5,
    '15': 6,
    '16': 7,
    '20': 8,
    '30': 9,
    '31': 10,
    '32': 11,
    '33': 12,
    '34': 13,
    '35': 14,
    '36': 15,
    '40': 16,
  };
  
  return mapeoTipoIGV[tipoAfectacionIGV.codigo] || 1;
};

const calcularTotalesPorAfectacion = (detalles) => {
  let totalGravada = 0;
  let totalExonerada = 0;
  let totalInafecta = 0;
  let totalIGV = 0;
  let totalDescuentos = 0;
  let total = 0;

  detalles.forEach(detalle => {
    const codigoAfectacion = detalle.tipoAfectacionIGV?.codigo || '10';
    const subtotal = Number(detalle.subtotal || 0);
    const igv = Number(detalle.igv || 0);
    const descuento = Number(detalle.descuento || 0);
    const totalLinea = Number(detalle.total || 0);

    if (codigoAfectacion.startsWith('1')) {
      totalGravada += subtotal;
      totalIGV += igv;
    } else if (codigoAfectacion.startsWith('2')) {
      totalExonerada += subtotal;
    } else if (codigoAfectacion.startsWith('3')) {
      totalInafecta += subtotal;
    } else if (codigoAfectacion === '40') {
      totalGravada += subtotal;
    }

    totalDescuentos += descuento;
    total += totalLinea;
  });

  return {
    totalGravada,
    totalExonerada,
    totalInafecta,
    totalIGV,
    totalDescuentos,
    total
  };
};

const formatearFecha = (fecha) => {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}-${mes}-${anio}`;
};

/**
 * OPERACIÓN 1: Generar comprobante en Nubefact
 * @param {Object} comprobante - ComprobanteElectronico
 * @param {Array} detalles - DetalleComprobante[]
 * @param {Number} porcentajeIgv - Porcentaje IGV desde PreFactura
 */
const generarComprobante = async (comprobante, detalles, porcentajeIgv = 18.00) => {
  try {
    const jsonNubefact = convertirComprobanteANubefact(comprobante, detalles, porcentajeIgv);
    const respuesta = await enviarPeticionNubefact(jsonNubefact);
    
    return {
      success: true,
      enlace: respuesta.enlace || '',
      enlace_del_pdf: respuesta.enlace_del_pdf || '',
      enlace_del_xml: respuesta.enlace_del_xml || '',
      enlace_del_cdr: respuesta.enlace_del_cdr || '',
      aceptada_por_sunat: respuesta.aceptada_por_sunat || false,
      sunat_description: respuesta.sunat_description || '',
      sunat_note: respuesta.sunat_note || '',
      sunat_responsecode: respuesta.sunat_responsecode || '',
      sunat_soap_error: respuesta.sunat_soap_error || '',
      cadena_para_codigo_qr: respuesta.cadena_para_codigo_qr || '',
      codigo_hash: respuesta.codigo_hash || ''
    };
  } catch (error) {
    throw error;
  }
};

const consultarComprobante = async (tipoComprobante, serie, numero) => {
  try {
    const tipoComprobanteMap = {
      '01': 1,
      '03': 2,
      '07': 3,
      '08': 4
    };

    const data = {
      operacion: 'consultar_comprobante',
      tipo_de_comprobante: tipoComprobanteMap[tipoComprobante] || 1,
      serie: serie,
      numero: parseInt(numero)
    };

    const respuesta = await enviarPeticionNubefact(data);
    
    return {
      success: true,
      enlace: respuesta.enlace || '',
      enlace_del_pdf: respuesta.enlace_del_pdf || '',
      enlace_del_xml: respuesta.enlace_del_xml || '',
      enlace_del_cdr: respuesta.enlace_del_cdr || '',
      aceptada_por_sunat: respuesta.aceptada_por_sunat || false,
      anulado: respuesta.anulado || false,
      sunat_description: respuesta.sunat_description || '',
      sunat_note: respuesta.sunat_note || '',
      sunat_responsecode: respuesta.sunat_responsecode || '',
      cadena_para_codigo_qr: respuesta.cadena_para_codigo_qr || '',
      codigo_hash: respuesta.codigo_hash || ''
    };
  } catch (error) {
    throw error;
  }
};

const anularComprobante = async (tipoComprobante, serie, numero, motivo) => {
  try {
    const tipoComprobanteMap = {
      '01': 1,
      '03': 2,
      '07': 3,
      '08': 4
    };

    const data = {
      operacion: 'generar_anulacion',
      tipo_de_comprobante: tipoComprobanteMap[tipoComprobante] || 1,
      serie: serie,
      numero: parseInt(numero),
      motivo: motivo || 'ANULACIÓN',
      codigo_unico: ''
    };

    const respuesta = await enviarPeticionNubefact(data);
    
    return {
      success: true,
      numero: respuesta.numero || 0,
      enlace: respuesta.enlace || '',
      sunat_ticket_numero: respuesta.sunat_ticket_numero || '',
      aceptada_por_sunat: respuesta.aceptada_por_sunat || false,
      sunat_description: respuesta.sunat_description || '',
      sunat_note: respuesta.sunat_note || '',
      sunat_responsecode: respuesta.sunat_responsecode || '',
      enlace_del_pdf: respuesta.enlace_del_pdf || '',
      enlace_del_xml: respuesta.enlace_del_xml || '',
      enlace_del_cdr: respuesta.enlace_del_cdr || ''
    };
  } catch (error) {
    throw error;
  }
};

const consultarAnulacion = async (tipoComprobante, serie, numero) => {
  try {
    const tipoComprobanteMap = {
      '01': 1,
      '03': 2,
      '07': 3,
      '08': 4
    };

    const data = {
      operacion: 'consultar_anulacion',
      tipo_de_comprobante: tipoComprobanteMap[tipoComprobante] || 1,
      serie: serie,
      numero: parseInt(numero)
    };

    const respuesta = await enviarPeticionNubefact(data);
    
    return {
      success: true,
      numero: respuesta.numero || 0,
      enlace: respuesta.enlace || '',
      sunat_ticket_numero: respuesta.sunat_ticket_numero || '',
      aceptada_por_sunat: respuesta.aceptada_por_sunat || false,
      sunat_description: respuesta.sunat_description || '',
      enlace_del_pdf: respuesta.enlace_del_pdf || '',
      enlace_del_xml: respuesta.enlace_del_xml || '',
      enlace_del_cdr: respuesta.enlace_del_cdr || ''
    };
  } catch (error) {
    throw error;
  }
};

export default {
  generarComprobante,
  consultarComprobante,
  anularComprobante,
  consultarAnulacion
};