import comprobanteElectronicoService from '../../services/FacturacionElectronica/comprobanteElectronico.service.js';
import factproService from '../../services/FacturacionElectronica/factpro.service.js';
import preFacturaService from '../../services/Ventas/preFactura.service.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import prisma from '../../config/prismaClient.js';
import { ESTADO_PREFACTURA } from '../../utils/estados.constants.js';

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
 * FLUJO A — HISTÓRICOS: comprobantes ya emitidos por el portal de SUNAT con Clave SOL (todo lo facturado antes de Factpro).
 *   - La venta guarda a mano tipo, serie y correlativo del documento final (PreFactura.numSerieDocFinal / numCorreDocFinal).
 *   - NO tiene ComprobanteElectronico y el ERP NO emite nada: solo conserva el PDF, subido a mano o descargado de SUNAT (json.pe).
 *   - No se debe generar comprobante en Factpro para ellos: crearía un segundo documento ante SUNAT. Si el usuario lo intenta
 *     (venta con correlativo propio), la pantalla se lo advierte y deja que decida.
 *
 * FLUJO B — NUEVOS: comprobantes emitidos por Factpro desde que se adoptó.
 *   1. generarComprobanteElectronico (preFactura.service): crea el ComprobanteElectronico con el tipo y la serie deducidos del
 *      tipo de documento final y SIN correlativo (provisional); la venta pasa a COMPROBANTE GENERADO (97).
 *   2. enviarASunat (aquí): emite en Factpro con numero "#"; Factpro asigna el correlativo, que se graba en el comprobante y en
 *      el documento final de la venta (serie, correlativo, número completo).
 *   3. Cuando SUNAT acepta, la venta pasa a VALIDADO SUNAT (98) y el PDF de Factpro se copia al ERP (urlPreFacturaPdf).
 *   XML y CDR no se guardan: se descargan a demanda por GET /pre-facturas/factpro-archivo/:id/:tipo.
 *
 * Ambos flujos muestran el PDF con el mismo componente (PdfComprobanteVentaCard, módulo "pre-factura"); lo que cambia es
 * de dónde sale el PDF y si hay comprobante en el ERP.
 */
/**
 * ========================================
 * CONTROLADORES DE INTEGRACIÓN CON EL PROVEEDOR DE FACTURACIÓN ELECTRÓNICA (Factpro)
 * ========================================
 */

// Estados OSE de EstadoMultiFuncion: 50=PENDIENTE, 51=ENVIADO, 52=ACEPTADO, 53=RECHAZADO, 54=ERROR
const ESTADO_OSE = { ENVIADO: 51, ACEPTADO: 52, ERROR: 54 };
// Estados SUNAT de EstadoMultiFuncion: 62=BAJA
const ESTADO_SUNAT_BAJA = 62;

// Todo lo que el servicio necesita para armar el documento y para ubicar las credenciales de la empresa
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
      aceptadoPorSunat: resultado?.aceptadoPorSunat ?? null,
      codigoRespuesta: resultado?.codigoEstado ?? null,
      mensajeRespuesta: resultado?.descripcionEstado ?? null,
      estadoEnvio: error ? 'ERROR' : resultado?.aceptadoPorSunat ? 'ACEPTADO' : 'ENVIADO',
      tieneError: Boolean(error),
      mensajeError: error ? error.message : null,
    },
  });
};

// Solo avanza ventas que están en COMPROBANTE ELECTRÓNICO GENERADO; no pisa ningún otro estado
const marcarVentaValidadaSunat = (preFacturaId) =>
  prisma.preFactura.updateMany({
    where: { id: preFacturaId, estadoId: ESTADO_PREFACTURA.COMPROBANTE_ELECTRONICO_GENERADO },
    data: { estadoId: ESTADO_PREFACTURA.VALIDADO_SUNAT },
  });

