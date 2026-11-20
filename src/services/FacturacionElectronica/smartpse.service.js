import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Cliente del proveedor de facturación electrónica Smart PSE (Flujo A: firma + envío a SUNAT en una sola llamada).
 * Documentación: https://smartpse.pe/documentacion
 *
 * - Cada empresa del ERP usa sus credenciales CPE (usuario + token de acceso, panel de Smart PSE) para pedir un JWT
 *   de 10 minutos; el JWT se guarda en memoria y se renueva solo antes de vencer.
 * - El entorno (demo / producción) es un dato de la empresa y viaja en el cuerpo de la petición (rutas /api/v1): no hay
 *   rutas ni URLs distintas por entorno, por eso no se duplica código.
 * - Este servicio NO accede a la base de datos: recibe el XML sin firmar, llama a la API y devuelve la respuesta ya
 *   normalizada (XML firmado, CDR y su lectura). Quien lo invoca persiste archivos, estados y la bitácora (EnvioOSE).
 *
 * Política de créditos: cada firma descuenta 1 crédito del paquete (también en demo y en cada reintento). Por eso solo se
 * reintenta ante fallos temporales de conexión (red, 502/503/504); jamás ante un rechazo de SUNAT ni un error del XML.
 */

const ENTORNOS = { DEMO: 'demo', PRODUCCION: 'produccion' };

// El JWT dura 10 minutos: se renueva con un minuto de margen, sin fiarse de `expira_en` (la API devuelve un valor no confiable)
const VIGENCIA_TOKEN_MS = 9 * 60 * 1000;
const TIMEOUT_MS = 45_000;
const PAUSAS_REINTENTO_MS = [1500, 4000];
const ESTADOS_HTTP_TEMPORALES = new Set([502, 503, 504]);

// Código de respuesta del CDR de SUNAT: 0 = aceptado; 4000 en adelante = aceptado con observaciones
const CODIGO_CDR_ACEPTADO = '0';

// Causas de HTTP 403 documentadas por Smart PSE (campo `motivo`) y qué debe hacer el usuario
const MOTIVOS_403 = {
  pool_agotado: 'Se agotaron las firmas del paquete de Smart PSE. Recargue el paquete para seguir emitiendo.',
  pool_vencido: 'El saldo de firmas de Smart PSE venció. Al recargar el paquete se renueva todo el saldo.',
  empresa_inactiva: 'La empresa está inactiva en Smart PSE. Actívela en el panel de Smart PSE.',
  suscripcion_vencida: 'La suscripción de Smart PSE está vencida. Renuévela para seguir emitiendo.',
  usuario_suspendido: 'La cuenta de Smart PSE está suspendida. Comuníquese con Smart PSE.',
  ruc_no_corresponde: 'El RUC del comprobante no pertenece a la cuenta de Smart PSE. Verifique el RUC de la empresa emisora.',
};

const cacheTokens = new Map();

const parserXml = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, trimValues: true });

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * Valida y devuelve la configuración de la empresa emisora (URL base, credenciales CPE y entorno).
 */
const obtenerConfiguracion = (empresa) => {
  const nombre = empresa?.razonSocial ? ` ${empresa.razonSocial}` : '';
  const url = String(empresa?.facturacionElectronicaUrl || '').trim().replace(/\/+$/, '');
  const usuario = String(empresa?.facturacionElectronicaUsuario || '').trim();
  const token = String(empresa?.facturacionElectronicaToken || '').trim();
  if (!url || !usuario || !token) {
    throw new ValidationError(
      `La empresa${nombre} no tiene configurados la URL, el usuario y el token de Smart PSE. Complételos en Maestros > Empresas.`,
    );
  }
  const entorno = String(empresa?.facturacionElectronicaEntorno || ENTORNOS.DEMO).trim().toLowerCase();
  if (!Object.values(ENTORNOS).includes(entorno)) {
    throw new ValidationError(`El entorno de facturación electrónica de la empresa${nombre} debe ser "demo" o "produccion".`);
  }
  return { url, usuario, token, entorno };
};

