import detraccionService from '../../services/Contabilidad/detraccion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const detracciones = await detraccionService.listar();
    res.json(toJSONBigInt(detracciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detraccion = await detraccionService.obtenerPorId(id);
    res.json(toJSONBigInt(detraccion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detraccionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detraccionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detraccionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const detracciones = await detraccionService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(detracciones));
  } catch (err) {
    next(err);
  }
}