import ordenCompraService from '../../services/Compras/ordenCompra.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para OrdenCompra
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const ordenes = await ordenCompraService.listar();
    res.json(toJSONBigInt(ordenes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orden = await ordenCompraService.obtenerPorId(id);
    res.json(toJSONBigInt(orden));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await ordenCompraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await ordenCompraService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await ordenCompraService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Aprueba una orden de compra
 */
export async function aprobar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const aprobado = await ordenCompraService.aprobar(id);
    res.json(toJSONBigInt(aprobado));
  } catch (err) {
    next(err);
  }
}

/**
 * Anula una orden de compra
 */
export async function anular(req, res, next) {
  try {
    const id = Number(req.params.id);
    const anulado = await ordenCompraService.anular(id);
    res.json(toJSONBigInt(anulado));
  } catch (err) {
    next(err);
  }
}

/**
 * Genera un MovimientoAlmacen desde una Orden de Compra aprobada
 */
export async function generarMovimiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { conceptoMovAlmacenId, fechaDocumento, observaciones } = req.body;
    
    const movimiento = await ordenCompraService.generarMovimiento(
      id,
      conceptoMovAlmacenId,
      fechaDocumento,
      observaciones
    );
    
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

/**
 * Genera una Orden de Compra desde un Requerimiento aprobado
 */
export async function generarDesdeRequerimiento(req, res, next) {
  try {
    const { requerimientoCompraId } = req.body;
    const orden = await ordenCompraService.generarDesdeRequerimiento(requerimientoCompraId);
    res.status(201).json(toJSONBigInt(orden));
  } catch (err) {
    next(err);
  }
}