import registrarMovimientoPagoService from '../../services/Tesoreria/registrarMovimientoPago.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Registrar pago de CxC con creación automática de MovimientoCaja
 */
export async function registrarPagoCuentaPorCobrar(req, res, next) {
  try {
    const resultado = await registrarMovimientoPagoService.registrarPagoCuentaPorCobrar(req.body);
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Registrar pago de CxP con creación automática de MovimientoCaja
 */
export async function registrarPagoCuentaPorPagar(req, res, next) {
  try {
    const resultado = await registrarMovimientoPagoService.registrarPagoCuentaPorPagar(req.body);
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}