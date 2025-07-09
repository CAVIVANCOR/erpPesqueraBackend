import empresaCentroCostoService from '../../services/Maestros/empresaCentroCosto.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para EmpresaCentroCosto
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const registros = await empresaCentroCostoService.listar();
    res.json(toJSONBigInt(registros));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const registro = await empresaCentroCostoService.obtenerPorId(id);
    res.json(toJSONBigInt(registro));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await empresaCentroCostoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await empresaCentroCostoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await empresaCentroCostoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
