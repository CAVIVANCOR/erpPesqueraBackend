import puertoPescaService from '../../services/Pesca/puertoPesca.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para PuertoPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const puertos = await puertoPescaService.listar();
    res.json(toJSONBigInt(puertos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const puerto = await puertoPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(puerto));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await puertoPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await puertoPescaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await puertoPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista puertos activos NACIONALES (por defecto para dropdowns de pesca)
 */
export async function listarActivos(req, res, next) {
  try {
    const puertos = await puertoPescaService.listarActivos();
    res.json(toJSONBigInt(puertos));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista TODOS los puertos activos (nacionales + internacionales)
 */
export async function listarTodosActivos(req, res, next) {
  try {
    const puertos = await puertoPescaService.listarTodosActivos();
    res.json(toJSONBigInt(puertos));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista solo puertos internacionales activos
 */
export async function listarInternacionales(req, res, next) {
  try {
    const puertos = await puertoPescaService.listarInternacionales();
    res.json(toJSONBigInt(puertos));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene las zonas únicas disponibles
 */
export async function obtenerZonasDisponibles(req, res, next) {
  try {
    const zonas = await puertoPescaService.obtenerZonasDisponibles();
    res.json(zonas);
  } catch (err) {
    next(err);
  }
}