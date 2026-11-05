import tarifaEntidadPensionService from '../../services/RecursosHumanos/tarifaEntidadPension.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await tarifaEntidadPensionService.listar(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerVigentes(req, res, next) {
  try {
    res.json(toJSONBigInt(await tarifaEntidadPensionService.obtenerVigentes(req.query.fecha)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await tarifaEntidadPensionService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await tarifaEntidadPensionService.crear(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(toJSONBigInt(await tarifaEntidadPensionService.actualizar(Number(req.params.id), req.body)));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tarifaEntidadPensionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
