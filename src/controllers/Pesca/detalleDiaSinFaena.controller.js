import detalleDiaSinFaenaService from '../../services/Pesca/detalleDiaSinFaena.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetalleDiaSinFaena
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const detalles = await detalleDiaSinFaenaService.listar();
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista detalles por temporadaPescaId
 */
export async function listarPorTemporada(req, res, next) {
  try {
    const { temporadaPescaId } = req.query;
    if (!temporadaPescaId) {
      return res.status(400).json({ error: 'temporadaPescaId es requerido' });
    }
    const detalles = await detalleDiaSinFaenaService.listarPorTemporada(temporadaPescaId);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista detalles por novedadPescaConsumoId
 */
export async function listarPorNovedad(req, res, next) {
  try {
    const { novedadPescaConsumoId } = req.query;
    if (!novedadPescaConsumoId) {
      return res.status(400).json({ error: 'novedadPescaConsumoId es requerido' });
    }
    const detalles = await detalleDiaSinFaenaService.listarPorNovedad(novedadPescaConsumoId);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const detalle = await detalleDiaSinFaenaService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detalleDiaSinFaenaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await detalleDiaSinFaenaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detalleDiaSinFaenaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}