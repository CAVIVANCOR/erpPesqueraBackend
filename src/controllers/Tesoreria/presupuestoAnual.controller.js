import presupuestoAnualService from '../../services/Tesoreria/presupuestoAnual.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const presupuestos = await presupuestoAnualService.listar();
    res.json(toJSONBigInt(presupuestos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const presupuesto = await presupuestoAnualService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(presupuesto));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await presupuestoAnualService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await presupuestoAnualService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await presupuestoAnualService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorEmpresa = async (req, res, next) => {
  try {
    const presupuestos = await presupuestoAnualService.listarPorEmpresa(Number(req.params.empresaId));
    res.json(toJSONBigInt(presupuestos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorEmpresaAnio = async (req, res, next) => {
  try {
    const presupuesto = await presupuestoAnualService.obtenerPorEmpresaAnio(
      Number(req.params.empresaId),
      Number(req.params.anio)
    );
    res.json(toJSONBigInt(presupuesto));
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
  obtenerPorEmpresaAnio
};