import tipoMovimientoAlmacenService from '../../services/Almacen/tipoMovimientoAlmacen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TipoMovimientoAlmacen
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tipos = await tipoMovimientoAlmacenService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipo = await tipoMovimientoAlmacenService.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tipoMovimientoAlmacenService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tipoMovimientoAlmacenService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tipoMovimientoAlmacenService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
