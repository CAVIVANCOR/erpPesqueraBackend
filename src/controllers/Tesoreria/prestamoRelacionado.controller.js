import prestamoRelacionadoService from '../../services/Tesoreria/prestamoRelacionado.service.js';
import prestamoRelacionadoAsientoService from '../../services/Tesoreria/prestamoRelacionadoAsiento.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Préstamos entre Empresas Relacionadas
 */

export async function listar(req, res, next) {
  try {
    const prestamos = await prestamoRelacionadoService.listar();
    res.json(toJSONBigInt(prestamos));
  } catch (err) {
    next(err);
  }
}

/**
 * Préstamos vigentes con saldo entre dos empresas (para elegir en una devolución)
 * Query: empresaPrestamistaId, empresaPrestatariaId
 */
export async function listarVigentes(req, res, next) {
  try {
    const { empresaPrestamistaId, empresaPrestatariaId } = req.query;
    const data = await prestamoRelacionadoService.listarVigentes({ empresaPrestamistaId, empresaPrestatariaId });
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const prestamo = await prestamoRelacionadoService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(prestamo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await prestamoRelacionadoService.crear(req.body, req.user?.id);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const actualizado = await prestamoRelacionadoService.actualizar(Number(req.params.id), req.body, req.user?.id);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

/** Asientos de apertura (saldo inicial) del préstamo */
export async function obtenerAsientos(req, res, next) {
  try {
    const asientos = await prestamoRelacionadoAsientoService.obtenerAsientos(Number(req.params.id));
    res.json(toJSONBigInt(asientos));
  } catch (err) {
    next(err);
  }
}

/** Genera los asientos de apertura del préstamo (uno por empresa) */
export async function generarAsientoApertura(req, res, next) {
  try {
    const asientos = await prestamoRelacionadoAsientoService.generarAsientoApertura(Number(req.params.id), req.user?.id);
    res.status(201).json(toJSONBigInt(asientos));
  } catch (err) {
    next(err);
  }
}

/** Elimina los asientos de apertura pendientes del préstamo */
export async function eliminarAsientos(req, res, next) {
  try {
    const resultado = await prestamoRelacionadoAsientoService.eliminarAsientos(Number(req.params.id));
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prestamoRelacionadoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
