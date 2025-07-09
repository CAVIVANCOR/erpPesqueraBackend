import cotizacionVentasService from '../../services/Ventas/cotizacionVentas.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CotizacionVentas
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const cotizaciones = await cotizacionVentasService.listar();
    res.json(toJSONBigInt(cotizaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cotizacion = await cotizacionVentasService.obtenerPorId(id);
    res.json(toJSONBigInt(cotizacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await cotizacionVentasService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await cotizacionVentasService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await cotizacionVentasService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
