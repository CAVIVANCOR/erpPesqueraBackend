import flujoCajaProyectadoService from '../../services/Tesoreria/flujoCajaProyectado.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const flujos = await flujoCajaProyectadoService.listar();
    res.json(toJSONBigInt(flujos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const flujo = await flujoCajaProyectadoService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(flujo));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await flujoCajaProyectadoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await flujoCajaProyectadoService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await flujoCajaProyectadoService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorEmpresa = async (req, res, next) => {
  try {
    const flujos = await flujoCajaProyectadoService.listarPorEmpresa(Number(req.params.empresaId));
    res.json(toJSONBigInt(flujos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorEmpresaPeriodo = async (req, res, next) => {
  try {
    const flujo = await flujoCajaProyectadoService.obtenerPorEmpresaPeriodo(
      Number(req.params.empresaId),
      req.params.periodo
    );
    res.json(toJSONBigInt(flujo));
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
  obtenerPorEmpresaPeriodo
};