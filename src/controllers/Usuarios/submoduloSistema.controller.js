import submoduloSistemaService from '../../services/Usuarios/submoduloSistema.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para SubmoduloSistema
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const submodulos = await submoduloSistemaService.listar();
    res.json(toJSONBigInt(submodulos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const submodulo = await submoduloSistemaService.obtenerPorId(id);
    res.json(toJSONBigInt(submodulo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await submoduloSistemaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await submoduloSistemaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await submoduloSistemaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
