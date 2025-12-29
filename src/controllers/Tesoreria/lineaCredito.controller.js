import lineaCreditoService from '../../services/Tesoreria/lineaCredito.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para LineaCredito
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const lineas = await lineaCreditoService.listar();
    res.json(toJSONBigInt(lineas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const linea = await lineaCreditoService.obtenerPorId(id);
    res.json(toJSONBigInt(linea));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await lineaCreditoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await lineaCreditoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await lineaCreditoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function registrarUtilizacion(req, res, next) {
  try {
    const lineaCreditoId = Number(req.params.id);
    const utilizacion = await lineaCreditoService.registrarUtilizacion(lineaCreditoId, req.body);
    res.status(201).json(toJSONBigInt(utilizacion));
  } catch (err) {
    next(err);
  }
}

export async function registrarDevolucion(req, res, next) {
  try {
    const utilizacionId = Number(req.params.utilizacionId);
    const devolucion = await lineaCreditoService.registrarDevolucion(utilizacionId, req.body);
    res.json(toJSONBigInt(devolucion));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const lineas = await lineaCreditoService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(lineas));
  } catch (err) {
    next(err);
  }
}

export async function listarVigentes(req, res, next) {
  try {
    const lineas = await lineaCreditoService.listarVigentes();
    res.json(toJSONBigInt(lineas));
  } catch (err) {
    next(err);
  }
}

export async function listarUtilizaciones(req, res, next) {
  try {
    const lineaCreditoId = Number(req.params.id);
    const utilizaciones = await lineaCreditoService.listarUtilizaciones(lineaCreditoId);
    res.json(toJSONBigInt(utilizaciones));
  } catch (err) {
    next(err);
  }
}
