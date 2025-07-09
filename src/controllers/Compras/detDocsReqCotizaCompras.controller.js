import detDocsReqCotizaComprasService from '../../services/Compras/detDocsReqCotizaCompras.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetDocsReqCotizaCompras
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const docs = await detDocsReqCotizaComprasService.listar();
    res.json(toJSONBigInt(docs));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const doc = await detDocsReqCotizaComprasService.obtenerPorId(id);
    res.json(toJSONBigInt(doc));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detDocsReqCotizaComprasService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detDocsReqCotizaComprasService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detDocsReqCotizaComprasService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
