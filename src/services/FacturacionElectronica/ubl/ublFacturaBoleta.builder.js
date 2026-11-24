import { ValidationError } from '../../../utils/errors.js';
import { numeroALetras } from '../../../utils/numeroALetras.js';

/**
 * Generador del XML UBL 2.1 (estándar SUNAT, CustomizationID 2.0) de FACTURA (01) y BOLETA DE VENTA (03).
 *
 * - Funciones puras: no acceden a la base de datos ni a la red. Reciben el ComprobanteElectronico ya cargado con sus
 *   relaciones y devuelven el XML SIN firmar; la firma y el envío a SUNAT los hace Smart PSE (Flujo A).
 * - El XML incluye el contenedor vacío de la firma (ext:UBLExtensions) y el nodo cac:Signature que exige SUNAT.
 * - `validarComprobante` revisa todo ANTES de enviar: cada firma consume un crédito del paquete y SUNAT rechaza con
 *   códigos 2xxx/3xxx lo que aquí se detecta, por eso se informan todos los problemas juntos, con un mensaje accionable.
 *
 * Alcance de esta versión: operaciones gravadas, exoneradas, inafectas y de exportación, con descuentos por línea,
 * contado o crédito con cuotas, y detracción. Quedan FUERA (se rechazan con un mensaje claro, no se generan mal):
 * transferencias gratuitas, ISC, ICBPER, anticipos, retención y percepción.
 *
 * Referencias: Anexo 9 de la RS 245-2017/SUNAT (estándar UBL 2.1) y catálogos SUNAT 01, 02, 06, 07, 51, 52 y 54.
 */

const ZONA_HORARIA = 'America/Lima';
const TOLERANCIA = 0.02; // Diferencia admitida por redondeo entre líneas y totales (en la moneda del comprobante)
const MONTO_MINIMO_BOLETA_CON_DOCUMENTO = 700; // En soles: desde este importe la boleta exige documento del cliente

// Código de establecimiento anexo del emisor; 0000 = domicilio fiscal. Las sedes todavía no guardan su código SUNAT.
const CODIGO_ESTABLECIMIENTO_DEFECTO = '0000';

// Tributo (catálogo 05) y categoría de impuesto (catálogo UN/ECE 5305) por categoría de afectación del IGV (catálogo 07)
const TRIBUTO_POR_CATEGORIA = {
  GRAVADO: { categoria: 'S', id: '1000', nombre: 'IGV', tipo: 'VAT' },
  EXONERADO: { categoria: 'E', id: '9997', nombre: 'EXO', tipo: 'VAT' },
  INAFECTO: { categoria: 'O', id: '9998', nombre: 'INA', tipo: 'FRE' },
  EXPORTACION: { categoria: 'G', id: '9995', nombre: 'EXP', tipo: 'FRE' },
};

const NOMBRE_MONEDA = { PEN: 'SOLES', USD: 'DOLARES AMERICANOS', EUR: 'EUROS' };

const NS = {
  inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ccts: 'urn:un:unece:uncefact:documentation:2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  qdt: 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2',
  udt: 'urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
};

const esc = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const dec = (valor, decimales = 2) => Number(valor || 0).toFixed(decimales);
const redondear2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
const fechaISO = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date(fecha));
const mismaCifra = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) <= TOLERANCIA;

const codigoTipo = (c) => String(c.tipoComprobante?.codigoSunat || '').trim();
const numeroSerieCorrelativo = (c) => `${c.numeroSerie}-${c.numeroCorrelativo}`;
const categoriaDeLinea = (d) => d.tipoAfectacionIGV?.categoria;

/**
 * Revisa el comprobante contra las reglas de SUNAT que más rechazos generan. Devuelve la lista de problemas
 * (vacía si está correcto).
 */
