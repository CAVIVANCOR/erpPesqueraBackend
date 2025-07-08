import cuentaCorrienteService from '../services/cuentaCorriente.service.js';

const listar = async (req, res, next) => {
  try {
    const cuentas = await cuentaCorrienteService.listar();
    res.json(cuentas);
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const cuenta = await cuentaCorrienteService.obtenerPorId(Number(req.params.id));
    res.json(cuenta);
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nueva = await cuentaCorrienteService.crear(req.body);
    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizada = await cuentaCorrienteService.actualizar(Number(req.params.id), req.body);
    res.json(actualizada);
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await cuentaCorrienteService.eliminar(Number(req.params.id));
    res.json({ eliminado: true });
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
