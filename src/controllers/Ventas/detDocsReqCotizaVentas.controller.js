import detDocsReqCotizaVentasService from '../../services/Ventas/detDocsReqCotizaVentas.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para detDocsReqCotizaVentas
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const docs = await detDocsReqCotizaVentasService.listar();
    res.json(toJSONBigInt(docs));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCotizacion(req, res, next) {
  try {
    const cotizacionVentaId = Number(req.params.cotizacionVentaId);
    const docs = await detDocsReqCotizaVentasService.listarPorCotizacion(cotizacionVentaId);
    res.json(toJSONBigInt(docs));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const doc = await detDocsReqCotizaVentasService.obtenerPorId(id);
    res.json(toJSONBigInt(doc));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detDocsReqCotizaVentasService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detDocsReqCotizaVentasService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detDocsReqCotizaVentasService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
