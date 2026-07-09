import tipoAfectacionIGVService from '../../services/FacturacionElectronica/tipoAfectacionIGV.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const tipos = await tipoAfectacionIGVService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(req, res, next) {
  try {
    const tipos = await tipoAfectacionIGVService.listarActivos();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipo = await tipoAfectacionIGVService.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await tipoAfectacionIGVService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await tipoAfectacionIGVService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tipoAfectacionIGVService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCategoria(req, res, next) {
  try {
    const categoria = req.params.categoria;
    const tipos = await tipoAfectacionIGVService.listarPorCategoria(categoria);
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}