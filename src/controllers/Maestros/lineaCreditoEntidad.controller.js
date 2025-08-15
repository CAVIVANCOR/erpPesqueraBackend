import lineaCreditoEntidadService from '../../services/Maestros/lineaCreditoEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para LineaCreditoEntidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const lineas = await lineaCreditoEntidadService.listar();
    res.json(toJSONBigInt(lineas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const linea = await lineaCreditoEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(linea));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const lineas = await lineaCreditoEntidadService.obtenerPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(lineas));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerPorEntidad:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await lineaCreditoEntidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await lineaCreditoEntidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await lineaCreditoEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
