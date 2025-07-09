import movLiquidacionFaenaPescaService from '../../services/Pesca/movLiquidacionFaenaPesca.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para MovLiquidacionFaenaPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await movLiquidacionFaenaPescaService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mov = await movLiquidacionFaenaPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(mov));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await movLiquidacionFaenaPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await movLiquidacionFaenaPescaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await movLiquidacionFaenaPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