/**
 * Nombre de archivo que exige SUNAT y Smart PSE: RUC-TIPO-SERIE-CORRELATIVO (el correlativo con 8 dígitos).
 */
const construirNombreArchivo = (ruc, codigoTipo, serie, correlativo) =>
  `${ruc}-${codigoTipo}-${String(serie).toUpperCase()}-${String(correlativo).padStart(8, '0')}`;

/**
 * Traduce una respuesta HTTP de error de Smart PSE a un mensaje accionable para el usuario.
 */
const errorDeRespuesta = (estado, cuerpo, contexto) => {
  const detalle = cuerpo?.mensaje || cuerpo?.message || (cuerpo?.errors ? JSON.stringify(cuerpo.errors) : '');
  if (estado === 401) {
    return new ConflictError(
      'Smart PSE rechazó las credenciales de la empresa. Verifique el usuario y el token en Maestros > Empresas (o regenere el token en el panel de Smart PSE).',
    );
  }
  if (estado === 403) {
    const motivo = MOTIVOS_403[cuerpo?.motivo];
    return new ConflictError(motivo || `Smart PSE no permitió firmar el comprobante${cuerpo?.motivo ? ` (${cuerpo.motivo})` : ''}. ${detalle}`.trim());
  }
  if (estado === 404) {
    return new ConflictError(`Smart PSE no encontró el recurso solicitado (${contexto}). ${detalle}`.trim());
  }
  if (estado === 422) {
    return new ValidationError(`Smart PSE consideró inválidos los datos enviados (${contexto}): ${detalle}`);
  }
  if (estado === 429) {
    const reintento = cuerpo?.reintentar_en ? ` Podrá reintentar desde ${cuerpo.reintentar_en}.` : '';
    return new ConflictError(
      `Smart PSE detuvo los reintentos de este comprobante (se firmó ${cuerpo?.intentos ?? 'demasiadas'} veces en la última hora y cada firma consume un crédito). Motivo del último rechazo: ${cuerpo?.motivo || detalle}. Corrija el XML antes de volver a enviarlo.${reintento}`,
    );
  }
  return new ConflictError(`Smart PSE respondió con error (HTTP ${estado}, ${contexto}). ${detalle}`.trim());
};

/**
 * Una petición HTTP a Smart PSE, con timeout y respuesta JSON. Reintenta únicamente ante fallos temporales
 * de conexión (red, 502/503/504); cualquier otra respuesta se devuelve o se informa sin reintentar.
 */
const peticion = async (config, metodo, ruta, { cuerpo = null, token = null, contexto = ruta } = {}) => {
  const direccion = `${config.url}${ruta}`;
  let ultimoError;

  for (let intento = 0; intento <= PAUSAS_REINTENTO_MS.length; intento++) {
    if (intento > 0) await dormir(PAUSAS_REINTENTO_MS[intento - 1]);

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      const respuesta = await fetch(direccion, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        signal: controlador.signal,
      });
      const texto = await respuesta.text();
      let json;
      try {
        json = texto ? JSON.parse(texto) : {};
      } catch {
        json = { mensaje: texto.slice(0, 300) };
      }

      if (ESTADOS_HTTP_TEMPORALES.has(respuesta.status) && intento < PAUSAS_REINTENTO_MS.length) {
        ultimoError = new ConflictError(`Smart PSE no está disponible (HTTP ${respuesta.status}).`);
        continue;
      }
      return { estado: respuesta.status, cuerpo: json };
    } catch (error) {
      ultimoError = new ConflictError(
        `No se pudo conectar con Smart PSE (${config.url}). Verifique la conexión a internet y la URL de la empresa. Detalle: ${error.name === 'AbortError' ? 'tiempo de espera agotado' : error.message}`,
      );
    } finally {
      clearTimeout(temporizador);
    }
  }
  throw ultimoError;
};

