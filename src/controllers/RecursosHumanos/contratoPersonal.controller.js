import contratoPersonalService from '../../services/RecursosHumanos/contratoPersonal.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await contratoPersonalService.listar(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await contratoPersonalService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await contratoPersonalService.crear(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(toJSONBigInt(await contratoPersonalService.actualizar(Number(req.params.id), req.body)));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await contratoPersonalService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
