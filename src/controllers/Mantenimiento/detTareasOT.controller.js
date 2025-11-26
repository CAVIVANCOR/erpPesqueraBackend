import detTareasOTService from '../../services/Mantenimiento/detTareasOT.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetTareasOT
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tareas = await detTareasOTService.listar();
    res.json(toJSONBigInt(tareas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorOT(req, res, next) {
  try {
    const otMantenimientoId = Number(req.params.otMantenimientoId);
    const tareas = await detTareasOTService.listarPorOT(otMantenimientoId);
    res.json(toJSONBigInt(tareas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tarea = await detTareasOTService.obtenerPorId(id);
    res.json(toJSONBigInt(tarea));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detTareasOTService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detTareasOTService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detTareasOTService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
