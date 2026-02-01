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
    const id = BigInt(req.params.id);
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
    const id = BigInt(req.params.id);
    const actualizada = await lineaCreditoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await lineaCreditoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = BigInt(req.params.empresaId);
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

export async function listarPrestamos(req, res, next) {
  try {
    const lineaCreditoId = BigInt(req.params.id);
    const prestamos = await lineaCreditoService.listarPrestamos(lineaCreditoId);
    res.json(toJSONBigInt(prestamos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerReporteLineasDisponibles(req, res, next) {
  try {
    const empresaId = BigInt(req.params.empresaId);
    const reporte = await lineaCreditoService.obtenerReporteLineasDisponibles(empresaId);
    res.json(toJSONBigInt(reporte));
  } catch (err) {
    next(err);
  }
}

export async function obtenerTipoCambio(req, res, next) {
  try {
    const { fecha } = req.params;
    const tc = await lineaCreditoService.obtenerTipoCambio(new Date(fecha));
    res.json(toJSONBigInt(tc));
  } catch (err) {
    next(err);
  }
}