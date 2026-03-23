import endosoLetraCambioService from '../../services/Tesoreria/endosoLetraCambio.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const listar = async (req, res, next) => {
  try {
    const endosos = await endosoLetraCambioService.listar();
    res.json(toJSONBigInt(endosos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const endoso = await endosoLetraCambioService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(endoso));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await endosoLetraCambioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await endosoLetraCambioService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    await endosoLetraCambioService.eliminar(Number(req.params.id));
    res.status(200).json(toJSONBigInt({ eliminado: true, id: Number(req.params.id) }));
  } catch (err) {
    next(err);
  }
};

const listarPorLetra = async (req, res, next) => {
  try {
    const endosos = await endosoLetraCambioService.listarPorLetra(Number(req.params.letraCambioId));
    res.json(toJSONBigInt(endosos));
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