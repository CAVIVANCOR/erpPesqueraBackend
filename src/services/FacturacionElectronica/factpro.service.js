import { ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Integración con el proveedor de facturación electrónica Factpro (API v3).
 * Documentación: https://docs.factpro.la/
 *
 * - Cada empresa del ERP usa su propio token (Empresa.facturacionElectronicaToken) como Bearer.
 * - La URL base (Empresa.facturacionElectronicaUrl) es, por ejemplo, https://api.factpro.la/api/v3
 * - Demo y producción usan la misma URL: lo que cambia es el token de la empresa en Factpro.
 * - Este servicio NO accede a la base de datos: arma el JSON, llama al API y normaliza la respuesta.
 *   Quien lo invoca (controlador) persiste el resultado y la bitácora de envíos (EnvioOSE).
 */

const ZONA_HORARIA = 'America/Lima';

// Estado "ACEPTADO" que devuelve Factpro en tipo_estado (01 = REGISTRADO, 05 = ACEPTADO)
const ESTADO_FACTPRO_ACEPTADO = '05';

// Catálogo 06 SUNAT -> código Factpro (tipo de documento de identidad del cliente)
const DOC_IDENTIDAD_FACTPRO = { '0': '1', '1': '2', '4': '3', '6': '4', '7': '5' };

// Catálogo 07 SUNAT (afectación IGV) -> código Factpro "tipo_tax"
const TIPO_TAX_FACTPRO = { '10': '1', '20': '20', '21': '21', '30': '30', '40': '40' };

// Catálogo 08 SUNAT (tipo de comprobante) -> código Factpro del documento afectado por una nota
const DOC_AFECTADO_FACTPRO = { '01': '7', '03': '8' };

// Catálogo 10 SUNAT (tipo de nota de débito) -> código Factpro
const TIPO_NOTA_DEBITO_FACTPRO = { '01': '14', '02': '15', '03': '16', '11': '17', '12': '18' };

/**
 * Valida y devuelve la configuración de la empresa emisora.
 */
const obtenerConfiguracion = (empresa) => {
  const url = String(empresa?.facturacionElectronicaUrl || '').trim().replace(/\/+$/, '');
  const token = String(empresa?.facturacionElectronicaToken || '').trim();
  if (!url || !token) {
    throw new ValidationError(
      `La empresa${empresa?.razonSocial ? ` ${empresa.razonSocial}` : ''} no tiene configurada la URL y el token de facturación electrónica. Complételos en Maestros > Empresas.`,
    );
  }
  return { url, token };
};

// Fecha en la zona horaria de Perú (evita que una medianoche local caiga en el día anterior o siguiente)
const fechaISO = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date(fecha));
const fechaDDMMAAAA = (fecha) => fechaISO(fecha).split('-').reverse().join('-');

/**
 * Envía una petición al API de Factpro y devuelve la respuesta ya validada.
 * Factpro responde { exito: false, mensaje } ante cualquier rechazo, que se informa tal cual al usuario.
 */
