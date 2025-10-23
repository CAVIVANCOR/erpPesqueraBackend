import requerimientoCompraService from '../../services/Compras/requerimientoCompra.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para RequerimientoCompra
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const requerimientos = await requerimientoCompraService.listar();
    res.json(toJSONBigInt(requerimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const requerimiento = await requerimientoCompraService.obtenerPorId(id);
    res.json(toJSONBigInt(requerimiento));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await requerimientoCompraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await requerimientoCompraService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await requerimientoCompraService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Aprueba un requerimiento de compra y crea automáticamente la EntregaARendir
 */
export async function aprobar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const aprobado = await requerimientoCompraService.aprobar(id);
    res.json(toJSONBigInt(aprobado));
  } catch (err) {
    next(err);
  }
}

/**
 * Anula un requerimiento de compra
 */
export async function anular(req, res, next) {
  try {
    const id = Number(req.params.id);
    const anulado = await requerimientoCompraService.anular(id);
    res.json(toJSONBigInt(anulado));
  } catch (err) {
    next(err);
  }
}

/**
 * Autoriza la compra de un requerimiento
 */
export async function autorizarCompra(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { autorizadoPorId } = req.body;
    const autorizado = await requerimientoCompraService.autorizarCompra(id, autorizadoPorId);
    res.json(toJSONBigInt(autorizado));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene series de documentos filtradas
 * Query params: empresaId, tipoDocumentoId
 */
export async function obtenerSeriesDoc(req, res, next) {
  try {
    const { empresaId, tipoDocumentoId } = req.query;
    
    const series = await requerimientoCompraService.obtenerSeriesDoc(
      empresaId,
      tipoDocumentoId
    );
    
    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}