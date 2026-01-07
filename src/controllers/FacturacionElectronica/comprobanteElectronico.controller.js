import comprobanteElectronicoService from '../../services/FacturacionElectronica/comprobanteElectronico.service.js';
import nubefactService from '../../services/FacturacionElectronica/nubefact.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import prisma from '../../config/prismaClient.js';

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

export async function crear(req, res, next) {
  try {
    const nuevo = await comprobanteElectronicoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await comprobanteElectronicoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
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

export async function listarPorCliente(req, res, next) {
  try {
    const clienteId = Number(req.params.clienteId);
    const comprobantes = await comprobanteElectronicoService.listarPorCliente(clienteId);
    res.json(toJSONBigInt(comprobantes));
  } catch (err) {
    next(err);
  }
}

export async function marcarEnviado(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { hashCPE, codigoQR } = req.body;
    const comprobante = await comprobanteElectronicoService.marcarEnviado(id, hashCPE, codigoQR);
    res.json(toJSONBigInt(comprobante));
  } catch (err) {
    next(err);
  }
}

export async function marcarCDRRecibido(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { respuestaSunat } = req.body;
    const comprobante = await comprobanteElectronicoService.marcarCDRRecibido(id, respuestaSunat);
    res.json(toJSONBigInt(comprobante));
  } catch (err) {
    next(err);
  }
}

/**
 * ========================================
 * CONTROLADORES DE INTEGRACIÓN NUBEFACT
 * ========================================
 */

/**
 * Envía un comprobante a SUNAT vía Nubefact
 * POST /api/comprobante-electronico/:id/enviar-sunat
 */
export async function enviarASunat(req, res, next) {
  try {
    const id = Number(req.params.id);
    
    const comprobante = await prisma.comprobanteElectronico.findUnique({
      where: { id },
      include: {
        tipoComprobante: true,
        tipoDocumentoCliente: true,
        moneda: true,
        formaPago: true,
        preFactura: {
          select: {
            porcentajeIgv: true,
            exoneradoIgv: true
          }
        },
        detalles: {
          include: {
            producto: true,
            tipoAfectacionIGV: true
          }
        }
      }
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const porcentajeIgv = comprobante.preFactura?.exoneradoIgv 
      ? 0.00 
      : Number(comprobante.preFactura?.porcentajeIgv || 18.00);

    const respuestaNubefact = await nubefactService.generarComprobante(
      comprobante, 
      comprobante.detalles,
      porcentajeIgv
    );

    const actualizado = await prisma.comprobanteElectronico.update({
      where: { id },
      data: {
        nubefactAceptadoPorSunat: respuestaNubefact.aceptada_por_sunat,
        nubefactEnlacePDF: respuestaNubefact.enlace_del_pdf,
        nubefactEnlaceXML: respuestaNubefact.enlace_del_xml,
        nubefactEnlaceCDR: respuestaNubefact.enlace_del_cdr,
        nubefactSunatDescription: respuestaNubefact.sunat_description,
        nubefactSunatNote: respuestaNubefact.sunat_note,
        nubefactSunatResponsecode: respuestaNubefact.sunat_responsecode,
        nubefactSunatSoapError: respuestaNubefact.sunat_soap_error,
        nubefactCadenaParaQr: respuestaNubefact.cadena_para_codigo_qr,
        nubefactHashCpe: respuestaNubefact.codigo_hash,
        fechaEnvioOSE: new Date(),
        estadoOSEId: respuestaNubefact.aceptada_por_sunat ? 52 : 53
      }
    });

    res.json(toJSONBigInt({
      success: true,
      mensaje: respuestaNubefact.aceptada_por_sunat 
        ? 'Comprobante aceptado por SUNAT' 
        : 'Comprobante enviado pero con observaciones',
      comprobante: actualizado,
      respuestaNubefact
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Consulta el estado de un comprobante en SUNAT vía Nubefact
 * GET /api/comprobante-electronico/:id/consultar-sunat
 */
export async function consultarEnSunat(req, res, next) {
  try {
    const id = Number(req.params.id);
    
    const comprobante = await prisma.comprobanteElectronico.findUnique({
      where: { id },
      include: {
        tipoComprobante: true
      }
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const respuesta = await nubefactService.consultarComprobante(
      comprobante.tipoComprobante.codigo,
      comprobante.numeroSerie,
      comprobante.numeroCorrelativo
    );

    res.json(toJSONBigInt({
      success: true,
      comprobante: {
        id: comprobante.id,
        numeroCompleto: comprobante.numeroCompleto
      },
      estadoSunat: respuesta
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Anula un comprobante en SUNAT vía Nubefact
 * POST /api/comprobante-electronico/:id/anular
 */
export async function anularComprobante(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { motivo } = req.body;
    
    const comprobante = await prisma.comprobanteElectronico.findUnique({
      where: { id },
      include: {
        tipoComprobante: true
      }
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const respuesta = await nubefactService.anularComprobante(
      comprobante.tipoComprobante.codigo,
      comprobante.numeroSerie,
      comprobante.numeroCorrelativo,
      motivo
    );

    const actualizado = await prisma.comprobanteElectronico.update({
      where: { id },
      data: {
        fechaBaja: new Date(),
        motivoBaja: motivo,
        ticketBaja: respuesta.sunat_ticket_numero,
        estadoSUNATId: 62
      }
    });

    res.json(toJSONBigInt({
      success: true,
      mensaje: 'Solicitud de anulación enviada a SUNAT',
      comprobante: actualizado,
      respuestaNubefact: respuesta
    }));
  } catch (err) {
    next(err);
  }
}

/**
 * Consulta el estado de anulación de un comprobante
 * GET /api/comprobante-electronico/:id/consultar-anulacion
 */
export async function consultarAnulacion(req, res, next) {
  try {
    const id = Number(req.params.id);
    
    const comprobante = await prisma.comprobanteElectronico.findUnique({
      where: { id },
      include: {
        tipoComprobante: true
      }
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const respuesta = await nubefactService.consultarAnulacion(
      comprobante.tipoComprobante.codigo,
      comprobante.numeroSerie,
      comprobante.numeroCorrelativo
    );

    res.json(toJSONBigInt({
      success: true,
      comprobante: {
        id: comprobante.id,
        numeroCompleto: comprobante.numeroCompleto
      },
      estadoAnulacion: respuesta
    }));
  } catch (err) {
    next(err);
  }
}