const enviarPeticion = async (config, ruta, payload) => {
  let respuesta;
  try {
    respuesta = await fetch(`${config.url}${ruta}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new ConflictError(`No se pudo conectar con Factpro (${config.url}). Verifique la conexión a internet y la URL de la empresa. Detalle: ${error.message}`);
  }

  const texto = await respuesta.text();
  let cuerpo;
  try {
    cuerpo = texto ? JSON.parse(texto) : {};
  } catch {
    throw new ConflictError(`Factpro respondió con un formato no válido (HTTP ${respuesta.status}): ${texto.slice(0, 300)}`);
  }

  if (!respuesta.ok || cuerpo.exito === false) {
    const detalle = cuerpo.mensaje || cuerpo.message || cuerpo.errors || texto.slice(0, 300);
    throw new ConflictError(`Factpro rechazó la solicitud (HTTP ${respuesta.status}): ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`);
  }
  return cuerpo;
};

/**
 * Convierte la respuesta de Factpro a los campos genéricos del ERP.
 */
const normalizarRespuesta = (cuerpo) => ({
  codigoEstado: cuerpo.data?.tipo_estado || null,
  descripcionEstado: cuerpo.data?.descripcion_estado || null,
  aceptadoPorSunat: cuerpo.data?.tipo_estado === ESTADO_FACTPRO_ACEPTADO,
  hash: cuerpo.data?.hash || null,
  qr: cuerpo.data?.qr || null,
  enlacePDF: cuerpo.archivos?.pdf || null,
  enlaceXML: cuerpo.archivos?.xml || null,
  enlaceCDR: cuerpo.archivos?.cdr || null,
  eventos: cuerpo.eventos || [],
});

/**
 * Código "tipo_tax" de Factpro a partir de la afectación IGV (catálogo 07 SUNAT) de la línea.
 */
const tipoTaxDeLinea = (detalle) => {
  const codigo = detalle.tipoAfectacionIGV?.codigo;
  const tipoTax = TIPO_TAX_FACTPRO[codigo];
  if (!tipoTax) {
    throw new ValidationError(
      `La línea ${detalle.numeroLinea} (${detalle.descripcion}) tiene el tipo de afectación IGV "${codigo || 'sin definir'}", que Factpro no admite. Admitidos: ${Object.keys(TIPO_TAX_FACTPRO).join(', ')}.`,
    );
  }
  return tipoTax;
};

/**
 * Datos de la nota de crédito/débito: tipo, motivo y documento afectado.
 */
const datosNota = (comprobante, codigoTipo) => {
  const motivo = comprobante.motivoNotaCreditoDebito;
  const afectado = comprobante.comprobanteModifica;
  if (!motivo) throw new ValidationError(`La ${codigoTipo === '07' ? 'nota de crédito' : 'nota de débito'} ${comprobante.numeroCompleto} no tiene motivo registrado.`);
  if (!afectado) throw new ValidationError(`La nota ${comprobante.numeroCompleto} no tiene el comprobante que modifica.`);

  const esNotaDebito = codigoTipo === '08';
  if (Boolean(motivo.esNCND) !== esNotaDebito) {
    throw new ValidationError(`El motivo "${motivo.descripcion}" no corresponde a una ${esNotaDebito ? 'nota de débito' : 'nota de crédito'}.`);
  }
  const tipoNota = esNotaDebito ? TIPO_NOTA_DEBITO_FACTPRO[motivo.codigoSunat] : String(Number(motivo.codigoSunat));
  if (!tipoNota || tipoNota === 'NaN') {
    throw new ValidationError(`El motivo "${motivo.descripcion}" (código SUNAT ${motivo.codigoSunat}) no tiene equivalente en Factpro.`);
  }
  const tipoDocumentoAfectado = DOC_AFECTADO_FACTPRO[afectado.tipoComprobante?.codigoSunat || afectado.tipoComprobante?.codigo];
  if (!tipoDocumentoAfectado) {
    throw new ValidationError(`Solo se pueden emitir notas sobre facturas o boletas. El comprobante ${afectado.numeroCompleto} es de otro tipo.`);
  }
  return {
    tipo_nota: tipoNota,
    motivo_nota: motivo.descripcion,
    documento_afectado: { tipo_documento: tipoDocumentoAfectado, serie: afectado.numeroSerie, numero: afectado.numeroCorrelativo },
  };
};

/**
 * Condición de pago: contado, o crédito con las cuotas del comprobante (el vencimiento y monto de cada una son obligatorios en Perú).
 */
const condicionDePago = (comprobante) => {
  if (!comprobante.formaPago?.esCredito) {
    return [{ tipo_de_condicion: '0', forma_de_pago: '0', monto: 0 }];
  }
  if (!comprobante.cuotas?.length) {
    throw new ValidationError(`El comprobante ${comprobante.numeroCompleto} es al crédito pero no tiene cuotas de pago registradas.`);
  }
  return comprobante.cuotas.map((cuota) => ({
    tipo_de_condicion: '1',
    forma_de_pago: '',
    fecha: fechaDDMMAAAA(cuota.fechaVencimiento),
    monto: Number(cuota.montoCuota),
  }));
};

/**
 * Arma el JSON de emisión (factura, boleta, nota de crédito o nota de débito) del comprobante.
 * @param {Object} comprobante ComprobanteElectronico con: tipoComprobante, tipoDocumentoCliente, moneda, formaPago, cuotas,
 *   motivoNotaCreditoDebito, comprobanteModifica (con tipoComprobante) y detalles (con tipoAfectacionIGV).
 */
const construirDocumento = (comprobante) => {
  const codigoTipo = comprobante.tipoComprobante?.codigoSunat || comprobante.tipoComprobante?.codigo;
  if (!['01', '03', '07', '08'].includes(codigoTipo)) {
    throw new ValidationError(`El tipo de comprobante "${codigoTipo}" no se puede emitir: solo factura (01), boleta (03), nota de crédito (07) y nota de débito (08).`);
  }
  if (!comprobante.detalles?.length) {
    throw new ValidationError(`El comprobante ${comprobante.numeroCompleto} no tiene líneas de detalle.`);
  }
  if (comprobante.sujetoPercepcion) {
    throw new ValidationError('La emisión de comprobantes con percepción aún no está soportada por la integración con Factpro.');
  }

  const tipoDocumentoCliente = DOC_IDENTIDAD_FACTPRO[comprobante.tipoDocumentoCliente?.codSunat];
  if (!tipoDocumentoCliente) {
    throw new ValidationError(`El tipo de documento del cliente (código SUNAT "${comprobante.tipoDocumentoCliente?.codSunat}") no tiene equivalente en Factpro.`);
  }

  const items = comprobante.detalles.map((detalle) => ({
    unidad: detalle.codigoUnidadSUNAT || 'NIU',
    codigo: detalle.codigoProducto || '',
    descripcion: detalle.descripcion,
    cantidad: Number(detalle.cantidad),
    // El precio unitario del comprobante ya incluye IGV
    precio: Number(detalle.precioUnitario),
    incluye_tax: true,
    tipo_tax: tipoTaxDeLinea(detalle),
    descuento: Number(detalle.descuento || 0),
  }));

  const esExportacion = items.some((item) => item.tipo_tax === '40');
  const esNota = codigoTipo === '07' || codigoTipo === '08';

  const documento = {
    serie: comprobante.numeroSerie,
    numero: comprobante.numeroCorrelativo,
    fecha_de_emision: fechaISO(comprobante.fechaEmision),
    moneda: comprobante.moneda?.codigoSunat,
    tipo_operacion: comprobante.sujetoDetraccion ? '3' : esExportacion ? '2' : '1',
    enviar_automaticamente_al_cliente: false,
    cliente: {
      cliente_tipo_documento: tipoDocumentoCliente,
      cliente_numero_documento: comprobante.numeroDocumentoCliente,
      cliente_denominacion: comprobante.razonSocialCliente,
      cliente_direccion: comprobante.direccionCliente || '',
      cliente_email: comprobante.emailCliente || '',
      cliente_telefono: '',
    },
    items,
    observaciones: comprobante.observaciones || '',
    formato_pdf: 'a4',
  };

  if (esNota) {
    Object.assign(documento, datosNota(comprobante, codigoTipo));
  } else {
    documento.condicion_de_pago = condicionDePago(comprobante);
  }

  if (comprobante.sujetoDetraccion) {
    if (!comprobante.codigoDetraccion) {
      throw new ValidationError(`El comprobante ${comprobante.numeroCompleto} está sujeto a detracción pero no tiene el código de detracción.`);
    }
    documento.detraccion = { codigo: comprobante.codigoDetraccion, forma_de_pago: '1' };
  }

  return documento;
};

/**
 * Emite el documento en Factpro (POST /documentos).
 */
const emitirDocumento = async (empresa, documento) => {
  const respuesta = await enviarPeticion(obtenerConfiguracion(empresa), '/documentos', documento);
  return { crudo: respuesta, resultado: normalizarRespuesta(respuesta) };
};

/**
 * Consulta el estado del documento en Factpro (POST /consulta).
 */
const consultarDocumento = async (empresa, serie, numero) => {
  const respuesta = await enviarPeticion(obtenerConfiguracion(empresa), '/consulta', { serie, numero: Number(numero) });
  return { crudo: respuesta, resultado: normalizarRespuesta(respuesta) };
};

/**
 * Solicita la baja del documento (POST /anular). Factpro devuelve un ticket de SUNAT.
 */
const anularDocumento = async (empresa, serie, numero, motivo) => {
  if (!String(motivo || '').trim()) {
    throw new ValidationError('Ingrese el motivo de la anulación del comprobante.');
  }
  const respuesta = await enviarPeticion(obtenerConfiguracion(empresa), '/anular', { serie, numero: String(numero), motivo: String(motivo).trim() });
  return {
    crudo: respuesta,
    resultado: {
      ticket: respuesta.ticket || null,
      estadoDocumento: respuesta.estado_documento || null,
      enlacePDF: respuesta.archivos?.pdf || null,
      enlaceXML: respuesta.archivos?.xml || null,
      enlaceCDR: respuesta.archivos?.cdr || null,
      eventos: respuesta.eventos || [],
    },
  };
};

export default {
  construirDocumento,
  emitirDocumento,
  consultarDocumento,
  anularDocumento,
};
