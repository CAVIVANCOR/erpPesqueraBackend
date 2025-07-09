import empresaService from '../../services/Maestros/empresa.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Empresa
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const empresas = await empresaService.listar();
    res.json(toJSONBigInt(empresas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const empresa = await empresaService.obtenerPorId(id);
    res.json(toJSONBigInt(empresa));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await empresaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await empresaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await empresaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
