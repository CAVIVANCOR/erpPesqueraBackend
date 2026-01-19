import pagoService from '../../services/CuentasPorCobrarPagar/pago.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const pagos = await pagoService.listar();
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipoPago = req.query.tipoPago; // COBRAR o PAGAR
    const pago = await pagoService.obtenerPorId(id, tipoPago);
    res.json(toJSONBigInt(pago));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const pagos = await pagoService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCuentaCobrar(req, res, next) {
  try {
    const cuentaPorCobrarId = Number(req.params.cuentaPorCobrarId);
    const pagos = await pagoService.listarPorCuentaCobrar(cuentaPorCobrarId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCuentaPagar(req, res, next) {
  try {
    const cuentaPorPagarId = Number(req.params.cuentaPorPagarId);
    const pagos = await pagoService.listarPorCuentaPagar(cuentaPorPagarId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

// NOTA: No hay funciones crear, actualizar o eliminar
// Los pagos se gestionan desde los tabs de CuentaPorCobrar y CuentaPorPagar