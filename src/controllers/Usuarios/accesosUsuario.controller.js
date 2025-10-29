import accesosUsuarioService from '../../services/Usuarios/accesosUsuario.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AccesosUsuario
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const accesos = await accesosUsuarioService.listar();
    res.json(toJSONBigInt(accesos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const acceso = await accesosUsuarioService.obtenerPorId(id);
    res.json(toJSONBigInt(acceso));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await accesosUsuarioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await accesosUsuarioService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await accesosUsuarioService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener todos los accesos de un usuario específico
 */
export async function obtenerPorUsuario(req, res, next) {
  try {
    const usuarioId = Number(req.params.usuarioId);
    const accesos = await accesosUsuarioService.obtenerPorUsuario(usuarioId);
    res.json(toJSONBigInt(accesos));
  } catch (err) {
    next(err);
  }
}

/**
 * Asignar múltiples accesos a un usuario (en lote)
 * Body: { usuarioId, submodulosIds: [1, 2, 3] } o { usuarioId, submodulosIds: [{submoduloId, permisos}, ...] }
 */
export async function asignarAccesosEnLote(req, res, next) {
  try {
    const { usuarioId, submodulosIds } = req.body;
    
    // Detectar si es array de números o array de objetos
    let submodulosData;
    if (Array.isArray(submodulosIds) && submodulosIds.length > 0) {
      if (typeof submodulosIds[0] === 'object' && submodulosIds[0] !== null) {
        // Array de objetos {submoduloId, permisos}
        submodulosData = submodulosIds;
      } else {
        // Array de números simples
        submodulosData = submodulosIds.map(Number);
      }
    } else {
      submodulosData = [];
    }
    
    const accesos = await accesosUsuarioService.asignarAccesosEnLote(
      Number(usuarioId),
      submodulosData
    );
    res.status(201).json(toJSONBigInt(accesos));
  } catch (err) {
    next(err);
  }
}

/**
 * Revocar múltiples accesos de un usuario
 * Body: { usuarioId, submodulosIds: [1, 2, 3] }
 */
export async function revocarAccesosEnLote(req, res, next) {
  try {
    const { usuarioId, submodulosIds } = req.body;
    await accesosUsuarioService.revocarAccesosEnLote(
      Number(usuarioId),
      submodulosIds.map(Number)
    );
    res.json({ revocado: true, usuarioId, cantidad: submodulosIds.length });
  } catch (err) {
    next(err);
  }
}
