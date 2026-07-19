import cron from "node-cron";
import tareasAutomaticasService from "../services/Tesoreria/tareasAutomaticas.service.js";

/**
 * Configuración de tareas programadas (CRON Jobs)
 * 
 * Formato CRON: * * * * * *
 *               | | | | | |
 *               | | | | | └─ Día de la semana (0-7, 0 y 7 = Domingo)
 *               | | | | └─── Mes (1-12)
 *               | | | └───── Día del mes (1-31)
 *               | | └─────── Hora (0-23)
 *               | └───────── Minuto (0-59)
 *               └─────────── Segundo (0-59) - opcional
 */

/**
 * Inicializa todas las tareas programadas
 */
export function inicializarCronJobs() {
  console.log("=".repeat(60));
  console.log("[CRON] Inicializando tareas programadas...");
  console.log("=".repeat(60));

  // ========================================
  // TAREA 1: Actualizar cuotas vencidas
  // ========================================
  // Se ejecuta todos los días a las 00:05 AM
  cron.schedule("5 0 * * *", async () => {
    try {
      console.log("\n[CRON] Ejecutando: Actualización de cuotas vencidas");
      await tareasAutomaticasService.procesarCuotasVencidas();
      console.log("[CRON] Tarea completada exitosamente\n");
    } catch (error) {
      console.error("[CRON] Error en tarea de cuotas vencidas:", error);
    }
  }, {
    scheduled: true,
    timezone: "America/Lima" // Ajustar según tu zona horaria
  });

  console.log("✅ Tarea programada: Actualización de cuotas vencidas (Diario 00:05 AM)");

  // ========================================
  // TAREA 2: Tareas automáticas completas
  // ========================================
  // Se ejecuta todos los días a las 01:00 AM
  cron.schedule("0 1 * * *", async () => {
    try {
      console.log("\n[CRON] Ejecutando: Tareas automáticas completas");
      await tareasAutomaticasService.ejecutarTareasAutomaticas();
      console.log("[CRON] Todas las tareas completadas exitosamente\n");
    } catch (error) {
      console.error("[CRON] Error en tareas automáticas:", error);
    }
  }, {
    scheduled: true,
    timezone: "America/Lima"
  });

  console.log("✅ Tarea programada: Tareas automáticas completas (Diario 01:00 AM)");

  // ========================================
  // FUTURAS TAREAS
  // ========================================
  // Aquí se pueden agregar más tareas programadas:
  // - Cálculo de intereses devengados
  // - Envío de notificaciones de vencimiento
  // - Generación de reportes automáticos
  // - Respaldos automáticos
  // - etc.

  console.log("=".repeat(60));
  console.log("[CRON] Tareas programadas inicializadas correctamente");
  console.log("=".repeat(60));
}

export default {
  inicializarCronJobs,
};
