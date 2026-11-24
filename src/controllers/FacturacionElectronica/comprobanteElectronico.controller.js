import comprobanteElectronicoService from '../../services/FacturacionElectronica/comprobanteElectronico.service.js';
import emisionComprobanteService from '../../services/FacturacionElectronica/emisionComprobante.service.js';
import prisma from '../../config/prismaClient.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const comprobantes = await comprobanteElectronicoService.listar();
    res.json(toJSONBigInt(comprobantes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const comprobante = await comprobanteElectronicoService.obtenerPorId(id);
    res.json(toJSONBigInt(comprobante));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await comprobanteElectronicoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const comprobantes = await comprobanteElectronicoService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(comprobantes));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPreFactura(req, res, next) {
  try {
    const comprobantes = await comprobanteElectronicoService.listarPorPreFactura(Number(req.params.preFacturaId));
    res.json(toJSONBigInt(comprobantes));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCliente(req, res, next) {
  try {
    const clienteId = Number(req.params.clienteId);
    const comprobantes = await comprobanteElectronicoService.listarPorCliente(clienteId);
    res.json(toJSONBigInt(comprobantes));
  } catch (err) {
    next(err);
  }
}

/**
 * ========================================
 * BIFURCACIÓN DE COMPROBANTES ELECTRÓNICOS DE VENTA (leer antes de tocar este flujo)
 * ========================================
 * El ERP convive con dos orígenes de comprobantes. Se distinguen por un solo hecho: si la venta tiene o no una fila en
 * ComprobanteElectronico (no hay un campo "origen").
 *
 * FLUJO A — HISTÓRICOS: comprobantes ya emitidos por el portal de SUNAT con Clave SOL (todo lo facturado antes de Smart PSE).
 *   - La venta guarda a mano tipo, serie y correlativo del documento final (PreFactura.numSerieDocFinal / numCorreDocFinal).
 *   - NO tiene ComprobanteElectronico y el ERP NO emite nada: solo conserva el PDF, subido a mano o descargado de SUNAT.
 *   - No se debe generar comprobante electrónico para ellos: crearía un segundo documento ante SUNAT. Si el usuario lo intenta
 *     (venta con correlativo propio), la pantalla se lo advierte y deja que decida.
 *
 * FLUJO B — NUEVOS: comprobantes emitidos por el ERP con Smart PSE.
 *   1. generarComprobanteElectronico (preFactura.service): crea el ComprobanteElectronico con el tipo y la serie electrónica
 *      (SerieDoc.esElectronica) deducidos del tipo de documento final y SIN correlativo (provisional); la venta pasa a COMPROBANTE GENERADO (97).
 *   2. enviarASunat (aquí → emisionComprobante.service): valida, asigna el correlativo con bloqueo de la serie, arma el XML UBL 2.1,
 *      lo envía a Smart PSE (firma + SUNAT) y graba el número en el comprobante y en el documento final de la venta.
 *   3. Cuando SUNAT acepta, la venta pasa a VALIDADO SUNAT (98). XML firmado y CDR quedan guardados en el servidor
 *      (descarga por GET /:id/archivo/:tipo).
 */

const usuarioDe = (req) => (req.user?.id ? Number(req.user.id) : null);

/**
 * Emite un comprobante en SUNAT a través de Smart PSE
 * POST /api/comprobante-electronico/:id/enviar-sunat
 */
export async function enviarASunat(req, res, next) {
  try {
    const { comprobante, resultado, advertencia } = await emisionComprobanteService.emitirComprobante(Number(req.params.id), usuarioDe(req));

    const observaciones = [].concat(resultado.observaciones || []).filter(Boolean).join(' | ');
    const mensaje = resultado.aceptado
      ? `Comprobante ${comprobante.numeroCompleto} aceptado por SUNAT${observaciones ? ` con observaciones: ${observaciones}` : ''}`
      : resultado.rechazado || !resultado.pendiente
        ? `SUNAT rechazó el comprobante ${comprobante.numeroCompleto}: ${comprobante.errorEnvio || resultado.mensaje || 'sin detalle'}. Corrija los datos y reenvíe: se conserva el mismo número.`
        : `Comprobante ${comprobante.numeroCompleto} enviado; SUNAT aún no responde: ${resultado.mensaje || 'pendiente de respuesta'}.`;

    res.json(toJSONBigInt({
      success: resultado.aceptado,
      advertencia,
      mensaje,
      comprobante,
      respuestaProveedor: { aceptadoPorSunat: resultado.aceptado, rechazado: resultado.rechazado, rechazado: resultado.rechazado, hash: resultado.hash, observaciones: resultado.observaciones, errores: resultado.errores },
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Devuelve el estado guardado del comprobante. Las facturas y boletas se responden en el mismo envío (CDR), por lo que no hay
 * nada que consultar al proveedor; la consulta por ticket aplica solo a resúmenes y bajas.
 * GET /api/comprobante-electronico/:id/consultar-sunat
 */
export async function consultarEnSunat(req, res, next) {
  try {
    const comprobante = await comprobanteElectronicoService.obtenerPorId(Number(req.params.id));
    if (!comprobante) throw new NotFoundError('Comprobante no encontrado');
    res.json(toJSONBigInt({
      success: true,
      comprobante,
      estadoSunat: {
        aceptado: comprobante.aceptadoPorSunat,
        codigo: comprobante.codigoEstadoProveedor,
        descripcion: comprobante.descripcionEstadoProveedor,
        error: comprobante.errorEnvio,
      },
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Baja (anulación) de un comprobante emitido.
 * POST /api/comprobante-electronico/:id/anular
 */
export async function anularComprobante(req, res, next) {
  try {
    const comprobante = await prisma.comprobanteElectronico.findUnique({ where: { id: Number(req.params.id) }, select: { numeroCompleto: true } });
    if (!comprobante) throw new NotFoundError('Comprobante no encontrado');
    throw new ValidationError(
      `La baja del comprobante ${comprobante.numeroCompleto} requiere la comunicación de baja (RA) a SUNAT, que se habilita en la siguiente entrega. Por ahora no se puede anular desde el ERP: use el portal de SUNAT (Clave SOL) si es urgente.`,
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Descarga el XML firmado o el CDR guardados del comprobante
 * GET /api/comprobante-electronico/:id/archivo/:tipo   (tipo = xml | cdr)
 */
export async function descargarArchivo(req, res, next) {
  try {
    const { ruta, nombre } = await emisionComprobanteService.obtenerArchivo(Number(req.params.id), String(req.params.tipo).toLowerCase());
    res.download(ruta, nombre);
  } catch (err) {
    next(err);
  }
}
