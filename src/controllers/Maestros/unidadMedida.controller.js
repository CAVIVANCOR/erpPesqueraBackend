import unidadMedidaService from '../../services/Maestros/unidadMedida.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para UnidadMedida
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const unidades = await unidadMedidaService.listar();
    res.json(toJSONBigInt(unidades));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const unidad = await unidadMedidaService.obtenerPorId(id);
    res.json(toJSONBigInt(unidad));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await unidadMedidaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await unidadMedidaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await unidadMedidaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
