import detMovsEntregaRendirContratoServiciosService from '../../services/ContratoServicio/detMovsEntregaRendirContratoServicios.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetMovsEntregaRendirContratoServicios
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const dets = await detMovsEntregaRendirContratoServiciosService.listar();
    res.json(toJSONBigInt(dets));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const det = await detMovsEntregaRendirContratoServiciosService.obtenerPorId(id);
    res.json(toJSONBigInt(det));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntrega(req, res, next) {
  try {
    const entregaARendirContratoServicioId = BigInt(req.params.entregaId);
    const dets = await detMovsEntregaRendirContratoServiciosService.obtenerPorEntrega(entregaARendirContratoServicioId);
    res.json(toJSONBigInt(dets));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detMovsEntregaRendirContratoServiciosService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await detMovsEntregaRendirContratoServiciosService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await detMovsEntregaRendirContratoServiciosService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
