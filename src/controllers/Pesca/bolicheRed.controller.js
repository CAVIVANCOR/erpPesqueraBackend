import bolicheRedService from '../../services/Pesca/bolicheRed.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para BolicheRed
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const boliches = await bolicheRedService.listar();
    res.json(toJSONBigInt(boliches));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const boliche = await bolicheRedService.obtenerPorId(id);
    res.json(toJSONBigInt(boliche));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await bolicheRedService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await bolicheRedService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await bolicheRedService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
