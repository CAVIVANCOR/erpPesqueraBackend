import tipoEstadoProductoService from '../../services/Ventas/tipoEstadoProducto.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TipoEstadoProducto
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tipos = await tipoEstadoProductoService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipo = await tipoEstadoProductoService.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tipoEstadoProductoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tipoEstadoProductoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tipoEstadoProductoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
