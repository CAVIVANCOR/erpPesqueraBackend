import tiposDocIdentidadService from '../../services/Maestros/tiposDocIdentidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TiposDocIdentidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tipos = await tiposDocIdentidadService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipo = await tiposDocIdentidadService.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tiposDocIdentidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tiposDocIdentidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tiposDocIdentidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
