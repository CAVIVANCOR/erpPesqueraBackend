import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TripulanteFaena
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  // faenaPescaId es requerido
  const faenaPesca = await prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } });
  if (!faenaPesca) throw new ValidationError('El faenaPescaId no existe.');
  // personalId y cargoId son opcionales
  if (data.personalId) {
    const personal = await prisma.personal.findUnique({ where: { id: data.personalId } });
    if (!personal) throw new ValidationError('El personalId no existe.');
  }
  if (data.cargoId) {
    const cargo = await prisma.cargo.findUnique({ where: { id: data.cargoId } });
    if (!cargo) throw new ValidationError('El cargoId no existe.');
  }
}

const listar = async () => {
  try {
    return await prisma.tripulanteFaena.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tripulante = await prisma.tripulanteFaena.findUnique({ where: { id } });
    if (!tripulante) throw new NotFoundError('TripulanteFaena no encontrado');
    return tripulante;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.faenaPescaId) throw new ValidationError('El campo faenaPescaId es obligatorio.');
    await validarClavesForaneas(data);
    return await prisma.tripulanteFaena.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tripulanteFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TripulanteFaena no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaId','personalId','cargoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.tripulanteFaena.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tripulanteFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TripulanteFaena no encontrado');
    await prisma.tripulanteFaena.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorFaena = async (faenaPescaId) => {
  try {
    // Obtener tripulantes de la faena
    const tripulantes = await prisma.tripulanteFaena.findMany({
      where: { faenaPescaId: faenaPescaId },
      orderBy: [
        { cargoId: 'asc' },
        { apellidos: 'asc' },
        { nombres: 'asc' }
      ]
    });

    // Si no hay tripulantes, retornar array vacío
    if (!tripulantes || tripulantes.length === 0) {
      return [];
    }

    // Obtener los IDs de personal que no son null
    const personalIds = tripulantes
      .filter(t => t.personalId !== null)
      .map(t => t.personalId);

    // Obtener datos de personal si hay IDs
    let personalData = [];
    if (personalIds.length > 0) {
      personalData = await prisma.personal.findMany({
        where: {
          id: { in: personalIds }
        },
        include: {
          tipoDocIdentidad: true
        }
      });
    }

    // Combinar los datos
    const tripulantesConPersonal = tripulantes.map(tripulante => {
      const personal = personalData.find(p => p.id === tripulante.personalId);
      
      return {
        ...tripulante,
        personal: personal || null
      };
    });

    return tripulantesConPersonal;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorFaena,
  crear,
  actualizar,
  eliminar
};
