/**
 * Controlador para garantías de préstamos bancarios
 * Documentado en español.
 */

import garantiaPrestamoService from '../../services/Tesoreria/garantiaPrestamo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Listar todas las garantías
 */
export async function listar(req, res, next) {
  try {
    const garantias = await garantiaPrestamoService.listar();
    res.json(toJSONBigInt(garantias));
  } catch (err) {
    next(err);
  }
}

/**
 * Listar garantías activas
 */
export async function listarActivas(req, res, next) {
  try {
    const garantias = await garantiaPrestamoService.listarActivas();
    res.json(toJSONBigInt(garantias));
  } catch (err) {
    next(err);
  }
}

/**
 * Listar garantías de un préstamo específico
 */
export async function listarPorPrestamo(req, res, next) {
  try {
    const { prestamoBancarioId } = req.params;
    const garantias = await garantiaPrestamoService.listarPorPrestamo(BigInt(prestamoBancarioId));
    res.json(toJSONBigInt(garantias));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener una garantía por ID
 */
export async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;
    const garantia = await garantiaPrestamoService.obtenerPorId(BigInt(id));
    res.json(toJSONBigInt(garantia));
  } catch (err) {
    next(err);
  }
}

/**
 * Crear una nueva garantía
 */
export async function crear(req, res, next) {
  try {
    const garantia = await garantiaPrestamoService.crear(req.body);
    res.status(201).json(toJSONBigInt(garantia));
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar una garantía existente
 */
export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const garantia = await garantiaPrestamoService.actualizar(BigInt(id), req.body);
    res.json(toJSONBigInt(garantia));
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar una garantía
 */
export async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    await garantiaPrestamoService.eliminar(BigInt(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Liberar una garantía
 */
export async function liberar(req, res, next) {
  try {
    const { id } = req.params;
    const { fechaLiberacion } = req.body;
    const garantia = await garantiaPrestamoService.liberar(BigInt(id), fechaLiberacion);
    res.json(toJSONBigInt(garantia));
  } catch (err) {
    next(err);
  }
}

/**
 * Reactivar una garantía
 */
export async function reactivar(req, res, next) {
  try {
    const { id } = req.params;
    const garantia = await garantiaPrestamoService.reactivar(BigInt(id));
    res.json(toJSONBigInt(garantia));
  } catch (err) {
    next(err);
  }
}
