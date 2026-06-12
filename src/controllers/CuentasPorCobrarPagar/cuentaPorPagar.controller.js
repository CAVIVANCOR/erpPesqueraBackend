import cuentaPorPagarService from '../../services/CuentasPorCobrarPagar/cuentaPorPagar.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const cuentas = await cuentaPorPagarService.listar();
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cuenta = await cuentaPorPagarService.obtenerPorId(id);
    res.json(toJSONBigInt(cuenta));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await cuentaPorPagarService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await cuentaPorPagarService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await cuentaPorPagarService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const cuentas = await cuentaPorPagarService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorProveedor(req, res, next) {
  try {
    const proveedorId = Number(req.params.proveedorId);
    const cuentas = await cuentaPorPagarService.listarPorProveedor(proveedorId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function listarPendientes(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const cuentas = await cuentaPorPagarService.listarPendientes(empresaId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function listarVencidas(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const cuentas = await cuentaPorPagarService.listarVencidas(empresaId);
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorOrdenCompraId(req, res, next) {
  try {
    const ordenCompraId = Number(req.params.ordenCompraId);
    const cuenta = await cuentaPorPagarService.obtenerPorOrdenCompraId(ordenCompraId);
    res.json(toJSONBigInt(cuenta));
  } catch (err) {
    next(err);
  }
}