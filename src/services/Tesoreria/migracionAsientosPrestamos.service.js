import prisma from '../../config/prismaClient.js';
import integracionContablePrestamo from './integracionContablePrestamo.service.js';

/**
 * Servicio de migración para generar asientos contables retroactivos
 * para préstamos existentes que no tienen asientos.
 */

/**
 * Migra asientos contables para préstamos sin asiento
 * @param {BigInt} empresaId - ID de la empresa (opcional, si no se envía migra todas)
 * @param {BigInt} creadoPor - ID del usuario que ejecuta la migración
 * @returns {Promise<Object>} - Resultado de la migración
 */
async function migrarAsientosPrestamos(empresaId = null, creadoPor = null) {
  try {
    // Obtener préstamos sin asiento contable
    const whereClause = {
      asientoContableId: null
    };
    
    if (empresaId) {
      whereClause.empresaId = empresaId;
    }

    const prestamos = await prisma.prestamoBancario.findMany({
      where: whereClause,
      include: {
        banco: true,
        moneda: true,
        empresa: true
      },
      orderBy: { fechaDesembolso: 'asc' }
    });
    const resultados = {
      total: prestamos.length,
      exitosos: 0,
      fallidos: 0,
      errores: []
    };

    // Procesar cada préstamo
    for (const prestamo of prestamos) {
      try {
        await prisma.$transaction(async (tx) => {
          await integracionContablePrestamo.generarAsientoPrestamoNuevo(
            prestamo,
            tx,
            creadoPor
          );
        });
        resultados.exitosos++;
      } catch (err) {
        resultados.fallidos++;
        resultados.errores.push({
          prestamoId: prestamo.id,
          numeroPrestamo: prestamo.numeroPrestamo,
          error: err.message
        });
        console.error(`❌ Error en préstamo ${prestamo.numeroPrestamo}:`, err.message);
      }
    }

    return resultados;
  } catch (err) {
    console.error('Error en migración de asientos de préstamos:', err);
    throw err;
  }
}

/**
 * Obtiene reporte de préstamos sin asientos
 * @param {BigInt} empresaId - ID de la empresa (opcional)
 * @returns {Promise<Array>} - Lista de préstamos sin asientos
 */
async function obtenerPrestamosSinAsientos(empresaId = null) {
  try {
    const whereClause = {
      asientoContableId: null
    };
    
    if (empresaId) {
      whereClause.empresaId = empresaId;
    }

    return await prisma.prestamoBancario.findMany({
      where: whereClause,
      select: {
        id: true,
        numeroPrestamo: true,
        fechaDesembolso: true,
        montoDesembolsado: true,
        empresaId: true,
        empresa: {
          select: {
            id: true,
            razonSocial: true
          }
        },
        banco: {
          select: {
            id: true,
            nombre: true
          }
        },
        moneda: {
          select: {
            id: true,
            codigo: true
          }
        }
      },
      orderBy: { fechaDesembolso: 'asc' }
    });
  } catch (err) {
    console.error('Error al obtener préstamos sin asientos:', err);
    throw err;
  }
}

export default {
  migrarAsientosPrestamos,
  obtenerPrestamosSinAsientos
};
