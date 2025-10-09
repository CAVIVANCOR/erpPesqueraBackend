import detalleDocEmbarcacionService from '../../services/Pesca/detalleDocEmbarcacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetalleDocEmbarcacion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const { faenaPescaId } = req.query;  // ← AGREGAR ESTA LÍNEA
    const detalles = await detalleDocEmbarcacionService.listar(faenaPescaId);  // ← PASAR PARÁMETRO
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await detalleDocEmbarcacionService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detalleDocEmbarcacionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detalleDocEmbarcacionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detalleDocEmbarcacionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}