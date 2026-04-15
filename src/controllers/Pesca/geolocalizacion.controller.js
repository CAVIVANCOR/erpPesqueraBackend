import geolocalizacionService from '../../services/Pesca/geolocalizacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Geolocalización
 * Analiza coordenadas GPS y obtiene información geográfica completa
 * Documentado en español.
 */

/**
 * Analiza coordenadas GPS y retorna información geográfica completa
 * @route POST /api/pesca/geolocalizacion/analizar
 * @param {Object} req.body.latitud - Latitud del punto (requerido)
 * @param {Object} req.body.longitud - Longitud del punto (requerido)
 * @param {Object} req.body.puertoSalidaId - ID del puerto de salida (opcional)
 */
export async function analizarCoordenadas(req, res, next) {
  try {
    const { latitud, longitud, puertoSalidaId } = req.body;

    // Validar parámetros requeridos
    if (latitud === undefined || latitud === null) {
      return res.status(400).json({
        error: 'El parámetro latitud es requerido'
      });
    }

    if (longitud === undefined || longitud === null) {
      return res.status(400).json({
        error: 'El parámetro longitud es requerido'
      });
    }

    // Convertir a números
    const lat = Number(latitud);
    const lng = Number(longitud);
    const puertoId = puertoSalidaId ? BigInt(puertoSalidaId) : null;

    // Obtener información geográfica completa
    const informacion = await geolocalizacionService.obtenerInformacionGeograficaCompleta(
      lat,
      lng,
      puertoId
    );

    res.json(toJSONBigInt(informacion));
  } catch (err) {
    console.error('Error en analizarCoordenadas controller:', err);
    next(err);
  }
}

/**
 * Obtiene referencia costera para ubicación en alta mar
 * @route POST /api/pesca/geolocalizacion/referencia-costa
 * @param {Object} req.body.latitud - Latitud del punto en el mar (requerido)
 * @param {Object} req.body.longitud - Longitud del punto en el mar (requerido)
 */
export async function obtenerReferenciaCosta(req, res, next) {
  try {
    const { latitud, longitud } = req.body;

    if (latitud === undefined || latitud === null) {
      return res.status(400).json({
        error: 'El parámetro latitud es requerido'
      });
    }

    if (longitud === undefined || longitud === null) {
      return res.status(400).json({
        error: 'El parámetro longitud es requerido'
      });
    }

    const lat = Number(latitud);
    const lng = Number(longitud);

    const referencia = await geolocalizacionService.obtenerReferenciaCosta(lat, lng);

    res.json(toJSONBigInt(referencia));
  } catch (err) {
    console.error('Error en obtenerReferenciaCosta controller:', err);
    next(err);
  }
}