import prisma from "../../config/prismaClient.js";
import cuotaPrestamoService from "./cuotaPrestamo.service.js";

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

    // 1. Actualizar estados de cuotas vencidas
    const cuotasActualizadas = await prisma.cuotaPrestamo.updateMany({
      where: {
        fechaVencimiento: { lt: hoy },
        estadoPago: "PENDIENTE",
      },
      data: {
        estadoPago: "VENCIDO",
      },
    });

    // 2. Obtener préstamos afectados
    const cuotasVencidas = await prisma.cuotaPrestamo.findMany({
      where: {
        fechaVencimiento: { lt: hoy },
        estadoPago: "VENCIDO",
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

    // 4. Actualizar estados de préstamos según cuotas vencidas
    await actualizarEstadosPrestamos(prestamosAfectados);

    return {
      success: true,
      cuotasActualizadas: cuotasActualizadas.count,
      prestamosAfectados: prestamosAfectados.length,
      fechaEjecucion: new Date(),
    };
  } catch (error) {
    console.error("[TAREA AUTOMÁTICA] Error al procesar cuotas vencidas:", error);
    throw error;
  }
}

/**
 * Actualiza el estado de los préstamos según sus cuotas vencidas
 * Estados:
 * - 81: VIGENTE (sin cuotas vencidas)
 * - 82: PAGADO (todas las cuotas pagadas)
 * - 83: VENCIDO (tiene cuotas vencidas)
 */
async function actualizarEstadosPrestamos(prestamosIds) {
  for (const prestamoBancarioId of prestamosIds) {
    const cuotas = await prisma.cuotaPrestamo.findMany({
      where: { prestamoBancarioId },
    });

    const cuotasPendientes = cuotas.filter(
      (c) => c.estadoPago === "PENDIENTE" || c.estadoPago === "VENCIDO" || c.estadoPago === "PARCIAL"
    );

    const cuotasVencidas = cuotas.filter((c) => c.estadoPago === "VENCIDO");

    let nuevoEstadoId;
    if (cuotasPendientes.length === 0) {
      // Todas las cuotas pagadas
      nuevoEstadoId = BigInt(82); // PAGADO
    } else if (cuotasVencidas.length > 0) {
      // Tiene cuotas vencidas
      nuevoEstadoId = BigInt(83); // VENCIDO
    } else {
      // Sin cuotas vencidas
      nuevoEstadoId = BigInt(81); // VIGENTE
    }

    await prisma.prestamoBancario.update({
      where: { id: prestamoBancarioId },
      data: { estadoId: nuevoEstadoId },
    });
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
    console.error("[TESORERÍA] Error en tareas automáticas:", error);
    throw error;
  }
}

export default {
  procesarCuotasVencidas,
  ejecutarTareasAutomaticas,
};
