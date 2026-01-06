import tipoPrestamoService from '../../services/Tesoreria/tipoPrestamo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TipoPrestamo
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const tipos = await tipoPrestamoService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const tipo = await tipoPrestamoService.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tipoPrestamoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await tipoPrestamoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await tipoPrestamoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    const tipos = await tipoPrestamoService.listarActivos();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function listarComercioExterior(req, res, next) {
  try {
    const tipos = await tipoPrestamoService.listarComercioExterior();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerEstadisticas(req, res, next) {
  try {
    const estadisticas = await tipoPrestamoService.obtenerEstadisticas();
    res.json(toJSONBigInt(estadisticas));
  } catch (err) {
    next(err);
  }
}