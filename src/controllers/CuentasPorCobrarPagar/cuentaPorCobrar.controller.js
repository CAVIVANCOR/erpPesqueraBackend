import cuentaPorCobrarService from '../../services/CuentasPorCobrarPagar/cuentaPorCobrar.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const cuentas = await cuentaPorCobrarService.listar();
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cuenta = await cuentaPorCobrarService.obtenerPorId(id);
    res.json(toJSONBigInt(cuenta));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await cuentaPorCobrarService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await cuentaPorCobrarService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await cuentaPorCobrarService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const cuentas = await cuentaPorCobrarService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCliente(req, res, next) {
  try {
    const clienteId = Number(req.params.clienteId);
    const cuentas = await cuentaPorCobrarService.listarPorCliente(clienteId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function listarPendientes(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const cuentas = await cuentaPorCobrarService.listarPendientes(empresaId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function listarVencidas(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const cuentas = await cuentaPorCobrarService.listarVencidas(empresaId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorPreFacturaId(req, res, next) {
  try {
    const preFacturaId = Number(req.params.preFacturaId);
    const cuenta = await cuentaPorCobrarService.obtenerPorPreFacturaId(preFacturaId);
    res.json(toJSONBigInt(cuenta));
  } catch (err) {
    next(err);
  }
}
