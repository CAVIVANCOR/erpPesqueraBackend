import { ValidationError } from '../../utils/errors.js';
import AppError from '../../utils/AppError.js';
import sunatAuthService from './sunatAuth.service.js';
import parseTXTService from './parseTXT.service.js';
import generarPDFService from './generarPDF.service.js';
import generarPDFProfesionalService from './generarPDFProfesional.service.js';
import descargarXMLService from './descargarXML.service.js';
import prisma from '../../config/prismaClient.js';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import unzipper from 'unzipper';
import { XMLParser } from 'fast-xml-parser';

// URLs según Manual SIRE Compras v28 (páginas 87-90)
// NOTA: El manual dice "apisire" pero el dominio real es "api-sire" (con guion)
const BASE_URL_PROPUESTA = 'https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rce/propuesta/web/propuesta';
const BASE_URL_PERIODOS = 'https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rvierce/padron/web/omisos/080000/periodos';

async function solicitarPropuestaCompras(empresa, periodo) {
  const token = await sunatAuthService.obtenerTokenSIRE(empresa);
  const urlPeriodos = BASE_URL_PERIODOS;
  const headersPeriodos = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  let responsePeriodos;
  try {
    responsePeriodos = await fetch(urlPeriodos, {
      method: 'GET',
      headers: headersPeriodos
    });
  } catch (fetchError) {
    throw fetchError;
  }
  
  if (responsePeriodos.ok) {
    const periodos = await responsePeriodos.json();
  } else {
    const errorPeriodos = await responsePeriodos.text();
  }
  // Según manual v28 página 89: exportacioncomprobantepropuesta (GET)
  // codTipoArchivo: 0=TXT, 1=CSV
  // codOrigenEnvio: 2=Servicio API (obligatorio)
  const url = `${BASE_URL_PROPUESTA}/${periodo}/exportacioncomprobantepropuesta?codTipoArchivo=0&codOrigenEnvio=2`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
  } catch (fetchError) {
    throw fetchError;
  }

  const bodyText = await response.text();
  
  if (!response.ok) {
    // Mensajes específicos según el error
    if (response.status === 401) {
      throw new ValidationError(
        'Error de autenticación SUNAT (401): Las credenciales de API no tienen permisos para SIRE Compras. ' +
        'Verifique que: 1) Las credenciales fueron generadas desde "Credenciales de API SUNAT" en Clave SOL, ' +
        '2) El RUC tiene acceso habilitado a SIRE Compras, ' +
        '3) Las credenciales están asociadas al módulo correcto.'
      );
    }
    
    throw new ValidationError(`Error SUNAT (${response.status}): ${bodyText || response.statusText}`);
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    throw new ValidationError('Respuesta de SUNAT no es JSON válido');
  }
  return data.numTicket;
}

async function consultarTicket(empresa, periodo, numTicket) {
  const token = await sunatAuthService.obtenerTokenSIRE(empresa);
  
  // Según manual v28 página 84-85: Servicio 5.31 consultar estado de envío de ticket
  const url = `https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rvierce/gestionprocesosmasivos/web/masivo/consultaestadotickets?perIni=${periodo}&perFin=${periodo}&page=1&perPage=20&numTicket=${numTicket}&codLibro=080000&codOrigenEnvio=2`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new ValidationError(`Error consultando ticket: ${response.statusText}`);
  }

  const data = await response.json();
  const registro = data.registros?.[0];
  
  // El archivo está en registro.archivoReporte, NO en detalleTicket.archivoReporte
  return {
    codEstado: registro?.codEstadoProceso,
    desEstado: registro?.desEstadoProceso,
    nomArchivo: registro?.archivoReporte?.[0]?.nomArchivoReporte,
    codTipoArchivoReporte: registro?.archivoReporte?.[0]?.codTipoAchivoReporte,
    codProceso: registro?.codProceso
  };
}

