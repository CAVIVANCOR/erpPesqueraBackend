import preFacturaService from '../../services/Ventas/preFactura.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para PreFactura
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const pfs = await preFacturaService.listar();
    res.json(toJSONBigInt(pfs));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pf = await preFacturaService.obtenerPorId(id);
    res.json(toJSONBigInt(pf));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await preFacturaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await preFacturaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await preFacturaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
