import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import prisma from '../../config/prismaClient.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import { ESTADO_PREFACTURA } from '../../utils/estados.constants.js';
import smartpseService from './smartpse.service.js';
import { construirXmlFacturaBoleta, validarComprobante, fechaISO } from './ubl/ublFacturaBoleta.builder.js';

/**
 * Orquestador de la emisión de comprobantes electrónicos con Smart PSE (Flujo A: firma + envío en una llamada).
 *
 * Responsabilidades (el cliente de Smart PSE y el generador de XML no tocan la base de datos; este servicio sí):
 *  1. Validar el comprobante ANTES de gastar un crédito y antes de consumir un correlativo.
 *  2. Asignar el correlativo de la serie electrónica con bloqueo de fila, en una transacción.
 *  3. Enviar el XML, guardar XML firmado y CDR en disco (respaldo legal) y registrar cada intento en EnvioOSE.
 *  4. Actualizar el comprobante y avanzar la venta a VALIDADO SUNAT cuando SUNAT acepta.
 *
 * Un comprobante rechazado o con error de conexión conserva su número: se corrige y se reenvía con el MISMO número
 * (SUNAT no registró nada); nunca se consume otro correlativo por un reintento.
 */

// Estados OSE de EstadoMultiFuncion: 50=PENDIENTE, 51=ENVIADO, 52=ACEPTADO, 53=RECHAZADO, 54=ERROR
const ESTADO_OSE = { ENVIADO: 51, ACEPTADO: 52, RECHAZADO: 53, ERROR: 54 };

// Carpeta base de los archivos de comprobantes (misma convención que otros adjuntos del ERP: uploads/ bajo el cwd)
export const DIRECTORIO_COMPROBANTES = path.join(process.cwd(), 'uploads', 'comprobantes-electronicos');

const TIPOS_HABILITADOS = ['01', '03'];

// Todo lo que el generador de XML necesita
const INCLUDE_EMISION = {
  empresa: true,
  tipoComprobante: true,
  tipoDocumentoCliente: true,
  moneda: true,
  formaPago: true,
  cuotas: { orderBy: { numeroCuota: 'asc' } },
  motivoNotaCreditoDebito: true,
  comprobanteModifica: { include: { tipoComprobante: true } },
  detalles: { orderBy: { numeroLinea: 'asc' }, include: { tipoAfectacionIGV: true } },
  preFactura: { include: { tipoOperacionSunat: true } },
};

const cargarComprobante = async (id) => {
  const comprobante = await prisma.comprobanteElectronico.findUnique({ where: { id }, include: INCLUDE_EMISION });
  if (!comprobante) throw new NotFoundError('Comprobante no encontrado');
  return comprobante;
};

/**
 * Bitácora de cada llamada al proveedor (EnvioOSE): lo enviado, lo respondido y el error si lo hubo.
 */
const registrarEnvio = async ({ comprobanteId, tipoAccion, payload, crudo, resultado, error }) => {
  const numeroIntento = (await prisma.envioOSE.count({ where: { comprobanteElectronicoId: comprobanteId, tipoAccion } })) + 1;
  await prisma.envioOSE.create({
    data: {
      comprobanteElectronicoId: comprobanteId,
      tipoAccion,
      numeroIntento,
      payloadJSON: payload,
      respuestaJSON: crudo ?? undefined,
      aceptadoPorSunat: resultado ? resultado.aceptado : null,
      codigoRespuesta: resultado?.cdr?.codigo ?? null,
      mensajeRespuesta: resultado?.cdr?.descripcion ?? resultado?.mensaje ?? null,
      estadoEnvio: error ? 'ERROR' : resultado?.aceptado ? 'ACEPTADO' : resultado?.rechazado ? 'RECHAZADO' : 'ENVIADO',
      tieneError: Boolean(error),
      mensajeError: error ? error.message : resultado?.rechazado ? [].concat(resultado.errores || []).join(' | ') : null,
    },
  });
};

/**
 * Asigna el correlativo de la serie electrónica con bloqueo de fila: dos emisiones simultáneas nunca obtienen el mismo
 * número. Si el comprobante ya tiene número (reenvío tras un rechazo o un error), no consume otro.
 */