/**
 * JWT de la empresa (10 minutos), con caché en memoria por URL + usuario.
 */
const obtenerToken = async (config) => {
  const clave = `${config.url}|${config.usuario}`;
  const enCache = cacheTokens.get(clave);
  if (enCache && enCache.venceEn > Date.now()) return enCache.token;

  const { estado, cuerpo } = await peticion(config, 'POST', '/api/v1/auth/token', {
    cuerpo: { usuario: config.usuario, password: config.token },
    contexto: 'token CPE',
  });
  if (estado !== 200 || !cuerpo.token_acceso) throw errorDeRespuesta(estado, cuerpo, 'token CPE');

  cacheTokens.set(clave, { token: cuerpo.token_acceso, venceEn: Date.now() + VIGENCIA_TOKEN_MS });
  return cuerpo.token_acceso;
};

/**
 * Smart PSE devuelve XML firmado y CDR en base64; según el caso pueden venir como XML directo o dentro de un ZIP
 * (SUNAT entrega el CDR en ZIP). Se detecta por la firma del archivo ("PK") y se devuelven siempre el contenido original
 * (para conservarlo tal cual, como respaldo legal) y el XML extraído (para leerlo).
 */
const extraerArchivo = (base64) => {
  if (!base64) return null;
  const original = Buffer.from(base64, 'base64');
  const esZip = original.length > 3 && original[0] === 0x50 && original[1] === 0x4b;
  if (!esZip) return { original, esZip: false, nombre: null, xml: original.toString('utf8') };

  const entradas = new AdmZip(original).getEntries().filter((e) => !e.isDirectory && /\.xml$/i.test(e.entryName));
  if (entradas.length === 0) throw new ConflictError('El archivo ZIP devuelto por Smart PSE no contiene ningún XML.');
  // En el CDR de SUNAT el XML de respuesta es el que empieza con "R-"; en el comprobante firmado hay uno solo
  const entrada = entradas.find((e) => /^R-/i.test(e.entryName.split('/').pop())) || entradas[0];
  return { original, esZip: true, nombre: entrada.entryName, xml: entrada.getData().toString('utf8') };
};

/**
 * Lee el XML del CDR: código y descripción de la respuesta de SUNAT, y sus observaciones (notas).
 */
const leerCdr = (xml) => {
  const raiz = parserXml.parse(xml)?.ApplicationResponse;
  if (!raiz) throw new ConflictError('El CDR devuelto por Smart PSE no tiene el formato esperado de SUNAT.');
  const respuesta = raiz.DocumentResponse?.Response || {};
  const notas = [raiz.Note].flat().filter(Boolean).map(String);
  const codigo = String(respuesta.ResponseCode ?? '').trim();
  return {
    codigo,
    descripcion: String(respuesta.Description ?? '').trim() || null,
    notas,
    aceptado: codigo === CODIGO_CDR_ACEPTADO,
    // Códigos 4xxx: SUNAT aceptó el comprobante, pero con observaciones que se muestran al usuario
    conObservaciones: notas.length > 0,
  };
};

/**
 * Convierte la respuesta de /documents/process o de /documents/{nombre}/status en los campos genéricos del ERP.
 */
const normalizarRespuesta = (cuerpo) => {
  const xmlFirmado = extraerArchivo(cuerpo.xml_firmado || cuerpo.xml);
  const cdrArchivo = extraerArchivo(cuerpo.cdr);
  const cdr = cdrArchivo ? { ...cdrArchivo, ...leerCdr(cdrArchivo.xml) } : null;
  const ticket = cuerpo.ticket || null;
  const rechazado = cuerpo.rechazado === true;
  return {
    estado: cuerpo.estado ?? null,
    mensaje: cuerpo.mensaje || null,
    rechazado,
    // Aceptado = SUNAT devolvió CDR con código 0 (o con observaciones 4xxx) y no lo rechazó
    aceptado: !rechazado && !ticket && Boolean(cdr) && (cdr.aceptado || cdr.conObservaciones || Number(cdr.codigo) >= 4000),
    pendiente: Boolean(ticket),
    ticket,
    hash: cuerpo.codigo_hash || null,
    xmlFirmado,
    cdr,
    observaciones: cuerpo.observaciones || null,
    errores: cuerpo.errores || null,
  };
};

