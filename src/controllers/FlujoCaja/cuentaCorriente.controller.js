import cuentaCorrienteService from '../../services/FlujoCaja/cuentaCorriente.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const cuentas = await cuentaCorrienteService.listar();
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const cuenta = await cuentaCorrienteService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(cuenta));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nueva = await cuentaCorrienteService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizada = await cuentaCorrienteService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await cuentaCorrienteService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
