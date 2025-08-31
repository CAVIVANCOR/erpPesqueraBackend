import tipoProvieneDeService from '../../services/Maestros/tipoProvieneDe.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TipoProvieneDe
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const tipos = await tipoProvieneDeService.listar();
    res.json(toJSONBigInt(tipos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipo = await tipoProvieneDeService.obtenerPorId(id);
    res.json(toJSONBigInt(tipo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    // Agregar updatedAt requerido por Prisma
    const dataConUpdatedAt = {
      ...req.body,
      updatedAt: new Date()
    };
    const nuevo = await tipoProvieneDeService.crear(dataConUpdatedAt);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    // Agregar updatedAt para actualizaciones
    const dataConUpdatedAt = {
      ...req.body,
      updatedAt: new Date()
    };
    const actualizado = await tipoProvieneDeService.actualizar(id, dataConUpdatedAt);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tipoProvieneDeService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
