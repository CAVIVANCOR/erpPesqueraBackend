import tipoRetencionPercepcionService from '../../services/Tesoreria/tipoRetencionPercepcion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const tipos = await tipoRetencionPercepcionService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const tipo = await tipoRetencionPercepcionService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await tipoRetencionPercepcionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await tipoRetencionPercepcionService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await tipoRetencionPercepcionService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorTipo = async (req, res, next) => {
  try {
    const tipos = await tipoRetencionPercepcionService.listarPorTipo(req.params.tipo);
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorTipo
};