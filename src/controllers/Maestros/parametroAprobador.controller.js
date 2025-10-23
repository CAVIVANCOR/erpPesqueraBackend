import parametroAprobadorService from '../../services/Maestros/parametroAprobador.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ParametroAprobador
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const parametros = await parametroAprobadorService.listar();
    res.json(toJSONBigInt(parametros));
  } catch (err) {
    next(err);
  }
}

export async function listarPorModulo(req, res, next) {
  try {
    const { empresaId, moduloSistemaId } = req.query;
    if (!empresaId || !moduloSistemaId) {
      return res.status(400).json({ error: 'empresaId y moduloSistemaId son requeridos' });
    }
    const parametros = await parametroAprobadorService.listarPorModulo(empresaId, moduloSistemaId);
    res.json(toJSONBigInt(parametros));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const parametro = await parametroAprobadorService.obtenerPorId(id);
    res.json(toJSONBigInt(parametro));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await parametroAprobadorService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await parametroAprobadorService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await parametroAprobadorService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
