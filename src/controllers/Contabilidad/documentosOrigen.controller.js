import documentosOrigenService from '../../services/Contabilidad/documentosOrigen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DocumentosOrigen
 * Obtiene documentos origen polimórficos para asientos contables
 * Documentado en español.
 */
/**
 * Obtiene documentos origen según el modelo especificado
 */
export async function obtenerPorModelo(req, res, next) {
  try {
    const { nombreModelo } = req.params;
    const { entidadComercialId, empresaId } = req.query;
    const registros = await documentosOrigenService.obtenerPorModelo(
      nombreModelo,
      entidadComercialId,
      empresaId
    );
    res.json(toJSONBigInt(registros));
  } catch (err) {
    console.error('❌ [CONTROLLER] Error:', err.message);
    next(err);
  }
}