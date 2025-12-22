import grabacionReunionService from '../../services/Videoconferencia/grabacionReunion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para GrabacionReunion
 * Gestiona grabaciones de videoconferencias
 * Documentado en español.
 */

export async function listarPorVideoconferencia(req, res, next) {
  try {
    const videoconferenciaId = Number(req.params.videoconferenciaId);
    const grabaciones = await grabacionReunionService.listarPorVideoconferencia(videoconferenciaId);
    res.json(toJSONBigInt(grabaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const grabacion = await grabacionReunionService.obtenerPorId(id);
    res.json(toJSONBigInt(grabacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await grabacionReunionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await grabacionReunionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await grabacionReunionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