async function descargarArchivo(empresa, periodo, numTicket, estado) {
  const token = await sunatAuthService.obtenerTokenSIRE(empresa);
  
  // Según manual v28 página 86-87: Servicio 5.32 descargar archivo
  const url = `https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rvierce/gestionprocesosmasivos/web/masivo/archivoreporte?nomArchivoReporte=${estado.nomArchivo}&codTipoArchivoReporte=${estado.codTipoArchivoReporte || 'null'}&perTributario=${periodo}&codProceso=${estado.codProceso}&numTicket=${numTicket}&codLibro=080000`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new ValidationError(`Error descargando archivo: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function procesarDescargaSIRE(empresa, periodo) {
  const ticket = await solicitarPropuestaCompras(empresa, periodo);
  
  let intentos = 0;
  const maxIntentos = 40;
  let estado;
  
  while (intentos < maxIntentos) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    intentos++;
    
    estado = await consultarTicket(empresa, periodo, ticket);
    
    if (estado.codEstado === '06') {
      const zipBuffer = await descargarArchivo(empresa, periodo, ticket, estado);
      
      const uploadDir = path.join(process.cwd(), 'uploads', 'sire', periodo);
      await fs.mkdir(uploadDir, { recursive: true });
      
      const zipPath = path.join(uploadDir, 'original.zip');
      await fs.writeFile(zipPath, zipBuffer);
      
      const directory = await unzipper.Open.buffer(zipBuffer);
      
      // Buscar archivo CSV o TXT
      const dataFile = directory.files.find(f => f.path.endsWith('.csv') || f.path.endsWith('.txt'));
      
      if (!dataFile) {
        throw new ValidationError('No se encontró archivo CSV o TXT en el ZIP');
      }
      
      const extension = dataFile.path.endsWith('.csv') ? 'csv' : 'txt';
      const fileContent = await dataFile.buffer();
      const filePath = path.join(uploadDir, `extracted.${extension}`);
      await fs.writeFile(filePath, fileContent);
      
      return { txtPath: filePath, zipPath };
    }
    
    if (estado.codEstado === '07' || estado.codEstado === '10') {
      throw new ValidationError(`Error SUNAT: ${estado.desEstado}`);
    }
  }
  
  throw new ValidationError('Timeout esperando respuesta de SUNAT (2 minutos)');
}

async function descargarComprasSIRE(empresaId, periodo) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: BigInt(empresaId) },
    select: {
      id: true,
      ruc: true,
      razonSocial: true,
      sunatClientId: true,
      sunatClientSecret: true,
      sunatUsuarioSol: true,
      sunatClaveSol: true
    }
  });
  
  if (!empresa) {
    throw new ValidationError('Empresa no encontrada');
  }
  
  if (!empresa.sunatClientId || !empresa.sunatClientSecret || !empresa.sunatUsuarioSol || !empresa.sunatClaveSol) {
    throw new ValidationError('Configure las credenciales SUNAT SIRE en la empresa');
  }
  
  const { txtPath } = await procesarDescargaSIRE(empresa, periodo);
  
  const resultado = await parseTXTService.parsearTXTCompras(txtPath, BigInt(empresaId));
  
  // NOTA: Descarga de XML/PDF desactivada temporalmente por errores de SUNAT
  // Los documentos se importarán sin PDF adjunto
  
  return {
    success: true,
    ...resultado
  };
}

async function importarDocumentos(empresaId, documentos, usuarioId) {
  const estadoPendiente = await prisma.estadoMultiFuncion.findFirst({
    where: { nombre: 'PENDIENTE', activo: true }
  });
  
  const tipoDocFactura = await prisma.tipoDocumento.findFirst({
    where: { codigoSunat: '01' }
  });
  
  const monedaPEN = await prisma.moneda.findFirst({
    where: { codigo: 'PEN' }
  });
  
  const importados = [];
  
  for (const doc of documentos) {
    let proveedor = await prisma.entidadComercial.findFirst({
      where: {
        empresaId: 1,
        numeroDocumento: doc.rucProveedor
      }
    });
    
    if (!proveedor) {
      const tipoDocRUC = await prisma.tipoDocumento.findFirst({
        where: { codigoSunat: '6' }
      });
      
      const tipoEntidadProveedor = await prisma.tipoEntidad.findFirst({
        where: { nombre: 'PROVEEDOR' }
      });
      
      const formaPagoContado = await prisma.formaPago.findFirst({
        where: { nombre: 'CONTADO' }
      });
      
      proveedor = await prisma.entidadComercial.create({
        data: {
          empresaId: 1,
          tipoDocumentoId: tipoDocRUC.id,
          tipoEntidadId: tipoEntidadProveedor.id,
          formaPagoId: formaPagoContado.id,
          numeroDocumento: doc.rucProveedor,
          razonSocial: doc.razonSocial,
          esProveedor: true,
          estado: true
        }
      });
    }
    
    const ordenCompra = await prisma.ordenCompra.create({
      data: {
        empresaId: Number(empresaId),
        tipoDocumentoId: tipoDocFactura.id,
        proveedorId: proveedor.id,
        estadoId: estadoPendiente.id,
        monedaId: monedaPEN.id,
        tipoCambio: doc.tipoCambio,
        numSerieDocFinal: doc.serie,
        numCorreDocFinal: doc.numero,
        numeroDocumentoFinal: `${doc.serie}-${doc.numero}`,
        fechaDocumento: new Date(doc.fechaEmision.split('/').reverse().join('-')),
        fechaFacturacion: new Date(doc.fechaEmision.split('/').reverse().join('-')),
        fechaVencimiento: new Date(doc.fechaVencimiento.split('/').reverse().join('-')),
        comprobanteRecibido: true,
        fechaRecepcionComprobante: new Date(),
        urlDocumentoRef: doc.pdfUrl,
        creadoPor: usuarioId,
        actualizadoPor: usuarioId
      }
    });
    
    importados.push(ordenCompra);
  }
  
  return {
    success: true,
    importados: importados.length,
    errores: 0
  };
}

/**
 * Descarga el XML de un comprobante específico por su CAR y genera el PDF
 */
async function obtenerYGenerarPdfPorCar(token, periodo, car, uploadDir) {
  try {
    if (!car || car.length !== 27) {
      return null;
    }
    
    const rucEmisor = car.substring(0, 11);
    const codTipoCdp = car.substring(11, 13);
    const numSerieCdp = car.substring(13, 17);
    const numCdp = car.substring(17, 27);
    
    const baseUrl = `https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rce/propuesta/web/propuesta/comprobantes/descarga`;
    
    const params = {
      codTipoArchivo: '1',
      numRucEmisor: rucEmisor,
      codTipoCdp: codTipoCdp,
      numSerieCdp: numSerieCdp,
      numCdp: numCdp
    };
    
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?${queryString}`;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      
      return null;
    }
    
    let data;
    try {
      const rawText = await response.text();
      data = JSON.parse(rawText);
    } catch (e) {
      return null;
    }
    
    if (!data.arcXml) {
      return null;
    }

    let xmlContent;
    try {
      xmlContent = Buffer.from(data.arcXml, 'base64');
    } catch (e) {
      return null;
    }
    
    let XMLParser, parser, xmlData;
    try {
      XMLParser = (await import('fast-xml-parser')).XMLParser;
      parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      xmlData = parser.parse(xmlContent);
    } catch (e) {
      return null;
    }
    
    const invoice = xmlData.Invoice || xmlData['cbc:Invoice'] || {};
    
    // Función helper para obtener valor de nodo XML
    const getXmlValue = (obj, defaultValue = '') => {
      if (!obj) return defaultValue;
      return obj['#text'] || obj || defaultValue;
    };
    
    const supplier = invoice['cac:AccountingSupplierParty']?.['cac:Party'] || {};
    
    const emisorRuc = getXmlValue(supplier['cac:PartyIdentification']?.['cbc:ID']);
    
    const emisorNombre = getXmlValue(supplier['cac:PartyLegalEntity']?.['cbc:RegistrationName'] || 
                                     supplier['cac:PartyName']?.['cbc:Name']);
    
    const emisorDireccion = getXmlValue(supplier['cac:PartyLegalEntity']?.['cac:RegistrationAddress']?.['cbc:AddressLine']?.['cbc:Line'] ||
                                       supplier['cac:PostalAddress']?.['cbc:StreetName']);
    
    // Cliente (receptor)
    const customer = invoice['cac:AccountingCustomerParty']?.['cac:Party'] || {};
    const clienteRuc = getXmlValue(customer['cac:PartyIdentification']?.['cbc:ID']);
    const clienteNombre = getXmlValue(customer['cac:PartyLegalEntity']?.['cbc:RegistrationName'] ||
                                     customer['cac:PartyName']?.['cbc:Name']);
    
    // Datos del comprobante
    const tipoDoc = getXmlValue(invoice['cbc:InvoiceTypeCode']);
    const serieNumero = getXmlValue(invoice['cbc:ID']);
    const fechaEmision = getXmlValue(invoice['cbc:IssueDate']);
    const moneda = getXmlValue(invoice['cbc:DocumentCurrencyCode'], 'PEN');
    
    // Montos
    const monetary = invoice['cac:LegalMonetaryTotal'] || {};
    const taxTotal = invoice['cac:TaxTotal'] || {};
    
    const subtotal = parseFloat(getXmlValue(monetary['cbc:LineExtensionAmount'], 0));
    const igv = parseFloat(getXmlValue(taxTotal['cbc:TaxAmount'], 0));
    const total = parseFloat(getXmlValue(monetary['cbc:PayableAmount'], 0));
    
    // Ítems/Líneas
    const invoiceLines = Array.isArray(invoice['cac:InvoiceLine']) ? 
                        invoice['cac:InvoiceLine'] : 
                        (invoice['cac:InvoiceLine'] ? [invoice['cac:InvoiceLine']] : []);
    
    const items = invoiceLines.map(line => ({
      cantidad: parseFloat(getXmlValue(line['cbc:InvoicedQuantity'], 1)),
      unidad: getXmlValue(line['cbc:InvoicedQuantity']?.['@_unitCode'], 'NIU'),
      codigo: getXmlValue(line['cac:Item']?.['cac:SellersItemIdentification']?.['cbc:ID'], ''),
      descripcion: getXmlValue(line['cac:Item']?.['cbc:Description']),
      precioUnitario: parseFloat(getXmlValue(line['cac:Price']?.['cbc:PriceAmount'], 0)),
      valorVenta: parseFloat(getXmlValue(line['cbc:LineExtensionAmount'], 0))
    }));
    
    const datosXML = {
      // Emisor
      emisorRuc,
      emisorNombre,
      emisorDireccion,
      
      // Cliente
      clienteRuc,
      clienteNombre,
      
      // Comprobante
      tipoDocumento: tipoDoc === '01' ? 'FACTURA ELECTRÓNICA' : 
                     tipoDoc === '03' ? 'BOLETA DE VENTA ELECTRÓNICA' : 
                     tipoDoc === '07' ? 'NOTA DE CRÉDITO ELECTRÓNICA' :
                     tipoDoc === '08' ? 'NOTA DE DÉBITO ELECTRÓNICA' : 'COMPROBANTE ELECTRÓNICO',
      serieNumero,
      fechaEmision,
      moneda,
      
      // Montos
      subtotal,
      igv,
      total,
      
      // Ítems
      items,
      
      // Para QR (según normativa SUNAT)
      qrData: {
        rucEmisor: emisorRuc,
        tipoDoc: tipoDoc,
        serie: serieNumero.split('-')[0] || '',
        numero: serieNumero.split('-')[1] || serieNumero,
        igv: igv.toFixed(2),
        total: total.toFixed(2),
        fecha: fechaEmision,
        tipoDocReceptor: clienteRuc.length === 11 ? '6' : '1', // 6=RUC, 1=DNI
        numDocReceptor: clienteRuc
      }
    };
    
    let pdfPath;
    try {
      pdfPath = await generarPDFProfesionalService.generarPDFComprobanteConQR(datosXML, periodo);
    } catch (e) {
      return null;
    }
    
    return pdfPath;
    
  } catch (error) {
    return null;
  }
}

