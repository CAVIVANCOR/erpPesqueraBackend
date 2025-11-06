import costoExportacionPorIncotermService from '../../services/Ventas/costoExportacionPorIncoterm.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CostoExportacionPorIncoterm
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const costos = await costoExportacionPorIncotermService.listar();
    res.json(toJSONBigInt(costos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const costo = await costoExportacionPorIncotermService.obtenerPorId(id);
    res.json(toJSONBigInt(costo));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorIncoterm(req, res, next) {
  try {
    const incotermId = Number(req.params.incotermId);
    const costos = await costoExportacionPorIncotermService.obtenerPorIncoterm(incotermId);
    res.json(toJSONBigInt(costos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerCostosVendedorPorIncoterm(req, res, next) {
  try {
    const incotermId = Number(req.params.incotermId);
    const costos = await costoExportacionPorIncotermService.obtenerCostosVendedorPorIncoterm(incotermId);
    res.json(toJSONBigInt(costos));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await costoExportacionPorIncotermService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await costoExportacionPorIncotermService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await costoExportacionPorIncotermService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}