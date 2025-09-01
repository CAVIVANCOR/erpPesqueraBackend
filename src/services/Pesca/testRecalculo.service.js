import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Servicio de prueba para verificar que los cálculos de toneladas funcionan correctamente
 */

/**
 * Verifica los datos de una cala específica y sus especies
 */
async function verificarDatosCala(calaId) {  
  const cala = await prisma.cala.findUnique({
    where: { id: BigInt(calaId) },
    include: {
      especiesPescadas: true,
      faenaPesca: true
    }
  });

  if (!cala) {
    return null;
  }
  let sumaCalculada = 0;
  cala.especiesPescadas.forEach((especie, index) => {
    const toneladas = parseFloat(especie.toneladas) || 0;
    sumaCalculada += toneladas;
  });
  return {
    cala,
    sumaCalculada,
    diferencia: parseFloat(cala.toneladasCapturadas || 0) - sumaCalculada
  };
}

/**
 * Verifica los datos de una faena específica y sus calas
 */
async function verificarDatosFaena(faenaId) {  
  const faena = await prisma.faenaPesca.findUnique({
    where: { id: BigInt(faenaId) },
    include: {
      calas: true,
      temporada: true
    }
  });

  if (!faena) {
    return null;
  }
  let sumaCalculada = 0;
  faena.calas.forEach((cala, index) => {
    const toneladas = parseFloat(cala.toneladasCapturadas) || 0;
    sumaCalculada += toneladas;
  });

  return {
    faena,
    sumaCalculada,
    diferencia: parseFloat(faena.toneladasCapturadasFaena || 0) - sumaCalculada
  };
}

/**
 * Obtiene una muestra de datos para probar
 */
async function obtenerMuestraDatos() {
  
  // Obtener una cala con especies
  const calaConEspecies = await prisma.cala.findFirst({
    include: {
      especiesPescadas: true,
      faenaPesca: {
        include: {
          temporada: true
        }
      }
    },
    where: {
      especiesPescadas: {
        some: {}
      }
    }
  });

  if (!calaConEspecies) {
    return null;
  }

  return calaConEspecies;
}

/**
 * Ejecuta una verificación completa de los cálculos
 */
async function verificarCalculosCompletos() {
  try {
    const muestra = await obtenerMuestraDatos();
    if (!muestra) {
      return { success: false, message: 'No hay datos para verificar' };
    }
    const resultadoCala = await verificarDatosCala(muestra.id);
    const resultadoFaena = await verificarDatosFaena(muestra.faenaPescaId);
    return {
      success: true,
      cala: resultadoCala,
      faena: resultadoFaena
    };

  } catch (error) {
    console.error('❌ ERROR EN VERIFICACIÓN:', error);
    throw error;
  }
}

export default {
  verificarCalculosCompletos,
  verificarDatosCala,
  verificarDatosFaena,
  obtenerMuestraDatos
};
