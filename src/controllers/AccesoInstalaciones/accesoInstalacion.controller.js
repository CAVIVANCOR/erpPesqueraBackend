import accesoInstalacionService from '../../services/AccesoInstalaciones/accesoInstalacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AccesoInstalacion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const accesos = await accesoInstalacionService.listar();
    res.json(toJSONBigInt(accesos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const acceso = await accesoInstalacionService.obtenerPorId(id);
    res.json(toJSONBigInt(acceso));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await accesoInstalacionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await accesoInstalacionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await accesoInstalacionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
