import contactoEntidadService from '../../services/Maestros/contactoEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ContactoEntidad
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const contactos = await contactoEntidadService.listar();
    res.json(toJSONBigInt(contactos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const contacto = await contactoEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(contacto));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const contactos = await contactoEntidadService.obtenerPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(contactos));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerPorEntidad:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await contactoEntidadService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await contactoEntidadService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await contactoEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
