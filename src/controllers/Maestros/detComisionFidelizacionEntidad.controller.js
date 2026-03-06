import detComisionFidelizacionEntidadService from '../../services/Maestros/detComisionFidelizacionEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetComisionFidelizacionEntidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const detalles = await detComisionFidelizacionEntidadService.listar();
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await detComisionFidelizacionEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialFidelizacionId = Number(req.params.entidadComercialFidelizacionId);
    const detalles = await detComisionFidelizacionEntidadService.obtenerPorEntidad(entidadComercialFidelizacionId);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerPorEntidad:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detComisionFidelizacionEntidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detComisionFidelizacionEntidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detComisionFidelizacionEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}