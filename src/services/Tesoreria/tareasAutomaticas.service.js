import cuotaPrestamoService from "./cuotaPrestamo.service.js";

/**
 * Servicio de tareas automáticas para Tesorería
 * Ejecuta procesos programados diariamente
 */

/**
 * Actualiza los estados de las cuotas vencidas y recalcula, desde los pagos registrados, los
 * totales de las cuotas, los saldos y el estado de los préstamos. Es la misma función que usan
 * el botón de la lista de préstamos y la edición de un préstamo.
 * Debe ejecutarse diariamente (recomendado: 00:05 AM)
 */
export async function procesarCuotasVencidas() {
  try {
    const { cuotasActualizadas, prestamosRevisados, prestamosEstadoActualizado } =
      await cuotaPrestamoService.sincronizarEstados();

    return {
      success: true,
      cuotasActualizadas,
      prestamosRevisados,
      prestamosEstadoActualizado,
      fechaEjecucion: new Date(),
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Ejecuta todas las tareas automáticas de Tesorería
 * Punto de entrada principal para el CRON job
 */
export async function ejecutarTareasAutomaticas() {
  const resultados = {
    fechaEjecucion: new Date(),
    tareas: [],
  };
  try {
    // Tarea 1: Procesar cuotas vencidas
    const resultadoCuotas = await procesarCuotasVencidas();
    resultados.tareas.push({
      nombre: "Actualización de cuotas vencidas",
      resultado: resultadoCuotas,
    });

    // Aquí se pueden agregar más tareas automáticas en el futuro:
    // - Calcular intereses devengados
    // - Enviar notificaciones de vencimiento
    // - Generar reportes automáticos
    // - etc.

    return resultados;
  } catch (error) {
    throw error;
  }
}

export default {
  procesarCuotasVencidas,
  ejecutarTareasAutomaticas,
};
