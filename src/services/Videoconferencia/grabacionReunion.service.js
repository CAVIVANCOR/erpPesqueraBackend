import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para GrabacionReunion
 * Gestiona grabaciones de videoconferencias
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
}

/**
 * Lista todas las grabaciones de una videoconferencia.
 */
const listarPorVideoconferencia = async (videoconferenciaId) => {
  try {
    return await prisma.grabacionReunion.findMany({
      where: { videoconferenciaId },
      include: {
        videoconferencia: {
          select: {
            id: true,
            titulo: true,
            fechaInicio: true,
            organizador: {
              select: {
                id: true,
                nombres: true,
                apellidos: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaGrabacion: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una grabación por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const grabacion = await prisma.grabacionReunion.findUnique({ 
      where: { id }, 
      include: { 
        videoconferencia: {
          include: {
            organizador: true
          }
        }
      } 
    });
    
    if (!grabacion) throw new NotFoundError('Grabación no encontrada');
    return grabacion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una nueva grabación.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios y acumular los faltantes
    const camposFaltantes = [];
    
    if (!data.videoconferenciaId) camposFaltantes.push('Videoconferencia');
    if (!data.nombreArchivo) camposFaltantes.push('Nombre de Archivo');
    if (!data.rutaArchivo) camposFaltantes.push('Ruta de Archivo');
    if (!data.duracionSegundos) camposFaltantes.push('Duración en Segundos');
    if (!data.tamanoBytes) camposFaltantes.push('Tamaño en Bytes');
    
    if (camposFaltantes.length > 0) {
      throw new ValidationError(
        `Usted debe ingresar estos campos: ${camposFaltantes.join(', ')} que son obligatorios.`
      );
    }
    
    await validarForaneas(data);
    
    const nueva = await prisma.grabacionReunion.create({
      data,
      include: {
        videoconferencia: {
          select: {
            id: true,
            titulo: true,
            fechaInicio: true
          }
        }
      }
    });
    
    return nueva;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una grabación existente.
 */
const actualizar = async (id, data) => {
  try {
    const existe = await prisma.grabacionReunion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Grabación no encontrada');
    
    const actualizada = await prisma.grabacionReunion.update({
      where: { id },
      data,
      include: {
        videoconferencia: true
      }
    });
    
    return actualizada;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una grabación.
 */
const eliminar = async (id) => {
  try {
    const existe = await prisma.grabacionReunion.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Grabación no encontrada');
    
    await prisma.grabacionReunion.delete({ where: { id } });
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
  eliminar
};
