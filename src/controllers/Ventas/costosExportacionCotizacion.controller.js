import costosExportacionCotizacionService from '../../services/Ventas/costosExportacionCotizacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CostosExportacionCotizacion
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const costos = await costosExportacionCotizacionService.listar();
    res.json(toJSONBigInt(costos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const costo = await costosExportacionCotizacionService.obtenerPorId(id);
    res.json(toJSONBigInt(costo));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorCotizacion(req, res, next) {
  try {
    const cotizacionVentasId = Number(req.params.cotizacionVentasId);
    const costos = await costosExportacionCotizacionService.obtenerPorCotizacion(cotizacionVentasId);
    res.json(toJSONBigInt(costos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerCostosConVariacion(req, res, next) {
  try {
    const cotizacionVentasId = Number(req.params.cotizacionVentasId);
    const costos = await costosExportacionCotizacionService.obtenerCostosConVariacion(cotizacionVentasId);
    res.json(toJSONBigInt(costos));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await costosExportacionCotizacionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await costosExportacionCotizacionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function registrarMontoReal(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { movimientoEntregaRendirId, montoReal, montoRealMonedaBase } = req.body;
    const actualizado = await costosExportacionCotizacionService.registrarMontoReal(
      id, 
      movimientoEntregaRendirId, 
      montoReal, 
      montoRealMonedaBase
    );
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await costosExportacionCotizacionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}