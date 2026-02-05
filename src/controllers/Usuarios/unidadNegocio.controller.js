import unidadNegocioService from '../../services/Usuarios/unidadNegocio.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para UnidadNegocio
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const { activo } = req.query;
    const filtros = {};
    
    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }
    
    const unidades = await unidadNegocioService.listar(filtros);
    res.json(toJSONBigInt(unidades));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const unidad = await unidadNegocioService.obtenerPorId(id);
    res.json(toJSONBigInt(unidad));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await unidadNegocioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await unidadNegocioService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await unidadNegocioService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}