const asignarNumeracion = async (comprobante) => {
  if (Number(comprobante.numeroCorrelativo) > 0) {
    return { serie: comprobante.numeroSerie, correlativo: Number(comprobante.numeroCorrelativo) };
  }

  return prisma.$transaction(async (tx) => {
    const [fila] = await tx.$queryRaw`SELECT id, serie, correlativo, activo, "esElectronica", "empresaId" FROM "SerieDoc" WHERE id = ${comprobante.serieDocId} FOR UPDATE`;
    if (!fila) throw new ValidationError('La serie del comprobante ya no existe. Genere el comprobante nuevamente.');
    if (!fila.esElectronica || !fila.activo || Number(fila.empresaId) !== Number(comprobante.empresaId)) {
      throw new ValidationError(
        `La serie ${fila.serie} no es una serie electrónica activa de la empresa emisora. Revise las series en Almacén > Series de documento.`,
      );
    }

    const correlativo = Number(fila.correlativo) + 1;
    const serie = String(fila.serie).toUpperCase();
    const numeroCompleto = `${serie}-${String(correlativo).padStart(8, '0')}`;

    await tx.serieDoc.update({ where: { id: comprobante.serieDocId }, data: { correlativo } });
    await tx.comprobanteElectronico.update({
      where: { id: comprobante.id },
      data: { numeroSerie: serie, numeroCorrelativo: correlativo, numeroCompleto },
    });
    return { serie, correlativo };
  });
};

// Texto del código QR del comprobante según el formato de SUNAT (campos separados por |)
// Formato oficial de SUNAT (RS 097-2012, anexo técnico, numeral 5.1.3): 10 campos separados por |, el último es el Valor Resumen
// (hash en base 64 del XML firmado)
const contenidoQr = (c, serie, correlativo, hash) =>
  [
    c.empresa.ruc,
    c.tipoComprobante.codigoSunat,
    serie,
    String(correlativo).padStart(8, '0'),
    Number(c.totalIgv).toFixed(2),
    Number(c.totalComprobante).toFixed(2),
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(c.fechaEmision)),
    String(Number(c.tipoDocumentoCliente?.codSunat) || 0),
    c.numeroDocumentoCliente || '-',
    hash || '',
  ].join('|') + '|';

/**
 * Guarda XML firmado y CDR en disco y devuelve sus rutas relativas a la carpeta de comprobantes.
 */
const guardarArchivos = (c, nombreArchivo, resultado) => {
  const fecha = new Date(c.fechaEmision);
  const relativo = path.join(String(c.empresaId), String(fecha.getFullYear()), String(fecha.getMonth() + 1).padStart(2, '0'));
  const carpeta = path.join(DIRECTORIO_COMPROBANTES, relativo);
  fs.mkdirSync(carpeta, { recursive: true });

  const rutas = { rutaLocalXML: null, rutaLocalCDR: null };
  if (resultado.xmlFirmado) {
    // Se conserva el archivo tal como lo entregó Smart PSE (ZIP o XML)
    const extension = resultado.xmlFirmado.esZip ? 'zip' : 'xml';
    const archivo = `${nombreArchivo}.${extension}`;
    fs.writeFileSync(path.join(carpeta, archivo), resultado.xmlFirmado.original);
    rutas.rutaLocalXML = path.join(relativo, archivo);
  }
  if (resultado.cdr) {
    const archivo = `R-${nombreArchivo}.${resultado.cdr.esZip ? 'zip' : 'xml'}`;
    fs.writeFileSync(path.join(carpeta, archivo), resultado.cdr.original);
    rutas.rutaLocalCDR = path.join(relativo, archivo);
  }
  return rutas;
};

/**
 * Emite un comprobante (factura o boleta) en SUNAT a través de Smart PSE.
 * @returns {{ comprobante: object, resultado: object, advertencia: string|null }}
 */
