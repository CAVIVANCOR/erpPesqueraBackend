import prisma from '../../config/prismaClient.js';
import { ValidationError } from '../../utils/errors.js';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import ordenCompraService from '../Compras/ordenCompra.service.js';
import descargarXMLService from './descargarXML.service.js';
import { XMLParser } from 'fast-xml-parser';
import entidadComercialService from '../Maestros/entidadComercial.service.js';

/**
 * Parsea fecha SIRE (DD/MM/YYYY) a Date
 */
function parseFechaSIRE(fechaStr) {
  if (!fechaStr) return new Date();
  const [dia, mes, año] = fechaStr.split('/');
  return new Date(`${año}-${mes}-${dia}`);
}

/**
 * Consulta API SUNAT para obtener datos del RUC
 * Usa la misma lógica que consultaExterna.routes.js
 * @param {string} ruc - Número de RUC
 * @returns {Promise<Object>} - Datos de SUNAT
 */
async function consultarSunatAPI(ruc) {
  try {
    // Validar formato de RUC
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
      throw new Error('RUC debe tener exactamente 11 dígitos numéricos');
    }

    const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;
    
    if (!token) {
      throw new Error('Token de API SUNAT no configurado en variables de entorno');
    }
    
    // Usar la misma URL y método que consultaExterna.routes.js (línea 131)
    const url = `https://api.decolecta.com/v1/sunat/ruc/full?numero=${ruc}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Mismo manejo de errores que consultaExterna.routes.js (líneas 139-146)
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error(`RUC ${ruc} no encontrado en SUNAT`);
      }
      throw new Error(`Error API SUNAT: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Crea un proveedor automáticamente desde datos de SUNAT
 * @param {string} numeroDocumento - RUC del proveedor
 * @param {string} razonSocialSIRE - Razón social del documento SIRE (fallback)
 * @param {number} empresaId - ID de la empresa
 * @returns {Promise<Object>} - Proveedor creado
 */
async function crearProveedorAutomatico(numeroDocumento, razonSocialSIRE, empresaId) {
  try {
    const datosAPI = await consultarSunatAPI(numeroDocumento);
    const nuevoProveedor = await entidadComercialService.crear({
      // Obligatorios del contexto
      empresaId: Number(empresaId),
      tipoDocumentoId: 2, // RUC
      numeroDocumento: numeroDocumento,
      
      // De API SUNAT (con fallback a SIRE)
      razonSocial: datosAPI.razonSocial || datosAPI.razon_social || razonSocialSIRE,
      nombreComercial: datosAPI.razonSocial || datosAPI.razon_social || razonSocialSIRE,
      estadoActivoSUNAT: datosAPI.estado === "ACTIVO",
      condicionHabidoSUNAT: datosAPI.condicion === "HABIDO",
      esAgenteRetencion: Boolean(datosAPI.esAgenteRetencion || datosAPI.es_agente_retencion),
      
      // Defaults seguros
      agrupacionEntidadId: 1,  // ✅ CORRECTO: agrupacionEntidadId
      tipoEntidadId: 2,        // PROVEEDOR GENERAL
      formaPagoId: 1,          // CONTADO
      
      // Flags
      esProveedor: true,
      esCliente: false,
      estado: true,  // ✅ CORRECTO: estado (no activo)
      esCorporativo: false,
      sujetoRetencion: false,
      sujetoPercepcion: false,
      
      // Auditoría
      creadoPor: null,
      actualizadoPor: null
    });
    
    return nuevoProveedor;
    
  } catch (error) {
    
    const proveedorMinimo = await entidadComercialService.crear({
      empresaId: Number(empresaId),
      tipoDocumentoId: 2,
      numeroDocumento: numeroDocumento,
      razonSocial: razonSocialSIRE,
      nombreComercial: razonSocialSIRE,
      agrupacionEntidadId: 1,  // ✅ CORRECTO: agrupacionEntidadId
      tipoEntidadId: 2,
      formaPagoId: 1,
      esProveedor: true,
      esCliente: false,
      estado: true,  // ✅ CORRECTO: estado (no activo)
      esCorporativo: false,
      sujetoRetencion: false,
      sujetoPercepcion: false,
      estadoActivoSUNAT: true, // Asumir activo por defecto
      condicionHabidoSUNAT: true, // Asumir habido por defecto
      esAgenteRetencion: false,
      creadoPor: null,
      actualizadoPor: null
    });
    
    return proveedorMinimo;
  }
}

/**
 * Mapea código SUNAT de afectación IGV a ID de base de datos
 * @param {string} codigoSunat - Código SUNAT (10, 20, 30, etc.)
 * @param {Array} tiposAfectacionIGV - Array de tipos de afectación desde BD
 * @returns {bigint|null} - ID del tipo de afectación o null
 */
function mapearCodigoAfectacionIGV(codigoSunat, tiposAfectacionIGV) {
  if (!codigoSunat) return null;
  
  // Normalizar código (puede venir como string, number u objeto)
  const codigoStr = typeof codigoSunat === 'object' 
    ? codigoSunat['#text']?.toString() 
    : codigoSunat?.toString();
  
  // Buscar en la lista de tipos de afectación
  const tipo = tiposAfectacionIGV.find(t => t.codigo === codigoStr);
  
  return tipo?.id || null;
}

/**
 * Crea una OrdenCompra desde un documento SIRE usando su CAR
 * @param {string} car - CAR del documento
 * @param {string} empresaId - ID de la empresa
 * @param {string} periodo - Periodo SIRE (YYYYMM)
 * @param {string} usuarioId - ID del usuario que ejecuta
 * @param {object} documentoSIRE - Datos del documento SIRE parseado
 * @returns {object} { success, ordenCompraId, error }
 */
export async function crearOrdenCompraDesdeCAR(car, empresaId, periodo, usuarioId, documentoSIRE) {
  try {
    // ========================================
    // PASO 1: Validar datos maestros
    // ========================================

    // 1.1 Buscar o crear proveedor automáticamente
    let proveedor = await prisma.entidadComercial.findFirst({
      where: {
        numeroDocumento: documentoSIRE.rucProveedor,
        empresaId: Number(empresaId),
        esProveedor: true
      }
    });

    if (!proveedor) {
      try {
        proveedor = await crearProveedorAutomatico(
          documentoSIRE.rucProveedor,
          documentoSIRE.razonSocial,
          empresaId
        );

      } catch (errorCreacion) {
        throw new ValidationError(
          `No se pudo crear el proveedor automáticamente para RUC ${documentoSIRE.rucProveedor}. ` +
          `Por favor, créelo manualmente en el módulo de Entidades Comerciales. ` +
          `Error: ${errorCreacion.message}`
        );
      }
    } 

    // ========================================
    // 1.2 DETERMINAR TIPO DE DOCUMENTO INTERNO
    // ========================================
    // MAPEO DE TIPOS SUNAT A TIPOS INTERNOS ERP:
    // - 01 (Factura SUNAT) → tipoDocumentoId = 2  (FAC - Factura Compra)
    // - 03 (Boleta SUNAT)  → tipoDocumentoId = 4  (BV - Boleta Compra)
    // - 07 (NC SUNAT)      → tipoDocumentoId = 8  (NC - Nota Crédito Compra)
    // - 08 (ND SUNAT)      → tipoDocumentoId = 9  (ND - Nota Débito Compra)
    //
    // IMPORTANTE: Todos los documentos fiscales SUNAT usan la SERIE INTERNA 002
    // (Producto Final y Servicios) para la numeración interna del ERP.
    // Los datos del documento original del proveedor se guardan en los campos *Final.
    //
    // ESTRUCTURA DE CAMPOS:
    // - tipoDocumentoId, serieDocId, numeroDocumento: Numeración INTERNA del ERP
    // - tipoDocumentoFinalId, numeroDocumentoFinal: Documento FISCAL SUNAT del proveedor
    // ========================================

    let tipoDocumentoInternoId;
    let tipoDocumentoInternoNombre;

    switch (documentoSIRE.tipoDoc) {
      case '01': // Factura SUNAT
        tipoDocumentoInternoId = 2;  // FAC - Factura Compra
        tipoDocumentoInternoNombre = 'Factura Compra';
        break;
      case '03': // Boleta SUNAT
        tipoDocumentoInternoId = 4;  // BV - Boleta Compra
        tipoDocumentoInternoNombre = 'Boleta Compra';
        break;
      case '07': // Nota Crédito SUNAT
        tipoDocumentoInternoId = 8;  // NC - Nota Crédito Compra
        tipoDocumentoInternoNombre = 'Nota Crédito Compra';
        break;
      case '08': // Nota Débito SUNAT
        tipoDocumentoInternoId = 9;  // ND - Nota Débito Compra
        tipoDocumentoInternoNombre = 'Nota Débito Compra';
        break;
      default:
        throw new ValidationError(`Tipo de documento SUNAT ${documentoSIRE.tipoDoc} no soportado para importación`);
    }

    // ========================================
    // 1.3 BUSCAR SERIE INTERNA 002
    // ========================================
    // CRÍTICO: Todos los documentos fiscales SUNAT (FAC, BV, NC, ND) deben usar
    // la SERIE INTERNA 002 (Producto Final y Servicios) para mantener consistencia
    // en la numeración interna del ERP.


    const serieDoc = await prisma.serieDoc.findFirst({
      where: {
        tipoDocumentoId: Number(tipoDocumentoInternoId),
        empresaId: Number(empresaId),
        serie: '002'  // ⭐ CRÍTICO: Siempre serie 002 para documentos fiscales SUNAT
      }
    });

    if (!serieDoc) {
      throw new ValidationError(`No existe serie 002 para ${tipoDocumentoInternoNombre} (tipo ${tipoDocumentoInternoId}). Configure la serie 002 antes de importar documentos SIRE.`);
    }

    // 1.4 Buscar tipo documento final (código SUNAT)
    const tipoDocFinal = await prisma.tipoDocumento.findFirst({
      where: { codigoSunat: documentoSIRE.tipoDoc }
    });

    if (!tipoDocFinal) {
      throw new ValidationError(`Tipo de documento SUNAT ${documentoSIRE.tipoDoc} no encontrado en catálogo`);
    }
 

    // 1.5 Buscar moneda
    const moneda = await prisma.moneda.findFirst({
      where: { codigoSunat: documentoSIRE.moneda }
    });

    if (!moneda) {
      throw new ValidationError(`Moneda ${documentoSIRE.moneda} no encontrada`);
    }

    // 1.6 Buscar período contable
    const fechaEmision = parseFechaSIRE(documentoSIRE.fechaEmision);
    const periodoContable = await prisma.periodoContable.findFirst({
      where: {
        empresaId: Number(empresaId),
        fechaInicio: { lte: fechaEmision },
        fechaFin: { gte: fechaEmision }
      }
    });

    // 1.7 Cargar TODOS los tipos de afectación IGV para mapeo dinámico
    const tiposAfectacionIGV = await prisma.tipoAfectacionIGV.findMany({
      select: { id: true, codigo: true, nombre: true }
    });


    // 1.8 Verificar producto genérico
    const productoGenerico = await prisma.producto.findUnique({
      where: { id: Number(362) }
    });

    if (!productoGenerico) {
      throw new ValidationError('Producto genérico ID 362 (Pendiente por Asignar) no existe en el sistema');
    }

    // ========================================
    // PASO 2: Descargar y parsear XML desde SUNAT
    // ========================================
    // El XML NO se guarda en disco, se descarga en memoria cada vez.
    // Esto garantiza que siempre tenemos la versión más actualizada desde SUNAT.
    //
    // Para NC/ND (07, 08): El XML es OBLIGATORIO para extraer datos del documento afectado.
    // Para Facturas/Boletas (01, 03): El XML es opcional, se puede crear con detalle genérico.
    // ========================================

    let xmlContent = null;
    let lineasDetalle = [];
    let usarDatosSIRE = false; // Flag para indicar si debemos usar datos SIRE

    try {

      // Buscar empresa completa para autenticación con SUNAT
      const empresaCompleta = await prisma.empresa.findUnique({
        where: { id: Number(empresaId) }
      });

      if (!empresaCompleta) {
        throw new ValidationError('Empresa no encontrada para autenticación SUNAT');
      }

      // Descargar XML usando servicio existente (reutilización de código)
      // Este servicio:
      // 1. Autentica con SUNAT usando OAuth2
      // 2. Descarga ZIP del comprobante
      // 3. Extrae XML del ZIP
      // 4. Retorna el contenido XML como string en memoria
      xmlContent = await descargarXMLService.descargarXmlPorCAR(empresaCompleta, car);

      // 📋 DEBUG: Guardar XML completo para análisis
      const fs = await import('fs/promises');
      const path = await import('path');
      const debugDir = path.join(process.cwd(), 'uploads', 'sire', 'debug-xml');
      await fs.mkdir(debugDir, { recursive: true });
      const xmlDebugPath = path.join(debugDir, `${car}.xml`);
      await fs.writeFile(xmlDebugPath, xmlContent, 'utf-8');
      // Parsear líneas del XML UBL 2.1
      lineasDetalle = parsearLineasXML(xmlContent);

      // Si el parser retorna null, significa que el XML no es válido (probablemente un CDR)
      if (lineasDetalle === null) {
        usarDatosSIRE = true; // Activar flag
        lineasDetalle = [{
          cantidad: '1',
          descripcion: `${documentoSIRE.razonSocial} - ${documentoSIRE.serie}-${documentoSIRE.numero}`,
          precioUnitario: documentoSIRE.baseImponible.toString(),
          subtotal: documentoSIRE.baseImponible.toString(),
          codigoAfectacion: '10' // Asumir gravado por defecto
        }];
      }

      // Detectar si el documento es exonerado/inafecto
      // Códigos de afectación IGV (Catálogo 07 SUNAT):
      // 10 = Gravado
      // 20 = Exonerado
      // 30 = Inafecto
      // 40 = Exportación
      const codigosExonerados = ['20', '30', '40'];
      const tieneLineasExoneradas = lineasDetalle.some(linea => {
        const codigo = typeof linea.codigoAfectacion === 'object' 
          ? linea.codigoAfectacion['#text']?.toString() 
          : linea.codigoAfectacion?.toString();
        return codigosExonerados.includes(codigo);
      });


    } catch (error) {
      // Para NC/ND, el XML es crítico
      if (documentoSIRE.tipoDoc === '07' || documentoSIRE.tipoDoc === '08') {
        throw new ValidationError(`No se pudo descargar XML para NC/ND: ${error.message}`);
      }

      // Para Facturas/Boletas, crear detalle usando datos SIRE
      usarDatosSIRE = true; // Activar flag
      
      lineasDetalle = [{
        cantidad: '1',
        descripcion: `${documentoSIRE.razonSocial} - ${documentoSIRE.serie}-${documentoSIRE.numero}`,
        precioUnitario: documentoSIRE.baseImponible?.toString() || '0',
        subtotal: documentoSIRE.baseImponible?.toString() || '0',
        codigoAfectacion: '10'
      }];
    }

    // ========================================
    // PASO 3: Generar correlativo
    // ========================================
    const ultimaOC = await prisma.ordenCompra.findFirst({
      where: { serieDocId: serieDoc.id },
      orderBy: { numCorreDoc: 'desc' }
    });

    const ultimoCorrelativo = ultimaOC?.numCorreDoc ? parseInt(ultimaOC.numCorreDoc) : serieDoc.correlativo || 0;
    const nuevoCorrelativo = ultimoCorrelativo + 1;
    const numCorreDoc = String(nuevoCorrelativo).padStart(serieDoc.numCerosIzqCorrelativo || 7, '0');
    const numSerieDoc = String(serieDoc.serie).padStart(serieDoc.numCerosIzqSerie || 4, '0');
    const numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;

    // ========================================
    // PASO 4: Procesar documento afectado (NC/ND)
    // ========================================
    // Las Notas de Crédito (07) y Débito (08) SIEMPRE modifican un documento previo.
    // El XML contiene en <cac:BillingReference> los datos del documento afectado:
    // - Serie-Número del documento original
    // - Fecha de emisión del documento original
    // - Tipo de documento original
    //
    // También contiene en <cbc:DiscrepancyResponse> el motivo de la NC/ND según
    // catálogo SUNAT (ej: 01=Anulación, 02=Anulación por error en RUC, etc.)
    //
    // Esta información es OBLIGATORIA para validaciones contables y tributarias.
    // ========================================
    let datosNCND = null;

    if (documentoSIRE.tipoDoc === '07' || documentoSIRE.tipoDoc === '08') {
      if (xmlContent) {
        try {
          datosNCND = await procesarDatosNCND(xmlContent, documentoSIRE.tipoDoc, empresaId, proveedor.id);
        } catch (error) {
          // Continue without NC/ND data
        }
      }
    }

    // ========================================
    // PASO 5: Construir observaciones
    // ========================================
    const observaciones = construirObservaciones(documentoSIRE, car, datosNCND, usarDatosSIRE);

    // ========================================
    // PASO 6: Verificar detracción
    // ========================================
    const aplicaDetraccion = (documentoSIRE.porcentajeDetraccion && documentoSIRE.porcentajeDetraccion > 0) ||
      (documentoSIRE.montoDetraccion && documentoSIRE.montoDetraccion > 0);

    // ========================================
    // PASO 7: Crear OrdenCompra
    // ========================================

    const ordenCompra = await prisma.ordenCompra.create({
      data: {
        // ========================================
        // IDENTIFICACIÓN INTERNA DEL DOCUMENTO
        // ========================================
        // tipoDocumentoId: Tipo interno del ERP (17=OC, 8=NC, 9=ND)
        // Determinado en PASO 1.2 según código SUNAT
        // ========================================
        empresaId: Number(empresaId),
        tipoDocumentoId: Number(tipoDocumentoInternoId),
        serieDocId: serieDoc.id,
        numSerieDoc,
        numCorreDoc,
        numeroDocumento,

        // Comprobante del proveedor
        tipoDocumentoFinalId: tipoDocFinal.id,
        numeroDocumentoFinal: `${documentoSIRE.serie}-${documentoSIRE.numero}`,
        numSerieDocFinal: documentoSIRE.serie,
        numCorreDocFinal: documentoSIRE.numero,
        comprobanteRecibido: true,
        fechaRecepcionComprobante: new Date(),

        // Fechas (todas iguales a fechaEmision)
        fechaDocumento: fechaEmision,
        fechaContable: fechaEmision,
        fechaVencimiento: fechaEmision,
        fechaEntrega: fechaEmision,
        fechaRecepcion: fechaEmision,
        fechaFacturacion: fechaEmision,

        // Período contable
        periodoContableId: periodoContable?.id || null,

        // Proveedor
        proveedorId: proveedor.id,

        // Forma de pago
        formaPagoId: Number(1), // Contado

        // Responsables
        solicitanteId: Number(usuarioId),

        // Moneda y tipo cambio
        monedaId: moneda.id,
        tipoCambio: documentoSIRE.tipoCambio ? parseFloat(documentoSIRE.tipoCambio) : null,

        // Determinar si el documento es exonerado/inafecto
        // Códigos SUNAT: 10-17=GRAVADO, 20-21=EXONERADO, 30-36=INAFECTO, 40=EXPORTACIÓN
        esExoneradoAlIGV: lineasDetalle.some(l => {
          const codigo = l.codigoAfectacion?.toString() || '10';
          return ['20', '21', '30', '31', '32', '33', '34', '35', '36', '40'].includes(codigo);
        }),
        porcentajeIGV: lineasDetalle.some(l => {
          const codigo = l.codigoAfectacion?.toString() || '10';
          return ['20', '21', '30', '31', '32', '33', '34', '35', '36', '40'].includes(codigo);
        }) ? 0 : 18,

        // Montos
        subtotal: parseFloat(documentoSIRE.baseImponible),
        totalDescuentos: 0,
        totalIGV: parseFloat(documentoSIRE.igv),
        total: parseFloat(documentoSIRE.total),

        // Estado
        estadoId: Number(38), // Pendiente

        // Control
        facturado: false,
        esGerencial: false,
        esParticionada: false,

        // Trazabilidad
        submoduloOrigenId: null,
        procesoOrigenId: null,

        // NC/ND
        motivoNotaCreditoDebitoId: datosNCND?.motivoId || null,
        fechaDcmtoAfectoNCND: datosNCND?.fechaAfectado || null,
        dcmtoAfectoNCNDId: datosNCND?.docAfectoId || null,
        numeroDcmtoAfectoNCND: datosNCND?.numeroAfectado || null,

        // Detracción
        aplicaDetraccion,
        porcentajeDetraccion: documentoSIRE.porcentajeDetraccion ? parseFloat(documentoSIRE.porcentajeDetraccion) : null,
        montoDetraccion: documentoSIRE.montoDetraccion ? parseFloat(documentoSIRE.montoDetraccion) : null,

        // Otros
        aplicaRetencion: false,
        aplicaPercepcion: false,
        aplicaImpuestoRenta: false,

        // Observaciones
        observaciones,

        // Auditoría
        creadoPor: Number(usuarioId),
        actualizadoPor: Number(usuarioId)
      }
    });

    // ========================================
    // PASO 8: Crear DetalleOrdenCompra
    // ========================================

    for (const linea of lineasDetalle) {
      // Mapear código de afectación IGV del XML a ID de BD
      let tipoAfectacionId = mapearCodigoAfectacionIGV(linea.codigoAfectacion, tiposAfectacionIGV);
      
      // ⚠️ VALIDACIÓN CRÍTICA: Si no se pudo mapear, usar GRAVADO (código 10) por defecto
      if (!tipoAfectacionId) {
        const tipoGravado = tiposAfectacionIGV.find(t => t.codigo === '10');
        tipoAfectacionId = tipoGravado?.id || null;
        
        // Si aún es null, es un error crítico de configuración
        if (!tipoAfectacionId) {
          throw new ValidationError('ERROR CRÍTICO: No existe tipo de afectación GRAVADO (código 10) en la base de datos. Verificar tabla tipoAfectacionIGV.');
        }
      }

      await prisma.detalleOrdenCompra.create({
        data: {
          ordenCompraId: ordenCompra.id,
          productoId: Number(362), // Pendiente por Asignar

          cantidad: parseFloat(linea.cantidad),
          cantidadCompra: parseFloat(linea.cantidad),
          cantidadRecibida: 0,

          precioUnitario: parseFloat(linea.precioUnitario),
          precioUnitarioCompra: parseFloat(linea.precioUnitario),
          subtotal: parseFloat(linea.subtotal),

          tipoAfectacionIGVId: tipoAfectacionId,

          observaciones: `📋 CONCEPTO ORIGINAL (XML):\n${linea.descripcion}\n\n⚠️ ACCIÓN REQUERIDA:\nAsignar producto correcto desde el catálogo`,

          creadoPor: Number(usuarioId),
          actualizadoPor: Number(usuarioId)
        }
      });
    }

    // ========================================
    // PASO 9: Recalcular totales desde detalles
    // ========================================
    if (!usarDatosSIRE) {
      const totalesCalculados = await ordenCompraService.calcularTotalesEImpuestos(ordenCompra.id);

      await prisma.ordenCompra.update({
        where: { id: ordenCompra.id },
        data: totalesCalculados
      });
    }

    return {
      success: true,
      ordenCompraId: ordenCompra.id.toString(),
      numeroDocumento,
      error: null
    };

  } catch (error) {
    return {
      success: false,
      ordenCompraId: null,
      error: error.message
    };
  }
}

/**
 * Parsea las líneas de detalle del XML según estándar UBL 2.1 SUNAT
 * SOLUCIÓN PROFESIONAL: Usa XMLParser para manejar namespaces variables
 * 
 * Estructura UBL 2.1:
 * - InvoicedQuantity: Cantidad facturada
 * - LineExtensionAmount: Subtotal de la línea SIN IGV
 * - Price/PriceAmount: Precio unitario SIN IGV (VALOR OFICIAL)
 * - TaxExemptionReasonCode: Código de afectación IGV
 */
function parsearLineasXML(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true,
    removeNSPrefix: true  // ✅ CRÍTICO: Elimina prefijos n1:, n2:, cac:, cbc: para acceso directo
  });

  try {
    const parsed = parser.parse(xmlContent);
    
    // Buscar el nodo raíz (Invoice, CreditNote o DebitNote)
    const invoice = parsed.Invoice || parsed.CreditNote || parsed.DebitNote;
    
    if (!invoice) {
      // Retornar null para indicar que no se pudo parsear
      return null;
    }

    // Buscar líneas de detalle
    let rawLines = invoice.InvoiceLine || invoice.CreditNoteLine || invoice.DebitNoteLine;
    
    if (!rawLines) {
      return [{
        cantidad: '1',
        descripcion: 'Concepto de factura (ver observaciones)',
        precioUnitario: '0',
        subtotal: '0',
        codigoAfectacion: '10'
      }];
    }
    
    const linesArray = Array.isArray(rawLines) ? rawLines : [rawLines];

    const lineas = [];

    for (const line of linesArray) {
      // Extraer cantidad
      let cantidad = line.InvoicedQuantity?.['#text'] || line.InvoicedQuantity ||
                     line.CreditedQuantity?.['#text'] || line.CreditedQuantity ||
                     line.DebitedQuantity?.['#text'] || line.DebitedQuantity || '1';

      // Extraer descripción
      const item = line.Item || {};
      let descripcion = item.Description || 'Sin descripción';

      // Extraer subtotal (SIN IGV)
      let subtotal = line.LineExtensionAmount?.['#text'] || line.LineExtensionAmount || '0';

      // Extraer precio unitario desde <Price> (VALOR OFICIAL)
      const price = line.Price || {};
      let precioUnitario = price.PriceAmount?.['#text'] || price.PriceAmount || subtotal;

      // ========================================
      // EXTRACCIÓN ROBUSTA DE CÓDIGO DE AFECTACIÓN IGV
      // ========================================
      // PRIORIDAD 1: TaxExemptionReasonCode (código explícito SUNAT)
      // PRIORIDAD 2: TaxScheme ID (inferir desde catálogo 05)
      // PRIORIDAD 3: Percent (inferir desde porcentaje)
      // DEFAULT: '10' (GRAVADO) - Producción segura
      // ========================================
      const taxTotal = line.TaxTotal || {};
      const taxSubtotal = Array.isArray(taxTotal.TaxSubtotal) ? taxTotal.TaxSubtotal[0] : taxTotal.TaxSubtotal;
      const taxCategory = taxSubtotal?.TaxCategory || {};
      
      let codigoAfectacion = null;
      
      // PRIORIDAD 1: Código explícito (lo más confiable)
      if (taxCategory.TaxExemptionReasonCode) {
        codigoAfectacion = typeof taxCategory.TaxExemptionReasonCode === 'object'
          ? taxCategory.TaxExemptionReasonCode['#text']?.toString()
          : taxCategory.TaxExemptionReasonCode?.toString();
      }
      
      // PRIORIDAD 2: Inferir desde TaxScheme ID (Catálogo 05 SUNAT)
      if (!codigoAfectacion) {
        const taxScheme = taxCategory.TaxScheme || {};
        const taxSchemeId = typeof taxScheme.ID === 'object'
          ? taxScheme.ID['#text']?.toString()
          : taxScheme.ID?.toString();
        
        switch(taxSchemeId) {
          case '1000': codigoAfectacion = '10'; break; // IGV - GRAVADO
          case '9997': codigoAfectacion = '20'; break; // EXO - EXONERADO
          case '9998': codigoAfectacion = '30'; break; // INA - INAFECTO
          case '9995': codigoAfectacion = '40'; break; // EXP - EXPORTACIÓN
        }
      }
      
      // PRIORIDAD 3: Inferir desde porcentaje (menos confiable)
      if (!codigoAfectacion) {
        const percent = typeof taxCategory.Percent === 'object'
          ? parseFloat(taxCategory.Percent['#text'] || 0)
          : parseFloat(taxCategory.Percent || 0);
        
        // Si tiene porcentaje > 0, es GRAVADO; si es 0, podría ser EXONERADO o INAFECTO
        // Por seguridad, si es 0 y no tenemos más info, usamos INAFECTO (30)
        codigoAfectacion = (percent > 0) ? '10' : '30';
      }
      
      // DEFAULT: GRAVADO (producción segura)
      const codigoAfectacionNormalizado = codigoAfectacion || '10';

      lineas.push({
        cantidad: String(cantidad),
        descripcion: String(descripcion),
        precioUnitario: String(precioUnitario),
        subtotal: String(subtotal),
        codigoAfectacion: codigoAfectacionNormalizado
      });
    }

    return lineas.length > 0 ? lineas : [{
      cantidad: '1',
      descripcion: 'Concepto de factura (ver observaciones)',
      precioUnitario: '0',
      subtotal: '0',
      codigoAfectacion: '10'
    }];

  } catch (error) {
    return [{
      cantidad: '1',
      descripcion: 'Concepto de factura (ver observaciones)',
      precioUnitario: '0',
      subtotal: '0',
      codigoAfectacion: '10'
    }];
  }
}

