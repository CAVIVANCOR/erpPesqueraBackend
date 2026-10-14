import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: REPROCESO DE SALDOS DE CUENTAS CORRIENTES
 * ════════════════════════════════════════════════════════════════════════════
 *
 * El saldo de una cuenta es un libro corrido (como un kardex): cada fila de SaldoCuentaCorriente
 * parte del saldo actual de la fila anterior y suma ingresos y resta egresos.
 *
 * Orden de la cadena: fecha e id. El id desempata filas con la misma fecha (varias filas de una
 * misma operación se guardan con la misma fecha exacta): la de mayor id es la más reciente.
 *
 * El reproceso recorre la cadena completa de cada cuenta y corrige las filas cuyo saldo anterior o
 * saldo actual no coincide. La primera fila conserva su saldo anterior (saldo de apertura).
 * No toca ingresos, egresos, conciliación ni los campos contables (saldoContable / diferencia).
 * Cada cuenta se procesa en su propia transacción y bajo un bloqueo (el mismo que usa la
 * reversión de operaciones) para que no se revierta o reprocese la misma cuenta al mismo tiempo.
 */

const MAXIMO_CUENTAS = 200;
const CLAVE_BLOQUEO_CUENTA = 710100000000n + 1000000000n;

const num = (valor) => Number(valor ?? 0);
const r2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

async function reprocesarCuenta(cuentaCorrienteId, usuarioId) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_CUENTA + cuentaCorrienteId})`;

      const filas = await tx.saldoCuentaCorriente.findMany({
        where: { cuentaCorrienteId },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        select: { id: true, saldoAnterior: true, ingresos: true, egresos: true, saldoActual: true, conciliado: true },
      });

      let corriente = filas.length > 0 ? num(filas[0].saldoAnterior) : 0;
      let filasCorregidas = 0;
      let filasConciliadasCorregidas = 0;

      for (const fila of filas) {
        const anterior = r2(corriente);
        const actual = r2(anterior + num(fila.ingresos) - num(fila.egresos));
        if (r2(fila.saldoAnterior) !== anterior || r2(fila.saldoActual) !== actual) {
          await tx.saldoCuentaCorriente.update({
            where: { id: fila.id },
            data: { saldoAnterior: anterior, saldoActual: actual },
          });
          filasCorregidas++;
          if (fila.conciliado) filasConciliadasCorregidas++;
        }
        corriente = actual;
      }

      const ultima = filas.length > 0 ? filas[filas.length - 1] : null;
      const resultado = {
        cuentaCorrienteId: Number(cuentaCorrienteId),
        filas: filas.length,
        filasCorregidas,
        filasConciliadasCorregidas,
        saldoFinalAntes: ultima ? r2(ultima.saldoActual) : 0,
        saldoFinalDespues: r2(corriente),
      };
      if (filasCorregidas > 0) {
        console.log(
          "[REPROCESO_SALDOS]",
          JSON.stringify({ ...resultado, usuarioId: usuarioId ? Number(usuarioId) : null, fecha: new Date().toISOString() }),
        );
      }
      return resultado;
    },
    { maxWait: 15000, timeout: 120000 },
  );
}

/**
 * Reprocesa la cadena de saldos de las cuentas indicadas.
 * @param {Object} params
 * @param {Array<number|string>} params.cuentaCorrienteIds - cuentas a reprocesar
 * @param {number|null} params.usuarioId - usuario que ejecuta (auditoría)
 */
export async function reprocesarSaldosCuentas({ cuentaCorrienteIds, usuarioId }) {
  const ids = [...new Set((Array.isArray(cuentaCorrienteIds) ? cuentaCorrienteIds : []).map((id) => String(id)))]
    .filter((id) => /^\d+$/.test(id))
    .map((id) => BigInt(id));

  if (ids.length === 0) throw new ValidationError("Debe indicar al menos una cuenta corriente para reprocesar.");
  if (ids.length > MAXIMO_CUENTAS) {
    throw new ValidationError(`Se pueden reprocesar como máximo ${MAXIMO_CUENTAS} cuentas por vez.`);
  }

  try {
    const cuentas = [];
    for (const id of ids) cuentas.push(await reprocesarCuenta(id, usuarioId));

    return {
      cuentasProcesadas: cuentas.length,
      filasRevisadas: cuentas.reduce((suma, c) => suma + c.filas, 0),
      filasCorregidas: cuentas.reduce((suma, c) => suma + c.filasCorregidas, 0),
      filasConciliadasCorregidas: cuentas.reduce((suma, c) => suma + c.filasConciliadasCorregidas, 0),
      cuentas,
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) {
      throw new DatabaseError("Error de base de datos al reprocesar los saldos", err.message);
    }
    throw err;
  }
}

export default { reprocesarSaldosCuentas };