export const revisarComprobante = (c) => {
  const problemas = [];
  const tipo = codigoTipo(c);

  if (!['01', '03'].includes(tipo)) {
    problemas.push(`El tipo de comprobante "${c.tipoComprobante?.descripcion || tipo || 'sin definir'}" no está habilitado: solo factura (01) y boleta de venta (03).`);
    return problemas;
  }

  // Emisor
  if (!/^\d{11}$/.test(String(c.empresa?.ruc || '').trim())) problemas.push('El RUC de la empresa emisora debe tener 11 dígitos.');
  if (!String(c.empresa?.razonSocial || '').trim()) problemas.push('La empresa emisora no tiene razón social.');

  // Serie y correlativo
  const prefijo = tipo === '01' ? 'F' : 'B';
  if (!new RegExp(`^${prefijo}[A-Z0-9]{3}$`).test(String(c.numeroSerie || ''))) {
    problemas.push(`La serie "${c.numeroSerie}" no es válida para ${tipo === '01' ? 'una factura' : 'una boleta'}: debe tener 4 caracteres y empezar con ${prefijo}.`);
  }
  if (!Number.isInteger(Number(c.numeroCorrelativo)) || Number(c.numeroCorrelativo) < 1 || Number(c.numeroCorrelativo) > 99999999) {
    problemas.push('El correlativo debe ser un entero entre 1 y 99999999.');
  }

  // Moneda y fechas
  const moneda = String(c.moneda?.codigoSunat || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(moneda)) problemas.push('La moneda del comprobante no tiene un código ISO de 3 letras (catálogo 02).');
  if (c.fechaVencimiento && fechaISO(c.fechaVencimiento) < fechaISO(c.fechaEmision)) {
    problemas.push('La fecha de vencimiento no puede ser anterior a la fecha de emisión.');
  }

  // Cliente (catálogo 06)
  const docCliente = String(c.tipoDocumentoCliente?.codSunat ?? '');
  const numeroCliente = String(c.numeroDocumentoCliente || '').trim();
  const totalEnSoles = moneda === 'PEN' ? Number(c.totalComprobante) : Number(c.totalComprobante) * Number(c.tipoCambio || 1);
  if (!String(c.razonSocialCliente || '').trim()) problemas.push('El cliente no tiene razón social o nombre.');
  if (tipo === '01') {
    if (docCliente !== '6' || !/^\d{11}$/.test(numeroCliente)) problemas.push('Una factura exige el RUC del cliente (11 dígitos).');
  } else if (docCliente === '0' || !numeroCliente || numeroCliente === '-') {
    if (totalEnSoles >= MONTO_MINIMO_BOLETA_CON_DOCUMENTO) {
      problemas.push(`Una boleta de ${MONTO_MINIMO_BOLETA_CON_DOCUMENTO} soles o más exige el documento del cliente.`);
    }
  } else if (docCliente === '1' && !/^\d{8}$/.test(numeroCliente)) {
    problemas.push('El DNI del cliente debe tener 8 dígitos.');
  } else if (docCliente === '6' && !/^\d{11}$/.test(numeroCliente)) {
    problemas.push('El RUC del cliente debe tener 11 dígitos.');
  }

  // Alcance de esta versión
  if (Number(c.totalIsc) > 0) problemas.push('El comprobante tiene ISC: todavía no se admite.');
  if (Number(c.totalGratuito) > 0) problemas.push('El comprobante tiene transferencias gratuitas: todavía no se admiten.');
  if (c.sujetoPercepcion || c.sujetoRetencion) problemas.push('El comprobante tiene percepción o retención: todavía no se admiten.');

  // Detalle
  const detalles = c.detalles || [];
  if (detalles.length === 0) problemas.push('El comprobante no tiene líneas.');
  const sumas = { GRAVADO: 0, EXONERADO: 0, INAFECTO: 0, EXPORTACION: 0 };
  let sumaIgv = 0;
  let sumaTotal = 0;
  for (const d of detalles) {
    const etiqueta = `Línea ${d.numeroLinea} (${String(d.descripcion || '').slice(0, 40)})`;
    const categoria = categoriaDeLinea(d);
    if (!TRIBUTO_POR_CATEGORIA[categoria]) {
      problemas.push(`${etiqueta}: la afectación IGV "${d.tipoAfectacionIGV?.codigo || 'sin definir'}" no está admitida (solo gravado, exonerado, inafecto y exportación).`);
      continue;
    }
    if (!String(d.descripcion || '').trim()) problemas.push(`${etiqueta}: no tiene descripción.`);
    if (!String(d.codigoUnidadSUNAT || '').trim()) problemas.push(`${etiqueta}: no tiene código de unidad de medida SUNAT.`);
    if (!(Number(d.cantidad) > 0)) problemas.push(`${etiqueta}: la cantidad debe ser mayor a cero.`);
    if (Number(d.isc) > 0) problemas.push(`${etiqueta}: tiene ISC, todavía no se admite.`);

    const base = Number(d.cantidad) * Number(d.valorUnitario) - Number(d.descuento || 0);
    if (!mismaCifra(base, d.subtotal)) {
      problemas.push(`${etiqueta}: el valor de venta (${dec(d.subtotal)}) no coincide con cantidad × valor unitario − descuento (${dec(base)}).`);
    }
    const igvEsperado = categoria === 'GRAVADO' ? Number(d.subtotal) * (Number(d.porcentajeIgv) / 100) : 0;
    if (!mismaCifra(igvEsperado, d.igv)) {
      problemas.push(`${etiqueta}: el IGV (${dec(d.igv)}) no coincide con el ${dec(d.porcentajeIgv)} % del valor de venta (${dec(igvEsperado)}).`);
    }
    if (!mismaCifra(Number(d.subtotal) + Number(d.igv), d.total)) {
      problemas.push(`${etiqueta}: el total de la línea (${dec(d.total)}) no es valor de venta + IGV.`);
    }
    sumas[categoria] += Number(d.subtotal);
    sumaIgv += Number(d.igv);
    sumaTotal += Number(d.total);
  }

  // Totales de cabecera contra las líneas
  if (!mismaCifra(sumas.GRAVADO, c.totalGravado)) problemas.push(`El total gravado (${dec(c.totalGravado)}) no coincide con la suma de las líneas (${dec(sumas.GRAVADO)}).`);
  if (!mismaCifra(sumas.EXONERADO, c.totalExonerado)) problemas.push(`El total exonerado (${dec(c.totalExonerado)}) no coincide con la suma de las líneas (${dec(sumas.EXONERADO)}).`);
  if (!mismaCifra(sumas.INAFECTO + sumas.EXPORTACION, c.totalInafecto)) {
    problemas.push(`El total inafecto (${dec(c.totalInafecto)}) no coincide con la suma de las líneas inafectas y de exportación (${dec(sumas.INAFECTO + sumas.EXPORTACION)}).`);
  }
  if (!mismaCifra(sumaIgv, c.totalIgv)) problemas.push(`El IGV total (${dec(c.totalIgv)}) no coincide con la suma de las líneas (${dec(sumaIgv)}).`);
  if (!mismaCifra(sumaTotal, c.totalComprobante)) problemas.push(`El importe total (${dec(c.totalComprobante)}) no coincide con la suma de las líneas (${dec(sumaTotal)}).`);

  // Referencias
  if (c.guiaRemision && !/^[A-Z0-9]{4}-\d{1,8}$/.test(String(c.guiaRemision).trim())) {
    problemas.push(`La guía de remisión "${c.guiaRemision}" no tiene el formato SERIE-NUMERO (por ejemplo T001-123).`);
  }

  // Detracción
  if (c.sujetoDetraccion) {
    if (!c.codigoDetraccion) problemas.push('El comprobante está sujeto a detracción pero no tiene el código del bien o servicio (catálogo 54).');
    if (!(Number(c.porcentajeDetraccion) > 0) || !(Number(c.montoDetraccion) > 0)) problemas.push('La detracción necesita porcentaje y monto mayores a cero.');
    if (!String(c.empresa?.cuentaDetraccion || '').trim()) problemas.push('La empresa emisora no tiene registrada la cuenta de detracciones (Banco de la Nación).');
  }

  // Forma de pago (solo facturas): crédito con cuotas
  if (tipo === '01' && (c.cuotas || []).length > 0) {
    const pendiente = Number(c.montoPendientePago ?? c.totalComprobante);
    const sumaCuotas = c.cuotas.reduce((s, q) => s + Number(q.montoCuota), 0);
    if (!mismaCifra(sumaCuotas, pendiente)) problemas.push(`La suma de las cuotas (${dec(sumaCuotas)}) no coincide con el monto pendiente de pago (${dec(pendiente)}).`);
    if (c.cuotas.some((q) => fechaISO(q.fechaVencimiento) <= fechaISO(c.fechaEmision))) {
      problemas.push('Todas las cuotas deben vencer después de la fecha de emisión.');
    }
  }

  return problemas;
};

