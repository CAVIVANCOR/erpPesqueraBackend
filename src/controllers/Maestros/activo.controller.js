import activoService from '../../services/Maestros/activo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Activo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const activos = await activoService.listar();
    res.json(toJSONBigInt(activos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const activo = await activoService.obtenerPorId(id);
    res.json(toJSONBigInt(activo));
  } catch (err) {
    next(err);
  }
}

export async function obtenerVehiculosPorRuc(req, res, next) {
  try {
    const { ruc } = req.params;
    const vehiculos = await activoService.obtenerVehiculosPorRuc(ruc);
    res.json(toJSONBigInt(vehiculos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEmpresaYTipo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const tipoId = Number(req.params.tipoId);
    const activos = await activoService.obtenerPorEmpresaYTipo(empresaId, tipoId);
    res.json(toJSONBigInt(activos));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await activoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await activoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await activoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
