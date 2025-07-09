import detMovsEntregaRendirPVentasService from '../../services/Ventas/detMovsEntregaRendirPVentas.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetMovsEntregaRendirPVentas
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const dets = await detMovsEntregaRendirPVentasService.listar();
    res.json(toJSONBigInt(dets));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const det = await detMovsEntregaRendirPVentasService.obtenerPorId(id);
    res.json(toJSONBigInt(det));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detMovsEntregaRendirPVentasService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detMovsEntregaRendirPVentasService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detMovsEntregaRendirPVentasService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
