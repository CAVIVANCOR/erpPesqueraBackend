import asientoContableService from '../../services/Contabilidad/asientoContable.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AsientoContable
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const asientos = await asientoContableService.listar();
    res.json(toJSONBigInt(asientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const asiento = await asientoContableService.obtenerPorId(id);
    res.json(toJSONBigInt(asiento));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await asientoContableService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await asientoContableService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await asientoContableService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const asientos = await asientoContableService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(asientos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPeriodo(req, res, next) {
  try {
    const periodoContableId = Number(req.params.periodoContableId);
    const asientos = await asientoContableService.listarPorPeriodo(periodoContableId);
    res.json(toJSONBigInt(asientos));
  } catch (err) {
    next(err);
  }
}

export async function aprobarAsiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { aprobadoPorId } = req.body;
    const asiento = await asientoContableService.aprobarAsiento(id, aprobadoPorId);
    res.json(toJSONBigInt(asiento));
  } catch (err) {
    next(err);
  }
}

export async function anularAsiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { anuladoPorId, motivoAnulacion } = req.body;
    const asiento = await asientoContableService.anularAsiento(id, anuladoPorId, motivoAnulacion);
    res.json(toJSONBigInt(asiento));
  } catch (err) {
    next(err);
  }
}
