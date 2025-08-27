import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetAccionesPreviasFaena
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faenaPesca, accionPrevia, responsable, verificador] = await Promise.all([
    prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } }),
    prisma.accionesPreviasFaena.findUnique({ where: { id: data.accionPreviaId } }),
    data.responsableId ? prisma.personal.findUnique({ where: { id: data.responsableId } }) : true,
    data.verificadorId ? prisma.personal.findUnique({ where: { id: data.verificadorId } }) : true
  ]);
  if (!faenaPesca) throw new ValidationError('El faenaPescaId no existe.');
  if (!accionPrevia) throw new ValidationError('El accionPreviaId no existe.');
  if (data.responsableId && !responsable) throw new ValidationError('El responsableId no existe.');
  if (data.verificadorId && !verificador) throw new ValidationError('El verificadorId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detAccionesPreviasFaena.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detAccionesPreviasFaena.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetAccionesPreviasFaena no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['faenaPescaId','accionPreviaId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.detAccionesPreviasFaena.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detAccionesPreviasFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetAccionesPreviasFaena no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaId','accionPreviaId','responsableId','verificadorId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detAccionesPreviasFaena.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detAccionesPreviasFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetAccionesPreviasFaena no encontrado');
    await prisma.detAccionesPreviasFaena.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorTemporada = async (temporadaId) => {
  try {
    const resultado = await prisma.detAccionesPreviasFaena.findMany({
      where: {
        faenaPesca: {
          temporadaId: temporadaId
        }
      },
      include: {
        accionPrevia: true,
        faenaPesca: {
          include: {
            embarcacion: {
              include: {
                activo: true
              }
            }
          }
        }
      }
    });
    return resultado;
  } catch (err) {
    console.error("❌ [DEBUG] Error en obtenerPorTemporada:", err);
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
  obtenerPorTemporada
};
