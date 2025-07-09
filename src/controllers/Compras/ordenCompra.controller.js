import ordenCompraService from '../../services/Compras/ordenCompra.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para OrdenCompra
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const ordenes = await ordenCompraService.listar();
    res.json(toJSONBigInt(ordenes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orden = await ordenCompraService.obtenerPorId(id);
    res.json(toJSONBigInt(orden));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await ordenCompraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await ordenCompraService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await ordenCompraService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
