import modoDespachoRecepcionService from '../../services/Ventas/modoDespachoRecepcion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ModoDespachoRecepcion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const modos = await modoDespachoRecepcionService.listar();
    res.json(toJSONBigInt(modos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const modo = await modoDespachoRecepcionService.obtenerPorId(id);
    res.json(toJSONBigInt(modo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await modoDespachoRecepcionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await modoDespachoRecepcionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await modoDespachoRecepcionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}