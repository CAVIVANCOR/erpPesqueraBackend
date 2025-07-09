import colorService from '../../services/Maestros/color.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Color
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const colores = await colorService.listar();
    res.json(toJSONBigInt(colores));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const color = await colorService.obtenerPorId(id);
    res.json(toJSONBigInt(color));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await colorService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await colorService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await colorService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
