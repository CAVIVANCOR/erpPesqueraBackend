import calaFaenaConsumoService from '../../services/Pesca/calaFaenaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CalaFaenaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const calas = await calaFaenaConsumoService.listar();
    res.json(toJSONBigInt(calas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cala = await calaFaenaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(cala));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await calaFaenaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await calaFaenaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await calaFaenaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
