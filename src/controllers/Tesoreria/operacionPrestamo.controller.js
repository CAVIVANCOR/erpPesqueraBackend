import operacionPrestamoService from "../../services/Tesoreria/operacionPrestamo.service.js";
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
export async function desembolsar(req, res, next) {
  try {
    const data = { ...req.body, usuarioId: req.user?.id || null };
    const resultado = await operacionPrestamoService.procesarDesembolso(data);
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
