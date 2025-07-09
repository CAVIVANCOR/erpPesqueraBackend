import subfamiliaProductoService from '../../services/Maestros/subfamiliaProducto.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para SubfamiliaProducto
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const subfamilias = await subfamiliaProductoService.listar();
    res.json(toJSONBigInt(subfamilias));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const subfamilia = await subfamiliaProductoService.obtenerPorId(id);
    res.json(toJSONBigInt(subfamilia));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await subfamiliaProductoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await subfamiliaProductoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await subfamiliaProductoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
