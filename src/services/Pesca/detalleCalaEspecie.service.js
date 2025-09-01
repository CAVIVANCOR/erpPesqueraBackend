import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleCalaEspecie
 * Valida existencia de claves foráneas y (opcional) unicidad por calaId-especieId.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cala, especie] = await Promise.all([
    prisma.cala.findUnique({ where: { id: data.calaId } }),
    prisma.especie.findUnique({ where: { id: data.especieId } })
  ]);
  if (!cala) throw new ValidationError('El calaId no existe.');
  if (!especie) throw new ValidationError('El especieId no existe.');
}

async function validarUnicidad(calaId, especieId, id = null) {
  const where = id ? { calaId, especieId, NOT: { id } } : { calaId, especieId };
  const existe = await prisma.detalleCalaEspecie.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un registro para esa cala y especie.');
}

/**
 * Actualiza el campo toneladasCapturadas de una Cala
 * sumando todas las toneladas de sus DetalleCalaEspecie
 */
async function actualizarToneladasCala(calaId) {
  try {
    const totalToneladas = await prisma.detalleCalaEspecie.aggregate({
      where: { calaId },
      _sum: { toneladas: true }
    });

    const calaActualizada = await prisma.cala.update({
      where: { id: calaId },
      data: {
        toneladasCapturadas: totalToneladas._sum.toneladas || 0,
        updatedAt: new Date()
      }
    });

    // Actualizar también las toneladas de la faena
    await actualizarToneladasFaena(calaActualizada.faenaPescaId);
  } catch (error) {
    console.error('Error actualizando toneladas de cala:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Actualiza el campo toneladasCapturadasFaena de una FaenaPesca
 * sumando todas las toneladasCapturadas de sus Calas
 */
async function actualizarToneladasFaena(faenaPescaId) {
  try {
    const totalToneladas = await prisma.cala.aggregate({
      where: { faenaPescaId },
      _sum: { toneladasCapturadas: true }
    });

    const faenaActualizada = await prisma.faenaPesca.update({
      where: { id: faenaPescaId },
      data: {
        toneladasCapturadasFaena: totalToneladas._sum.toneladasCapturadas || 0,
        updatedAt: new Date()
      }
    });

    // Actualizar también las toneladas de la temporada
    await actualizarToneladasTemporada(faenaActualizada.temporadaId);
  } catch (error) {
    console.error('Error actualizando toneladas de faena:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Actualiza el campo toneladasCapturadasTemporada de una TemporadaPesca
 * sumando todas las toneladasCapturadasFaena de sus FaenasPesca
 */
async function actualizarToneladasTemporada(temporadaId) {
  try {
    const totalToneladas = await prisma.faenaPesca.aggregate({
      where: { temporadaId },
      _sum: { toneladasCapturadasFaena: true }
    });

    await prisma.temporadaPesca.update({
      where: { id: temporadaId },
      data: {
        toneladasCapturadasTemporada: totalToneladas._sum.toneladasCapturadasFaena || 0,
        fechaActualizacion: new Date()
      }
    });
  } catch (error) {
    console.error('Error actualizando toneladas de temporada:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

const listar = async () => {
  try {
    return await prisma.detalleCalaEspecie.findMany({
      include: {
        cala: true,
        especie: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleCalaEspecie.findUnique({ 
      where: { id },
      include: {
        cala: true,
        especie: true
      }
    });
    if (!detalle) throw new NotFoundError('DetalleCalaEspecie no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorCala = async (calaId) => {
  try {
    return await prisma.detalleCalaEspecie.findMany({
      where: { calaId },
      include: {
        cala: true,
        especie: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.calaId || !data.especieId) {
      throw new ValidationError('Los campos calaId y especieId son obligatorios.');
    }
    await validarClavesForaneas(data);
    await validarUnicidad(data.calaId, data.especieId);
    
    // Agregar updatedAt requerido por Prisma
    const dataConUpdatedAt = {
      ...data,
      updatedAt: new Date()
    };
    
    const creado = await prisma.detalleCalaEspecie.create({ data: dataConUpdatedAt });
    await actualizarToneladasCala(data.calaId);
    return creado;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detalleCalaEspecie.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleCalaEspecie no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['calaId','especieId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      await validarUnicidad(
        data.calaId || existente.calaId,
        data.especieId || existente.especieId,
        id
      );
    }
    const actualizado = await prisma.detalleCalaEspecie.update({ where: { id }, data });
    await actualizarToneladasCala(actualizado.calaId);
    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleCalaEspecie.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleCalaEspecie no encontrado');
    await prisma.detalleCalaEspecie.delete({ where: { id } });
    await actualizarToneladasCala(existente.calaId);
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorCala,
  crear,
  actualizar,
  eliminar
};
