import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import crypto from 'crypto';
import notificacionService from '../Notificacion/notificacion.service.js'; // AGREGADO

/**
 * Servicio CRUD para Videoconferencia
 * Gestiona reuniones virtuales con Jitsi Meet
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 */
async function validarForaneas(data) {
  if (data.organizadorId) {
    const organizador = await prisma.personal.findUnique({ where: { id: data.organizadorId } });
    if (!organizador) throw new ValidationError('El organizador referenciado no existe.');
  }
}

/**
 * Genera un ID único para la sala de Jitsi
 */
function generarSalaId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Lista todas las videoconferencias.
 */
const listar = async () => {
  try {
    return await prisma.videoconferencia.findMany({
      include: {
        organizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true
          }
        },
        participantes: {
          include: {
            personal: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                correo: true
              }
            }
          }
        },
        grabaciones: true
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una videoconferencia por ID (incluyendo participantes y grabaciones).
 */
const obtenerPorId = async (id) => {
  try {
    const videoconferencia = await prisma.videoconferencia.findUnique({ 
      where: { id }, 
      include: { 
        organizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true
          }
        },
        participantes: {
          include: {
            personal: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                correo: true
              }
            }
          },
          orderBy: {
            rol: 'asc'
          }
        },
        grabaciones: {
          orderBy: {
            fechaGrabacion: 'desc'
          }
        }
      } 
    });
    
    if (!videoconferencia) throw new NotFoundError('Videoconferencia no encontrada');
    return videoconferencia;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una nueva videoconferencia.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios y acumular los faltantes
    const camposFaltantes = [];
    
    if (!data.titulo) camposFaltantes.push('Título');
    if (!data.fechaInicio) camposFaltantes.push('Fecha de Inicio');
    if (!data.duracionMinutos) camposFaltantes.push('Duración en Minutos');
    if (!data.organizadorId) camposFaltantes.push('Organizador');
    
    if (camposFaltantes.length > 0) {
      throw new ValidationError(
        `Usted debe ingresar estos campos: ${camposFaltantes.join(', ')} que son obligatorios.`
      );
    }
    
    await validarForaneas(data);
    
    // Generar salaId único si no se proporciona
    if (!data.salaId) {
      data.salaId = generarSalaId();
    }
    
    // Extraer participantes si vienen en el data
    const { participantes, ...videoconferenciaData } = data;
    
    const nueva = await prisma.videoconferencia.create({
      data: {
        ...videoconferenciaData,
        participantes: participantes ? {
          create: participantes.map(p => ({
            personalId: p.personalId,
            rol: p.rol || 'PARTICIPANTE',
            confirmado: p.confirmado || false
          }))
        } : undefined
      },
      include: {
        organizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            usuario: {
              select: {
                id: true
              }
            }
          }
        },
        participantes: {
          include: {
            personal: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                correo: true
              }
            }
          }
        }
      }
    });
    
    // AGREGADO: Crear notificación para el moderador (organizador)
    try {
      if (nueva.organizador?.usuario?.id) {
        const fechaFormateada = new Date(nueva.fechaInicio).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        await notificacionService.crear({
          usuarioId: nueva.organizador.usuario.id,
          tipo: 'VIDEOCONFERENCIA_INVITACION',
          titulo: `Eres moderador de: ${nueva.titulo}`,
          mensaje: `Has creado una videoconferencia programada para el ${fechaFormateada}. Como moderador, debes iniciar la reunión.`,
          referenciaId: nueva.id,
          referenciaTabla: 'videoconferencia',
          urlDestino: `/videoconferencia`,
          metadata: {
            videoconferenciaId: nueva.id.toString(),
            salaId: nueva.salaId,
            esModerador: true,
            rol: 'MODERADOR'
          }
        });
      }
    } catch (notifError) {
      console.error('Error al crear notificación para moderador:', notifError);
      // No lanzar error, la videoconferencia ya fue creada exitosamente
    }
    
    return nueva;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una videoconferencia existente.
 */
const actualizar = async (id, data) => {
  try {
    const existe = await prisma.videoconferencia.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Videoconferencia no encontrada');
    
    // Validar que no esté finalizada o cancelada
    if (existe.estado === 'FINALIZADA') {
      throw new ValidationError('No se puede modificar una videoconferencia finalizada');
    }
    if (existe.estado === 'CANCELADA') {
      throw new ValidationError('No se puede modificar una videoconferencia cancelada');
    }
    
    await validarForaneas(data);
    
    // Extraer participantes si vienen en el data
    const { participantes, ...videoconferenciaData } = data;
    
    const actualizada = await prisma.videoconferencia.update({
      where: { id },
      data: videoconferenciaData,
      include: {
        organizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true
          }
        },
        participantes: {
          include: {
            personal: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                correo: true
              }
            }
          }
        },
        grabaciones: true
      }
    });
    
    return actualizada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una videoconferencia.
 */
