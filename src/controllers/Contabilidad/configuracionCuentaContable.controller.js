import configuracionCuentaContableService from '../../services/Contabilidad/configuracionCuentaContable.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ConfiguracionCuentaContable
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const configuraciones = await configuracionCuentaContableService.listar();
    res.json(toJSONBigInt(configuraciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const configuracion = await configuracionCuentaContableService.obtenerPorId(id);
    res.json(toJSONBigInt(configuracion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await configuracionCuentaContableService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await configuracionCuentaContableService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await configuracionCuentaContableService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const configuraciones = await configuracionCuentaContableService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(configuraciones));
  } catch (err) {
    next(err);
  }
}

export async function listarPorTipoOperacion(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const tipoOperacion = req.params.tipoOperacion;
    const configuraciones = await configuracionCuentaContableService.listarPorTipoOperacion(empresaId, tipoOperacion);
    res.json(toJSONBigInt(configuraciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorConcepto(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const tipoOperacion = req.params.tipoOperacion;
    const concepto = req.params.concepto;
    const configuracion = await configuracionCuentaContableService.obtenerPorConcepto(empresaId, tipoOperacion, concepto);
    res.json(toJSONBigInt(configuracion));
  } catch (err) {
    next(err);
  }
}

export async function copiarConfiguraciones(req, res, next) {
  try {
    const { empresaOrigenId, empresaDestinoId } = req.body;
    const resultado = await configuracionCuentaContableService.copiarConfiguraciones(empresaOrigenId, empresaDestinoId);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
