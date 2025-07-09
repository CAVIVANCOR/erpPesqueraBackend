import formaPagoService from '../../services/Maestros/formaPago.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para FormaPago
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const formas = await formaPagoService.listar();
    res.json(toJSONBigInt(formas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const forma = await formaPagoService.obtenerPorId(id);
    res.json(toJSONBigInt(forma));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await formaPagoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await formaPagoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await formaPagoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
