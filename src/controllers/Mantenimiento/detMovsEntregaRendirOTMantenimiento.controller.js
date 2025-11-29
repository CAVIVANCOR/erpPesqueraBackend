import detMovsEntregaRendirOTMantenimientoService from '../../services/Mantenimiento/detMovsEntregaRendirOTMantenimiento.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetMovsEntregaRendirOTMantenimiento
 * Gestiona los movimientos de las entregas a rendir de órdenes de trabajo de mantenimiento
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await detMovsEntregaRendirOTMantenimientoService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movimiento = await detMovsEntregaRendirOTMantenimientoService.obtenerPorId(id);
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntrega(req, res, next) {
  try {
    const entregaARendirOTMantenimientoId = BigInt(req.params.entregaId);
    const dets = await detMovsEntregaRendirOTMantenimientoService.obtenerPorEntrega(entregaARendirOTMantenimientoId);
    res.json(toJSONBigInt(dets));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detMovsEntregaRendirOTMantenimientoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detMovsEntregaRendirOTMantenimientoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detMovsEntregaRendirOTMantenimientoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
