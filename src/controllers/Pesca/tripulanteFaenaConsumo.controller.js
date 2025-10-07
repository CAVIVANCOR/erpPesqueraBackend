import tripulanteFaenaConsumoService from '../../services/Pesca/tripulanteFaenaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TripulanteFaenaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tripulantes = await tripulanteFaenaConsumoService.listar();
    res.json(toJSONBigInt(tripulantes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tripulante = await tripulanteFaenaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(tripulante));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorFaena(req, res, next) {
  try {
    const faenaPescaConsumoId = Number(req.params.faenaPescaConsumoId);
    const tripulantes = await tripulanteFaenaConsumoService.obtenerPorFaena(faenaPescaConsumoId);
    res.json(toJSONBigInt(tripulantes));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tripulanteFaenaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tripulanteFaenaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tripulanteFaenaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function regenerarTripulantes(req, res, next) {
  try {
    const faenaPescaConsumoId = Number(req.params.faenaPescaConsumoId);
    const resultado = await tripulanteFaenaConsumoService.regenerarTripulantes(faenaPescaConsumoId);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}