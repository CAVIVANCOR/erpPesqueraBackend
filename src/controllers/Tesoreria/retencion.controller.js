import retencionService from '../../services/Tesoreria/retencion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para el módulo de Retenciones
 * Maneja las peticiones HTTP y delega la lógica de negocio al servicio
 */

/**
 * Lista todas las retenciones
 * GET /api/tesoreria/retenciones
 */
export async function listar(req, res, next) {
  try {
    const retenciones = await retencionService.listar();
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene una retención por ID
 * GET /api/tesoreria/retenciones/:id
 */
export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const retencion = await retencionService.obtenerPorId(id);
    res.json(toJSONBigInt(retencion));
  } catch (err) {
    next(err);
  }
}

/**
 * Crea una nueva retención
 * POST /api/tesoreria/retenciones
 */
export async function crear(req, res, next) {
  try {
    const nueva = await retencionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

/**
 * Actualiza una retención existente
 * PUT /api/tesoreria/retenciones/:id
 */
export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await retencionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina una retención
 * DELETE /api/tesoreria/retenciones/:id
 */
export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await retencionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