/**
 * Igual que `revisarComprobante`, pero lanza un solo ValidationError con todos los problemas encontrados.
 */
export const validarComprobante = (c) => {
  const problemas = revisarComprobante(c);
  if (problemas.length > 0) {
    throw new ValidationError(
      `El comprobante ${numeroSerieCorrelativo(c)} no se puede enviar a SUNAT. Corrija: ${problemas.map((p, i) => `${i + 1}) ${p}`).join(' ')}`,
    );
  }
};

const montoMoneda = (etiqueta, valor, moneda) => `<cbc:${etiqueta} currencyID="${moneda}">${dec(valor)}</cbc:${etiqueta}>`;

const bloqueTributo = (tributo) =>
  `<cac:TaxScheme>` +
  `<cbc:ID schemeID="UN/ECE 5153" schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT">${tributo.id}</cbc:ID>` +
  `<cbc:Name>${tributo.nombre}</cbc:Name><cbc:TaxTypeCode>${tributo.tipo}</cbc:TaxTypeCode></cac:TaxScheme>`;

const bloqueSubtotalImpuesto = (tributo, base, impuesto, moneda) =>
  `<cac:TaxSubtotal>${montoMoneda('TaxableAmount', base, moneda)}${montoMoneda('TaxAmount', impuesto, moneda)}` +
  `<cac:TaxCategory><cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">${tributo.categoria}</cbc:ID>` +
  `${bloqueTributo(tributo)}</cac:TaxCategory></cac:TaxSubtotal>`;

