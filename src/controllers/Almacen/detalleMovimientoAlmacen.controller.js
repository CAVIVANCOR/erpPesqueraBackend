import detalleMovimientoAlmacenService from '../../services/Almacen/detalleMovimientoAlmacen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetalleMovimientoAlmacen
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const detalles = await detalleMovimientoAlmacenService.listar();
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await detalleMovimientoAlmacenService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detalleMovimientoAlmacenService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detalleMovimientoAlmacenService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detalleMovimientoAlmacenService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
