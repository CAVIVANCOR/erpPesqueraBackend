import ejecucionPresupuestalService from '../../services/Tesoreria/ejecucionPresupuestal.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const ejecuciones = await ejecucionPresupuestalService.listar();
    res.json(toJSONBigInt(ejecuciones));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const ejecucion = await ejecucionPresupuestalService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(ejecucion));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await ejecucionPresupuestalService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await ejecucionPresupuestalService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await ejecucionPresupuestalService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorPresupuesto = async (req, res, next) => {
  try {
    const ejecuciones = await ejecucionPresupuestalService.listarPorPresupuesto(Number(req.params.presupuestoAnualId));
    res.json(toJSONBigInt(ejecuciones));
  } catch (err) {
    next(err);
  }
};

const listarPorPeriodo = async (req, res, next) => {
  try {
    const ejecuciones = await ejecucionPresupuestalService.listarPorPeriodo(req.params.periodo);
    res.json(toJSONBigInt(ejecuciones));
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
  listarPorPresupuesto,
  listarPorPeriodo
};