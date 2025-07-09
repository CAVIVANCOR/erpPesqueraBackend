import detGastosComprasProdService from '../../services/Compras/detGastosComprasProd.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetGastosComprasProd
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const gastos = await detGastosComprasProdService.listar();
    res.json(toJSONBigInt(gastos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const gasto = await detGastosComprasProdService.obtenerPorId(id);
    res.json(toJSONBigInt(gasto));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detGastosComprasProdService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detGastosComprasProdService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detGastosComprasProdService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