const bloqueLinea = (d, moneda) => {
  const categoria = categoriaDeLinea(d);
  const tributo = TRIBUTO_POR_CATEGORIA[categoria];
  const descuento = Number(d.descuento || 0);
  const partes = [`<cac:InvoiceLine><cbc:ID>${d.numeroLinea}</cbc:ID>`];

  partes.push(
    `<cbc:InvoicedQuantity unitCode="${esc(d.codigoUnidadSUNAT)}" unitCodeListID="UN/ECE rec 20" unitCodeListAgencyName="United Nations Economic Commission for Europe">${dec(d.cantidad, 4)}</cbc:InvoicedQuantity>`,
    montoMoneda('LineExtensionAmount', d.subtotal, moneda),
    // Precio unitario con IGV; código 01 = precio unitario (incluye el IGV) de una operación onerosa
    `<cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="${moneda}">${dec(d.precioUnitario, 6)}</cbc:PriceAmount>` +
      `<cbc:PriceTypeCode listName="Tipo de Precio" listAgencyName="PE:SUNAT" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference>`,
  );

  if (descuento > 0) {
    const base = Number(d.cantidad) * Number(d.valorUnitario);
    // Código 00: descuento que afecta la base imponible del IGV (catálogo 53)
    partes.push(
      `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator>` +
        `<cbc:AllowanceChargeReasonCode listName="Cargo/descuento" listAgencyName="PE:SUNAT" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo53">00</cbc:AllowanceChargeReasonCode>` +
        `<cbc:MultiplierFactorNumeric>${dec(base > 0 ? descuento / base : 0, 5)}</cbc:MultiplierFactorNumeric>` +
        `${montoMoneda('Amount', descuento, moneda)}${montoMoneda('BaseAmount', base, moneda)}</cac:AllowanceCharge>`,
    );
  }

  const porcentaje = categoria === 'GRAVADO' ? dec(d.porcentajeIgv) : '0.00';
  partes.push(
    `<cac:TaxTotal>${montoMoneda('TaxAmount', d.igv, moneda)}<cac:TaxSubtotal>${montoMoneda('TaxableAmount', d.subtotal, moneda)}${montoMoneda('TaxAmount', d.igv, moneda)}` +
      `<cac:TaxCategory><cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">${tributo.categoria}</cbc:ID>` +
      `<cbc:Percent>${porcentaje}</cbc:Percent>` +
      `<cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">${esc(d.tipoAfectacionIGV.codigo)}</cbc:TaxExemptionReasonCode>` +
      `${bloqueTributo(tributo)}</cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>`,
  );

  partes.push(
    `<cac:Item><cbc:Description><![CDATA[${String(d.descripcion).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]></cbc:Description>` +
      (d.codigoProducto ? `<cac:SellersItemIdentification><cbc:ID>${esc(d.codigoProducto)}</cbc:ID></cac:SellersItemIdentification>` : '') +
      (d.codigoProductoSunat
        ? `<cac:CommodityClassification><cbc:ItemClassificationCode listID="UNSPSC" listAgencyName="GS1 US" listName="Item Classification">${esc(d.codigoProductoSunat)}</cbc:ItemClassificationCode></cac:CommodityClassification>`
        : '') +
      `</cac:Item>`,
    // Valor unitario SIN IGV (hasta 10 decimales admitidos por SUNAT)
    `<cac:Price><cbc:PriceAmount currencyID="${moneda}">${dec(d.valorUnitario, 6)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`,
  );
  return partes.join('');
};

