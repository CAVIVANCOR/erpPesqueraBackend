import flujoCajaService from '../../services/Tesoreria/flujoCaja.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const flujos = await flujoCajaService.listar();
    res.json(toJSONBigInt(flujos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const flujo = await flujoCajaService.obtenerPorId(id);
    res.json(toJSONBigInt(flujo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await flujoCajaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await flujoCajaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await flujoCajaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const flujos = await flujoCajaService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(flujos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCuentaCorriente(req, res, next) {
  try {
    const cuentaCorrienteId = Number(req.params.cuentaCorrienteId);
    const flujos = await flujoCajaService.listarPorCuentaCorriente(cuentaCorrienteId);
    res.json(toJSONBigInt(flujos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPeriodo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const { fechaInicio, fechaFin } = req.query;
    const flujos = await flujoCajaService.listarPorPeriodo(empresaId, fechaInicio, fechaFin);
    res.json(toJSONBigInt(flujos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerResumenPorPeriodo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const { fechaInicio, fechaFin } = req.query;
    const resumen = await flujoCajaService.obtenerResumenPorPeriodo(empresaId, fechaInicio, fechaFin);
    res.json(toJSONBigInt(resumen));
  } catch (err) {
    next(err);
  }
}
