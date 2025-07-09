import liquidacionFaenaConsumoService from '../../services/Pesca/liquidacionFaenaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para LiquidacionFaenaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const liquidaciones = await liquidacionFaenaConsumoService.listar();
    res.json(toJSONBigInt(liquidaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const liquidacion = await liquidacionFaenaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(liquidacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await liquidacionFaenaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await liquidacionFaenaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await liquidacionFaenaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
