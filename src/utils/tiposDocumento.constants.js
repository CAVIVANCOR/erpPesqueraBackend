/**
 * Constantes de Tipos de Documento del Sistema
 * Usadas para identificar documentos en backend y frontend
 */

// IDs de Tipos de Documento
export const TIPO_DOC_ID = {
  OTROS: 1n,
  FACTURA: 2n,
  RECIBO_HONORARIOS: 3n,
  BOLETA_VENTA: 4n,
  LIQUIDACION_COMPRA: 5n,
  BOLETO_TRANSPORTE: 6n,
  PORTE_AEREO: 7n,
  NOTA_CREDITO: 8n,
  NOTA_DEBITO: 9n,
  GUIA_REMISION: 10n,
  RECIBO_ARRENDAMIENTO: 11n,
  COMPROBANTE_RETENCION: 12n,
  VALE_INGRESO: 13n,
  VALE_SALIDA: 14n,
  NOTA_TRANSFERENCIA: 15n,
  REQUERIMIENTO_COMPRA: 16n,
  ORDEN_COMPRA: 17n,
  COTIZACION_VENTA: 18n,
  PRE_FACTURA: 19n,
  CONTRATO: 20n,
  ORDEN_TRABAJO: 21n,
  SI_CXC: 22n,
  SI_CXP: 23n,
  SI_ANTICIPO_PROVEEDOR: 24n,
  SI_ANTICIPO_CLIENTE: 25n,
  DETRACCION: 26n,
  RETENCION: 27n,
  PERCEPCION: 28n,
  SI_DET_CXP: 29n,
  DOC_COBRANZA: 30n,
};

// Códigos SUNAT de Tipos de Documento
export const CODIGO_SUNAT = {
  OTROS: "00",
  FACTURA: "01",
  RECIBO_HONORARIOS: "02",
  BOLETA_VENTA: "03",
  LIQUIDACION_COMPRA: "04",
  BOLETO_TRANSPORTE: "05",
  PORTE_AEREO: "06",
  NOTA_CREDITO: "07",
  NOTA_DEBITO: "08",
  GUIA_REMISION: "09",
  RECIBO_ARRENDAMIENTO: "10",
  COMPROBANTE_RETENCION: "20",
};

// Documentos que deben tener monto negativo
export const DOCS_MONTO_NEGATIVO = [
  TIPO_DOC_ID.NOTA_CREDITO,
];

// Documentos que deben tener monto negativo por código SUNAT
export const CODIGOS_SUNAT_MONTO_NEGATIVO = [
  CODIGO_SUNAT.NOTA_CREDITO,
];

/**
 * Verifica si un tipo de documento debe tener monto negativo
 * @param {BigInt} tipoDocumentoId - ID del tipo de documento
 * @returns {boolean}
 */
export const esTipoDocumentoNegativo = (tipoDocumentoId) => {
  return DOCS_MONTO_NEGATIVO.includes(tipoDocumentoId);
};

/**
 * Verifica si un código SUNAT debe tener monto negativo
 * @param {string} codigoSunat - Código SUNAT del documento
 * @returns {boolean}
 */
export const esCodigoSunatNegativo = (codigoSunat) => {
  return CODIGOS_SUNAT_MONTO_NEGATIVO.includes(codigoSunat);
};

/**
 * Aplica el signo correcto al monto según el tipo de documento
 * @param {number} monto - Monto a ajustar
 * @param {BigInt} tipoDocumentoId - ID del tipo de documento
 * @returns {number}
 */
export const aplicarSignoMonto = (monto, tipoDocumentoId) => {
  if (esTipoDocumentoNegativo(tipoDocumentoId)) {
    return -Math.abs(monto);
  }
  return Math.abs(monto);
};

/**
 * Aplica el signo correcto al monto según código SUNAT
 * @param {number} monto - Monto a ajustar
 * @param {string} codigoSunat - Código SUNAT del documento
 * @returns {number}
 */
export const aplicarSignoMontoPorCodigo = (monto, codigoSunat) => {
  if (esCodigoSunatNegativo(codigoSunat)) {
    return -Math.abs(monto);
  }
  return Math.abs(monto);
};