// Controlador para AsientoContableInterfaz
import servicio from '../services/asientoContableInterfaz.service.js';

/**
 * Obtiene todos los asientos contables interfaz
 */
export async function listar(req, res, next) {
  try {
    const lista = await servicio.listar();
    res.json(lista);
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene un asiento contable interfaz por ID
 */
export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const asiento = await servicio.obtenerPorId(id);
    res.json(asiento);
  } catch (err) {
    next(err);
  }
}

/**
 * Crea un nuevo asiento contable interfaz
 */
export async function crear(req, res, next) {
  try {
    const nuevo = await servicio.crear(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
}

/**
 * Actualiza un asiento contable interfaz existente
 */
export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await servicio.actualizar(id, req.body);
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina un asiento contable interfaz por ID
 */
export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await servicio.eliminar(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
