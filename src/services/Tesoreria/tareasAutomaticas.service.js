import prisma from "../../config/prismaClient.js";
import cuotaPrestamoService from "./cuotaPrestamo.service.js";
import { ESTADO_CUOTA_PRESTAMO } from "../../utils/estados.constants.js";

/**
 * Servicio de tareas automáticas para Tesorería
 * Ejecuta procesos programados diariamente
 */

/**
 * Actualiza estados de cuotas vencidas y recalcula saldos de préstamos
 * Debe ejecutarse diariamente (recomendado: 00:05 AM)
 */
export async function procesarCuotasVencidas() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 1. Estados de cuotas y de préstamos: misma lógica que usa la edición de un préstamo
    const { cuotasActualizadas, prestamosEstadoActualizado } =
      await cuotaPrestamoService.sincronizarEstados();

    // 2. Obtener préstamos afectados
    const cuotasVencidas = await prisma.cuotaPrestamo.findMany({
      where: {
        fechaVencimiento: { lt: hoy },
        estadoCuotaId: ESTADO_CUOTA_PRESTAMO.VENCIDO,
      },
      select: {
        prestamoBancarioId: true,
      },
      distinct: ["prestamoBancarioId"],
    });

    // 3. Recalcular saldos de cada préstamo afectado
    const prestamosAfectados = [...new Set(cuotasVencidas.map(c => c.prestamoBancarioId))];

    for (const prestamoBancarioId of prestamosAfectados) {
      await cuotaPrestamoService.actualizarSaldosPrestamo(prestamoBancarioId);
    }

    return {
      success: true,
      cuotasActualizadas,
      prestamosAfectados: prestamosAfectados.length,
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