async function descargarXMLsMasivo(empresaId, periodo, listaCars) {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: BigInt(empresaId) },
      select: {
        id: true,
        ruc: true,
        razonSocial: true,
        sunatClientId: true,
        sunatClientSecret: true,
        sunatUsuarioSol: true,
        sunatClaveSol: true
      }
    });

    if (!empresa) {
      throw new AppError('Empresa no encontrada', 404, 'ERR_EMPRESA_NO_ENCONTRADA');
    }

    const token = await sunatAuthService.obtenerTokenSIRE(empresa);

    const urlTicket = `https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rce/propuesta/web/propuesta/${periodo}/exportacioncomprobantepropuesta?codTipoArchivo=1&codOrigenEnvio=2`;

    const respTicket = await fetch(urlTicket, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!respTicket.ok) {
      const errorText = await respTicket.text();
      throw new AppError(`Error solicitando ticket: ${respTicket.status}`, 500, 'ERR_TICKET');
    }

    const dataTicket = await respTicket.json();
    const numTicket = dataTicket?.numTicket;

    if (!numTicket) {
      throw new AppError('SUNAT no generó ticket', 500, 'ERR_NO_TICKET');
    }

    let archivoListo = false;
    let intentos = 0;
    const maxIntentos = 40;

    while (!archivoListo && intentos < maxIntentos) {
      intentos++;
      await new Promise(resolve => setTimeout(resolve, 3000));

      const urlEstado = `https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rvierce/gestionprocesosmasivos/web/masivo/consultaestadotickets?perIni=${periodo}&perFin=${periodo}&page=1&perPage=20&numTicket=${numTicket}&codLibro=080000&codOrigenEnvio=2`;

      const respEstado = await fetch(urlEstado, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (respEstado.ok) {
        const dataEstado = await respEstado.json();
        const registro = dataEstado?.registros?.[0];
        
        if (registro) {
          const estado = registro.codEstadoProceso;

          if (estado === '06') {
            archivoListo = true;
          } else if (estado === '05') {
            throw new AppError('Procesamiento falló en SUNAT', 500, 'ERR_PROCESO_FALLIDO');
          }
        }
      }
    }

    if (!archivoListo) {
      throw new AppError('Timeout esperando ticket', 500, 'ERR_TIMEOUT');
    }

    const urlDescarga = `https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rvierce/gestiondescargas/web/masiva/archivos?numTicket=${numTicket}&perTributario=${periodo}`;

    const respDescarga = await fetch(urlDescarga, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!respDescarga.ok) {
      throw new AppError(`Error descargando: ${respDescarga.status}`, 500, 'ERR_DESCARGA');
    }

    const zipBuffer = Buffer.from(await respDescarga.arrayBuffer());

    const xmlDir = path.join(process.cwd(), 'uploads', 'sire', 'xmls', periodo);
    await fs.mkdir(xmlDir, { recursive: true });

    const directory = await unzipper.Open.buffer(zipBuffer);
    const xmlFiles = directory.files.filter(f => f.path.endsWith('.xml'));

    const pdfDir = path.join(process.cwd(), 'uploads', 'sire', 'pdfs', periodo);
    await fs.mkdir(pdfDir, { recursive: true });

    let exitosos = 0;
    let fallidos = 0;
    const archivosGuardados = [];

    for (const xmlFile of xmlFiles) {
      try {
        const xmlContent = await xmlFile.buffer();
        
        // Parsear XML
        const XMLParser = (await import('fast-xml-parser')).XMLParser;
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const xmlData = parser.parse(xmlContent);

        // Generar PDF
        const pdfPath = await generarPDFProfesionalService.generarPDFComprobanteConQR(xmlData, periodo);
        
        if (pdfPath) {
          exitosos++;
          archivosGuardados.push(pdfPath);
        } else {
          fallidos++;
        }
      } catch (error) {
        fallidos++;
      }
    }

    return {
      success: true,
      message: `${exitosos} PDFs generados desde ${xmlFiles.length} XMLs`,
      total: xmlFiles.length,
      exitosos,
      fallidos,
      archivosGuardados
    };

  } catch (error) {
    throw error;
  }
}

