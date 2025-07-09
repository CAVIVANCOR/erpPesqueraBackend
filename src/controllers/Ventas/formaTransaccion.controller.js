import formaTransaccionService from '../../services/Ventas/formaTransaccion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para FormaTransaccion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const formas = await formaTransaccionService.listar();
    res.json(toJSONBigInt(formas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const forma = await formaTransaccionService.obtenerPorId(id);
    res.json(toJSONBigInt(forma));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await formaTransaccionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await formaTransaccionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await formaTransaccionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
