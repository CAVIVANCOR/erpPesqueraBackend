import detInsumosTareaOTService from '../../services/Mantenimiento/detInsumosTareaOT.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetInsumosTareaOT
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const insumos = await detInsumosTareaOTService.listar();
    res.json(toJSONBigInt(insumos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const insumo = await detInsumosTareaOTService.obtenerPorId(id);
    res.json(toJSONBigInt(insumo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detInsumosTareaOTService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detInsumosTareaOTService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detInsumosTareaOTService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
