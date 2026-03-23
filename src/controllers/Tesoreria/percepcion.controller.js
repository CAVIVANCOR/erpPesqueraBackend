import percepcionService from '../../services/Tesoreria/percepcion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const percepciones = await percepcionService.listar();
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const percepcion = await percepcionService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(percepcion));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await percepcionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await percepcionService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await percepcionService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorEmpresa = async (req, res, next) => {
  try {
    const percepciones = await percepcionService.listarPorEmpresa(Number(req.params.empresaId));
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
};

const listarPorCliente = async (req, res, next) => {
  try {
    const percepciones = await percepcionService.listarPorCliente(Number(req.params.clienteId));
    res.json(toJSONBigInt(percepciones));
  } catch (err) {
    next(err);
  }
};

const listarPorPeriodo = async (req, res, next) => {
  try {
    const percepciones = await percepcionService.listarPorPeriodo(req.params.periodo);
    res.json(toJSONBigInt(percepciones));
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
  listarPorCliente,
  listarPorPeriodo
};