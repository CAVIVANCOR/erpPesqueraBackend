import tipoConceptoService from '../../services/Almacen/tipoConcepto.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TipoConcepto
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tipos = await tipoConceptoService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipo = await tipoConceptoService.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tipoConceptoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tipoConceptoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tipoConceptoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
