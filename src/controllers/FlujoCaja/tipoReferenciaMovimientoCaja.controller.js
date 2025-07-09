// Controlador para TipoReferenciaMovimientoCaja
import servicio from '../../services/FlujoCaja/tipoReferenciaMovimientoCaja.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Lista todos los tipos de referencia
 */
export async function listar(req, res, next) {
  try {
    const lista = await servicio.listar();
    res.json(toJSONBigInt(lista));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene un tipo de referencia por ID
 */
export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipo = await servicio.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

/**
 * Crea un nuevo tipo de referencia
 */
export async function crear(req, res, next) {
  try {
    const nuevo = await servicio.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

/**
 * Actualiza un tipo de referencia existente
 */
export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await servicio.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina un tipo de referencia por ID
 */
export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await servicio.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
