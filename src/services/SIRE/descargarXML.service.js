import { ValidationError } from '../../utils/errors.js';
import { XMLParser } from 'fast-xml-parser';
import AdmZip from 'adm-zip';

/**
 * Descarga el XML de un comprobante individual usando json.pe
 * PATRÓN EXACTO copiado de generarPDFIndividual que YA FUNCIONA
 */
async function descargarXmlPorCAR(empresa, numCar) {
  // Descomponer el CAR (EXACTO como generarPDFIndividual)
  const rucProveedor = numCar.substring(0, 11);
  const tipoDoc = numCar.substring(11, 13);
  const serie = numCar.substring(13, 17);
  const numeroStr = numCar.substring(17, 27);
  const numero = parseInt(numeroStr, 10).toString(); // Quitar ceros a la izquierda

  const jsonPeToken = process.env.JSONPE_TOKEN;

  if (!jsonPeToken) {
    throw new ValidationError('Token de json.pe no configurado en variables de entorno');
  }

  const requestBody = {
    ruc: empresa.ruc,
    usuario: empresa.sunatUsuarioSol,
    password: empresa.sunatClaveSol,
    proveedor: rucProveedor,
    tipo_doc: tipoDoc,
    serie: serie,
    correlativo: numero
  };

  const xmlResponse = await fetch('https://api.json.pe/api/sunat/xml', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jsonPeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!xmlResponse.ok) {
    const errorText = await xmlResponse.text();

    // Parsear error para detectar falta de créditos
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message && errorData.message.includes('créditos')) {
        throw new ValidationError('⚠️ CRÉDITOS AGOTADOS: No tiene créditos suficientes en json.pe. Renueve su plan para continuar descargando XMLs desde SUNAT.');
      }
    } catch (parseError) {
      // Si no se puede parsear, usar mensaje genérico
    }

    throw new ValidationError(`Error descargando XML desde SUNAT: ${xmlResponse.statusText}`);
  }

  const xmlData = await xmlResponse.json();

  if (!xmlData.success || !xmlData.data?.xml_base64) {
    const errorMsg = xmlData.message || 'No se pudo obtener el XML';

    // Detectar mensaje de créditos agotados
    if (errorMsg.includes('créditos') || errorMsg.includes('plan')) {
      throw new ValidationError('⚠️ CRÉDITOS AGOTADOS: No tiene créditos suficientes en json.pe. Renueve su plan para continuar descargando XMLs desde SUNAT.');
    }

    throw new ValidationError(errorMsg);
  }

  // El endpoint /api/sunat/xml devuelve xml_base64 (que es un ZIP con el XML)
  const xmlZipBuffer = Buffer.from(xmlData.data.xml_base64, 'base64');
  const xmlZip = new AdmZip(xmlZipBuffer);
  const xmlZipEntries = xmlZip.getEntries();

  if (xmlZipEntries.length === 0) {
    throw new ValidationError('El ZIP del XML está vacío');
  }

  // Extraer el primer archivo XML del ZIP
  const xmlEntry = xmlZipEntries[0];
  const xmlBuffer = xmlEntry.getData();
  const xmlString = xmlBuffer.toString('utf-8');

  return xmlString;
}

/**
 * Parsea el XML UBL 2.1 y extrae los campos clave
 */
