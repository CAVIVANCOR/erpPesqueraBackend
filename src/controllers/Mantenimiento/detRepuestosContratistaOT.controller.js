import detRepuestosContratistaOTService from '../../services/Mantenimiento/detRepuestosContratistaOT.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetRepuestosContratistaOT
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const { detContratistaOTId } = req.query;
    const detalles = await detRepuestosContratistaOTService.listar(detContratistaOTId ? BigInt(detContratistaOTId) : null);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const detalle = await detRepuestosContratistaOTService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detRepuestosContratistaOTService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await detRepuestosContratistaOTService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await detRepuestosContratistaOTService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}