import serieDocService from '../../services/Almacen/serieDoc.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para SerieDoc
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const series = await serieDocService.listar();
    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const serie = await serieDocService.obtenerPorId(id);
    res.json(toJSONBigInt(serie));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await serieDocService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await serieDocService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await serieDocService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