/**
 * Extrae valor de etiqueta XML (soporta CDATA)
 */
function extraerValorXML(xml, tag) {
  // Buscar el contenido entre las etiquetas (incluyendo CDATA)
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);

  if (!match) return null;

  let valor = match[1].trim();

  // Si el valor está envuelto en CDATA, extraerlo
  const cdataMatch = valor.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) {
    valor = cdataMatch[1].trim();
  }

  return valor || null;
}

/**
 * Procesa datos de NC/ND
 */
async function procesarDatosNCND(xmlContent, tipoDoc, empresaId, proveedorId) {
  try {
    // Extraer código de motivo desde <cac:DiscrepancyResponse>
    const discrepancyMatch = xmlContent.match(/<cac:DiscrepancyResponse>[\s\S]*?<\/cac:DiscrepancyResponse>/);

    const codigoMotivo = discrepancyMatch ? extraerValorXML(discrepancyMatch[0], 'cbc:ResponseCode') : null;
    const descripcionMotivo = discrepancyMatch ? extraerValorXML(discrepancyMatch[0], 'cbc:Description') : null;

    // Buscar motivo en BD
    // esNCND: false = Nota de Crédito (07), true = Nota de Débito (08)
    const esNotaDebito = tipoDoc === '08';

    const motivo = await prisma.motivoNotaCreditoDebito.findFirst({
      where: {
        codigoSunat: codigoMotivo,
        esNCND: esNotaDebito,
        activo: true
      }
    });

    // Extraer documento afectado
    const billingRefMatch = xmlContent.match(/<cac:BillingReference>[\s\S]*?<\/cac:BillingReference>/);

    if (!billingRefMatch) {
      return null;
    }

    const billingRef = billingRefMatch[0];
    const numeroAfectado = extraerValorXML(billingRef, 'cbc:ID');
    const fechaAfectadoStr = extraerValorXML(billingRef, 'cbc:IssueDate');

    if (!numeroAfectado) {
      return null;
    }

    // Separar serie y número
    const partes = numeroAfectado.split('-').map(p => p.trim());
    const serieAfectada = partes[0];
    const numAfectado = partes[1];

    // Buscar documento afectado
    const docAfecto = await prisma.ordenCompra.findFirst({
      where: {
        empresaId: Number(empresaId),
        proveedorId: proveedorId,
        numSerieDocFinal: serieAfectada,
        numCorreDocFinal: numAfectado,
        fechaFacturacion: fechaAfectadoStr ? parseFechaSIRE(fechaAfectadoStr) : undefined
      },
      orderBy: { id: 'desc' }
    });

    return {
      motivoId: motivo?.id || null,
      fechaAfectado: fechaAfectadoStr ? new Date(fechaAfectadoStr) : null,
      docAfectoId: docAfecto?.id || null,
      numeroAfectado
    };

  } catch (error) {
    return null;
  }
}

