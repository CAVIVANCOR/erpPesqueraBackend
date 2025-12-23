import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';
import notificacionService from '../Notificacion/notificacion.service.js';
import emailService from '../Email/email.service.js';

/**
 * Servicio CRUD para ParticipanteReunion
 * Gestiona participantes de videoconferencias
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 */
async function validarForaneas(data) {
  if (data.videoconferenciaId) {
    const videoconferencia = await prisma.videoconferencia.findUnique({ where: { id: data.videoconferenciaId } });
    if (!videoconferencia) throw new ValidationError('La videoconferencia referenciada no existe.');
  }
  
  if (data.personalId) {
    const personal = await prisma.personal.findUnique({ where: { id: data.personalId } });
    if (!personal) throw new ValidationError('El personal referenciado no existe.');
  }
}

/**
 * Lista todos los participantes de una videoconferencia.
 */
const listarPorVideoconferencia = async (videoconferenciaId) => {
  try {
    return await prisma.participanteReunion.findMany({
      where: { videoconferenciaId },
      include: {
        personal: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            telefono: true
          }
        },
        videoconferencia: {
          select: {
            id: true,
            titulo: true,
            fechaInicio: true,
            estado: true
          }
        }
      },
      orderBy: {
        rol: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un participante por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const participante = await prisma.participanteReunion.findUnique({ 
      where: { id }, 
      include: { 
        personal: true,
        videoconferencia: true
      } 
    });
    
    if (!participante) throw new NotFoundError('Participante no encontrado');
    return participante;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Agrega un participante a una videoconferencia.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios y acumular los faltantes
    const camposFaltantes = [];
    
    if (!data.videoconferenciaId) camposFaltantes.push('Videoconferencia');
    if (!data.personalId) camposFaltantes.push('Personal');
    
    if (camposFaltantes.length > 0) {
      throw new ValidationError(
        `Usted debe ingresar estos campos: ${camposFaltantes.join(', ')} que son obligatorios.`
      );
    }
    
    await validarForaneas(data);
    
    // Verificar que no exista ya este participante en la videoconferencia
    const existe = await prisma.participanteReunion.findFirst({
      where: {
        videoconferenciaId: data.videoconferenciaId,
        personalId: data.personalId
      }
    });
    
    if (existe) {
      throw new ValidationError('Este participante ya está agregado a la videoconferencia');
    }
    
    const nuevo = await prisma.participanteReunion.create({
      data,
      include: {
        personal: {
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
        videoconferencia: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            fechaInicio: true,
            duracionMinutos: true,
            salaId: true,
            organizador: {
              select: {
                nombres: true,
                apellidos: true
              }
            }
          }
        }
      }
    });
    
    // Enviar notificación in-app si el personal tiene usuario
    if (nuevo.personal.usuario?.id) {
      try {
        await notificacionService.crear({
          usuarioId: nuevo.personal.usuario.id,
          tipo: 'VIDEOCONFERENCIA_INVITACION',
          titulo: `Invitación: ${nuevo.videoconferencia.titulo}`,
          mensaje: `Has sido invitado a participar en la videoconferencia "${nuevo.videoconferencia.titulo}"`,
          referenciaId: nuevo.videoconferenciaId,
          referenciaTabla: 'videoconferencia',
          urlDestino: `/videoconferencia/${nuevo.videoconferenciaId}`,
          metadata: {
            participanteId: nuevo.id.toString(),
            rol: nuevo.rol
          }
        });
      } catch (error) {
        console.error('Error al crear notificación:', error);
      }
    }
    
    // Enviar email de invitación
    if (nuevo.personal.correo) {
      try {
        const participanteEmail = {
          nombres: nuevo.personal.nombres,
          apellidos: nuevo.personal.apellidos,
          email: nuevo.personal.correo
        };
        
        await emailService.enviarInvitacionVideoconferencia(
          participanteEmail,
          nuevo.videoconferencia
        );
      } catch (error) {
        console.error('Error al enviar email:', error);
      }
    }
    
    return nuevo;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un participante existente.
 */
const actualizar = async (id, data) => {
  try {
    const existe = await prisma.participanteReunion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Participante no encontrado');
    
    const actualizado = await prisma.participanteReunion.update({
      where: { id },
      data,
      include: {
        personal: true,
        videoconferencia: true
      }
    });
    
    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un participante.
 */
const eliminar = async (id) => {
  try {
    const existe = await prisma.participanteReunion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Participante no encontrado');
    
    await prisma.participanteReunion.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Confirma la asistencia de un participante
 */
const confirmar = async (id) => {
  try {
    const existe = await prisma.participanteReunion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Participante no encontrado');
    
    const confirmado = await prisma.participanteReunion.update({
      where: { id },
      data: { confirmado: true },
      include: {
        personal: true,
        videoconferencia: true
      }
    });
    
    return confirmado;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Registra el ingreso de un participante a la reunión
 */
const registrarIngreso = async (id) => {
  try {
    const existe = await prisma.participanteReunion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Participante no encontrado');
    
    const registrado = await prisma.participanteReunion.update({
      where: { id },
      data: { 
        horaIngreso: new Date(),
        asistio: true
      },
      include: {
        personal: true,
        videoconferencia: true
      }
    });
    
    return registrado;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Registra la salida de un participante de la reunión
 */
const registrarSalida = async (id) => {
  try {
    const existe = await prisma.participanteReunion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Participante no encontrado');
    
    const registrado = await prisma.participanteReunion.update({
      where: { id },
      data: { 
        horaSalida: new Date()
      },
      include: {
        personal: true,
        videoconferencia: true
      }
    });
    
    return registrado;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listarPorVideoconferencia,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  confirmar,
  registrarIngreso,
  registrarSalida
};
