import detAccionesPreviasFaenaConsumoService from '../../services/Pesca/detAccionesPreviasFaenaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetAccionesPreviasFaenaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const detalles = await detAccionesPreviasFaenaConsumoService.listar();
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await detAccionesPreviasFaenaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detAccionesPreviasFaenaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detAccionesPreviasFaenaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detAccionesPreviasFaenaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
