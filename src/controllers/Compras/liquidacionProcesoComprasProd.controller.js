import liquidacionProcesoComprasProdService from '../../services/Compras/liquidacionProcesoComprasProd.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para LiquidacionProcesoComprasProd
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const liquidaciones = await liquidacionProcesoComprasProdService.listar();
    res.json(toJSONBigInt(liquidaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const liquidacion = await liquidacionProcesoComprasProdService.obtenerPorId(id);
    res.json(toJSONBigInt(liquidacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await liquidacionProcesoComprasProdService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await liquidacionProcesoComprasProdService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await liquidacionProcesoComprasProdService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
