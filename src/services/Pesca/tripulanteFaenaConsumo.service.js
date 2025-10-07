import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TripulanteFaenaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, personal, cargo] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }),
    data.personalId ? prisma.personal.findUnique({ where: { id: data.personalId } }) : true,
    data.cargoId ? prisma.cargo.findUnique({ where: { id: data.cargoId } }) : true
  ]);
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (data.personalId && !personal) throw new ValidationError('El personalId no existe.');
  if (data.cargoId && !cargo) throw new ValidationError('El cargoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.tripulanteFaenaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tripulante = await prisma.tripulanteFaenaConsumo.findUnique({ where: { id } });
    if (!tripulante) throw new NotFoundError('TripulanteFaenaConsumo no encontrado');
    return tripulante;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (typeof data.faenaPescaConsumoId === 'undefined' || data.faenaPescaConsumoId === null) {
      throw new ValidationError('El campo faenaPescaConsumoId es obligatorio.');
    }
    await validarClavesForaneas(data);
    return await prisma.tripulanteFaenaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tripulanteFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TripulanteFaenaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaConsumoId','personalId','cargoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.tripulanteFaenaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tripulanteFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TripulanteFaenaConsumo no encontrado');
    await prisma.tripulanteFaenaConsumo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorFaena = async (faenaPescaConsumoId) => {
  try {
    // Obtener tripulantes de la faena
    const tripulantes = await prisma.tripulanteFaenaConsumo.findMany({
      where: { faenaPescaConsumoId: faenaPescaConsumoId },
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



const regenerarTripulantes = async (faenaPescaConsumoId) => {
  try {
    // 1. Obtener la faena para obtener el empresaId
    const faena = await prisma.faenaPescaConsumo.findUnique({
      where: { id: faenaPescaConsumoId },
      include: {
        novedadPescaConsumo: true
      }
    });

    if (!faena) {
      throw new NotFoundError('FaenaPescaConsumo no encontrada');
    }

    // 2. Filtrar personal según especificaciones
    const personalFiltrado = await prisma.personal.findMany({
      where: {
        empresaId: faena.novedadPescaConsumo.empresaId,
        cesado: false,
        paraPescaConsumo: true,
        cargoId: {
          in: [21, 22, 14] // 21: TRIPULANTE, 22: PATRON, 14: MOTORISTA
        }
      }
    });

    // 3. Obtener tripulantes existentes
    const tripulantesExistentes = await prisma.tripulanteFaenaConsumo.findMany({
      where: { faenaPescaConsumoId: faenaPescaConsumoId }
    });

    let creados = 0;
    let actualizados = 0;

    // 4. Procesar cada personal encontrado
    for (const personal of personalFiltrado) {
      // Buscar si ya existe un tripulante para este personal
      const tripulanteExistente = tripulantesExistentes.find(
        t => t.personalId === personal.id
      );

      if (tripulanteExistente) {
        // Actualizar si existe
        await prisma.tripulanteFaenaConsumo.update({
          where: { id: tripulanteExistente.id },
          data: {
            cargoId: Number(personal.cargoId),
            nombres: personal.nombres,
            apellidos: personal.apellidos,
            updatedAt: new Date()
          }
        });
        actualizados++;
      } else {
        // Crear si no existe
        await prisma.tripulanteFaenaConsumo.create({
          data: {
            faenaPescaConsumoId: Number(faenaPescaConsumoId),
            personalId: Number(personal.id),
            cargoId: Number(personal.cargoId),
            nombres: personal.nombres,
            apellidos: personal.apellidos,
            observaciones: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        creados++;
      }
    }

    return {
      mensaje: 'Tripulantes regenerados correctamente',
      creados,
      actualizados,
      total: creados + actualizados
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
  obtenerPorFaena,
  crear,
  actualizar,
  eliminar,
  regenerarTripulantes
};