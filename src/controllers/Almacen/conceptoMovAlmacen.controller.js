import conceptoMovAlmacenService from '../../services/Almacen/conceptoMovAlmacen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ConceptoMovAlmacen
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const conceptos = await conceptoMovAlmacenService.listar();
    res.json(toJSONBigInt(conceptos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const concepto = await conceptoMovAlmacenService.obtenerPorId(id);
    res.json(toJSONBigInt(concepto));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await conceptoMovAlmacenService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await conceptoMovAlmacenService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await conceptoMovAlmacenService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
