import areaFisicaSedeService from '../../services/Maestros/areaFisicaSede.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AreaFisicaSede
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const areas = await areaFisicaSedeService.listar();
    res.json(toJSONBigInt(areas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const area = await areaFisicaSedeService.obtenerPorId(id);
    res.json(toJSONBigInt(area));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await areaFisicaSedeService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await areaFisicaSedeService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await areaFisicaSedeService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
