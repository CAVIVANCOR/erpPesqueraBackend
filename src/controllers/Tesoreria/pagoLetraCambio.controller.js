import pagoLetraCambioService from '../../services/Tesoreria/pagoLetraCambio.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const pagos = await pagoLetraCambioService.listar();
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const pago = await pagoLetraCambioService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(pago));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await pagoLetraCambioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await pagoLetraCambioService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await pagoLetraCambioService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorLetra = async (req, res, next) => {
  try {
    const pagos = await pagoLetraCambioService.listarPorLetra(Number(req.params.letraCambioId));
    res.json(toJSONBigInt(pagos));
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
  listarPorLetra
};