/**
 * Condiciones de pago de una factura: contado, o crédito con su monto pendiente y cada cuota.
 * La detracción se informa como medio y condición de pago aparte (siempre en soles).
 */
const bloquesPago = (c, moneda) => {
  const partes = [];

  if (c.sujetoDetraccion) {
    const montoSoles = moneda === 'PEN' ? Number(c.montoDetraccion) : redondear2(Number(c.montoDetraccion) * Number(c.tipoCambio || 1));
    partes.push(
      `<cac:PaymentMeans><cbc:ID>Detraccion</cbc:ID><cbc:PaymentMeansCode>001</cbc:PaymentMeansCode>` +
        `<cac:PayeeFinancialAccount><cbc:ID>${esc(String(c.empresa.cuentaDetraccion).trim())}</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>`,
      `<cac:PaymentTerms><cbc:ID>Detraccion</cbc:ID><cbc:PaymentMeansID>${esc(c.codigoDetraccion)}</cbc:PaymentMeansID>` +
        `<cbc:PaymentPercent>${dec(c.porcentajeDetraccion)}</cbc:PaymentPercent>${montoMoneda('Amount', montoSoles, 'PEN')}</cac:PaymentTerms>`,
    );
  }

  if (codigoTipo(c) === '01') {
    const cuotas = c.cuotas || [];
    if (cuotas.length === 0) {
      partes.push(`<cac:PaymentTerms><cbc:ID>FormaPago</cbc:ID><cbc:PaymentMeansID>Contado</cbc:PaymentMeansID></cac:PaymentTerms>`);
    } else {
      partes.push(
        `<cac:PaymentTerms><cbc:ID>FormaPago</cbc:ID><cbc:PaymentMeansID>Credito</cbc:PaymentMeansID>${montoMoneda('Amount', c.montoPendientePago ?? c.totalComprobante, moneda)}</cac:PaymentTerms>`,
      );
      cuotas.forEach((q, i) => {
        partes.push(
          `<cac:PaymentTerms><cbc:ID>FormaPago</cbc:ID><cbc:PaymentMeansID>Cuota${String(i + 1).padStart(3, '0')}</cbc:PaymentMeansID>` +
            `${montoMoneda('Amount', q.montoCuota, moneda)}<cbc:PaymentDueDate>${fechaISO(q.fechaVencimiento)}</cbc:PaymentDueDate></cac:PaymentTerms>`,
        );
      });
    }
  }
  return partes.join('');
};

