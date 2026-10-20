import prisma from "../../config/prismaClient.js";
import { DatabaseError } from "../../utils/errors.js";
import { DIAS_HABILES_PROTESTO } from "../../utils/letrasCambio.constants.js";
import { obtenerEstadosLetra, formatearFecha } from "./letraCambioBase.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PROCESO DIARIO DE LETRAS DE CAMBIO: VENCIMIENTO Y PROTESTO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Para las letras con capital pendiente:
 *   - Pasan a VENCIDA al día siguiente de su fecha de vencimiento.
 *   - Pasan a PROTESTADA cuando se supera la fecha límite de protesto (vencimiento + 7 días hábiles,
 *     lunes a viernes): se marca protestada = true con fecha y motivo.
 * Es idempotente: se puede ejecutar varias veces el mismo día.
 */
export async function actualizarVencimientosYProtestos(hoy = new Date(), db = prisma) {
  try {
    const inicioHoy = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    const estados = await obtenerEstadosLetra(db);

    const candidatas = await db.letraCambio.findMany({
      where: {
        saldoCapital: { gt: 0 },
        protestada: false,
        estadoId: { in: [estados.VIGENTE, estados.PAGADA_PARCIAL, estados.VENCIDA] },
        fechaVencimiento: { lt: inicioHoy },
      },
      select: { id: true, estadoId: true, fechaVencimiento: true, fechaLimiteProtesto: true },
    });

    let vencidas = 0;
    let protestadas = 0;
    for (const l of candidatas) {
      if (l.fechaLimiteProtesto && l.fechaLimiteProtesto < inicioHoy) {
        await db.letraCambio.update({
          where: { id: l.id },
          data: {
            estadoId: estados.PROTESTADA,
            protestada: true,
            fechaProtesto: l.fechaLimiteProtesto,
            motivoProtesto: `Falta de pago: protesto automático a los ${DIAS_HABILES_PROTESTO} días hábiles del vencimiento (${formatearFecha(l.fechaVencimiento)}).`,
          },
        });
        protestadas++;
      } else if (Number(l.estadoId) !== Number(estados.VENCIDA)) {
        await db.letraCambio.update({ where: { id: l.id }, data: { estadoId: estados.VENCIDA } });
        vencidas++;
      }
    }
    return { revisadas: candidatas.length, vencidas, protestadas };
  } catch (err) {
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al actualizar vencimientos y protestos de letras", err.message);
    throw err;
  }
}

export default { actualizarVencimientosYProtestos };
