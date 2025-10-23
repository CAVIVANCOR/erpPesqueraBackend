import cotizacionProveedorService from '../../services/Compras/cotizacionProveedor.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CotizacionProveedor
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const { requerimientoCompraId } = req.query;
    const cotizaciones = await cotizacionProveedorService.listar(requerimientoCompraId);
    res.json(toJSONBigInt(cotizaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cotizacion = await cotizacionProveedorService.obtenerPorId(id);
    res.json(toJSONBigInt(cotizacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await cotizacionProveedorService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await cotizacionProveedorService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await cotizacionProveedorService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Selecciona una cotización como ganadora
 */
export async function seleccionar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const seleccionada = await cotizacionProveedorService.seleccionar(id);
    res.json(toJSONBigInt(seleccionada));
  } catch (err) {
    next(err);
  }
}