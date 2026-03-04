import prisma from "../../config/prismaClient.js";

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
      calaId: BigInt(calaId),
    },
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
      updatedAt: new Date(),
    },
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
      faenaPescaId: BigInt(faenaId),
    },
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
      updatedAt: new Date(),
    },
  });

  return toneladasCalculadas;
}
/**
 * SUMATORIA 3: Recalcula TemporadaPesca.toneladasCapturadasTemporada para una temporada específica
 * Suma DescargaFaenaPesca.toneladas filtrando por faenaPesca.temporadaId
 * @param {BigInt} temporadaId - ID de la temporada a recalcular
 */
async function recalcularToneladasTemporada(temporadaId) {
  // Obtener todas las descargas de esta temporada a través de la relación con faenaPesca
  const descargasTemporada = await prisma.descargaFaenaPesca.findMany({
    where: {
      faenaPesca: {
        temporadaId: BigInt(temporadaId),
      },
    },
    include: {
      faenaPesca: {
        select: {
          id: true,
          temporadaId: true,
        },
      },
    },
  });

  // Sumar las toneladas de todas las descargas de esta temporada
  let toneladasCalculadas = 0;
  descargasTemporada.forEach((descarga, index) => {
    const toneladas = parseFloat(descarga.toneladas) || 0;
    toneladasCalculadas += toneladas;
  });

  // Actualizar el campo toneladasCapturadasTemporada de la temporada
  await prisma.temporadaPesca.update({
    where: { id: BigInt(temporadaId) },
    data: {
      toneladasCapturadasTemporada: toneladasCalculadas,
      fechaActualizacion: new Date(),
    },
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
      select: { faenaPescaId: true, temporadaPescaId: true },
    });

    if (cala?.faenaPescaId) {
      await recalcularToneladasFaena(cala.faenaPescaId);

      // 3. Obtener la temporada de esta faena y recalcularla
      const faena = await prisma.faenaPesca.findUnique({
        where: { id: cala.faenaPescaId },
        select: { temporadaId: true },
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
      select: { temporadaId: true },
    });

    if (faena?.temporadaId) {
      await recalcularToneladasTemporada(faena.temporadaId);
    }
    return { success: true };
  } catch (error) {
    console.error(
      `❌ Error en recálculo cascada desde Faena ${faenaId}:`,
      error,
    );
    throw error;
  }
}
/**
 * ACTUALIZACIÓN PORCENTAJE JUVENILES: Actualiza DescargaFaenaPesca.porcentajeJuveniles
 * con el promedio de DetalleCalaEspecie.porcentajeJuveniles de todas las calas de la faena
 * @param {BigInt} faenaId - ID de la faena a recalcular
 */
async function actualizarPorcentajeJuvenilesFaena(faenaId) {
  // 1. Obtener todas las calas de esta faena
  const calas = await prisma.cala.findMany({
    where: {
      faenaPescaId: BigInt(faenaId),
    },
    include: {
      especiesPescadas: true, // ⭐ CORRECCIÓN: especiesPescadas en lugar de detalleCalaEspecie
    },
  });

  // 2. Recolectar todos los porcentajes de juveniles de todos los DetalleCalaEspecie
  let porcentajesJuveniles = [];

  calas.forEach((cala) => {
    if (cala.especiesPescadas && cala.especiesPescadas.length > 0) {
      cala.especiesPescadas.forEach((detalle) => {
        if (
          detalle.porcentajeJuveniles !== null &&
          detalle.porcentajeJuveniles !== undefined
        ) {
          porcentajesJuveniles.push(parseFloat(detalle.porcentajeJuveniles));
        }
      });
    }
  });

  // 3. Calcular el promedio
  let promedioJuveniles = null;

  if (porcentajesJuveniles.length > 0) {
    const suma = porcentajesJuveniles.reduce(
      (total, valor) => total + valor,
      0,
    );
    promedioJuveniles = suma / porcentajesJuveniles.length;
  }

  // 4. Actualizar TODAS las DescargaFaenaPesca de esta faena con el promedio calculado
  const descargasActualizadas = await prisma.descargaFaenaPesca.updateMany({
    where: {
      faenaPescaId: BigInt(faenaId),
    },
    data: {
      porcentajeJuveniles: promedioJuveniles,
      actualizadoEn: new Date(),
    },
  });

  return {
    porcentajeJuveniles: promedioJuveniles,
    descargasActualizadas: descargasActualizadas.count,
  };
}

/**
 * ACTUALIZACIÓN MASIVA: Actualiza porcentaje juveniles para todas las faenas de una temporada
 * @param {BigInt} temporadaId - ID de la temporada
 */
async function actualizarPorcentajeJuvenilesTemporada(temporadaId) {
  // Obtener todas las faenas de la temporada
  const faenas = await prisma.faenaPesca.findMany({
    where: {
      temporadaId: BigInt(temporadaId),
    },
    select: {
      id: true,
    },
  });

  // Actualizar cada faena
  const resultados = [];
  for (const faena of faenas) {
    const resultado = await actualizarPorcentajeJuvenilesFaena(faena.id);
    resultados.push(resultado);
  }
  return resultados;
}

export default {
  // Funciones individuales por registro
  recalcularToneladasCala,
  recalcularToneladasFaena,
  recalcularToneladasTemporada,

  // Funciones en cascada
  recalcularCascadaDesdeCala,
  recalcularCascadaDesdeFaena,
  actualizarPorcentajeJuvenilesFaena, // ⭐ NUEVO
  actualizarPorcentajeJuvenilesTemporada, // ⭐ NUEVO
};