const eliminar = async (id) => {
  try {
    const existe = await prisma.videoconferencia.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Videoconferencia no encontrada');
    
    // Validar que no esté en curso o finalizada
    if (existe.estado === 'EN_CURSO') {
      throw new ValidationError('No se puede eliminar una videoconferencia en curso. Debe finalizarla o cancelarla primero.');
    }
    if (existe.estado === 'FINALIZADA') {
      throw new ValidationError('No se puede eliminar una videoconferencia finalizada. Debe cancelarla primero.');
    }
    
    // Eliminar participantes y grabaciones primero (cascade)
    await prisma.participanteReunion.deleteMany({ where: { videoconferenciaId: id } });
    await prisma.grabacionReunion.deleteMany({ where: { videoconferenciaId: id } });
    
    await prisma.videoconferencia.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Inicia una videoconferencia (cambia estado a EN_CURSO)
 */
const iniciar = async (id) => {
  try {
    const existe = await prisma.videoconferencia.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Videoconferencia no encontrada');
    
    if (existe.estado !== 'PROGRAMADA') {
      throw new ValidationError('Solo se pueden iniciar videoconferencias programadas');
    }
    
    const iniciada = await prisma.videoconferencia.update({
      where: { id },
      data: {
        estado: 'EN_CURSO'
      },
      include: {
        organizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true
          }
        },
        participantes: {
          include: {
            personal: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                correo: true
              }
            }
          }
        }
      }
    });
    
    return iniciada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Finaliza una videoconferencia (cambia estado a FINALIZADA)
 */
const finalizar = async (id) => {
  try {
    const existe = await prisma.videoconferencia.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Videoconferencia no encontrada');
    
    if (existe.estado !== 'EN_CURSO') {
      throw new ValidationError('Solo se pueden finalizar videoconferencias en curso');
    }
    
    const finalizada = await prisma.videoconferencia.update({
      where: { id },
      data: {
        estado: 'FINALIZADA'
      },
      include: {
        organizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true
          }
        },
        participantes: {
          include: {
            personal: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                correo: true
              }
            }
          }
        },
        grabaciones: true
      }
    });
    
    return finalizada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Cancela una videoconferencia (cambia estado a CANCELADA)
 */
const cancelar = async (id) => {
  try {
    const existe = await prisma.videoconferencia.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Videoconferencia no encontrada');
    
    if (existe.estado === 'FINALIZADA') {
      throw new ValidationError('No se pueden cancelar videoconferencias finalizadas');
    }
    
    const cancelada = await prisma.videoconferencia.update({
      where: { id },
      data: {
        estado: 'CANCELADA'
      },
      include: {
        organizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true
          }
        },
        participantes: {
          include: {
            personal: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                correo: true
              }
            }
          }
        }
      }
    });
    
    return cancelada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene videoconferencias por organizador
 */
const obtenerPorOrganizador = async (organizadorId) => {
  try {
    return await prisma.videoconferencia.findMany({
      where: { organizadorId },
      include: {
        organizador: true,
        participantes: {
          include: {
            personal: true
          }
        },
        grabaciones: true
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene videoconferencias por estado
 */
const obtenerPorEstado = async (estado) => {
  try {
    return await prisma.videoconferencia.findMany({
      where: { estado },
      include: {
        organizador: true,
        participantes: {
          include: {
            personal: true
          }
        }
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

// AGREGADO: Verificar estado de reunión y obtener información para unirse
const verificarEstadoReunion = async (videoconferenciaId) => {
  try {
    const videoconferencia = await prisma.videoconferencia.findUnique({
      where: { id: BigInt(videoconferenciaId) },
      select: {
        id: true,
        titulo: true,
        estado: true,
        salaId: true,
        fechaInicio: true,
        organizador: {
          select: {
            nombres: true,
            apellidos: true
          }
        }
      }
    });

    if (!videoconferencia) {
      throw new NotFoundError('Videoconferencia no encontrada');
    }

    const jitsiUrl = `${process.env.JITSI_URL || 'https://meet.megui.com.pe'}/${videoconferencia.salaId}`;

    return {
      id: videoconferencia.id.toString(),
      titulo: videoconferencia.titulo,
      estado: videoconferencia.estado,
      moderadorInicio: videoconferencia.estado === 'EN_CURSO',
      urlReunion: jitsiUrl,
      salaId: videoconferencia.salaId,
      fechaInicio: videoconferencia.fechaInicio,
      organizador: `${videoconferencia.organizador.nombres} ${videoconferencia.organizador.apellidos}`
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  iniciar,
  finalizar,
  cancelar,
  obtenerPorOrganizador,
  obtenerPorEstado,
  verificarEstadoReunion // AGREGADO
};