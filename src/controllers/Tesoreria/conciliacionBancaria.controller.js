import conciliacionBancariaService from '../../services/Tesoreria/conciliacionBancaria.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const conciliaciones = await conciliacionBancariaService.listar();
    res.json(toJSONBigInt(conciliaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const conciliacion = await conciliacionBancariaService.obtenerPorId(id);
    res.json(toJSONBigInt(conciliacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await conciliacionBancariaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await conciliacionBancariaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await conciliacionBancariaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const conciliaciones = await conciliacionBancariaService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(conciliaciones));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCuentaCorriente(req, res, next) {
  try {
    const cuentaCorrienteId = Number(req.params.cuentaCorrienteId);
    const conciliaciones = await conciliacionBancariaService.listarPorCuentaCorriente(cuentaCorrienteId);
    res.json(toJSONBigInt(conciliaciones));
  } catch (err) {
    next(err);
  }
}

export async function marcarConciliado(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { conciliadoPorId } = req.body;
    const conciliacion = await conciliacionBancariaService.marcarConciliado(id, conciliadoPorId);
    res.json(toJSONBigInt(conciliacion));
  } catch (err) {
    next(err);
  }
}