const emitirComprobante = async (id, usuarioId = null) => {
  const comprobante = await cargarComprobante(id);
  const tipo = String(comprobante.tipoComprobante?.codigoSunat || '');
  const nombreDoc = comprobante.numeroCompleto;

  if (comprobante.aceptadoPorSunat) throw new ConflictError(`El comprobante ${nombreDoc} ya fue aceptado por SUNAT.`);
  if (!TIPOS_HABILITADOS.includes(tipo)) {
    throw new ValidationError('Por ahora solo se emiten facturas y boletas con Smart PSE: las notas de crédito y de débito se habilitan en la siguiente entrega.');
  }
  if (tipo === '03' && comprobante.empresa.facturacionElectronicaBoletaModo === 'RESUMEN_DIARIO') {
    throw new ValidationError(
      `La empresa está configurada para enviar boletas por resumen diario (RC), que se habilita en la siguiente entrega. Cambie "Envío de boletas" a Individual en Maestros > Empresas para emitir esta boleta.`,
    );
  }

  // Al CONTADO (sin cuotas) la fecha de vencimiento no tiene efecto tributario: si la venta quedó con un vencimiento anterior a la
  // fecha de emisión del comprobante (p. ej. una venta de días atrás que se emite hoy), SUNAT no lo admite; se corrige con la fecha de
  // emisión y se guarda para que el comprobante conserve lo que realmente se envía. En ventas al crédito NO se corrige: ahí el
  // vencimiento y las cuotas son una decisión comercial y el validador avisa para que la persona los ajuste.
  if (comprobante.fechaVencimiento && (comprobante.cuotas || []).length === 0 && fechaISO(comprobante.fechaVencimiento) < fechaISO(comprobante.fechaEmision)) {
    await prisma.comprobanteElectronico.update({ where: { id }, data: { fechaVencimiento: comprobante.fechaEmision } });
    comprobante.fechaVencimiento = comprobante.fechaEmision;
  }

  // 1. Validar antes de consumir un correlativo y un crédito (con un correlativo provisional si todavía no tiene)
  validarComprobante({ ...comprobante, numeroCorrelativo: Number(comprobante.numeroCorrelativo) || 1 });

  // 2. Numeración
  const { serie, correlativo } = await asignarNumeracion(comprobante);
  const final = { ...comprobante, numeroSerie: serie, numeroCorrelativo: correlativo };
  const numeroCompleto = `${serie}-${String(correlativo).padStart(8, '0')}`;
  const nombreArchivo = smartpseService.construirNombreArchivo(comprobante.empresa.ruc, tipo, serie, correlativo);

  // 3. XML
  const xml = construirXmlFacturaBoleta(final);
  const payload = { nombreArchivo, xml };

  await prisma.comprobanteElectronico.update({
    where: { id },
    data: { nombreArchivo, estadoOSEId: ESTADO_OSE.ENVIADO, fechaEnvioOSE: new Date(), errorEnvio: null, actualizadoPor: usuarioId ? BigInt(usuarioId) : null },
  });

  // 4. Envío
  let emision;
  try {
    emision = await smartpseService.emitirDocumento(comprobante.empresa, { nombreArchivo, xml });
  } catch (error) {
    await registrarEnvio({ comprobanteId: id, tipoAccion: 'EMISION', payload, error });
    await prisma.comprobanteElectronico.update({ where: { id }, data: { estadoOSEId: ESTADO_OSE.ERROR, errorEnvio: error.message } });
    throw error;
  }
  const { resultado, crudo } = emision;
  await registrarEnvio({ comprobanteId: id, tipoAccion: 'EMISION', payload, crudo, resultado });

  // 5. Archivos y estado. Un fallo al guardar archivos NO invalida la emisión (ya está aceptada ante SUNAT): se advierte.
  let rutas = { rutaLocalXML: null, rutaLocalCDR: null };
  let advertencia = null;
  try {
    rutas = guardarArchivos(final, nombreArchivo, resultado);
  } catch (error) {
    console.error('No se pudieron guardar el XML y el CDR del comprobante:', error.message);
    advertencia = `El comprobante fue enviado, pero no se pudieron guardar el XML y el CDR en el servidor: ${error.message}`;
  }

  // Sin CDR, sin ticket y sin aceptación SUNAT no registró el comprobante (p. ej. error de lectura del XML): el mensaje del
  // proveedor es el motivo y se muestra al usuario, que puede corregir y reenviar con el mismo número
  const sinAceptar = !resultado.aceptado && !resultado.pendiente;
  const errores = [].concat(resultado.errores || []).filter(Boolean);
  if (sinAceptar && errores.length === 0 && resultado.mensaje) errores.push(resultado.mensaje);
  const qr = resultado.aceptado ? await QRCode.toDataURL(contenidoQr(final, serie, correlativo, resultado.hash)) : null;

  const actualizado = await prisma.comprobanteElectronico.update({
    where: { id },
    data: {
      aceptadoPorSunat: resultado.aceptado ? true : resultado.rechazado ? false : null,
      codigoEstadoProveedor: resultado.cdr?.codigo ?? null,
      descripcionEstadoProveedor: resultado.cdr?.descripcion || resultado.mensaje || null,
      hashCpe: resultado.hash,
      qrBase64: qr ? qr.split(',')[1] : null,
      eventosProveedor: JSON.stringify({ observaciones: resultado.observaciones, errores, notasCdr: resultado.cdr?.notas || [] }),
      errorEnvio: errores.length > 0 ? errores.join(' | ') : null,
      fechaRespuestaOSE: new Date(),
      estadoOSEId: resultado.aceptado ? ESTADO_OSE.ACEPTADO : resultado.rechazado ? ESTADO_OSE.RECHAZADO : sinAceptar ? ESTADO_OSE.ERROR : ESTADO_OSE.ENVIADO,
      ...rutas,
    },
  });

  // 6. La venta toma el número del documento final; si SUNAT aceptó, pasa de COMPROBANTE ELECTRÓNICO GENERADO a VALIDADO SUNAT
  await prisma.preFactura.update({
    where: { id: comprobante.preFacturaId },
    data: {
      numSerieDocFinal: serie,
      numCorreDocFinal: String(correlativo).padStart(8, '0'),
      numeroDocumentoFinal: numeroCompleto,
      facturado: true,
    },
  });
  if (resultado.aceptado) {
    await prisma.preFactura.updateMany({
      where: { id: comprobante.preFacturaId, estadoId: ESTADO_PREFACTURA.COMPROBANTE_ELECTRONICO_GENERADO },
      data: { estadoId: ESTADO_PREFACTURA.VALIDADO_SUNAT },
    });
  }

  return { comprobante: actualizado, resultado, advertencia };
};

