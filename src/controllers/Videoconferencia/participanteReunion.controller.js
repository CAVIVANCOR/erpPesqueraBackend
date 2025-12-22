import participanteReunionService from '../../services/Videoconferencia/participanteReunion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ParticipanteReunion
 * Gestiona participantes de videoconferencias
 * Documentado en español.
 */

export async function listarPorVideoconferencia(req, res, next) {
  try {
    const videoconferenciaId = Number(req.params.videoconferenciaId);
    const participantes = await participanteReunionService.listarPorVideoconferencia(videoconferenciaId);
    res.json(toJSONBigInt(participantes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const participante = await participanteReunionService.obtenerPorId(id);
    res.json(toJSONBigInt(participante));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await participanteReunionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await participanteReunionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await participanteReunionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function confirmar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const confirmado = await participanteReunionService.confirmar(id);
    res.json(toJSONBigInt(confirmado));
  } catch (err) {
    next(err);
  }
}

export async function registrarIngreso(req, res, next) {
  try {
    const id = Number(req.params.id);
    const registrado = await participanteReunionService.registrarIngreso(id);
    res.json(toJSONBigInt(registrado));
  } catch (err) {
    next(err);
  }
}

export async function registrarSalida(req, res, next) {
  try {
    const id = Number(req.params.id);
    const registrado = await participanteReunionService.registrarSalida(id);
    res.json(toJSONBigInt(registrado));
  } catch (err) {
    next(err);
  }
}
