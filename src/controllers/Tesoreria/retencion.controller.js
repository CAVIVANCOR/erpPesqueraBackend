import retencionService from '../../services/Tesoreria/retencion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const retenciones = await retencionService.listar();
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const retencion = await retencionService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(retencion));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await retencionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await retencionService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await retencionService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorEmpresa = async (req, res, next) => {
  try {
    const retenciones = await retencionService.listarPorEmpresa(Number(req.params.empresaId));
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
};

const listarPorProveedor = async (req, res, next) => {
  try {
    const retenciones = await retencionService.listarPorProveedor(Number(req.params.proveedorId));
    res.json(toJSONBigInt(retenciones));
  } catch (err) {
    next(err);
  }
};

const listarPorPeriodo = async (req, res, next) => {
  try {
    const retenciones = await retencionService.listarPorPeriodo(req.params.periodo);
    res.json(toJSONBigInt(retenciones));
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
  listarPorProveedor,
  listarPorPeriodo
};