// FLUJO B: al aceptarse el comprobante se copia su PDF al ERP. Un fallo aquí NO revierte nada (la emisión ya es válida ante
// SUNAT): se devuelve una advertencia para que el usuario reintente con "Obtener de Factpro".
const copiarPdfFactproALaVenta = async (preFacturaId, resultado) => {
  if (!resultado.aceptadoPorSunat || !resultado.enlacePDF) return null;
  try {
    await preFacturaService.guardarPdfFactproEnVenta(preFacturaId, resultado.enlacePDF);
    return null;
  } catch (error) {
    console.error('No se pudo guardar la copia del PDF de Factpro:', error.message);
    return `El comprobante fue aceptado, pero no se pudo guardar la copia del PDF en el ERP: ${error.message} Use "Obtener de Factpro" para reintentarlo.`;
  }
};
// Campos del comprobante que se actualizan con la respuesta del proveedor
const camposDeRespuesta = (resultado) => ({
  aceptadoPorSunat: resultado.aceptadoPorSunat,
  codigoEstadoProveedor: resultado.codigoEstado,
  descripcionEstadoProveedor: resultado.descripcionEstado,
  enlacePDF: resultado.enlacePDF,
  enlaceXML: resultado.enlaceXML,
  enlaceCDR: resultado.enlaceCDR,
  hashCpe: resultado.hash,
  qrBase64: resultado.qr,
  eventosProveedor: JSON.stringify(resultado.eventos),
  errorEnvio: null,
  fechaRespuestaOSE: new Date(),
  estadoOSEId: resultado.aceptadoPorSunat ? ESTADO_OSE.ACEPTADO : ESTADO_OSE.ENVIADO,
});

/**
 * Emite un comprobante en SUNAT a través del proveedor
 * POST /api/comprobante-electronico/:id/enviar-sunat
 */
