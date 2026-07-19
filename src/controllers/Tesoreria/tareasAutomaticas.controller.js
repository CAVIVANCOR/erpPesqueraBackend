import tareasAutomaticasService from "../../services/Tesoreria/tareasAutomaticas.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

/**
 * Ejecuta el proceso de actualización de cuotas vencidas
 * Endpoint manual para ejecutar la tarea bajo demanda
 */
export async function procesarCuotasVencidas(req, res, next) {
  try {
    const resultado = await tareasAutomaticasService.procesarCuotasVencidas();
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Ejecuta todas las tareas automáticas de Tesorería
 * Endpoint manual para ejecutar todas las tareas bajo demanda
 */
export async function ejecutarTareasAutomaticas(req, res, next) {
  try {
    const resultado = await tareasAutomaticasService.ejecutarTareasAutomaticas();
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