/**
 * Ruta absoluta de un archivo guardado del comprobante (XML firmado o CDR) para su descarga.
 * Se valida que quede dentro de la carpeta de comprobantes.
 */
const obtenerArchivo = async (id, tipo) => {
  const comprobante = await prisma.comprobanteElectronico.findUnique({
    where: { id },
    select: { numeroCompleto: true, rutaLocalXML: true, rutaLocalCDR: true },
  });
  if (!comprobante) throw new NotFoundError('Comprobante no encontrado');

  const relativa = tipo === 'cdr' ? comprobante.rutaLocalCDR : tipo === 'xml' ? comprobante.rutaLocalXML : null;
  if (!['xml', 'cdr'].includes(tipo)) throw new ValidationError('El tipo de archivo debe ser xml o cdr.');
  if (!relativa) throw new NotFoundError(`El comprobante ${comprobante.numeroCompleto} no tiene ${tipo === 'cdr' ? 'CDR' : 'XML firmado'} guardado.`);

  const absoluta = path.resolve(DIRECTORIO_COMPROBANTES, relativa);
  if (!absoluta.startsWith(path.resolve(DIRECTORIO_COMPROBANTES) + path.sep) || !fs.existsSync(absoluta)) {
    throw new NotFoundError(`El archivo ${tipo.toUpperCase()} del comprobante ${comprobante.numeroCompleto} no se encuentra en el servidor.`);
  }
  return { ruta: absoluta, nombre: path.basename(absoluta) };
};

export default { emitirComprobante, obtenerArchivo, registrarEnvio };
