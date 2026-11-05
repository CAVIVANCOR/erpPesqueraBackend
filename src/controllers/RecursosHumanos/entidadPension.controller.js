import entidadPensionService from '../../services/RecursosHumanos/entidadPension.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await entidadPensionService.listar()));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    res.json(toJSONBigInt(await entidadPensionService.listarActivos()));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await entidadPensionService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await entidadPensionService.crear(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(toJSONBigInt(await entidadPensionService.actualizar(Number(req.params.id), req.body)));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await entidadPensionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
