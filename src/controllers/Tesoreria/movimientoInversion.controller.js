/**
 * Controlador para movimientos de inversiones financieras
 * Documentado en español.
 */

import movimientoInversionService from '../../services/Tesoreria/movimientoInversion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Listar todos los movimientos
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await movimientoInversionService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

/**
 * Listar movimientos por inversión
 */
export async function listarPorInversion(req, res, next) {
  try {
    const { inversionFinancieraId } = req.params;
    const movimientos = await movimientoInversionService.listarPorInversion(BigInt(inversionFinancieraId));
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

/**
 * Listar movimientos por tipo
 */
export async function listarPorTipo(req, res, next) {
  try {
    const { tipoMovimiento } = req.params;
    const movimientos = await movimientoInversionService.listarPorTipo(tipoMovimiento);
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener resumen de movimientos por inversión
 */
export async function obtenerResumenPorInversion(req, res, next) {
  try {
    const { inversionFinancieraId } = req.params;
    const resumen = await movimientoInversionService.obtenerResumenPorInversion(BigInt(inversionFinancieraId));
    res.json(toJSONBigInt(resumen));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener un movimiento por ID
 */
export async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;
    const movimiento = await movimientoInversionService.obtenerPorId(BigInt(id));
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

/**
 * Crear un nuevo movimiento
 */
export async function crear(req, res, next) {
  try {
    const movimiento = await movimientoInversionService.crear(req.body);
    res.status(201).json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar un movimiento existente
 */
export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const movimiento = await movimientoInversionService.actualizar(BigInt(id), req.body);
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar un movimiento
 */
export async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    await movimientoInversionService.eliminar(BigInt(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
