import categoriaTipoMovEntregaRendirService from '../../services/Pesca/categoriaTipoMovEntregaRendir.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CategoriaTipoMovEntregaRendir
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const categorias = await categoriaTipoMovEntregaRendirService.listar();
    res.json(toJSONBigInt(categorias));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const categoria = await categoriaTipoMovEntregaRendirService.obtenerPorId(id);
    res.json(toJSONBigInt(categoria));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await categoriaTipoMovEntregaRendirService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await categoriaTipoMovEntregaRendirService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await categoriaTipoMovEntregaRendirService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}