import detDatosAdicionalesOrdenCompraService from '../../services/Compras/detDatosAdicionalesOrdenCompra.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetDatosAdicionalesOrdenCompra
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const { ordenCompraId } = req.query;
    const datos = await detDatosAdicionalesOrdenCompraService.listar(ordenCompraId);
    res.json(toJSONBigInt(datos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const dato = await detDatosAdicionalesOrdenCompraService.obtenerPorId(id);
    res.json(toJSONBigInt(dato));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detDatosAdicionalesOrdenCompraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detDatosAdicionalesOrdenCompraService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detDatosAdicionalesOrdenCompraService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
