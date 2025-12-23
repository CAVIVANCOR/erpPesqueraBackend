import notificacionService from '../../services/Notificacion/notificacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Notificaciones
 * Gestiona notificaciones in-app para usuarios
 * Documentado en español.
 */

export async function obtenerNotificaciones(req, res, next) {
  try {
    const usuarioId = req.user.id;
    const { leida, tipo, limit, offset } = req.query;

    const filtros = {
      leida: leida !== undefined ? leida === 'true' : undefined,
      tipo,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };

    const notificaciones = await notificacionService.obtenerPorUsuario(
      usuarioId,
      filtros
    );

    res.json(toJSONBigInt(notificaciones));
  } catch (err) {
    next(err);
  }
}

export async function contarNoLeidas(req, res, next) {
  try {
    const usuarioId = req.user.id;
    const count = await notificacionService.contarNoLeidas(usuarioId);

    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function marcarComoLeida(req, res, next) {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    await notificacionService.marcarComoLeida(id, usuarioId);

    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (err) {
    next(err);
  }
}

export async function marcarTodasComoLeidas(req, res, next) {
  try {
    const usuarioId = req.user.id;

    await notificacionService.marcarTodasComoLeidas(usuarioId);

    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    await notificacionService.eliminar(id, usuarioId);

    res.json({ mensaje: 'Notificación eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}
