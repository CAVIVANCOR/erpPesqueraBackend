import presupuestoService from '../../services/Presupuestos/presupuesto.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const presupuestos = await presupuestoService.listar();
    res.json(toJSONBigInt(presupuestos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const presupuesto = await presupuestoService.obtenerPorId(id);
    res.json(toJSONBigInt(presupuesto));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await presupuestoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await presupuestoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await presupuestoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const presupuestos = await presupuestoService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(presupuestos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCentroCosto(req, res, next) {
  try {
    const centroCostoId = Number(req.params.centroCostoId);
    const presupuestos = await presupuestoService.listarPorCentroCosto(centroCostoId);
    res.json(toJSONBigInt(presupuestos));
  } catch (err) {
    next(err);
  }
}

export async function aprobarPresupuesto(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { aprobadoPorId } = req.body;
    const presupuesto = await presupuestoService.aprobarPresupuesto(id, aprobadoPorId);
    res.json(toJSONBigInt(presupuesto));
  } catch (err) {
    next(err);
  }
}
