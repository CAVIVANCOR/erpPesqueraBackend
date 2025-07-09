import agrupacionEntidadService from '../../services/Maestros/agrupacionEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AgrupacionEntidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const agrupaciones = await agrupacionEntidadService.listar();
    res.json(toJSONBigInt(agrupaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const agrup = await agrupacionEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(agrup));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await agrupacionEntidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await agrupacionEntidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await agrupacionEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
