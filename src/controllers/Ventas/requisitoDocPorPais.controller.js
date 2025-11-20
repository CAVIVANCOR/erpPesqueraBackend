import requisitoDocPorPaisService from '../../services/Ventas/requisitoDocPorPais.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para RequisitoDocPorPais
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const requisitos = await requisitoDocPorPaisService.listar();
    res.json(toJSONBigInt(requisitos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const requisito = await requisitoDocPorPaisService.obtenerPorId(id);
    res.json(toJSONBigInt(requisito));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorPais(req, res, next) {
  try {
    const paisId = Number(req.params.paisId);
    const requisitos = await requisitoDocPorPaisService.obtenerPorPais(paisId);
    res.json(toJSONBigInt(requisitos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorDocumento(req, res, next) {
  try {
    const docRequeridaVentasId = Number(req.params.docRequeridaVentasId);
    const requisitos = await requisitoDocPorPaisService.obtenerPorDocumento(docRequeridaVentasId);
    res.json(toJSONBigInt(requisitos));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const usuarioId = BigInt(req.user?.id || 1); // ID del usuario logueado
    const nuevo = await requisitoDocPorPaisService.crear(req.body, usuarioId);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = BigInt(req.user?.id || 1); // ID del usuario logueado
    const actualizado = await requisitoDocPorPaisService.actualizar(id, req.body, usuarioId);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await requisitoDocPorPaisService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}