/**
 * Firma el XML y lo envía a SUNAT en una sola llamada (Flujo A).
 * Facturas, boletas y notas responden con CDR; resúmenes y bajas responden con un ticket para consultar después.
 *
 * @param {object} empresa - Empresa emisora con sus credenciales de Smart PSE
 * @param {{ nombreArchivo: string, xml: string|Buffer }} documento - XML UBL SIN firmar
 */
const emitirDocumento = async (empresa, { nombreArchivo, xml }) => {
  if (!nombreArchivo || !xml) throw new ValidationError('Falta el nombre del archivo o el XML para enviar a Smart PSE.');
  const config = obtenerConfiguracion(empresa);
  const token = await obtenerToken(config);

  const { estado, cuerpo } = await peticion(config, 'POST', '/api/v1/documents/process', {
    token,
    contexto: nombreArchivo,
    cuerpo: {
      nombre_archivo: nombreArchivo,
      contenido_archivo: Buffer.from(xml).toString('base64'),
      environment: config.entorno,
    },
  });

  // Un rechazo de SUNAT puede llegar con HTTP 200 y `rechazado: true` (con o sin CDR): es una respuesta de negocio, no un fallo
  if (estado !== 200) {
    // El token pudo vencer entre la caché y la llamada: se descarta para que la próxima petición pida uno nuevo
    if (estado === 401) cacheTokens.delete(`${config.url}|${config.usuario}`);
    throw errorDeRespuesta(estado, cuerpo, nombreArchivo);
  }
  return { resultado: normalizarRespuesta(cuerpo), crudo: sinArchivos(cuerpo) };
};

/**
 * Consulta el estado de un ticket (resúmenes RC/RA/RR y, en la segunda fase, guías de remisión).
 * Devuelve `enProceso: true` mientras SUNAT no resuelva; en la primera consulta exitosa el CDR debe guardarse.
 */
const consultarTicket = async (empresa, nombreArchivo) => {
  const config = obtenerConfiguracion(empresa);
  const token = await obtenerToken(config);

  const { estado, cuerpo } = await peticion(
    config,
    'GET',
    `/api/v1/documents/${encodeURIComponent(nombreArchivo)}/status?environment=${config.entorno}`,
    { token, contexto: nombreArchivo },
  );
  if (estado === 202) return { resultado: { enProceso: true, mensaje: cuerpo?.mensaje || 'En proceso' }, crudo: cuerpo };
  if (estado !== 200) {
    if (estado === 401) cacheTokens.delete(`${config.url}|${config.usuario}`);
    throw errorDeRespuesta(estado, cuerpo, nombreArchivo);
  }
  return { resultado: { enProceso: false, ...normalizarRespuesta(cuerpo) }, crudo: sinArchivos(cuerpo) };
};

// Para la bitácora (EnvioOSE) no se guardan los archivos en base64: ya se conservan en disco y harían crecer la tabla
const sinArchivos = (cuerpo) => ({
  ...cuerpo,
  ...(cuerpo.xml_firmado !== undefined ? { xml_firmado: '[archivo guardado en disco]' } : {}),
  ...(cuerpo.xml !== undefined ? { xml: '[archivo guardado en disco]' } : {}),
  ...(cuerpo.cdr !== undefined && cuerpo.cdr !== null ? { cdr: '[archivo guardado en disco]' } : {}),
});

export default {
  construirNombreArchivo,
  emitirDocumento,
  consultarTicket,
  // Expuestos para pruebas y para el orquestador (lectura de archivos recibidos)
  extraerArchivo,
  leerCdr,
};
