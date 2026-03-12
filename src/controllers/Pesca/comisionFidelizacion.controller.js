import comisionFidelizacionService from '../../services/Pesca/comisionFidelizacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Comisiones de Fidelización
 * Gestiona la generación y consulta de comisiones por temporada
 */

/**
 * Generar comisiones de fidelización para una temporada
 * Elimina comisiones previas y genera nuevas basadas en descargas
 * @param {Object} req.params.temporadaId - ID de la temporada de pesca
 * @param {Object} req.user.personalId - ID del usuario logueado
 */
export async function generarComisiones(req, res, next) {
  try {
    const temporadaId = BigInt(req.params.temporadaId);
    const usuarioId = req.user?.personalId ? BigInt(req.user.personalId) : null;

    if (!temporadaId) {
      return res.status(400).json({
        error: 'El ID de la temporada es requerido'
      });
    }

    const resultado = await comisionFidelizacionService.generarComisionesPorTemporada(
      temporadaId,
      usuarioId
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    console.error('Error en generarComisiones controller:', err);
    next(err);
  }
}

/**
 * Obtener comisiones generadas de una temporada
 * @param {Object} req.params.temporadaId - ID de la temporada de pesca
 */
export async function obtenerComisionesPorTemporada(req, res, next) {
  try {
    const temporadaId = BigInt(req.params.temporadaId);

    if (!temporadaId) {
      return res.status(400).json({
        error: 'El ID de la temporada es requerido'
      });
    }

    const comisiones = await comisionFidelizacionService.obtenerComisionesPorTemporada(temporadaId);

    res.json(toJSONBigInt(comisiones));
  } catch (err) {
    console.error('Error en obtenerComisionesPorTemporada controller:', err);
    next(err);
  }
}