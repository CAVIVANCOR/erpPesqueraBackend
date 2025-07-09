import sedesEmpresaService from '../../services/Maestros/sedesEmpresa.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para SedesEmpresa
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const sedes = await sedesEmpresaService.listar();
    res.json(toJSONBigInt(sedes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sede = await sedesEmpresaService.obtenerPorId(id);
    res.json(toJSONBigInt(sede));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await sedesEmpresaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await sedesEmpresaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await sedesEmpresaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
