import calaFaenaConsumoProduceService from '../../services/Pesca/calaFaenaConsumoProduce.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CalaFaenaConsumoProduce
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const calas = await calaFaenaConsumoProduceService.listar();
    res.json(toJSONBigInt(calas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cala = await calaFaenaConsumoProduceService.obtenerPorId(id);
    res.json(toJSONBigInt(cala));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await calaFaenaConsumoProduceService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await calaFaenaConsumoProduceService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await calaFaenaConsumoProduceService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
