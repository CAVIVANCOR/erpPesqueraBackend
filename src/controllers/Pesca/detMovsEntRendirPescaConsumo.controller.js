import detMovsEntRendirPescaConsumoService from '../../services/Pesca/detMovsEntRendirPescaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetMovsEntRendirPescaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await detMovsEntRendirPescaConsumoService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movimiento = await detMovsEntRendirPescaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detMovsEntRendirPescaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detMovsEntRendirPescaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detMovsEntRendirPescaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
