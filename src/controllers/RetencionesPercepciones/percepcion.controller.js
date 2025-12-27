import percepcionService from '../../services/RetencionesPercepciones/percepcion.service.js';
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
    const nueva = await percepcionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await percepcionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
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

export async function listarPorCliente(req, res, next) {
  try {
    const clienteId = Number(req.params.clienteId);
    const percepciones = await percepcionService.listarPorCliente(clienteId);
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPeriodo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const { fechaInicio, fechaFin } = req.query;
    const percepciones = await percepcionService.listarPorPeriodo(empresaId, fechaInicio, fechaFin);
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
}
