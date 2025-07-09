import requerimientoCompraService from '../../services/Compras/requerimientoCompra.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para RequerimientoCompra
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const reqs = await requerimientoCompraService.listar();
    res.json(toJSONBigInt(reqs));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const reqCompra = await requerimientoCompraService.obtenerPorId(id);
    res.json(toJSONBigInt(reqCompra));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await requerimientoCompraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await requerimientoCompraService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await requerimientoCompraService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
