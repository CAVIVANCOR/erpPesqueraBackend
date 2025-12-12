import detCuotaPescaService from '../../services/Pesca/detCuotaPesca.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetCuotaPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const filtros = {};
    if (req.query.empresaId) {
      filtros.empresaId = Number(req.query.empresaId);
    }
    const detalles = await detCuotaPescaService.listar(filtros);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await detCuotaPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detCuotaPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detCuotaPescaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detCuotaPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function obtenerResumenPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const resumen = await detCuotaPescaService.obtenerResumenPorEmpresa(empresaId);
    res.json(toJSONBigInt(resumen));
  } catch (err) {
    next(err);
  }
}
