import tipoDetraccionService from '../../services/Tesoreria/tipoDetraccion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const tipos = await tipoDetraccionService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const tipo = await tipoDetraccionService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await tipoDetraccionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await tipoDetraccionService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await tipoDetraccionService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarActivos = async (req, res, next) => {
  try {
    const tipos = await tipoDetraccionService.listarActivos();
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
  listarActivos
};