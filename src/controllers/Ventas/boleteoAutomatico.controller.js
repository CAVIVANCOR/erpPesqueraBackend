import boleteoAutomaticoService from '../../services/Ventas/boleteoAutomatico.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para el Boleteo Automático (creación masiva de PreFactura desde boletas ya emitidas)
 * Documentado en español.
 */
export async function importarBoletas(req, res, next) {
  try {
    const resultado = await boleteoAutomaticoService.importarBoletas({
      boletas: req.body.boletas,
      parametros: req.body.parametros,
      usuarioId: req.user?.id || null,
    });
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
