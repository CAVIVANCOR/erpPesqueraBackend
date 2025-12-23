import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError } from '../../utils/errors.js';

/**
 * Servicio para Notificaciones
 * Gestiona notificaciones in-app para usuarios
 * Documentado en español.
 */

/**
 * Crea una nueva notificación
 */
export const crear = async (data) => {
  try {
    const notificacion = await prisma.notificacion.create({
      data: {
        usuarioId: BigInt(data.usuarioId),
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
        referenciaId: data.referenciaId ? BigInt(data.referenciaId) : null,
        referenciaTabla: data.referenciaTabla || null,
        urlDestino: data.urlDestino || null,
        metadata: data.metadata || null,
        fechaExpiracion: data.fechaExpiracion || null,
      },
      include: {
        usuario: {
          select: {
            id: true,
            username: true,
            personal: {
              select: {
                nombres: true,
                apellidos: true,
                correo: true,
              },
            },
          },
        },
      },
    });

    return notificacion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene notificaciones de un usuario con filtros
 */
export const obtenerPorUsuario = async (usuarioId, filtros = {}) => {
  try {
    const where = {
      usuarioId: BigInt(usuarioId),
    };

    if (filtros.leida !== undefined) {
      where.leida = filtros.leida;
    }

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    const notificaciones = await prisma.notificacion.findMany({
      where,
      orderBy: {
        fechaCreacion: 'desc',
      },
      take: filtros.limit || 50,
      skip: filtros.offset || 0,
    });

    return notificaciones;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Cuenta notificaciones no leídas de un usuario
 */
export const contarNoLeidas = async (usuarioId) => {
  try {
    const count = await prisma.notificacion.count({
      where: {
        usuarioId: BigInt(usuarioId),
        leida: false,
      },
    });

    return count;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Marca una notificación como leída
 */
export const marcarComoLeida = async (id, usuarioId) => {
  try {
    const notificacion = await prisma.notificacion.updateMany({
      where: {
        id: BigInt(id),
        usuarioId: BigInt(usuarioId),
      },
      data: {
        leida: true,
        fechaLeida: new Date(),
      },
    });

    if (notificacion.count === 0) {
      throw new NotFoundError('Notificación no encontrada');
    }

    return { success: true };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Marca todas las notificaciones de un usuario como leídas
 */
export const marcarTodasComoLeidas = async (usuarioId) => {
  try {
    await prisma.notificacion.updateMany({
      where: {
        usuarioId: BigInt(usuarioId),
        leida: false,
      },
      data: {
        leida: true,
        fechaLeida: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una notificación
 */
export const eliminar = async (id, usuarioId) => {
  try {
    const notificacion = await prisma.notificacion.deleteMany({
      where: {
        id: BigInt(id),
        usuarioId: BigInt(usuarioId),
      },
    });

    if (notificacion.count === 0) {
      throw new NotFoundError('Notificación no encontrada');
    }

    return { success: true };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea notificaciones para todos los participantes de una videoconferencia
 */
export const crearParaParticipantes = async (videoconferenciaId, tipo, titulo, mensaje) => {
  try {
    const participantes = await prisma.participanteReunion.findMany({
      where: {
        videoconferenciaId: BigInt(videoconferenciaId),
      },
      include: {
        personal: {
          include: {
            usuario: true,
          },
        },
      },
    });

    const notificaciones = [];

    for (const participante of participantes) {
      if (participante.personal?.usuario?.id) {
        const notificacion = await crear({
          usuarioId: participante.personal.usuario.id,
          tipo,
          titulo,
          mensaje,
          referenciaId: videoconferenciaId,
          referenciaTabla: 'videoconferencia',
          urlDestino: `/videoconferencia/${videoconferenciaId}`,
          metadata: {
            participanteId: participante.id.toString(),
            rol: participante.rol,
          },
        });

        notificaciones.push(notificacion);
      }
    }

    return notificaciones;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  crear,
  obtenerPorUsuario,
  contarNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminar,
  crearParaParticipantes,
};
