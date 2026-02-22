import ubicacionFisicaService from '../../services/Almacen/ubicacionFisica.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para UbicacionFisica
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const { almacenId } = req.query;
    const filtros = {};
    
    if (almacenId) {
      filtros.almacenId = Number(almacenId);
    }
    
    const ubicaciones = await ubicacionFisicaService.listar(filtros);
    res.json(toJSONBigInt(ubicaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const ubicacion = await ubicacionFisicaService.obtenerPorId(id);
    res.json(toJSONBigInt(ubicacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await ubicacionFisicaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await ubicacionFisicaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await ubicacionFisicaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
