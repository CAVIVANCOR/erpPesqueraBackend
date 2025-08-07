import accesoInstalacionDetalleService from '../../services/AccesoInstalaciones/accesoInstalacionDetalle.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AccesoInstalacionDetalle
 * Documentado en español.
 * Ahora soporta filtrado por query parameters.
 */
export async function listar(req, res, next) {
  try {
    // Extraer filtros de query parameters
    const filtros = {};
    
    // Filtrar por accesoInstalacionId si se proporciona
    if (req.query.accesoInstalacionId) {
      filtros.accesoInstalacionId = req.query.accesoInstalacionId;
    }
    
    const detalles = await accesoInstalacionDetalleService.listar(filtros);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await accesoInstalacionDetalleService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await accesoInstalacionDetalleService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await accesoInstalacionDetalleService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await accesoInstalacionDetalleService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
