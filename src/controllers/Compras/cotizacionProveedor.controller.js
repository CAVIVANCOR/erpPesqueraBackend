import cotizacionProveedorService from '../../services/Compras/cotizacionProveedor.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CotizacionProveedor
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const { requerimientoCompraId } = req.query;
    const cotizaciones = await cotizacionProveedorService.listar(
      requerimientoCompraId ? BigInt(requerimientoCompraId) : null
    );
    res.json(toJSONBigInt(cotizaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const cotizacion = await cotizacionProveedorService.obtenerPorId(id);
    res.json(toJSONBigInt(cotizacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const cotizacion = await cotizacionProveedorService.crear(req.body);
    res.status(201).json(toJSONBigInt(cotizacion));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const cotizacion = await cotizacionProveedorService.actualizar(id, req.body);
    res.json(toJSONBigInt(cotizacion));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await cotizacionProveedorService.eliminar(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function actualizarDetalle(req, res, next) {
  try {
    const detalleId = req.params.detalleId;
    const detalle = await cotizacionProveedorService.actualizarDetalle(detalleId, req.body);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function agregarProductoAlternativo(req, res, next) {
  try {
    const id = req.params.id;
    const detalle = await cotizacionProveedorService.agregarProductoAlternativo(id, req.body);
    res.status(201).json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function eliminarDetalle(req, res, next) {
  try {
    const detalleId = req.params.detalleId;
    await cotizacionProveedorService.eliminarDetalle(detalleId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function marcarSeleccionadoParaOC(req, res, next) {
  try {
    const detalleId = req.params.detalleId;
    const { esSeleccionadoParaOrdenCompra } = req.body;
    const detalle = await cotizacionProveedorService.marcarSeleccionadoParaOC(
      detalleId, 
      esSeleccionadoParaOrdenCompra
    );
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}