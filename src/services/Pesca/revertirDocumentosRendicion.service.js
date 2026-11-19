import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";
import { esSuperUsuario } from "../../utils/checkSuperUsuario.js";

/**
 * Reversión de los documentos generados desde Rendición de Gastos (Orden de Compra, Cuenta por Pagar, pago automático
 * en efectivo y asientos), SIN volver a generarlos. Es el inverso de `generarDocumentosFinancieros`.
 *
 * Reconocimiento: toda OC generada por Rendición de Gastos nace con submoduloOrigenId = 134 y procesoOrigenId = id del
 * movimiento de rendición. Una OC es HUÉRFANA cuando ese movimiento ya no existe.
 *
 * Protecciones (todo o nada por Orden de Compra, cada una en su transacción):
 *  - El pago de la CxP debe ser solo el automático de la rendición (sin movimiento de caja).
 *  - Los asientos a eliminar deben ser todos de Rendición de Gastos (submódulo 134).
 *  - Ninguna otra tabla (descubierta en el catálogo de PostgreSQL) puede referenciar la OC, la CxP o sus pagos.
 */
const SUBMODULO_RENDICION_GASTOS = 134;
const PREFIJO_PAGO_AUTOMATICO = "PAGO DESDE RENDICI";

// Referencias permitidas: las propias de lo que se elimina. Cualquier otra referencia bloquea la reversión.
const REFERENCIAS_PROPIAS = new Set([
  "CuentaPorPagar.ordenCompraId",
  "DetalleOrdenCompra.ordenCompraId",
  "PagoCuentaPorPagar.cuentaPorPagarId",
]);

const ident = (nombre) => `"${String(nombre).replace(/"/g, '""')}"`;
const aNumeros = (valores) => valores.map((v) => Number(v));

async function referenciasA(db, tabla) {
  return db.$queryRawUnsafe(
    `SELECT cl.relname AS tabla, a.attname AS columna
     FROM pg_constraint c
     JOIN pg_class cl ON cl.oid = c.conrelid
     JOIN pg_class rf ON rf.oid = c.confrelid
     JOIN pg_namespace ns ON ns.oid = rf.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'f' AND ns.nspname = 'public' AND rf.relname = $1
     ORDER BY cl.relname, a.attname`,
    tabla,
  );
}

