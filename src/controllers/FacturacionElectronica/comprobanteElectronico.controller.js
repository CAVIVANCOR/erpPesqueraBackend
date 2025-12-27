import comprobanteElectronicoService from '../../services/FacturacionElectronica/comprobanteElectronico.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ComprobanteElectronico
 * Documentado en español.
 */

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
