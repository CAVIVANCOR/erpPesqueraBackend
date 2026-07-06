import tipoDetraccionService from '../../services/Tesoreria/tipoDetraccion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TipoDetraccion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tiposDetraccion = await tipoDetraccionService.listar();
    res.json(toJSONBigInt(tiposDetraccion));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    const tiposDetraccion = await tipoDetraccionService.listarActivos();
    res.json(toJSONBigInt(tiposDetraccion));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipoDetraccion = await tipoDetraccionService.obtenerPorId(id);
    res.json(toJSONBigInt(tipoDetraccion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tipoDetraccionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tipoDetraccionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tipoDetraccionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}