import ctaCteEntidadService from '../../services/Maestros/ctaCteEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CtaCteEntidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const cuentas = await ctaCteEntidadService.listar();
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cuenta = await ctaCteEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(cuenta));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const cuentas = await ctaCteEntidadService.obtenerPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerPorEntidad:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await ctaCteEntidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await ctaCteEntidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await ctaCteEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}