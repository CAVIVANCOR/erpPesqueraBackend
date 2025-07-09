import motivoAccesoService from '../../services/AccesoInstalaciones/motivoAcceso.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para MotivoAcceso
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const motivos = await motivoAccesoService.listar();
    res.json(toJSONBigInt(motivos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const motivo = await motivoAccesoService.obtenerPorId(id);
    res.json(toJSONBigInt(motivo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await motivoAccesoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await motivoAccesoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await motivoAccesoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
