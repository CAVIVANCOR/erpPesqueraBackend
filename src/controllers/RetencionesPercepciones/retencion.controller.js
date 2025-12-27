import retencionService from '../../services/RetencionesPercepciones/retencion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const retenciones = await retencionService.listar();
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const retencion = await retencionService.obtenerPorId(id);
    res.json(toJSONBigInt(retencion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await retencionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await retencionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await retencionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const retenciones = await retencionService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
}

export async function listarPorProveedor(req, res, next) {
  try {
    const proveedorId = Number(req.params.proveedorId);
    const retenciones = await retencionService.listarPorProveedor(proveedorId);
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPeriodo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const { fechaInicio, fechaFin } = req.query;
    const retenciones = await retencionService.listarPorPeriodo(empresaId, fechaInicio, fechaFin);
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
}