/** Referencias de otras tablas (no propias) a los ids indicados de una tabla. Devuelve [{ tabla, registros }]. */
async function referenciasAjenas(db, tabla, ids) {
  if (ids.length === 0) return [];
  const resultado = [];
  for (const ref of await referenciasA(db, tabla)) {
    const clave = `${ref.tabla}.${ref.columna}`;
    if (REFERENCIAS_PROPIAS.has(clave) || String(ref.tabla).startsWith("_")) continue;
    const filas = await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM ${ident(ref.tabla)} WHERE ${ident(ref.columna)} = ANY($1::bigint[])`,
      ids,
    );
    if (filas[0].n > 0) resultado.push({ tabla: ref.tabla, columna: ref.columna, registros: filas[0].n });
  }
  return resultado;
}

/** Asientos vinculados a la OC, su CxP o sus pagos (relaciones M:N) o creados por el movimiento de rendición. */
async function asientosDe(db, ordenCompra, cuentaPorPagarId, pagosIds) {
  const filas = await db.$queryRawUnsafe(
    `SELECT DISTINCT a.id, a."numeroAsiento", a."submoduloOrigenId"
     FROM "AsientoContable" a
     WHERE a.id IN (SELECT "A" FROM "_AsientoContableToOrdenCompra" WHERE "B" = $1::bigint)
        OR ($2::bigint IS NOT NULL AND a.id IN (SELECT "A" FROM "_AsientoContableToCuentaPorPagar" WHERE "B" = $2::bigint))
        OR (cardinality($3::bigint[]) > 0 AND a.id IN (SELECT "A" FROM "_AsientoContableToPagoCuentaPorPagar" WHERE "B" = ANY($3::bigint[])))
        OR (a."submoduloOrigenId" = ${SUBMODULO_RENDICION_GASTOS} AND (a."procesoOrigenId" = $4::bigint OR a."procesoOrigenId" = ANY($3::bigint[])))
     ORDER BY a.id`,
    Number(ordenCompra.id),
    cuentaPorPagarId ? Number(cuentaPorPagarId) : null,
    pagosIds,
    ordenCompra.procesoOrigenId ? Number(ordenCompra.procesoOrigenId) : -1,
  );
  return filas;
}

/** Analiza qué se eliminaría y qué lo impide, para una Orden de Compra de Rendición de Gastos. */
async function analizarOrdenCompra(db, ordenCompraId) {
  const ordenCompra = await db.ordenCompra.findUnique({ where: { id: BigInt(ordenCompraId) } });
  if (!ordenCompra) throw new NotFoundError(`La Orden de Compra ${ordenCompraId} no existe.`);
  if (Number(ordenCompra.submoduloOrigenId) !== SUBMODULO_RENDICION_GASTOS) {
    throw new ValidationError(
      `La Orden de Compra ${ordenCompra.numeroDocumento} no fue generada desde Rendición de Gastos: no se puede revertir desde aquí.`,
    );
  }

  const cuentasPorPagar = await db.cuentaPorPagar.findMany({ where: { ordenCompraId: ordenCompra.id } });
  const cuentaIds = cuentasPorPagar.map((c) => c.id);
  const pagos = cuentaIds.length > 0 ? await db.pagoCuentaPorPagar.findMany({ where: { cuentaPorPagarId: { in: cuentaIds } } }) : [];
  const pagosIds = aNumeros(pagos.map((p) => p.id));

  const asientos = await asientosDe(db, ordenCompra, cuentasPorPagar[0]?.id ?? null, pagosIds);

  const bloqueos = [];
  const pagosAjenos = pagos.filter(
    (p) => !String(p.observaciones || "").startsWith(PREFIJO_PAGO_AUTOMATICO) || p.movimientoCajaId !== null,
  );
  if (pagosAjenos.length > 0) {
    bloqueos.push(
      `La cuenta por pagar tiene ${pagosAjenos.length} pago(s) que no son el pago automático de la rendición (por ejemplo canje por nota de crédito o pago de Tesorería). Revierta primero esos pagos.`,
    );
  }
  const asientosAjenos = asientos.filter((a) => Number(a.submoduloOrigenId) !== SUBMODULO_RENDICION_GASTOS);
  if (asientosAjenos.length > 0) {
    bloqueos.push(
      `Hay ${asientosAjenos.length} asiento(s) vinculados que no son de Rendición de Gastos (${asientosAjenos.map((a) => a.numeroAsiento).join(", ")}). Elimínelos primero desde Contabilidad.`,
    );
  }
  for (const [tabla, ids] of [
    ["OrdenCompra", aNumeros([ordenCompra.id])],
    ["CuentaPorPagar", aNumeros(cuentaIds)],
    ["PagoCuentaPorPagar", pagosIds],
  ]) {
    for (const ref of await referenciasAjenas(db, tabla, ids)) {
      bloqueos.push(`La tabla ${ref.tabla} tiene ${ref.registros} registro(s) que usan este documento (${ref.columna}).`);
    }
  }

  // Movimientos de rendición cuyo origen apunta a esta OC (origen COMPRAS): se restauran al eliminarla
  const movimientosApuntando = await db.$queryRawUnsafe(
    `SELECT d.id, d."moduloOrigenId", m."modeloDocumentoOrigen"
     FROM "DetMovsEntregaRendir" d JOIN "ModuloSistema" m ON m.id = d."moduloOrigenId"
     WHERE m."modeloDocumentoOrigen" = 'OrdenCompra' AND d."documentoOrigenId" = $1::bigint
     ORDER BY d.id`,
    Number(ordenCompra.id),
  );

  const movimientoProceso = ordenCompra.procesoOrigenId
    ? await db.detMovsEntregaRendir.findUnique({ where: { id: ordenCompra.procesoOrigenId }, select: { id: true } })
    : null;

  return {
    ordenCompra,
    cuentasPorPagar,
    pagos,
    asientos,
    movimientosApuntando,
    movimientoExiste: Boolean(movimientoProceso),
    bloqueos,
  };
}

const resumen = (a) => ({
  ordenCompraId: a.ordenCompra.id,
  numeroDocumento: a.ordenCompra.numeroDocumento,
  fechaDocumento: a.ordenCompra.fechaDocumento,
  total: a.ordenCompra.total,
  movimientoId: a.ordenCompra.procesoOrigenId,
  esHuerfana: !a.movimientoExiste,
  cuentasPorPagar: a.cuentasPorPagar.length,
  saldoPendiente: a.cuentasPorPagar.reduce((s, c) => s + Number(c.saldoPendiente || 0), 0),
  pagos: a.pagos.length,
  asientos: a.asientos.length,
  movimientosApuntando: a.movimientosApuntando.map((m) => m.id),
  bloqueos: a.bloqueos,
});

async function ordenesDeMovimiento(db, detMovId) {
  const detMov = await db.detMovsEntregaRendir.findUnique({ where: { id: BigInt(detMovId) }, select: { id: true } });
  if (!detMov) throw new NotFoundError(`El movimiento de rendición ${detMovId} no existe.`);
  const ordenes = await db.ordenCompra.findMany({
    where: { submoduloOrigenId: SUBMODULO_RENDICION_GASTOS, procesoOrigenId: Number(detMovId) },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (ordenes.length === 0) {
    throw new ValidationError(
      `El movimiento ${detMovId} no tiene documentos generados desde Rendición de Gastos (no hay Orden de Compra que revertir).`,
    );
  }
  return ordenes.map((o) => o.id);
}

/** Plan (sin cambiar nada) de lo que se revertiría para un movimiento de rendición. */
export async function planPorMovimiento(detMovId) {
  const ids = await ordenesDeMovimiento(prisma, detMovId);
  const ordenes = [];
  for (const id of ids) ordenes.push(resumen(await analizarOrdenCompra(prisma, id)));
  return { movimientoId: Number(detMovId), ordenes, puedeRevertir: ordenes.every((o) => o.bloqueos.length === 0) };
}

/** Órdenes de compra huérfanas de Rendición de Gastos (su movimiento ya no existe), con su plan. */
export async function listarHuerfanas() {
  const filas = await prisma.$queryRawUnsafe(
    `SELECT o.id FROM "OrdenCompra" o
     WHERE o."submoduloOrigenId" = ${SUBMODULO_RENDICION_GASTOS} AND o."procesoOrigenId" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "DetMovsEntregaRendir" d WHERE d.id = o."procesoOrigenId")
     ORDER BY o.id`,
  );
  const ordenes = [];
  for (const fila of filas) ordenes.push(resumen(await analizarOrdenCompra(prisma, fila.id)));
  return {
    total: ordenes.length,
    saldoPendienteTotal: ordenes.reduce((s, o) => s + o.saldoPendiente, 0),
    conBloqueos: ordenes.filter((o) => o.bloqueos.length > 0).length,
    ordenes,
  };
}

async function exigirSuperUsuario(usuarioId) {
  if (!usuarioId || !(await esSuperUsuario(usuarioId))) {
    throw new ForbiddenError("Solo un superusuario puede revertir los documentos generados desde Rendición de Gastos.");
  }
}

/** Revierte una Orden de Compra (todo o nada): elimina asientos, pagos, CxP, detalle y OC, y restaura los movimientos. */
async function revertirOrdenCompra(ordenCompraId, usuarioId) {
  return prisma.$transaction(
    async (tx) => {
      const analisis = await analizarOrdenCompra(tx, ordenCompraId);
      if (analisis.bloqueos.length > 0) {
        throw new ValidationError(
          `No se puede revertir la Orden de Compra ${analisis.ordenCompra.numeroDocumento}: ${analisis.bloqueos.join(" ")}`,
        );
      }

      const { ordenCompra } = analisis;
      const moduloTesoreria = await tx.moduloSistema.findFirst({
        where: { modeloDocumentoOrigen: "DetMovsEntregaRendir", activo: true },
        select: { id: true },
      });

      // Movimientos cuyo origen apuntaba a esta OC: si la OC se generó para el propio movimiento vuelven a TESORERÍA
      // (apuntando a sí mismos); si apuntaban a la OC de otro movimiento, quedan pendientes (documento 0).
      for (const mov of analisis.movimientosApuntando) {
        const propia = Number(ordenCompra.procesoOrigenId) === Number(mov.id);
        if (propia && !moduloTesoreria) {
          throw new ValidationError("No se encontró el módulo TESORERÍA para restaurar el origen del movimiento.");
        }
        await tx.detMovsEntregaRendir.update({
          where: { id: mov.id },
          data: propia
            ? { moduloOrigenId: moduloTesoreria.id, documentoOrigenId: BigInt(mov.id) }
            : { documentoOrigenId: BigInt(0) },
        });
      }

      // El movimiento de la rendición deja de estar validado: sus documentos ya no existen
      if (analisis.movimientoExiste) {
        await tx.detMovsEntregaRendir.update({
          where: { id: ordenCompra.procesoOrigenId },
          data: {
            validadoTesoreria: false,
            fechaValidacionTesoreria: null,
            actualizadoPorId: usuarioId ? BigInt(usuarioId) : null,
          },
        });
      }

      const asientosIds = analisis.asientos.map((a) => a.id);
      if (asientosIds.length > 0) {
        await tx.detalleAsientoContable.deleteMany({ where: { asientoContableId: { in: asientosIds } } });
        await tx.asientoContable.deleteMany({ where: { id: { in: asientosIds } } });
      }
      const cuentaIds = analisis.cuentasPorPagar.map((c) => c.id);
      if (analisis.pagos.length > 0) {
        await tx.pagoCuentaPorPagar.deleteMany({ where: { cuentaPorPagarId: { in: cuentaIds } } });
      }
      if (cuentaIds.length > 0) await tx.cuentaPorPagar.deleteMany({ where: { id: { in: cuentaIds } } });
      await tx.detalleOrdenCompra.deleteMany({ where: { ordenCompraId: ordenCompra.id } });
      await tx.ordenCompra.delete({ where: { id: ordenCompra.id } });

      return {
        ordenCompraId: ordenCompra.id,
        numeroDocumento: ordenCompra.numeroDocumento,
        asientosEliminados: asientosIds.length,
        pagosEliminados: analisis.pagos.length,
        cuentasPorPagarEliminadas: cuentaIds.length,
        movimientosRestaurados: analisis.movimientosApuntando.length,
      };
    },
    { maxWait: 15000, timeout: 120000 },
  );
}

/** Revierte los documentos generados para un movimiento de rendición (no vuelve a generarlos). */
export async function revertirPorMovimiento(detMovId, usuarioId) {
  await exigirSuperUsuario(usuarioId);
  const ids = await ordenesDeMovimiento(prisma, detMovId);
  const revertidas = [];
  for (const id of ids) revertidas.push(await revertirOrdenCompra(id, usuarioId));
  return { success: true, movimientoId: Number(detMovId), revertidas, message: `Se revirtieron ${revertidas.length} documento(s) de la rendición.` };
}

/** Elimina Órdenes de Compra huérfanas indicadas (cada una todo o nada). Las bloqueadas se informan sin detener las demás. */
export async function revertirHuerfanas(ordenCompraIds, usuarioId) {
  await exigirSuperUsuario(usuarioId);
  const ids = [...new Set((ordenCompraIds || []).map(Number))].filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) throw new ValidationError("Seleccione al menos una Orden de Compra huérfana.");

  const revertidas = [];
  const rechazadas = [];
  for (const id of ids) {
    const analisis = await analizarOrdenCompra(prisma, id);
    if (analisis.movimientoExiste) {
      rechazadas.push({ ordenCompraId: id, motivo: "No es huérfana: su movimiento de rendición todavía existe." });
      continue;
    }
    try {
      revertidas.push(await revertirOrdenCompra(id, usuarioId));
    } catch (error) {
      rechazadas.push({ ordenCompraId: id, motivo: error.message });
    }
  }
  return {
    success: rechazadas.length === 0,
    revertidas,
    rechazadas,
    message: `Se eliminaron ${revertidas.length} orden(es) de compra huérfana(s)${rechazadas.length ? `; ${rechazadas.length} no se pudieron eliminar` : ""}.`,
  };
}

export default { planPorMovimiento, listarHuerfanas, revertirPorMovimiento, revertirHuerfanas };
