import motivoNotaCreditoDebitoService from '../../services/Ventas/motivoNotaCreditoDebito.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para MotivoNotaCreditoDebito
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const motivos = await motivoNotaCreditoDebitoService.listar();
    res.json(toJSONBigInt(motivos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const motivo = await motivoNotaCreditoDebitoService.obtenerPorId(id);
    res.json(toJSONBigInt(motivo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await motivoNotaCreditoDebitoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await motivoNotaCreditoDebitoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await motivoNotaCreditoDebitoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    const motivos = await motivoNotaCreditoDebitoService.listarActivos();
    res.json(toJSONBigInt(motivos));
  } catch (err) {
    next(err);
  }
}

export async function listarNotasCredito(req, res, next) {
  try {
    const motivos = await motivoNotaCreditoDebitoService.listarNotasCredito();
    res.json(toJSONBigInt(motivos));
  } catch (err) {
    next(err);
  }
}

export async function listarNotasDebito(req, res, next) {
  try {
    const motivos = await motivoNotaCreditoDebitoService.listarNotasDebito();
    res.json(toJSONBigInt(motivos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerEstadisticas(req, res, next) {
  try {
    const estadisticas = await motivoNotaCreditoDebitoService.obtenerEstadisticas();
    res.json(toJSONBigInt(estadisticas));
  } catch (err) {
    next(err);
  }
}