import tripulanteFaenaService from '../../services/Pesca/tripulanteFaena.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TripulanteFaena
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tripulantes = await tripulanteFaenaService.listar();
    res.json(toJSONBigInt(tripulantes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tripulante = await tripulanteFaenaService.obtenerPorId(id);
    res.json(toJSONBigInt(tripulante));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorFaena(req, res, next) {
  try {
    const faenaPescaId = Number(req.params.faenaPescaId);
    const tripulantes = await tripulanteFaenaService.obtenerPorFaena(faenaPescaId);
    res.json(toJSONBigInt(tripulantes));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tripulanteFaenaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tripulanteFaenaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tripulanteFaenaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
