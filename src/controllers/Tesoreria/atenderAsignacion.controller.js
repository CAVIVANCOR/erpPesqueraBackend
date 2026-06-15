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
    console.error("❌ [CONTROLLER] Error capturado:", error);
    console.error("❌ [CONTROLLER] Error stack:", error.stack);
    console.error("❌ [CONTROLLER] Error message:", error.message);
    console.error("❌ [CONTROLLER] Error name:", error.name);
    next(error);
  }
}