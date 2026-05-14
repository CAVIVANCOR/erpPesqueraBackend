import movimientoActivoFijoService from '../../services/ActivosFijos/movimientoActivoFijo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para MovimientoActivoFijo
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await movimientoActivoFijoService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movimiento = await movimientoActivoFijoService.obtenerPorId(id);
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await movimientoActivoFijoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await movimientoActivoFijoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await movimientoActivoFijoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorActivo(req, res, next) {
  try {
    const activoId = Number(req.params.activoId);
    const movimientos = await movimientoActivoFijoService.listarPorActivo(activoId);
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function generarBorradorAsiento(req, res, next) {
  try {
    const movimientoId = Number(req.params.id);
    const borrador = await movimientoActivoFijoService.generarBorradorAsiento(movimientoId);
    res.json(toJSONBigInt(borrador));
  } catch (err) {
    next(err);
  }
}

export async function guardarAsientoContable(req, res, next) {
  try {
    const movimientoId = Number(req.params.id);
    const { asientoData } = req.body;
    const creadoPor = req.user?.id || null;
    const asiento = await movimientoActivoFijoService.guardarAsientoContable(
      movimientoId,
      asientoData,
      creadoPor
    );
    res.status(201).json(toJSONBigInt(asiento));
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina el asiento contable asociado a un movimiento
 */
export async function eliminarAsientoContable(req, res, next) {
  try {
    const movimientoId = BigInt(req.params.id);
    await movimientoActivoFijoService.eliminarAsientoContable(movimientoId);
    res.status(200).json({
      success: true,
      message: "Asiento contable eliminado correctamente",
    });
  } catch (err) {
    next(err);
  }
}