export async function enviarASunat(req, res, next) {
  try {
    const id = Number(req.params.id);
    const comprobante = await cargarComprobante(id);

    if (comprobante.aceptadoPorSunat) {
      throw new ConflictError(`El comprobante ${comprobante.numeroCompleto} ya fue aceptado por SUNAT.`);
    }

    const documento = factproService.construirDocumento(comprobante);

    let emision;
    try {
      emision = await factproService.emitirDocumento(comprobante.empresa, documento);
    } catch (error) {
      await registrarEnvio({ comprobanteId: id, tipoAccion: 'EMISION', payload: documento, error });
      await prisma.comprobanteElectronico.update({
        where: { id },
        data: { estadoOSEId: ESTADO_OSE.ERROR, errorEnvio: error.message, fechaEnvioOSE: new Date() },
      });
      throw error;
    }

    await registrarEnvio({ comprobanteId: id, tipoAccion: 'EMISION', payload: documento, crudo: emision.crudo, resultado: emision.resultado });

    // Factpro asigna el correlativo cuando el comprobante se envía sin número: se guarda en el comprobante y en el documento final de la venta
    const { serieEmitida, correlativoEmitido } = emision.resultado;
    const numeroPendiente = !(Number(comprobante.numeroCorrelativo) > 0);
    const datosNumeracion = serieEmitida && correlativoEmitido
      ? {
          numeroSerie: serieEmitida,
          numeroCorrelativo: correlativoEmitido,
          numeroCompleto: `${serieEmitida}-${String(correlativoEmitido).padStart(8, '0')}`,
        }
      : {};
    const [actualizado] = await prisma.$transaction([
      prisma.comprobanteElectronico.update({
        where: { id },
        data: { ...datosNumeracion, ...camposDeRespuesta(emision.resultado), fechaEnvioOSE: new Date() },
      }),
      ...(datosNumeracion.numeroCompleto
        ? [prisma.preFactura.update({
            where: { id: comprobante.preFacturaId },
            data: {
              numSerieDocFinal: datosNumeracion.numeroSerie,
              numCorreDocFinal: String(datosNumeracion.numeroCorrelativo).padStart(8, '0'),
              numeroDocumentoFinal: datosNumeracion.numeroCompleto,
              facturado: true,
            },
          })]
        : []),
      // SUNAT aceptó el comprobante: la venta pasa de COMPROBANTE ELECTRÓNICO GENERADO (97) a VALIDADO SUNAT (98)
      ...(emision.resultado.aceptadoPorSunat ? [marcarVentaValidadaSunat(comprobante.preFacturaId)] : []),
    ]);
    if (numeroPendiente && !datosNumeracion.numeroCompleto) {
      throw new ConflictError('Factpro registró el comprobante pero no devolvió su número (serie y correlativo). Consulte el estado del comprobante para completar el documento final de la venta.');
    }

    const advertencia = await copiarPdfFactproALaVenta(comprobante.preFacturaId, emision.resultado);

    res.json(toJSONBigInt({
      success: true,
      advertencia,
      mensaje: emision.resultado.aceptadoPorSunat
        ? 'Comprobante aceptado por SUNAT'
        : `Comprobante registrado y enviado. Estado: ${emision.resultado.descripcionEstado || 'pendiente de respuesta'}. Consulte el estado en unos momentos.`,
      comprobante: actualizado,
      respuestaProveedor: emision.resultado,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Consulta el estado del comprobante en el proveedor y lo actualiza (estado, CDR, enlaces)
 * GET /api/comprobante-electronico/:id/consultar-sunat
 */
export async function consultarEnSunat(req, res, next) {
  try {
    const id = Number(req.params.id);
    const comprobante = await cargarComprobante(id);

    const payload = { serie: comprobante.numeroSerie, numero: comprobante.numeroCorrelativo };
    let consulta;
    try {
      consulta = await factproService.consultarDocumento(comprobante.empresa, comprobante.numeroSerie, comprobante.numeroCorrelativo);
    } catch (error) {
      await registrarEnvio({ comprobanteId: id, tipoAccion: 'CONSULTA', payload, error });
      throw error;
    }

    await registrarEnvio({ comprobanteId: id, tipoAccion: 'CONSULTA', payload, crudo: consulta.crudo, resultado: consulta.resultado });
    const actualizado = await prisma.comprobanteElectronico.update({ where: { id }, data: camposDeRespuesta(consulta.resultado) });
    if (consulta.resultado.aceptadoPorSunat) await marcarVentaValidadaSunat(comprobante.preFacturaId);
    const advertencia = await copiarPdfFactproALaVenta(comprobante.preFacturaId, consulta.resultado);

    res.json(toJSONBigInt({
      success: true,
      comprobante: actualizado,
      advertencia,
      estadoSunat: consulta.resultado,
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Solicita la baja (anulación) de un comprobante emitido
 * POST /api/comprobante-electronico/:id/anular
 */
export async function anularComprobante(req, res, next) {
  try {
    const id = Number(req.params.id);
    const motivo = String(req.body?.motivo || '').trim();
    const comprobante = await cargarComprobante(id);

    if (!comprobante.enlacePDF) {
      throw new ValidationError(`El comprobante ${comprobante.numeroCompleto} aún no fue emitido; no se puede anular en SUNAT.`);
    }
    if (comprobante.ticketBaja) {
      throw new ConflictError(`El comprobante ${comprobante.numeroCompleto} ya tiene una baja solicitada (ticket ${comprobante.ticketBaja}).`);
    }

    const payload = { serie: comprobante.numeroSerie, numero: comprobante.numeroCorrelativo, motivo };
    let baja;
    try {
      baja = await factproService.anularDocumento(comprobante.empresa, comprobante.numeroSerie, comprobante.numeroCorrelativo, motivo);
    } catch (error) {
      await registrarEnvio({ comprobanteId: id, tipoAccion: 'ANULACION', payload, error });
      throw error;
    }

    await registrarEnvio({ comprobanteId: id, tipoAccion: 'ANULACION', payload, crudo: baja.crudo, resultado: null });
    const actualizado = await prisma.comprobanteElectronico.update({
      where: { id },
      data: {
        fechaBaja: new Date(),
        motivoBaja: motivo,
        ticketBaja: baja.resultado.ticket,
        estadoSUNATId: ESTADO_SUNAT_BAJA,
      },
    });

    res.json(toJSONBigInt({
      success: true,
      mensaje: 'Solicitud de anulación enviada a SUNAT',
      comprobante: actualizado,
      respuestaProveedor: baja.resultado,
    }));
  } catch (err) {
    next(err);
  }
}
