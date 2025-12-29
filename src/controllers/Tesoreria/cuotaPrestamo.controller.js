import cuotaPrestamoService from '../../services/Tesoreria/cuotaPrestamo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CuotaPrestamo
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const cuotas = await cuotaPrestamoService.listar();
    res.json(toJSONBigInt(cuotas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cuota = await cuotaPrestamoService.obtenerPorId(id);
    res.json(toJSONBigInt(cuota));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await cuotaPrestamoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await cuotaPrestamoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await cuotaPrestamoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function registrarPago(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cuotaPagada = await cuotaPrestamoService.registrarPago(id, req.body);
    res.json(toJSONBigInt(cuotaPagada));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPrestamo(req, res, next) {
  try {
    const prestamoBancarioId = Number(req.params.prestamoBancarioId);
    const cuotas = await cuotaPrestamoService.listarPorPrestamo(prestamoBancarioId);
    res.json(toJSONBigInt(cuotas));
  } catch (err) {
    next(err);
  }
}

export async function listarPendientes(req, res, next) {
  try {
    const cuotas = await cuotaPrestamoService.listarPendientes();
    res.json(toJSONBigInt(cuotas));
  } catch (err) {
    next(err);
  }
}

export async function listarVencidas(req, res, next) {
  try {
    const cuotas = await cuotaPrestamoService.listarVencidas();
    res.json(toJSONBigInt(cuotas));
  } catch (err) {
    next(err);
  }
}

export async function actualizarEstadosVencidos(req, res, next) {
  try {
    const resultado = await cuotaPrestamoService.actualizarEstadosVencidos();
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
