import ubicacionLetraService from '../../services/Tesoreria/ubicacionLetra.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const ubicaciones = await ubicacionLetraService.listar();
    res.json(toJSONBigInt(ubicaciones));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const ubicacion = await ubicacionLetraService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(ubicacion));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await ubicacionLetraService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await ubicacionLetraService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await ubicacionLetraService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorBanco = async (req, res, next) => {
  try {
    const ubicaciones = await ubicacionLetraService.listarPorBanco(Number(req.params.bancoId));
    res.json(toJSONBigInt(ubicaciones));
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
  listarPorBanco
};