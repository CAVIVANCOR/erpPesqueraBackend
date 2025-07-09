import permisoAutorizacionService from '../../services/Maestros/permisoAutorizacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para PermisoAutorizacion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const permisos = await permisoAutorizacionService.listar();
    res.json(toJSONBigInt(permisos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const permiso = await permisoAutorizacionService.obtenerPorId(id);
    res.json(toJSONBigInt(permiso));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await permisoAutorizacionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await permisoAutorizacionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await permisoAutorizacionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
