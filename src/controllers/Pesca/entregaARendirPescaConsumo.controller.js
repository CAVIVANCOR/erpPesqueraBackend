import entregaARendirPescaConsumoService from '../../services/Pesca/entregaARendirPescaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para EntregaARendirPescaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const entregas = await entregaARendirPescaConsumoService.listar();
    res.json(toJSONBigInt(entregas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const entrega = await entregaARendirPescaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(entrega));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await entregaARendirPescaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await entregaARendirPescaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await entregaARendirPescaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
