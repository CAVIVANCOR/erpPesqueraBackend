import detContratistasOTService from '../../services/Mantenimiento/detContratistasOT.service.js';
import documentoCompraPresupuestoService from '../../services/Mantenimiento/documentoCompraPresupuesto.service.js';
import otMantenimientoService from '../../services/Mantenimiento/otMantenimiento.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetContratistasOT
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const { otMantenimientoId } = req.query;
    const detalles = await detContratistasOTService.listar(otMantenimientoId ? BigInt(otMantenimientoId) : null);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function listarPorOrdenTrabajo(req, res, next) {
  try {
    const otMantenimientoId = BigInt(req.params.otId);
    const detalles = await detContratistasOTService.listar(otMantenimientoId);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const detalle = await detContratistasOTService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detContratistasOTService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await detContratistasOTService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await detContratistasOTService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

// ── Documentos de compra generados desde el presupuesto ──

export async function listarDocumentosCompra(req, res, next) {
  try {
    const presupuestoId = BigInt(req.params.id);
    const docs = await documentoCompraPresupuestoService.listarDocumentosCompra(presupuestoId);
    res.json(toJSONBigInt(docs));
  } catch (err) {
    next(err);
  }
}

export async function buscarProductosEquivalentes(req, res, next) {
  try {
    const presupuestoId = BigInt(req.params.id);
    const { empresaId } = req.query;
    const resultado = await documentoCompraPresupuestoService.buscarProductosEquivalentes(
      presupuestoId,
      BigInt(empresaId),
    );
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function generarDocumentoCompra(req, res, next) {
  try {
    const presupuestoId = BigInt(req.params.id);
    const usuarioId = req.body.usuarioId || req.usuario?.id || null;
    const resultado = await documentoCompraPresupuestoService.generarDocumentoCompra(
      presupuestoId,
      req.body,
      usuarioId,
    );
    // La generación de un documento cambia el estado de la OT a EN PROCESO
    try {
      const presupuesto = await detContratistasOTService.obtenerPorId(presupuestoId);
      await otMantenimientoService.actualizarEstadoOT(presupuesto.otMantenimientoId);
    } catch (e) {
      console.error("No se pudo actualizar el estado de la OT tras generar documento:", e.message);
    }
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}