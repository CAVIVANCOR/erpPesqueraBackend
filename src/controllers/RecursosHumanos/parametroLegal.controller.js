import parametroLegalService from '../../services/RecursosHumanos/parametroLegal.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await parametroLegalService.listar(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerVigentes(req, res, next) {
  try {
    res.json(toJSONBigInt(await parametroLegalService.obtenerVigentes(req.query.fecha, req.query.regimenLaboralId)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await parametroLegalService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await parametroLegalService.crear(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(toJSONBigInt(await parametroLegalService.actualizar(Number(req.params.id), req.body)));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await parametroLegalService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
