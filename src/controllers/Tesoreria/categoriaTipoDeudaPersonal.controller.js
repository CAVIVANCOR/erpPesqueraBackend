import categoriaTipoDeudaPersonalService from '../../services/Tesoreria/categoriaTipoDeudaPersonal.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const categorias = await categoriaTipoDeudaPersonalService.listar();
    res.json(toJSONBigInt(categorias));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    const categorias = await categoriaTipoDeudaPersonalService.listarActivos();
    res.json(toJSONBigInt(categorias));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const categoria = await categoriaTipoDeudaPersonalService.obtenerPorId(id);
    res.json(toJSONBigInt(categoria));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await categoriaTipoDeudaPersonalService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await categoriaTipoDeudaPersonalService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await categoriaTipoDeudaPersonalService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}