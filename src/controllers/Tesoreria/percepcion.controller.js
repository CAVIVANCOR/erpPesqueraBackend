import percepcionService from '../../services/Tesoreria/percepcion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para el módulo de Percepciones
 * Maneja las peticiones HTTP y delega la lógica de negocio al servicio
 */

/**
 * Lista todas las percepciones
 * GET /api/tesoreria/percepciones
 */
export async function listar(req, res, next) {
  try {
    const percepciones = await percepcionService.listar();
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene una percepción por ID
 * GET /api/tesoreria/percepciones/:id
 */
export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const percepcion = await percepcionService.obtenerPorId(id);
    res.json(toJSONBigInt(percepcion));
  } catch (err) {
    next(err);
  }
}

/**
 * Crea una nueva percepción
 * POST /api/tesoreria/percepciones
 */
export async function crear(req, res, next) {
  try {
    const nueva = await percepcionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

/**
 * Actualiza una percepción existente
 * PUT /api/tesoreria/percepciones/:id
 */
export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await percepcionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina una percepción
 * DELETE /api/tesoreria/percepciones/:id
 */
export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await percepcionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
