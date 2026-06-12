import atenderAsignacionService from "../../services/Tesoreria/atenderAsignacion.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

/**
 * Atender una asignación (Entrega de Fondos)
 */
export async function atenderAsignacion(req, res, next) {
  try {
    console.log("🔵 [CONTROLLER] Inicio atenderAsignacion");
    console.log("🔵 [CONTROLLER] req.body:", JSON.stringify(req.body, null, 2));
    console.log("🔵 [CONTROLLER] req.user:", req.user);

    const datos = {
      ...req.body,
      usuarioId: req.user?.id || null,
    };

    console.log("🔵 [CONTROLLER] Datos a enviar al service:", JSON.stringify(datos, null, 2));

    const resultado = await atenderAsignacionService.atenderAsignacion(datos);
    
    console.log("✅ [CONTROLLER] Resultado exitoso:", resultado);
    
    res.status(201).json(toJSONBigInt(resultado));
  } catch (error) {
    console.error("❌ [CONTROLLER] Error capturado:", error);
    console.error("❌ [CONTROLLER] Error stack:", error.stack);
    console.error("❌ [CONTROLLER] Error message:", error.message);
    console.error("❌ [CONTROLLER] Error name:", error.name);
    next(error);
  }
}