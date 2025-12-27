import planCuentasContableService from '../../services/Contabilidad/planCuentasContable.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para PlanCuentasContable
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const cuentas = await planCuentasContableService.listar();
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cuenta = await planCuentasContableService.obtenerPorId(id);
    res.json(toJSONBigInt(cuenta));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await planCuentasContableService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await planCuentasContableService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await planCuentasContableService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarActivas(req, res, next) {
  try {
    const cuentas = await planCuentasContableService.listarActivas();
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function listarImputables(req, res, next) {
  try {
    const cuentas = await planCuentasContableService.listarImputables();
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}
