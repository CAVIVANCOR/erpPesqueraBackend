import operacionPrestamoService from "../../services/Tesoreria/operacionPrestamo.service.js";
import factoringPrestamoService from "../../services/Tesoreria/factoringPrestamo.service.js";
import factoringIndirectoService from "../../services/Tesoreria/factoringIndirectoPrestamo.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

/**
 * Operaciones de caja del préstamo bancario (especializadas).
 * Las validaciones y el detalle contable viven en el servicio; el usuario sale del token.
 */

/** Pago de una o varias cuotas de un mismo préstamo (un solo egreso). */
export async function pagarCuotas(req, res, next) {
  try {
    const data = { ...req.body, usuarioId: req.user?.id || null };
    const resultado = await operacionPrestamoService.procesarPagoCuotas(data);
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/** Copia voucher consolidado y comprobante del pago indicado a los demás pagos de la operación. */
export async function sincronizarAdjuntos(req, res, next) {
  try {
    const { pagoId } = req.params;
    const resultado = await operacionPrestamoService.sincronizarAdjuntosOperacion(pagoId);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/** Desembolso del préstamo: ingreso del dinero a la cuenta de la empresa. */
/** Elimina un asiento del flujo anterior de un préstamo aprobado, antes de su desembolso (decisión del usuario) */
export async function eliminarAsientoPrevio(req, res, next) {
  try {
    const data = await operacionPrestamoService.eliminarAsientoPrevioDesembolso({
      prestamoId: req.params.prestamoId,
      asientoId: req.params.asientoId,
      usuarioId: req.user?.id || null,
    });
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function desembolsar(req, res, next) {
  try {
    const data = { ...req.body, usuarioId: req.user?.id || null };
    const resultado = await operacionPrestamoService.procesarDesembolso(data);
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

// ════════════════════════════════════════════════════════════
// FACTORING INDIRECTO (COMPRAS): desembolso sin caja y su reversión
// ════════════════════════════════════════════════════════════

/** Canjea las facturas de compra de las cuotas del préstamo (sin caja). Body: prestamoBancarioId, fechaDesembolso, tipoCambio */
export async function desembolsarFactoringIndirecto(req, res, next) {
  try {
    const resultado = await factoringIndirectoService.desembolsarFactoringIndirecto({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/** Cuotas del factoring con su factura de intereses y las facturas del proveedor que se pueden enlazar */
export async function interesesFactoringIndirecto(req, res, next) {
  try {
    res.json(toJSONBigInt(await factoringIndirectoService.listarInteresesCuotas(req.params.prestamoId)));
  } catch (err) {
    next(err);
  }
}

/** Enlaza (o suelta) la factura de intereses del proveedor con una cuota. Body: cuentaPorPagarInteresId (null para soltar) */
export async function enlazarInteresCuotaFactoringIndirecto(req, res, next) {
  try {
    res.json(toJSONBigInt(await factoringIndirectoService.enlazarInteresCuota({ cuotaId: req.params.cuotaId, cuentaPorPagarInteresId: req.body.cuentaPorPagarInteresId })));
  } catch (err) {
    next(err);
  }
}

// ════════════════════════════════════════════════════════════
// FACTORING (facturas entregadas en descuento y liquidación por cobro)
// ════════════════════════════════════════════════════════════

/** Facturas (CxC) que se pueden entregar a un factoring. Query: empresaId, monedaId */
export async function facturasFactoringDisponibles(req, res, next) {
  try {
    const data = await factoringPrestamoService.listarFacturasDisponibles(req.query);
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

/** Préstamos de factoring con facturas entregadas. Query: empresaId */
export async function prestamosFactoring(req, res, next) {
  try {
    const data = await factoringPrestamoService.listarPrestamosFactoring(req.query);
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function detalleFactoring(req, res, next) {
  try {
    const data = await factoringPrestamoService.obtenerDetalleFactoring(Number(req.params.id));
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

/** Liquidación por cobro de las facturas por la entidad (sin caja). */
export async function liquidarFactoring(req, res, next) {
  try {
    const data = await factoringPrestamoService.liquidarPorCobro({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}
