import prisma from '../../config/prismaClient.js';
import { ValidationError } from '../../utils/errors.js';

/**
 * Servicio simplificado para finalizar una faena de pesca
 * 
 * Este servicio SOLO actualiza el estado de la faena a FINALIZADA.
 * Los movimientos de almacén ahora se generan desde cada descarga individual
 * mediante el botón "Finalizar Descarga" en el componente DescargaFaenaPescaForm.
 * 
 * @param {BigInt} faenaPescaId - ID de la faena de pesca
 * @returns {Promise<Object>} Faena actualizada
 */
const finalizarFaena = async (faenaPescaId) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // Validar que la faena existe
      const faena = await tx.faenaPesca.findUnique({
        where: { id: faenaPescaId },
        include: {
          embarcacion: true
        }
      });

      if (!faena) {
        throw new ValidationError('Faena de pesca no encontrada');
      }

      // Validar que la faena está en estado EN ZARPE (18)
      if (Number(faena.estadoFaenaId) !== 18) {
        throw new ValidationError('Solo se pueden finalizar faenas en estado EN ZARPE');
      }

      // Actualizar estado de la faena a FINALIZADA (19)
      const faenaActualizada = await tx.faenaPesca.update({
        where: { id: faenaPescaId },
        data: {
          estadoFaenaId: BigInt(19), // FINALIZADA
          updatedAt: new Date()
        },
        include: {
          embarcacion: true
        }
      });

      return {
        faena: faenaActualizada,
        mensaje: 'Faena finalizada exitosamente. Los movimientos de almacén se generarán desde cada descarga individual.'
      };

    } catch (error) {
      console.error('❌ Error en finalizarFaena:', error);
      throw error;
    }
  });
};

export default {
  finalizarFaena
};