function parsearXmlUbl(xmlString) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const parsed = parser.parse(xmlString);
  const invoice = parsed.Invoice || parsed.CreditNote || parsed.DebitNote;

  if (!invoice) {
    throw new ValidationError('El XML no tiene estructura UBL válida (Invoice/CreditNote/DebitNote)');
  }

  // Normalizar líneas de detalle
  const rawLines = invoice['cac:InvoiceLine'] || invoice['cac:CreditNoteLine'] || invoice['cac:DebitNoteLine'] || [];
  const linesArray = Array.isArray(rawLines) ? rawLines : [rawLines];

  const items = linesArray.map((line) => {
    const item = line['cac:Item'] || {};
    const price = line['cac:Price'] || {};
    return {
      descripcion: item['cbc:Description'] || 'SIN DESCRIPCION',
      cantidad: parseFloat(line['cbc:InvoicedQuantity']?.['#text'] || line['cbc:CreditedQuantity']?.['#text'] || line['cbc:DebitedQuantity']?.['#text'] || 1),
      unidadMedida: line['cbc:InvoicedQuantity']?.['@_unitCode'] || line['cbc:CreditedQuantity']?.['@_unitCode'] || 'NIU',
      precioUnitario: parseFloat(price['cbc:PriceAmount']?.['#text'] || 0),
      montoTotal: parseFloat(line['cbc:LineExtensionAmount']?.['#text'] || 0)
    };
  });

  const legalTotal = invoice['cac:LegalMonetaryTotal'] || {};
  const supplier = invoice['cac:AccountingSupplierParty']?.['cac:Party'] || {};
  const customer = invoice['cac:AccountingCustomerParty']?.['cac:Party'] || {};

  // Dirección del emisor
  const supplierAddress = supplier['cac:PartyLegalEntity']?.['cac:RegistrationAddress'] || {};

  return {
    // Identificación del comprobante
    tipoDocumento: invoice['cbc:InvoiceTypeCode'] || invoice['cbc:CreditNoteTypeCode'] || invoice['cbc:DebitNoteTypeCode'] || '01',
    serieNumero: invoice['cbc:ID'] || 'F000-00000000',
    fechaEmision: invoice['cbc:IssueDate'] || '',
    horaEmision: invoice['cbc:IssueTime'] || '',
    moneda: invoice['cbc:DocumentCurrencyCode'] || 'PEN',

    // Emisor (Proveedor)
    emisorRuc: supplier['cac:PartyIdentification']?.['cbc:ID']?.['#text'] || supplier['cac:PartyIdentification']?.['cbc:ID'] || '',
    emisorRazonSocial: supplier['cac:PartyLegalEntity']?.['cbc:RegistrationName'] || '',
    emisorDireccion: supplierAddress['cbc:AddressLine']?.['cbc:Line'] || '',
    emisorUbigeo: supplierAddress['cbc:ID'] || '',

    // Receptor (Tu Empresa)
    receptorRuc: customer['cac:PartyIdentification']?.['cbc:ID']?.['#text'] || customer['cac:PartyIdentification']?.['cbc:ID'] || '',
    receptorRazonSocial: customer['cac:PartyLegalEntity']?.['cbc:RegistrationName'] || '',

    // Importes totales
    totalGravado: parseFloat(legalTotal['cbc:LineExtensionAmount']?.['#text'] || 0),
    totalIgv: parseFloat(invoice['cac:TaxTotal']?.[0]?.['cbc:TaxAmount']?.['#text'] || invoice['cac:TaxTotal']?.['cbc:TaxAmount']?.['#text'] || 0),
    totalExonerado: parseFloat(legalTotal['cbc:TaxExclusiveAmount']?.['#text'] || 0),
    totalInafecto: 0, // Calcular si existe
    totalGratuito: 0, // Calcular si existe
    totalDescuentos: parseFloat(legalTotal['cbc:AllowanceTotalAmount']?.['#text'] || 0),
    totalPagar: parseFloat(legalTotal['cbc:PayableAmount']?.['#text'] || 0),

    // Detalle de items
    items,

    // Hash y firma digital
    signatureValue: parsed['ds:Signature']?.['ds:SignatureValue'] || '',
    digestValue: parsed['ds:Signature']?.['ds:SignedInfo']?.['ds:Reference']?.['ds:DigestValue'] || ''
  };
}

/**
 * Descarga y parsea el XML de un comprobante
 */
async function obtenerDatosComprobanteDesdeXML(empresa, numCar) {
  const xmlString = await descargarXmlPorCAR(empresa, numCar);
  const datosParseados = parsearXmlUbl(xmlString);

  return {
    xmlOriginal: xmlString,
    datos: datosParseados
  };
}

export default {
  descargarXmlPorCAR,
  parsearXmlUbl,
  obtenerDatosComprobanteDesdeXML
};
