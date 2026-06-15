import pagoDeudaTributariaService from '../../services/Tesoreria/pagoDeudaTributaria.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const pagos = await pagoDeudaTributariaService.listar();
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pago = await pagoDeudaTributariaService.obtenerPorId(id);
    res.json(toJSONBigInt(pago));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await pagoDeudaTributariaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await pagoDeudaTributariaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await pagoDeudaTributariaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorDeuda(req, res, next) {
  try {
    const deudaTributariaId = Number(req.params.deudaId);
    const pagos = await pagoDeudaTributariaService.listarPorDeuda(deudaTributariaId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}