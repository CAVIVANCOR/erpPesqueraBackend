import detContratistasOTService from '../../services/Mantenimiento/detContratistasOT.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetContratistasOT
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const { otMantenimientoId } = req.query;
    const detalles = await detContratistasOTService.listar(otMantenimientoId ? BigInt(otMantenimientoId) : null);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function listarPorOrdenTrabajo(req, res, next) {
  try {
    const otMantenimientoId = BigInt(req.params.otId);
    const detalles = await detContratistasOTService.listar(otMantenimientoId);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const detalle = await detContratistasOTService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detContratistasOTService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await detContratistasOTService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await detContratistasOTService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}