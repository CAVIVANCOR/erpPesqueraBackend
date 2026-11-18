import prisma from "../../config/prismaClient.js";

/**
 * Uso (historial) de un tipo de movimiento o de una categoría en TODAS las tablas del sistema.
 *
 * Las tablas que referencian al registro se descubren en el catálogo de PostgreSQL (llaves foráneas), no se escriben
 * a mano: si mañana se agrega otra tabla que use el tipo, queda cubierta sin tocar este código.
 */

// Escapa un identificador de PostgreSQL (los nombres vienen del catálogo, nunca del usuario)
const ident = (nombre) => `"${String(nombre).replace(/"/g, '""')}"`;

/** Llaves foráneas (tabla, columna) que apuntan a la tabla indicada. */
async function referenciasA(tablaReferenciada) {
  return prisma.$queryRaw`
    SELECT cl.relname AS tabla, a.attname AS columna
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_class rf ON rf.oid = c.confrelid
    JOIN pg_namespace ns ON ns.oid = rf.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f' AND ns.nspname = 'public' AND rf.relname = ${tablaReferenciada}
    ORDER BY cl.relname, a.attname`;
}

async function contar(tabla, columna, condicion, valor) {
  const filas = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM ${ident(tabla)} WHERE ${condicion(ident(columna))}`,
    valor,
  );
  return filas[0].n;
}

const resultado = (tablas) => ({
  total: tablas.reduce((suma, t) => suma + t.registros, 0),
  tablas,
});

/** Tablas y cantidad de registros que usan el tipo de movimiento. Solo se devuelven las que tienen registros. */
export async function usoDeTipo(id) {
  const tablas = [];
  for (const { tabla, columna } of await referenciasA("TipoMovEntregaRendir")) {
    const registros = await contar(tabla, columna, (col) => `${col} = $1`, BigInt(id));
    if (registros > 0) tablas.push({ tabla, columna, registros });
  }
  return resultado(tablas);
}

/**
 * Tablas y cantidad de registros que usan la categoría: directamente (por ejemplo, sus tipos de movimiento) y a través
 * de sus tipos (los movimientos que usan esos tipos).
 */
export async function usoDeCategoria(id) {
  const tablas = [];
  for (const { tabla, columna } of await referenciasA("CategoriaTipoMovEntregaRendir")) {
    const registros = await contar(tabla, columna, (col) => `${col} = $1`, BigInt(id));
    if (registros > 0) tablas.push({ tabla, columna, registros, detalle: "tipos o registros de la categoría" });
  }
  for (const { tabla, columna } of await referenciasA("TipoMovEntregaRendir")) {
    const registros = await contar(
      tabla,
      columna,
      (col) => `${col} IN (SELECT id FROM "TipoMovEntregaRendir" WHERE "categoriaId" = $1)`,
      BigInt(id),
    );
    if (registros > 0) tablas.push({ tabla, columna, registros, detalle: "movimientos de sus tipos de movimiento" });
  }
  return resultado(tablas);
}

/** Texto para el usuario: "Tabla (n registros), Tabla (n registros)". */
export const resumenUso = (uso) =>
  uso.tablas.map((t) => `${t.tabla}${t.detalle ? ` [${t.detalle}]` : ""}: ${t.registros} registro(s)`).join("; ");
