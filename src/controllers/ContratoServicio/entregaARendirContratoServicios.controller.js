import entregaARendirContratoServiciosService from '../../services/ContratoServicio/entregaARendirContratoServicios.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para EntregaARendirContratoServicios
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const entregas = await entregaARendirContratoServiciosService.listar();
    res.json(toJSONBigInt(entregas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const entrega = await entregaARendirContratoServiciosService.obtenerPorId(id);
    res.json(toJSONBigInt(entrega));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorContrato(req, res, next) {
  try {
    const contratoServicioId = BigInt(req.params.contratoServicioId);
    const entrega = await entregaARendirContratoServiciosService.obtenerPorContrato(contratoServicioId);
    res.json(toJSONBigInt(entrega));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await entregaARendirContratoServiciosService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await entregaARendirContratoServiciosService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await entregaARendirContratoServiciosService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
