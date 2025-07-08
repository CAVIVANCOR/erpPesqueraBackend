import movimientoCajaService from '../services/movimientoCaja.service.js';

const listar = async (req, res, next) => {
  try {
    const movimientos = await movimientoCajaService.listar();
    res.json(movimientos);
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const movimiento = await movimientoCajaService.obtenerPorId(Number(req.params.id));
    res.json(movimiento);
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await movimientoCajaService.crear(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await movimientoCajaService.actualizar(Number(req.params.id), req.body);
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await movimientoCajaService.eliminar(Number(req.params.id));
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
