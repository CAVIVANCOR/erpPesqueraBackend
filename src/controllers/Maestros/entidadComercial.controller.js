import entidadComercialService from '../../services/Maestros/entidadComercial.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para EntidadComercial
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const entidades = await entidadComercialService.listar();
    res.json(toJSONBigInt(entidades));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const entidad = await entidadComercialService.obtenerPorId(id);
    res.json(toJSONBigInt(entidad));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await entidadComercialService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await entidadComercialService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await entidadComercialService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene las agencias de envío (entidades comerciales del tipo "AGENCIA DE ENVIO")
 */
export async function obtenerAgenciasEnvio(req, res, next) {
  try {
    const agencias = await entidadComercialService.obtenerAgenciasEnvio();
    res.json(toJSONBigInt(agencias));
  } catch (err) {
    next(err);
  }
}
