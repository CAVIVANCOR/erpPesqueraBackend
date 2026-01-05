/**
 * Controlador para desembolsos de préstamos bancarios
 * Documentado en español.
 */

import desembolsoPrestamoService from '../../services/Tesoreria/desembolsoPrestamo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Listar todos los desembolsos
 */
export async function listar(req, res, next) {
  try {
    const desembolsos = await desembolsoPrestamoService.listar();
    res.json(toJSONBigInt(desembolsos));
  } catch (err) {
    next(err);
  }
}

/**
 * Listar desembolsos de un préstamo específico
 */
export async function listarPorPrestamo(req, res, next) {
  try {
    const { prestamoBancarioId } = req.params;
    const desembolsos = await desembolsoPrestamoService.listarPorPrestamo(BigInt(prestamoBancarioId));
    res.json(toJSONBigInt(desembolsos));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener un desembolso por ID
 */
export async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;
    const desembolso = await desembolsoPrestamoService.obtenerPorId(BigInt(id));
    res.json(toJSONBigInt(desembolso));
  } catch (err) {
    next(err);
  }
}

/**
 * Crear un nuevo desembolso
 */
export async function crear(req, res, next) {
  try {
    const desembolso = await desembolsoPrestamoService.crear(req.body);
    res.status(201).json(toJSONBigInt(desembolso));
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar un desembolso existente
 */
export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const desembolso = await desembolsoPrestamoService.actualizar(BigInt(id), req.body);
    res.json(toJSONBigInt(desembolso));
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar un desembolso
 */
export async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    await desembolsoPrestamoService.eliminar(BigInt(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener total desembolsado de un préstamo
 */
export async function obtenerTotalDesembolsado(req, res, next) {
  try {
    const { prestamoBancarioId } = req.params;
    const resultado = await desembolsoPrestamoService.obtenerTotalDesembolsado(BigInt(prestamoBancarioId));
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
