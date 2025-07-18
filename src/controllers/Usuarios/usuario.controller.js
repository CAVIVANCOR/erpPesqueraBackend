import usuarioService from '../../services/Usuarios/usuario.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Usuario
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const usuarios = await usuarioService.listar();
    res.json(toJSONBigInt(usuarios));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuario = await usuarioService.obtenerPorId(id);
    res.json(toJSONBigInt(usuario));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await usuarioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await usuarioService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await usuarioService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function crearSuperusuario(req, res, next) {
  try {
    const usuario = await usuarioService.crearSuperusuarioEnCascada(req.body);
    res.status(201).json(toJSONBigInt(usuario));
  } catch (err) {
    next(err);
  }
}

// Nuevo endpoint: contar usuarios
export async function contarUsuarios(req, res, next) {
  try {
    const count = await usuarioService.contarUsuarios();
    res.json({ count });
  } catch (err) {
    next(err);
  }
}