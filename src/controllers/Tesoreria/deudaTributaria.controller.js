import deudaTributariaService from '../../services/Tesoreria/deudaTributaria.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const deudas = await deudaTributariaService.listar();
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const deuda = await deudaTributariaService.obtenerPorId(id);
    res.json(toJSONBigInt(deuda));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await deudaTributariaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await deudaTributariaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await deudaTributariaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const deudas = await deudaTributariaService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarPendientes(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const deudas = await deudaTributariaService.listarPendientes(empresaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarVencidas(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const deudas = await deudaTributariaService.listarVencidas(empresaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorTipo(req, res, next) {
  try {
    const tipoDeudaId = Number(req.params.tipoDeudaId);
    const deudas = await deudaTributariaService.listarPorTipo(tipoDeudaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPeriodo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const periodo = req.params.periodo;
    const deudas = await deudaTributariaService.listarPorPeriodo(empresaId, periodo);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}