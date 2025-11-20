import detCotizacionVentasService from '../../services/Ventas/detCotizacionVentas.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetCotizacionVentas
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const detalles = await detCotizacionVentasService.listar();
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await detCotizacionVentasService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorCotizacion(req, res, next) {
  try {
    const cotizacionVentasId = Number(req.params.cotizacionId);
    const detalles = await detCotizacionVentasService.obtenerPorCotizacion(cotizacionVentasId);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detCotizacionVentasService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detCotizacionVentasService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detCotizacionVentasService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
