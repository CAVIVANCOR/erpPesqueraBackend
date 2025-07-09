import novedadPescaConsumoService from '../../services/Pesca/novedadPescaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para NovedadPescaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const novedades = await novedadPescaConsumoService.listar();
    res.json(toJSONBigInt(novedades));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const novedad = await novedadPescaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(novedad));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await novedadPescaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await novedadPescaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await novedadPescaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
