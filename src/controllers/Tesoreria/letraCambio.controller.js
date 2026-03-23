import letraCambioService from '../../services/Tesoreria/letraCambio.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const letras = await letraCambioService.listar();
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const letra = await letraCambioService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(letra));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await letraCambioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await letraCambioService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await letraCambioService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorEmpresa = async (req, res, next) => {
  try {
    const letras = await letraCambioService.listarPorEmpresa(Number(req.params.empresaId));
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
};

const listarPorGirado = async (req, res, next) => {
  try {
    const letras = await letraCambioService.listarPorGirado(Number(req.params.giradoId));
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
};

const listarPorEstado = async (req, res, next) => {
  try {
    const letras = await letraCambioService.listarPorEstado(Number(req.params.estadoLetraId));
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
};

const listarPorRangoVencimiento = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const letras = await letraCambioService.listarPorRangoVencimiento(fechaInicio, fechaFin);
    res.json(toJSONBigInt(letras));
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
  listarPorEmpresa,
  listarPorGirado,
  listarPorEstado,
  listarPorRangoVencimiento
};