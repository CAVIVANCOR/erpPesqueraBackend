import { ValidationError } from "../../utils/errors.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";
import { MONEDA_SOLES_ID } from "../../utils/letrasCambio.constants.js";
import { obtenerIdTipoPorRolSinValidar } from "../Tesoreria/tipoMovimientoSistema.service.js";

/**
 * Total de EGRESOS (en soles) de las entregas a rendir de un documento de origen (temporada de pesca industrial o
 * novedad de pesca de consumo). Es la base del costo unitario de las descargas.
 *
 * Fuente única: DetMovsEntregaRendir, por módulo y documento de origen (los modelos de entrega a rendir por módulo
 * ya no se usan).
 *
 * Qué entra: los gastos reales, tanto los ligados a una asignación como los gastos directos. Es la misma regla con la que
 * el sistema calcula los saldos de la rendición: no entran las asignaciones (tipos de la categoría con el rol
 * GASTOS_A_RENDIR, que son la entrega de fondos y no un costo) ni las devoluciones a rendir (tipo con el rol
 * DEVOLUCION_A_RENDIR, que es dinero que vuelve y no un gasto).
 *
 * Los movimientos en moneda extranjera se convierten a soles con el tipo de cambio VENTA de su fecha.
 *
 * @param {object} tx - Cliente de transacción de Prisma
 * @param {string} modeloDocumentoOrigen - 'TemporadaPesca' o 'NovedadPescaConsumo' (modelo del módulo de origen)
 * @param {number|bigint} documentoOrigenId - id de la temporada o de la novedad
 * @returns {Promise<number>} total de egresos en soles
 */
export async function calcularEgresosEntregaRendir(tx, modeloDocumentoOrigen, documentoOrigenId) {
  const modulo = await tx.moduloSistema.findFirst({
    where: { modeloDocumentoOrigen },
    select: { id: true },
  });
  if (!modulo) {
    throw new ValidationError(
      `No existe un módulo del sistema con el modelo de documento de origen "${modeloDocumentoOrigen}": no se pueden calcular los egresos de la entrega a rendir.`,
    );
  }

  const tipoDevolucionId = await obtenerIdTipoPorRolSinValidar("DEVOLUCION_A_RENDIR", tx);

  const movimientos = await tx.detMovsEntregaRendir.findMany({
    where: {
      moduloOrigenId: modulo.id,
      documentoOrigenId: BigInt(documentoOrigenId),
      // "No es asignación": sin categoría, o con categoría cuyo rol es nulo o distinto. Se escribe explícito porque en SQL
      // `NOT (rol = 'X')` descarta los roles nulos (NULL), que son justamente casi todas las categorías.
      tipoMovimiento: {
        OR: [
          { categoriaId: null },
          { categoria: { OR: [{ codigoSistema: null }, { codigoSistema: { not: "GASTOS_A_RENDIR" } }] } },
        ],
      },
      ...(tipoDevolucionId ? { tipoMovimientoId: { not: BigInt(tipoDevolucionId) } } : {}),
    },
    select: { monto: true, monedaId: true, fechaMovimiento: true },
  });

  const tiposCambio = new Map();
  let total = 0;
  for (const mov of movimientos) {
    const monto = Number(mov.monto || 0);
    if (Number(mov.monedaId) === MONEDA_SOLES_ID) {
      total += monto;
      continue;
    }
    const clave = new Date(mov.fechaMovimiento).toISOString().slice(0, 10);
    if (!tiposCambio.has(clave)) {
      const tc = Number(await validarTipoCambio(null, mov.fechaMovimiento));
      if (!(tc > 0)) {
        throw new ValidationError(
          `No se pudo obtener el tipo de cambio (venta) del ${clave} para convertir a soles los gastos de la entrega a rendir en moneda extranjera.`,
        );
      }
      tiposCambio.set(clave, tc);
    }
    total += monto * tiposCambio.get(clave);
  }
  return total;
}
