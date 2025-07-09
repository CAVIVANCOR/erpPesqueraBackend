import faenaPescaConsumoService from '../../services/Pesca/faenaPescaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para FaenaPescaConsumo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const faenas = await faenaPescaConsumoService.listar();
    res.json(toJSONBigInt(faenas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const faena = await faenaPescaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(faena));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await faenaPescaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await faenaPescaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await faenaPescaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
