import inversionFinancieraService from '../../services/Tesoreria/inversionFinanciera.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para InversionFinanciera
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const inversiones = await inversionFinancieraService.listar();
    res.json(toJSONBigInt(inversiones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const inversion = await inversionFinancieraService.obtenerPorId(id);
    res.json(toJSONBigInt(inversion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await inversionFinancieraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await inversionFinancieraService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await inversionFinancieraService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function registrarMovimiento(req, res, next) {
  try {
    const inversionFinancieraId = Number(req.params.id);
    const movimiento = await inversionFinancieraService.registrarMovimiento(inversionFinancieraId, req.body);
    res.status(201).json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

export async function liquidar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const inversionLiquidada = await inversionFinancieraService.liquidar(id, req.body);
    res.json(toJSONBigInt(inversionLiquidada));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const inversiones = await inversionFinancieraService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(inversiones));
  } catch (err) {
    next(err);
  }
}

export async function listarVigentes(req, res, next) {
  try {
    const inversiones = await inversionFinancieraService.listarVigentes();
    res.json(toJSONBigInt(inversiones));
  } catch (err) {
    next(err);
  }
}

export async function listarPorTipo(req, res, next) {
  try {
    const tipoInversion = req.params.tipo;
    const inversiones = await inversionFinancieraService.listarPorTipo(tipoInversion);
    res.json(toJSONBigInt(inversiones));
  } catch (err) {
    next(err);
  }
}

export async function listarMovimientos(req, res, next) {
  try {
    const inversionFinancieraId = Number(req.params.id);
    const movimientos = await inversionFinancieraService.listarMovimientos(inversionFinancieraId);
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerResumenRendimientos(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const resumen = await inversionFinancieraService.obtenerResumenRendimientos(empresaId);
    res.json(toJSONBigInt(resumen));
  } catch (err) {
    next(err);
  }
}
