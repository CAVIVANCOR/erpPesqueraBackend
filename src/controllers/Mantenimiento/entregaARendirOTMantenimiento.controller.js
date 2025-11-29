import entregaARendirOTMantenimientoService from '../../services/Mantenimiento/entregaARendirOTMantenimiento.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para EntregaARendirOTMantenimiento
 * Gestiona las entregas a rendir asociadas a órdenes de trabajo de mantenimiento
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const entregas = await entregaARendirOTMantenimientoService.listar();
    res.json(toJSONBigInt(entregas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const entrega = await entregaARendirOTMantenimientoService.obtenerPorId(id);
    res.json(toJSONBigInt(entrega));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorOTMantenimiento(req, res, next) {
  try {
    const otMantenimientoId = Number(req.params.otMantenimientoId);
    const entrega = await entregaARendirOTMantenimientoService.obtenerPorOTMantenimiento(otMantenimientoId);
    res.json(toJSONBigInt(entrega));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await entregaARendirOTMantenimientoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await entregaARendirOTMantenimientoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await entregaARendirOTMantenimientoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

// Alias para compatibilidad
export const obtenerPorOT = obtenerPorOTMantenimiento;
