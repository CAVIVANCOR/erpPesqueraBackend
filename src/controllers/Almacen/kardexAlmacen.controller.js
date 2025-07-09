import kardexAlmacenService from '../../services/Almacen/kardexAlmacen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para KardexAlmacen
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const kardex = await kardexAlmacenService.listar();
    res.json(toJSONBigInt(kardex));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const registro = await kardexAlmacenService.obtenerPorId(id);
    res.json(toJSONBigInt(registro));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await kardexAlmacenService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await kardexAlmacenService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await kardexAlmacenService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
