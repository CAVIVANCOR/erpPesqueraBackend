import accionesPreviasFaenaService from '../../services/Pesca/accionesPreviasFaena.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AccionesPreviasFaena
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const acciones = await accionesPreviasFaenaService.listar();
    res.json(toJSONBigInt(acciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const accion = await accionesPreviasFaenaService.obtenerPorId(id);
    res.json(toJSONBigInt(accion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await accionesPreviasFaenaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await accionesPreviasFaenaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await accionesPreviasFaenaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
