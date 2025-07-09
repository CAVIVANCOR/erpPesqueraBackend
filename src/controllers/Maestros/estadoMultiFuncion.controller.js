import estadoMultiFuncionService from '../../services/Maestros/estadoMultiFuncion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para EstadoMultiFuncion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const estados = await estadoMultiFuncionService.listar();
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const estado = await estadoMultiFuncionService.obtenerPorId(id);
    res.json(toJSONBigInt(estado));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await estadoMultiFuncionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await estadoMultiFuncionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await estadoMultiFuncionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