/**
 * Construye el XML UBL 2.1 sin firmar de una factura o boleta.
 *
 * @param {object} c - ComprobanteElectronico con: empresa, tipoComprobante, tipoDocumentoCliente, moneda, cuotas,
 *        detalles (con tipoAfectacionIGV) y preFactura.tipoOperacionSunat
 * @returns {string} XML listo para enviarlo a Smart PSE
 */
export const construirXmlFacturaBoleta = (c) => {
  validarComprobante(c);

  const tipo = codigoTipo(c);
  const moneda = String(c.moneda.codigoSunat).trim().toUpperCase();
  const ruc = String(c.empresa.ruc).trim();
  const tipoOperacion = c.preFactura?.tipoOperacionSunat?.codigo || '0101'; // Catálogo 51: 0101 = venta interna
  const docCliente = String(c.tipoDocumentoCliente?.codSunat ?? '0');
  const numeroCliente = String(c.numeroDocumentoCliente || '').trim() || '-';
  const nombreMoneda = NOMBRE_MONEDA[moneda] || String(c.moneda.nombreLargo || moneda).toUpperCase();

  // Resumen de impuestos de la cabecera por categoría presente en las líneas
  const bases = {};
  const impuestos = {};
  for (const d of c.detalles) {
    const categoria = categoriaDeLinea(d);
    bases[categoria] = (bases[categoria] || 0) + Number(d.subtotal);
    impuestos[categoria] = (impuestos[categoria] || 0) + Number(d.igv);
  }
  const subtotalesCabecera = Object.keys(bases)
    .map((categoria) => bloqueSubtotalImpuesto(TRIBUTO_POR_CATEGORIA[categoria], bases[categoria], impuestos[categoria], moneda))
    .join('');

  const valorVenta = Object.values(bases).reduce((s, v) => s + v, 0);

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Invoice xmlns="${NS.inv}" xmlns:cac="${NS.cac}" xmlns:cbc="${NS.cbc}" xmlns:ccts="${NS.ccts}" xmlns:ds="${NS.ds}" xmlns:ext="${NS.ext}" xmlns:qdt="${NS.qdt}" xmlns:udt="${NS.udt}" xmlns:xsi="${NS.xsi}">`,
    // Contenedor donde Smart PSE inserta la firma digital
    `<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>`,
    `<cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:CustomizationID>2.0</cbc:CustomizationID>`,
    `<cbc:ID>${esc(c.numeroSerie)}-${Number(c.numeroCorrelativo)}</cbc:ID>`,
    `<cbc:IssueDate>${fechaISO(c.fechaEmision)}</cbc:IssueDate>`,
    c.horaEmision ? `<cbc:IssueTime>${esc(c.horaEmision)}</cbc:IssueTime>` : '',
    // La fecha de vencimiento solo se informa en la factura
    tipo === '01' && c.fechaVencimiento ? `<cbc:DueDate>${fechaISO(c.fechaVencimiento)}</cbc:DueDate>` : '',
    `<cbc:InvoiceTypeCode listID="${esc(tipoOperacion)}" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion" listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">${tipo}</cbc:InvoiceTypeCode>`,
    // Leyenda 1000: monto en letras
    `<cbc:Note languageLocaleID="1000">${esc(numeroALetras(Number(c.totalComprobante), nombreMoneda))}</cbc:Note>`,
    // Leyenda 2006: operación sujeta a detracción
    c.sujetoDetraccion ? `<cbc:Note languageLocaleID="2006">Operación sujeta a detracción</cbc:Note>` : '',
    `<cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listName="Currency" listAgencyName="United Nations Economic Commission for Europe">${moneda}</cbc:DocumentCurrencyCode>`,
    `<cbc:LineCountNumeric>${c.detalles.length}</cbc:LineCountNumeric>`,
    c.ordenCompra ? `<cac:OrderReference><cbc:ID>${esc(String(c.ordenCompra).trim())}</cbc:ID></cac:OrderReference>` : '',
    c.guiaRemision
      ? `<cac:DespatchDocumentReference><cbc:ID>${esc(String(c.guiaRemision).trim())}</cbc:ID><cbc:DocumentTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">09</cbc:DocumentTypeCode></cac:DespatchDocumentReference>`
      : '',
    // Firma: identifica al firmante; el valor de la firma lo inserta Smart PSE en ext:UBLExtensions
    `<cac:Signature><cbc:ID>${ruc}</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${ruc}</cbc:ID></cac:PartyIdentification>` +
      `<cac:PartyName><cbc:Name><![CDATA[${c.empresa.razonSocial}]]></cbc:Name></cac:PartyName></cac:SignatoryParty>` +
      `<cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>#SIGN-${ruc}</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature>`,
    // Emisor
    `<cac:AccountingSupplierParty><cac:Party>` +
      `<cac:PartyIdentification><cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${ruc}</cbc:ID></cac:PartyIdentification>` +
      `<cac:PartyName><cbc:Name><![CDATA[${c.empresa.nombreComercial || c.empresa.razonSocial}]]></cbc:Name></cac:PartyName>` +
      `<cac:PartyLegalEntity><cbc:RegistrationName><![CDATA[${c.empresa.razonSocial}]]></cbc:RegistrationName>` +
      `<cac:RegistrationAddress><cbc:AddressTypeCode>${CODIGO_ESTABLECIMIENTO_DEFECTO}</cbc:AddressTypeCode>` +
      (c.empresa.direccion ? `<cac:AddressLine><cbc:Line><![CDATA[${c.empresa.direccion}]]></cbc:Line></cac:AddressLine>` : '') +
      `<cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>`,
    // Cliente
    `<cac:AccountingCustomerParty><cac:Party>` +
      `<cac:PartyIdentification><cbc:ID schemeID="${esc(docCliente)}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${esc(numeroCliente)}</cbc:ID></cac:PartyIdentification>` +
      `<cac:PartyLegalEntity><cbc:RegistrationName><![CDATA[${c.razonSocialCliente}]]></cbc:RegistrationName>` +
      (c.direccionCliente
        ? `<cac:RegistrationAddress><cac:AddressLine><cbc:Line><![CDATA[${c.direccionCliente}]]></cbc:Line></cac:AddressLine><cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country></cac:RegistrationAddress>`
        : '') +
      `</cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>`,
    bloquesPago(c, moneda),
    // Impuestos de la cabecera
    `<cac:TaxTotal>${montoMoneda('TaxAmount', c.totalIgv, moneda)}${subtotalesCabecera}</cac:TaxTotal>`,
    `<cac:LegalMonetaryTotal>${montoMoneda('LineExtensionAmount', valorVenta, moneda)}${montoMoneda('TaxInclusiveAmount', c.totalComprobante, moneda)}${montoMoneda('PayableAmount', c.totalComprobante, moneda)}</cac:LegalMonetaryTotal>`,
    ...c.detalles.map((d) => bloqueLinea(d, moneda)),
    `</Invoice>`,
  ];

  return xml.filter(Boolean).join('');
};

export default { construirXmlFacturaBoleta, validarComprobante, revisarComprobante };
