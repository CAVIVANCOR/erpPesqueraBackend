import plantillaFormatoExternoService from '../../services/RecursosHumanos/plantillaFormatoExterno.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await plantillaFormatoExternoService.listar(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerVigente(req, res, next) {
  try {
    res.json(toJSONBigInt(await plantillaFormatoExternoService.obtenerVigente(req.query.codigo, req.query.fecha)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await plantillaFormatoExternoService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await plantillaFormatoExternoService.crear(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(toJSONBigInt(await plantillaFormatoExternoService.actualizar(Number(req.params.id), req.body)));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await plantillaFormatoExternoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
