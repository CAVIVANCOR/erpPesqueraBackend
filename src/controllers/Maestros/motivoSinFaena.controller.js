import motivoSinFaenaService from '../../services/Maestros/motivoSinFaena.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para MotivoSinFaena
 * Documentado en español.
 */
export async function listarMotivos(req, res, next) {
  try {
    const motivos = await motivoSinFaenaService.listar();
    res.json(toJSONBigInt(motivos));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista motivos sin faena activos
 */
export async function listarMotivosActivos(req, res, next) {
  try {
    const motivos = await motivoSinFaenaService.listarActivos();
    res.json(toJSONBigInt(motivos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerMotivoPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const motivo = await motivoSinFaenaService.obtenerPorId(id);
    res.json(toJSONBigInt(motivo));
  } catch (err) {
    next(err);
  }
}

export async function crearMotivo(req, res, next) {
  try {
    const nuevo = await motivoSinFaenaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizarMotivo(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await motivoSinFaenaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminarMotivo(req, res, next) {
  try {
    const id = Number(req.params.id);
    await motivoSinFaenaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}