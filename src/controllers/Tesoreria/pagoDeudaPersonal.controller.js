import pagoDeudaPersonalService from '../../services/Tesoreria/pagoDeudaPersonal.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const pagos = await pagoDeudaPersonalService.listar();
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pago = await pagoDeudaPersonalService.obtenerPorId(id);
    res.json(toJSONBigInt(pago));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const data = {
      ...req.body,
      creadoPor: req.user?.id || null
    };
    const nuevo = await pagoDeudaPersonalService.crear(data);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = {
      ...req.body,
      actualizadoPor: req.user?.id || null
    };
    const actualizado = await pagoDeudaPersonalService.actualizar(id, data);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await pagoDeudaPersonalService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorDeuda(req, res, next) {
  try {
    const deudaConPersonalId = Number(req.params.deudaId);
    const pagos = await pagoDeudaPersonalService.listarPorDeuda(deudaConPersonalId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function procesarPago(req, res, next) {
  try {
    const deudaId = Number(req.params.deudaId);
    const data = {
      ...req.body,
      usuarioId: req.user?.id || null
    };
    const resultado = await pagoDeudaPersonalService.procesarPago(deudaId, data);
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}