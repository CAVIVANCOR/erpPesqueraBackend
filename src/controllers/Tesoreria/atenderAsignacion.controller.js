import atenderAsignacionService from "../../services/Tesoreria/atenderAsignacion.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

/**
 * Atender una asignación (Entrega de Fondos)
 */
export async function atenderAsignacion(req, res, next) {
  try {
    const datos = {
      ...req.body,
      usuarioId: req.user?.id || null,
    };

    const resultado = await atenderAsignacionService.atenderAsignacion(datos);    
    res.status(201).json(toJSONBigInt(resultado));
  } catch (error) {

    next(error);
  }
}

/**
 * Guardar la URL del voucher de la operación en la asignación
 */
export async function actualizarUrlComprobante(req, res, next) {
  try {
    const resultado = await atenderAsignacionService.actualizarUrlComprobante(
      req.params.id,
      req.body.urlPdf,
    );
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}
