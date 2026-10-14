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

async function reprocesarCuenta(cuentaCorrienteId, usuarioId, { forzar = false, idsForzados = null, onEvento = null } = {}) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_CUENTA + cuentaCorrienteId})`;

      const filas = await tx.saldoCuentaCorriente.findMany({
        where: { cuentaCorrienteId },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        select: {
          id: true,
          fecha: true,
          movimientoCajaId: true,
          saldoAnterior: true,
          ingresos: true,
          egresos: true,
          saldoActual: true,
          conciliado: true,
        },
      });

      let corriente = filas.length > 0 ? num(filas[0].saldoAnterior) : 0;
      let filasCorregidas = 0;
      let filasReprocesadas = 0;
      let filasConciliadasCorregidas = 0;

      for (let indice = 0; indice < filas.length; indice++) {
        const fila = filas[indice];
        const anterior = r2(corriente);
        const actual = r2(anterior + num(fila.ingresos) - num(fila.egresos));
        const difiere = r2(fila.saldoAnterior) !== anterior || r2(fila.saldoActual) !== actual;
        // Forzado: se reescribe la fila aunque ya esté correcta (todas, o solo las indicadas en idsForzados)
        const reescribir = difiere || (forzar && (!idsForzados || idsForzados.has(String(fila.id))));
        if (reescribir) {
          await tx.saldoCuentaCorriente.update({
            where: { id: fila.id },
            data: { saldoAnterior: anterior, saldoActual: actual },
          });
          filasReprocesadas++;
          if (difiere) {
            filasCorregidas++;
            if (fila.conciliado) filasConciliadasCorregidas++;
          }
        }
        corriente = actual;

        onEvento?.({
          tipo: "fila",
          cuentaCorrienteId: Number(cuentaCorrienteId),
          indice: indice + 1,
          totalCuenta: filas.length,
          saldoId: Number(fila.id),
          movimientoCajaId: fila.movimientoCajaId ? Number(fila.movimientoCajaId) : null,
          fecha: fila.fecha,
          ingresos: num(fila.ingresos),
          egresos: num(fila.egresos),
          saldoAnteriorAntes: r2(fila.saldoAnterior),
          saldoAnterior: anterior,
          saldoActualAntes: r2(fila.saldoActual),
          saldoActual: actual,
          conciliado: Boolean(fila.conciliado),
          estado: difiere ? "corregido" : reescribir ? "reprocesado" : "correcto",
        });
      }

      const ultima = filas.length > 0 ? filas[filas.length - 1] : null;
      const resultado = {
        cuentaCorrienteId: Number(cuentaCorrienteId),
        filas: filas.length,
        filasReprocesadas,
        filasCorregidas,
        filasConciliadasCorregidas,
        saldoFinalAntes: ultima ? r2(ultima.saldoActual) : 0,
        saldoFinalDespues: r2(corriente),
      };
      if (filasReprocesadas > 0) {
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
 * @param {boolean} [params.forzar] - reescribe las filas aunque ya estén correctas
 * @param {Array<number|string>} [params.saldoIds] - con forzar, limita la reescritura a estas filas
 *   (la cadena se recalcula completa igualmente; las demás filas solo se escriben si difieren)
 */
export async function reprocesarSaldosCuentas({ cuentaCorrienteIds, usuarioId, forzar = false, saldoIds = null, onEvento = null }) {
  const idsForzados = Array.isArray(saldoIds) ? new Set(saldoIds.map((id) => String(id))) : null;
  const ids = [...new Set((Array.isArray(cuentaCorrienteIds) ? cuentaCorrienteIds : []).map((id) => String(id)))]
    .filter((id) => /^\d+$/.test(id))
    .map((id) => BigInt(id));

  if (ids.length === 0) throw new ValidationError("Debe indicar al menos una cuenta corriente para reprocesar.");
  if (ids.length > MAXIMO_CUENTAS) {
    throw new ValidationError(`Se pueden reprocesar como máximo ${MAXIMO_CUENTAS} cuentas por vez.`);
  }

  try {
    // Con seguimiento en tiempo real: se informa el total de registros antes de empezar
    let nombres = new Map();
    if (onEvento) {
      const [conteos, infoCuentas] = await Promise.all([
        prisma.saldoCuentaCorriente.groupBy({
          by: ["cuentaCorrienteId"],
          where: { cuentaCorrienteId: { in: ids } },
          _count: { id: true },
        }),
        prisma.cuentaCorriente.findMany({
          where: { id: { in: ids } },
          select: { id: true, numeroCuenta: true, descripcion: true, banco: { select: { nombre: true } } },
        }),
      ]);
      const filasPorCuenta = new Map(conteos.map((c) => [String(c.cuentaCorrienteId), c._count.id]));
      nombres = new Map(
        infoCuentas.map((c) => [String(c.id), `${c.banco?.nombre || "Banco"} ${c.numeroCuenta || `#${c.id}`}${c.descripcion ? ` - ${c.descripcion}` : ""}`]),
      );
      onEvento({
        tipo: "inicio",
        totalCuentas: ids.length,
        totalFilas: [...filasPorCuenta.values()].reduce((suma, n) => suma + n, 0),
        forzar: Boolean(forzar),
        cuentas: ids.map((id) => ({
          cuentaCorrienteId: Number(id),
          nombre: nombres.get(String(id)) || `Cuenta #${id}`,
          filas: filasPorCuenta.get(String(id)) || 0,
        })),
      });
    }

    const cuentas = [];
    for (const id of ids) {
      onEvento?.({ tipo: "cuenta", cuentaCorrienteId: Number(id), nombre: nombres.get(String(id)) || `Cuenta #${id}` });
      const resultadoCuenta = await reprocesarCuenta(id, usuarioId, { forzar: Boolean(forzar), idsForzados, onEvento });
      cuentas.push(resultadoCuenta);
      onEvento?.({ tipo: "cuenta_fin", nombre: nombres.get(String(id)) || `Cuenta #${id}`, ...resultadoCuenta });
    }

    return {
      cuentasProcesadas: cuentas.length,
      filasRevisadas: cuentas.reduce((suma, c) => suma + c.filas, 0),
      filasReprocesadas: cuentas.reduce((suma, c) => suma + c.filasReprocesadas, 0),
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
