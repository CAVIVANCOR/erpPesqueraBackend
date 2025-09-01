import prisma from '../../config/prismaClient.js';

/**
 * Servicio para recalcular toneladas capturadas por registro específico
 * Cada función calcula la sumatoria para UN registro en particular
 */

/**
 * SUMATORIA 1: Recalcula Cala.toneladasCapturadas para una cala específica
 * Suma DetalleCalaEspecie.toneladas WHERE calaId = calaId específico
 * @param {BigInt} calaId - ID de la cala a recalcular
 * @param {BigInt} faenaPescaId - ID de la faena para recalcular en cascada
 * @param {BigInt} TemporadaPescaId - ID de la temporada para recalcular en cascada
 */
async function recalcularToneladasCala(calaId, faenaPescaId, TemporadaPescaId) {
  // Obtener todos los detalles de especies de esta cala específica
  const especiesCala = await prisma.detalleCalaEspecie.findMany({
    where: {
      calaId: BigInt(calaId)
    }
  });
  // Sumar las toneladas de todas las especies de esta cala
  let toneladasCalculadas = 0;
  especiesCala.forEach((especie, index) => {
    const toneladas = parseFloat(especie.toneladas) || 0;
    toneladasCalculadas += toneladas;
  });
  // Actualizar el campo toneladasCapturadas de la cala
  await prisma.cala.update({
    where: { id: BigInt(calaId) },
    data: { 
      toneladasCapturadas: toneladasCalculadas,
      updatedAt: new Date()
    }
  });

  await recalcularToneladasFaena(faenaPescaId);
  await recalcularToneladasTemporada(TemporadaPescaId);

  return toneladasCalculadas;
}

/**
 * SUMATORIA 2: Recalcula FaenaPesca.toneladasCapturadasFaena para una faena específica
 * Suma Cala.toneladasCapturadas WHERE faenaPescaId = faenaId específico
 * @param {BigInt} faenaId - ID de la faena a recalcular
 */
async function recalcularToneladasFaena(faenaId) {  
  // Obtener todas las calas de esta faena específica
  const calasFaena = await prisma.cala.findMany({
    where: {
      faenaPescaId: BigInt(faenaId)
    }
  });
  // Sumar las toneladas capturadas de todas las calas de esta faena
  let toneladasCalculadas = 0;
  calasFaena.forEach((cala, index) => {
    const toneladas = parseFloat(cala.toneladasCapturadas) || 0;
    toneladasCalculadas += toneladas;
  });
  // Actualizar el campo toneladasCapturadasFaena de la faena
  await prisma.faenaPesca.update({
    where: { id: BigInt(faenaId) },
    data: {
      toneladasCapturadasFaena: toneladasCalculadas,
      updatedAt: new Date()
    }
  });

  return toneladasCalculadas;
}

/**
 * SUMATORIA 3: Recalcula TemporadaPesca.toneladasCapturadasTemporada para una temporada específica
 * Suma FaenaPesca.toneladasCapturadasFaena WHERE temporadaId = temporadaId específico
 * @param {BigInt} temporadaId - ID de la temporada a recalcular
 */
async function recalcularToneladasTemporada(temporadaId) {
  
  // Obtener todas las faenas de esta temporada específica
  const faenasTemporada = await prisma.faenaPesca.findMany({
    where: {
      temporadaId: BigInt(temporadaId)
    }
  });
  // Sumar las toneladas capturadas de todas las faenas de esta temporada
  let toneladasCalculadas = 0;
  faenasTemporada.forEach((faena, index) => {
    const toneladas = parseFloat(faena.toneladasCapturadasFaena) || 0;
    toneladasCalculadas += toneladas;
  });
  // Actualizar el campo toneladasCapturadasTemporada de la temporada
  await prisma.temporadaPesca.update({
    where: { id: BigInt(temporadaId) },
    data: {
      toneladasCapturadasTemporada: toneladasCalculadas,
      fechaActualizacion: new Date()
    }
  });
  return toneladasCalculadas;
}

/**
 * FUNCIÓN EN CASCADA: Recalcula desde una cala hacia arriba en la jerarquía
 * Útil cuando se modifica DetalleCalaEspecie
 * @param {BigInt} calaId - ID de la cala que cambió
 */
async function recalcularCascadaDesdeCala(calaId) {
  try {
    // 1. Recalcular la cala
    await recalcularToneladasCala(calaId);

    // 2. Obtener la faena de esta cala y recalcularla
    const cala = await prisma.cala.findUnique({
      where: { id: BigInt(calaId) },
      select: { faenaPescaId: true, temporadaPescaId: true }
    });

    if (cala?.faenaPescaId) {
      await recalcularToneladasFaena(cala.faenaPescaId);

      // 3. Obtener la temporada de esta faena y recalcularla
      const faena = await prisma.faenaPesca.findUnique({
        where: { id: cala.faenaPescaId },
        select: { temporadaId: true }
      });

      if (faena?.temporadaId) {
        await recalcularToneladasTemporada(faena.temporadaId);
      }
    }

    return { success: true };

  } catch (error) {
    console.error(`❌ Error en recálculo cascada desde Cala ${calaId}:`, error);
    throw error;
  }
}

/**
 * FUNCIÓN EN CASCADA: Recalcula desde una faena hacia arriba en la jerarquía
 * Útil cuando se modifica Cala
 * @param {BigInt} faenaId - ID de la faena que cambió
 */
async function recalcularCascadaDesdeFaena(faenaId) {
  try {

    // 1. Recalcular la faena
    await recalcularToneladasFaena(faenaId);

    // 2. Obtener la temporada de esta faena y recalcularla
    const faena = await prisma.faenaPesca.findUnique({
      where: { id: BigInt(faenaId) },
      select: { temporadaId: true }
    });

    if (faena?.temporadaId) {
      await recalcularToneladasTemporada(faena.temporadaId);
    }
    return { success: true };

  } catch (error) {
    console.error(`❌ Error en recálculo cascada desde Faena ${faenaId}:`, error);
    throw error;
  }
}

export default {
  // Funciones individuales por registro
  recalcularToneladasCala,
  recalcularToneladasFaena,
  recalcularToneladasTemporada,
  
  // Funciones en cascada
  recalcularCascadaDesdeCala,
  recalcularCascadaDesdeFaena
};
