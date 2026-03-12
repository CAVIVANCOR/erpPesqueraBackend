import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio para gestión de Comisiones de Fidelización
 * Genera comisiones basadas en descargas de temporada y configuración por cliente
 */

/**
 * Genera comisiones de fidelización para una temporada
 * Elimina comisiones previas, valida configuración de clientes y genera nuevas comisiones
 * @param {BigInt} temporadaPescaId - ID de la temporada de pesca
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Object} Resultado con estadísticas de generación
 */
const generarComisionesPorTemporada = async (temporadaPescaId, usuarioId) => {
  try {
    // 1. Validar que la temporada existe
    const temporada = await prisma.temporadaPesca.findUnique({
      where: { id: temporadaPescaId }
    });
    
    if (!temporada) {
      throw new NotFoundError('Temporada de pesca no encontrada');
    }

    // 2. Eliminar comisiones previas de esta temporada
    const comisionesEliminadas = await prisma.comisionFidelizacion.deleteMany({
      where: { temporadaPescaId }
    });

    // 3. Obtener todas las descargas de la temporada agrupadas por cliente
    const descargas = await prisma.descargaFaenaPesca.findMany({
      where: {
        faenaPesca: {
          temporadaId: temporadaPescaId
        }
      },
      include: {
        cliente: {
          select: {
            id: true,
            razonSocial: true
          }
        }
      }
    });

    // 4. Agrupar descargas por cliente y calcular totales
    const descargasPorCliente = {};
    
    descargas.forEach(descarga => {
      if (!descarga.clienteId) return; // Saltar descargas sin cliente
      
      const clienteId = descarga.clienteId.toString();
      
      if (!descargasPorCliente[clienteId]) {
        descargasPorCliente[clienteId] = {
          clienteId: descarga.clienteId,
          razonSocial: descarga.cliente?.razonSocial || 'Sin nombre',
          toneladasTotales: 0,
          precioPorTonComisionFidelizacion: descarga.precioPorTonComisionFidelizacion || 0
        };
      }
      
            // Sumar toneladas directamente del campo toneladas
      const toneladasDescarga = Number(descarga.toneladas || 0);
      
      descargasPorCliente[clienteId].toneladasTotales += toneladasDescarga;
    });

    // 5. Generar comisiones para cada cliente
    const comisionesGeneradas = [];
    const clientesSinConfiguracion = [];
    const clientesSinComision = [];

    for (const clienteData of Object.values(descargasPorCliente)) {
      const { clienteId, razonSocial, toneladasTotales, precioPorTonComisionFidelizacion } = clienteData;
      
      // Si el precio es 0, el cliente no da comisión
      if (Number(precioPorTonComisionFidelizacion) === 0) {
        clientesSinComision.push(razonSocial);
        continue;
      }

      // Obtener configuración de comisiones para este cliente
      const detallesComision = await prisma.detComisionFidelizacionEntidad.findMany({
        where: {
          entidadComercialFidelizacionId: clienteId,
          personal: {
            cesado: false // Solo personal activo
          }
        },
        include: {
          personal: {
            select: {
              id: true,
              nombres: true,
              apellidos: true
            }
          }
        }
      });

      // Si no hay configuración, registrar el cliente
      if (detallesComision.length === 0) {
        clientesSinConfiguracion.push(razonSocial);
        continue;
      }

      // Generar comisión para cada personal configurado
      for (const detalle of detallesComision) {
        const montoPagar = Number(toneladasTotales) * Number(detalle.precioPorTonelada);
        
        const comision = await prisma.comisionFidelizacion.create({
          data: {
            temporadaPescaId,
            entidadComercialId: clienteId,
            personalId: detalle.personalId,
            precioPorTonComisionFidelizacion: detalle.precioPorTonelada,
            toneladasCapturadas: toneladasTotales,
            montoPagarFidelizacionDolares: montoPagar
          }
        });
        
        comisionesGeneradas.push(comision);
      }
    }

    // 6. Retornar resultado con estadísticas
    return {
      exito: true,
      comisionesEliminadas: comisionesEliminadas.count,
      comisionesGeneradas: comisionesGeneradas.length,
      clientesProcesados: Object.keys(descargasPorCliente).length,
      clientesSinConfiguracion,
      clientesSinComision,
      advertencias: clientesSinConfiguracion.length > 0 || clientesSinComision.length > 0
    };

  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar comisiones', err.message);
    }
    throw err;
  }
};

/**
 * Obtener comisiones generadas de una temporada
 * @param {BigInt} temporadaPescaId - ID de la temporada de pesca
 * @returns {Array} Lista de comisiones con información relacionada
 */
const obtenerComisionesPorTemporada = async (temporadaPescaId) => {
  try {
    const comisiones = await prisma.comisionFidelizacion.findMany({
      where: { temporadaPescaId },
      include: {
        entidadComercial: {
          select: {
            id: true,
            razonSocial: true
          }
        },
        personal: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      },
      orderBy: [
        { entidadComercialId: 'asc' },
        { personalId: 'asc' }
      ]
    });

    return comisiones;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener comisiones', err.message);
    }
    throw err;
  }
};

export default {
  generarComisionesPorTemporada,
  obtenerComisionesPorTemporada
};