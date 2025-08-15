import direccionEntidadService from '../../services/Maestros/direccionEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DireccionEntidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const direcciones = await direccionEntidadService.listar();
    res.json(toJSONBigInt(direcciones));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en listar:', err);
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const direccion = await direccionEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(direccion));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerPorId:', err);
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const direcciones = await direccionEntidadService.obtenerPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(direcciones));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerPorEntidad:', err);
    next(err);
  }
}

export async function obtenerDireccionFiscalPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const direccionFiscal = await direccionEntidadService.obtenerDireccionFiscalPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(direccionFiscal));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerDireccionFiscalPorEntidad:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await direccionEntidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en crear:', err);
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await direccionEntidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en actualizar:', err);
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await direccionEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
