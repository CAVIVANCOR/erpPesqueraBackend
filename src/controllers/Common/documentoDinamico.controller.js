import documentoDinamicoService from '../../services/Common/documentoDinamico.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DocumentoDinamico
 * Documentado en español.
 */

export async function obtenerDocumentos(req, res, next) {
  try {
    const { modeloNombre } = req.params;
    
    const documentos = await documentoDinamicoService.obtenerDocumentosPorModelo(modeloNombre);
    
    res.json(toJSONBigInt(documentos));
  } catch (err) {
    next(err);
  }
}