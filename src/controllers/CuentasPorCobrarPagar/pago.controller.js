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
    const pago = await pagoService.obtenerPorId(id);
    res.json(toJSONBigInt(pago));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await pagoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await pagoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await pagoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
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
