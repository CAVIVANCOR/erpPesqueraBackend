import prestamoEntidadService from '../../services/Tesoreria/prestamoEntidad.service.js';
import prestamoEntidadOperacionService from '../../services/Tesoreria/prestamoEntidadOperacion.service.js';
import prestamoEntidadAsientoService from '../../services/Tesoreria/prestamoEntidadAsiento.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador de Préstamos con Accionistas y Terceros (recibidos y otorgados, solo capital)
 */

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await prestamoEntidadService.listar(req.query)));
  } catch (err) {
    next(err);
  }
}

/** Préstamos vigentes con saldo. Query: empresaId, sentido, entidadComercialId */
export async function listarVigentes(req, res, next) {
  try {
    const data = await prestamoEntidadService.listarVigentes(req.query);
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await prestamoEntidadService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await prestamoEntidadService.crear(req.body, req.user?.id)));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(toJSONBigInt(await prestamoEntidadService.actualizar(Number(req.params.id), req.body, req.user?.id)));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prestamoEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/** Asiento de apertura (saldo inicial) del préstamo */
export async function obtenerAsientos(req, res, next) {
  try {
    res.json(toJSONBigInt(await prestamoEntidadAsientoService.obtenerAsientos(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

/** Genera el asiento de apertura del préstamo */
export async function generarAsientoApertura(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await prestamoEntidadAsientoService.generarAsientoApertura(Number(req.params.id), req.user?.id)));
  } catch (err) {
    next(err);
  }
}

/** Elimina el asiento de apertura pendiente del préstamo */
export async function eliminarAsientos(req, res, next) {
  try {
    res.json(toJSONBigInt(await prestamoEntidadAsientoService.eliminarAsientos(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

/** Operación de Tesorería: desembolso de un préstamo nuevo */
export async function desembolsar(req, res, next) {
  try {
    const resultado = await prestamoEntidadOperacionService.procesarDesembolso({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/** Operación de Tesorería: pago (recibido) o cobro (otorgado) de capital */
export async function pagar(req, res, next) {
  try {
    const resultado = await prestamoEntidadOperacionService.procesarPago({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
