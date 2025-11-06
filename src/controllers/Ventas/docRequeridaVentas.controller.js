import docRequeridaVentasService from '../../services/Ventas/docRequeridaVentas.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DocRequeridaVentas
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const documentos = await docRequeridaVentasService.listar();
    res.json(toJSONBigInt(documentos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const documento = await docRequeridaVentasService.obtenerPorId(id);
    res.json(toJSONBigInt(documento));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    const documentos = await docRequeridaVentasService.listarActivos();
    res.json(toJSONBigInt(documentos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorPaisYProducto(req, res, next) {
  try {
    const paisId = Number(req.params.paisId);
    const tipoProductoId = req.query.tipoProductoId ? Number(req.query.tipoProductoId) : null;
    const documentos = await docRequeridaVentasService.obtenerPorPaisYProducto(paisId, tipoProductoId);
    res.json(toJSONBigInt(documentos));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await docRequeridaVentasService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await docRequeridaVentasService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await docRequeridaVentasService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}