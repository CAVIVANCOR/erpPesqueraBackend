import especieService from '../../services/Maestros/especie.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Especie
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const especies = await especieService.listar();
    res.json(toJSONBigInt(especies));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const especie = await especieService.obtenerPorId(id);
    res.json(toJSONBigInt(especie));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await especieService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await especieService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await especieService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
