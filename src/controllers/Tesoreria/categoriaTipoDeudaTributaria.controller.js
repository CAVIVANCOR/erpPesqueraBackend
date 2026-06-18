import categoriaTipoDeudaTributariaService from '../../services/Tesoreria/categoriaTipoDeudaTributaria.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const categorias = await categoriaTipoDeudaTributariaService.listar();
    res.json(toJSONBigInt(categorias));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    const categorias = await categoriaTipoDeudaTributariaService.listarActivos();
    res.json(toJSONBigInt(categorias));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const categoria = await categoriaTipoDeudaTributariaService.obtenerPorId(id);
    res.json(toJSONBigInt(categoria));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await categoriaTipoDeudaTributariaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await categoriaTipoDeudaTributariaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await categoriaTipoDeudaTributariaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}