/**
 * Construye observaciones
 */
function construirObservaciones(doc, car, datosNCND, usarDatosSIRE = false) {
  const tipoDocTexto = doc.tipoDoc === '07' ? 'NOTA DE CRÉDITO' :
    doc.tipoDoc === '08' ? 'NOTA DE DÉBITO' : 'FACTURA';

  let obs = `📥 IMPORTADO DESDE SIRE${datosNCND ? ' - ' + tipoDocTexto : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAR: ${car}
Proveedor: ${doc.razonSocial} (${doc.rucProveedor})
Comprobante: ${doc.serie}-${doc.numero} (${tipoDocTexto})
Fecha Emisión: ${doc.fechaEmision}
Moneda: ${doc.moneda} | TC: ${doc.tipoCambio || 'N/A'}
Total: ${parseFloat(doc.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })} ${doc.moneda}`;

  // Advertencia cuando se usaron datos del SIRE (XML no disponible)
  if (usarDatosSIRE) {
    obs += `\n\n⚠️ ADVERTENCIA - XML NO DISPONIBLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
El XML original del comprobante no está disponible en SUNAT.
Solo se recibió el CDR (Constancia de Recepción).

IMPLICACIONES:
• El detalle de items NO pudo ser importado
• Se creó 1 item genérico con el total del documento
• Los totales son correctos (tomados del SIRE)
• El PDF está disponible para descarga

CAUSA PROBABLE:
El proveedor no envió correctamente el XML a SUNAT o
usa un OSE (Operador de Servicios Electrónicos) que no
sincroniza con SUNAT.

SOLUCIÓN:
Solicitar al proveedor el XML o PDF original del comprobante
para obtener el detalle completo de items.`;
  }

  if (datosNCND) {
    obs += `\n\n📄 DOCUMENTO AFECTADO:
${doc.tipoDoc === '01' ? 'Factura' : 'Documento'}: ${datosNCND.numeroAfectado}
Fecha: ${datosNCND.fechaAfectado ? datosNCND.fechaAfectado.toISOString().split('T')[0] : 'N/A'}`;

    if (!datosNCND.docAfectoId) {
      obs += `\n\n⚠️ ADVERTENCIA CRÍTICA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No se encontró el documento afectado ${datosNCND.numeroAfectado}
en el sistema.

ACCIÓN REQUERIDA:
1. Importar primero el documento afectado
2. Luego vincular manualmente esta ${tipoDocTexto}
3. O verificar que serie/número/fecha sean correctos`;
    }
  }

  obs += `\n\n⚠️ ACCIÓN REQUERIDA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Revisar y asignar productos correctos en el detalle
2. Verificar cantidades y precios
3. Asignar centros de costo
4. Cambiar estado a APROBADO cuando esté listo`;

  return obs;
}

export default { crearOrdenCompraDesdeCAR };