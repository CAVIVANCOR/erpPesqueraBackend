/**
 * Controlador para cuotas de préstamos bancarios
 * Documentado en español.
 */

import * as cuotaPrestamoService from '../../services/Tesoreria/cuotaPrestamo.service.js';

/**
 * Listar todas las cuotas
 */
export async function listar(req, res, next) {
  try {
    const cuotas = await cuotaPrestamoService.listar();
    res.json(cuotas);
  } catch (err) {
    next(err);
  }
}

/**
 * Listar cuotas pendientes
 */
export async function listarPendientes(req, res, next) {
  try {
    const cuotas = await cuotaPrestamoService.listarPendientes();
    res.json(cuotas);
  } catch (err) {
    next(err);
  }
}

/**
 * Listar cuotas vencidas
 */
export async function listarVencidas(req, res, next) {
  try {
    const cuotas = await cuotaPrestamoService.listarVencidas();
    res.json(cuotas);
  } catch (err) {
    next(err);
  }
}

/**
 * Listar cuotas de un préstamo específico
 */
export async function listarPorPrestamo(req, res, next) {
  try {
    const { prestamoBancarioId } = req.params;
    const cuotas = await cuotaPrestamoService.listarPorPrestamo(BigInt(prestamoBancarioId));
    res.json(cuotas);
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener una cuota por ID
 */
export async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;
    const cuota = await cuotaPrestamoService.obtenerPorId(BigInt(id));
    res.json(cuota);
  } catch (err) {
    next(err);
  }
}

/**
 * Crear una nueva cuota
 */
export async function crear(req, res, next) {
  try {
    const cuota = await cuotaPrestamoService.crear(req.body);
    res.status(201).json(cuota);
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar una cuota existente
 */
export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const cuota = await cuotaPrestamoService.actualizar(BigInt(id), req.body);
    res.json(cuota);
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar una cuota
 */
export async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    await cuotaPrestamoService.eliminar(BigInt(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Registrar pago de una cuota
 */
export async function registrarPago(req, res, next) {
  try {
    const { id } = req.params;
    const cuota = await cuotaPrestamoService.registrarPago(BigInt(id), req.body);
    res.json(cuota);
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar estados de cuotas vencidas
 */
export async function actualizarEstadosVencidos(req, res, next) {
  try {
    const resultado = await cuotaPrestamoService.actualizarEstadosVencidos();
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}