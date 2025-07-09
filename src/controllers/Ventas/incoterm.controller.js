import incotermService from '../../services/Ventas/incoterm.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Incoterm
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const incoterms = await incotermService.listar();
    res.json(toJSONBigInt(incoterms));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const incoterm = await incotermService.obtenerPorId(id);
    res.json(toJSONBigInt(incoterm));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await incotermService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await incotermService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await incotermService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
