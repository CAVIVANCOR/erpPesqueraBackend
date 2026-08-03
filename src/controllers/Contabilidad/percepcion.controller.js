import percepcionService from '../../services/Contabilidad/percepcion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const percepciones = await percepcionService.listar();
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const percepcion = await percepcionService.obtenerPorId(id);
    res.json(toJSONBigInt(percepcion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await percepcionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await percepcionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await percepcionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const percepciones = await percepcionService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
}