export default {
  descargarComprasSIRE,
  importarDocumentos,
  descargarXMLsMasivo,
  generarPDFIndividual
};

async function generarPDFIndividual(empresaId, periodo, car) {
  try {
    // PASO 1: Buscar empresa con credenciales OAuth2
    const empresa = await prisma.empresa.findUnique({
      where: { id: BigInt(empresaId) },
      select: {
        id: true,
        ruc: true,
        razonSocial: true,
        sunatClientId: true,
        sunatClientSecret: true,
        sunatUsuarioSol: true,
        sunatClaveSol: true
      }
    });

    if (!empresa) {
      throw new AppError('Empresa no encontrada', 404, 'ERR_EMPRESA_NO_ENCONTRADA');
    }

    if (!empresa.sunatClientId || !empresa.sunatClientSecret) {
      throw new AppError('Credenciales SIRE no configuradas', 400, 'ERR_SIN_CREDENCIALES_SIRE');
    }

    const rucProveedor = car.substring(0, 11);
    const tipoDoc = car.substring(11, 13);
    const serie = car.substring(13, 17);
    const numeroStr = car.substring(17, 27);
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
      throw new ValidationError(`Error descargando XML: ${xmlResponse.statusText}`);
    }

    const xmlData = await xmlResponse.json();

    if (!xmlData.success || !xmlData.data?.xml_base64) {
      throw new ValidationError(xmlData.message || 'No se pudo obtener el XML');
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
    
    // PASO 3: Verificar que el XML corresponde al documento solicitado
    // Usar XMLParser para extraer correctamente el ID del documento
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true  // Elimina prefijos n1:, n2:, cac:, cbc:
    });
    
    const parsed = parser.parse(xmlString);
    
    // Intentar extraer ID del comprobante o del CDR
    let serieNumeroXML = null;
    
    // Opción 1: Comprobante original (Invoice, CreditNote, DebitNote)
    const invoice = parsed.Invoice || parsed.CreditNote || parsed.DebitNote;
    if (invoice) {
      serieNumeroXML = invoice.ID;
    }
    
    // Opción 2: CDR (ApplicationResponse)
    if (!serieNumeroXML && parsed.ApplicationResponse) {
      const docRef = parsed.ApplicationResponse?.DocumentResponse?.DocumentReference;
      serieNumeroXML = docRef?.ID;
    }
    
    // Comparar normalizando el número (sin ceros a la izquierda)
    if (serieNumeroXML) {
      const [serieXML, numeroXML] = serieNumeroXML.split('-');
      const numeroNormalizado = parseInt(numeroXML, 10).toString();
      
      if (serieXML !== serie || numeroNormalizado !== numero) {
        throw new ValidationError(
          `XML incorrecto: se esperaba ${serie}-${numero} pero se recibió ${serieXML}-${numeroNormalizado}`
        );
      }
    } else {
      throw new ValidationError('No se pudo extraer serie-número del XML');
    }

    // PASO 4: Descargar PDF directamente usando la nueva API de json.pe
    const pdfRequestBody = {
      ruc: empresa.ruc,
      usuario: empresa.sunatUsuarioSol,
      password: empresa.sunatClaveSol,
      proveedor: rucProveedor,
      tipo_doc: tipoDoc,
      serie: serie,
      correlativo: numero
    };
    
    const pdfResponse = await fetch('https://api.json.pe/api/sunat/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jsonPeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pdfRequestBody)
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new ValidationError(`Error descargando PDF: ${pdfResponse.statusText}`);
    }

    const pdfData = await pdfResponse.json();

    if (!pdfData.success || !pdfData.data?.pdf_base64) {
      throw new ValidationError(pdfData.message || 'No se pudo descargar el PDF');
    }
    
    // La nueva API /sunat/pdf devuelve PDF directo en base64
    const pdfBase64 = pdfData.data.pdf_base64;
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    // Verificar que sea un PDF válido
    const isPDF = pdfBuffer.toString('ascii', 0, 4) === '%PDF';
    if (!isPDF) {
      throw new ValidationError('El archivo descargado no es un PDF válido');
    }

    // PASO 5: Guardar XML y PDF
    // Guardar XML (ya tenemos xmlBuffer de la verificación)
    const xmlDir = path.join(process.cwd(), 'uploads', 'sire', 'xmls', periodo);
    await fs.mkdir(xmlDir, { recursive: true });
    const xmlPath = path.join(xmlDir, `${car}.xml`);
    await fs.writeFile(xmlPath, xmlBuffer);
    
    // Guardar PDF (ya tenemos pdfBuffer del ZIP extraído)
    const pdfDir = path.join(process.cwd(), 'uploads', 'sire', 'pdfs', periodo);
    await fs.mkdir(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, `${car}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);

    const pdfFileName = path.basename(pdfPath);
    
    return {
      success: true,
      pdfPath,
      pdfUrl: `/uploads/sire/pdfs/${periodo}/${pdfFileName}`,
      mensaje: 'PDF generado exitosamente usando json.pe'
    };
    
  } catch (error) {
    throw error;
  }
}
