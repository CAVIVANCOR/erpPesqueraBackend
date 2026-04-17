import detPlataformaRecepcionPescaService from '../../services/Pesca/detPlataformaRecepcionPesca.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetPlataformaRecepcionPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const plataformas = await detPlataformaRecepcionPescaService.listar();
    res.json(toJSONBigInt(plataformas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const plataformas = await detPlataformaRecepcionPescaService.obtenerPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(plataformas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorPuerto(req, res, next) {
  try {
    const puertoPescaId = Number(req.params.puertoPescaId);
    const plataformas = await detPlataformaRecepcionPescaService.obtenerPorPuerto(puertoPescaId);
    res.json(toJSONBigInt(plataformas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const plataforma = await detPlataformaRecepcionPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(plataforma));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detPlataformaRecepcionPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detPlataformaRecepcionPescaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detPlataformaRecepcionPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}