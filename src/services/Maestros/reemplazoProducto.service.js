import prisma from "../../config/prismaClient.js";
import { ValidationError, NotFoundError, ForbiddenError } from "../../utils/errors.js";
import { esSuperUsuario } from "../../utils/checkSuperUsuario.js";
import { ESTADO_PERIODO_CONTABLE } from "../../utils/estados.constants.js";
import { regenerarKardexYSaldosCompletoSAP } from "../Almacen/kardexSaldosSAP.service.js";

/**
 * REEMPLAZO DE UN PRODUCTO POR OTRO (para dar de baja productos obsoletos, p. ej. los marcados con XXX).
 *
 * Dos alcances:
 *  - GLOBAL: todos los registros del sistema que usan el producto (desde el maestro de productos). Al terminar el producto
 *    retirado queda CESADO (no se borra).
 *  - DOCUMENTOS: solo los documentos marcados en una lista (PreFacturas, Órdenes de Compra, gastos de rendición).
 *
 * Reglas:
 *  - Los vínculos se descubren en el catálogo de PostgreSQL (toda columna con llave foránea a Producto), así que cubre también las
 *    tablas que se agreguen después.
 *  - ALMACÉN: no se mueven filas de kardex ni de saldos a mano. Se cambia el producto en el detalle del movimiento de almacén y se
 *    REPROCESA el movimiento con el mismo código que lo genera (regenerarKardexYSaldosCompletoSAP): el kardex sigue siendo la única
 *    fuente de verdad y los saldos y costos promedio se recalculan desde él.
 *  - No se reemplaza en documentos de períodos contables cerrados o bloqueados (el recálculo cambiaría costos ya contabilizados).
 *  - Las diferencias de cuentas contables, IGV o detracción entre ambos productos solo AVISAN: los asientos ya registrados no se corrigen.
 *  - Todo ocurre en UNA transacción: si algo falla no se cambia nada.
 */

// Tablas con tratamiento propio (no se actualizan con el UPDATE genérico)
const TABLAS_ALMACEN = ["KardexAlmacen", "SaldosProductoCliente", "SaldosDetProductoCliente", "DetalleMovimientoAlmacen"];
const TABLA_PRECIOS = "PrecioEntidad";
const ESTADOS_PERIODO_NO_EDITABLES = [ESTADO_PERIODO_CONTABLE.CERRADO, ESTADO_PERIODO_CONTABLE.BLOQUEADO];

const ident = (nombre) => `"${String(nombre).replace(/"/g, '""')}"`;
const aNumeros = (lista) => [...new Set((lista || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
const num = (valor) => Number(valor ?? 0);

/** Normaliza el alcance recibido del cliente */
function normalizarAlcance(alcance) {
  if (!alcance || alcance.tipo === "GLOBAL") return { tipo: "GLOBAL" };
  if (alcance.tipo !== "DOCUMENTOS") throw new ValidationError('El alcance del reemplazo debe ser "GLOBAL" o "DOCUMENTOS".');
  const normalizado = {
    tipo: "DOCUMENTOS",
    preFacturaIds: aNumeros(alcance.preFacturaIds),
    ordenCompraIds: aNumeros(alcance.ordenCompraIds),
    rendicionIds: aNumeros(alcance.rendicionIds),
    movimientoAlmacenIds: aNumeros(alcance.movimientoAlmacenIds),
    otMantenimientoIds: aNumeros(alcance.otMantenimientoIds),
  };
  if (
    normalizado.preFacturaIds.length + normalizado.ordenCompraIds.length + normalizado.rendicionIds.length + normalizado.movimientoAlmacenIds.length + normalizado.otMantenimientoIds.length ===
    0
  ) {
    throw new ValidationError("Marque al menos un documento de la lista para reemplazar el producto.");
  }
  return normalizado;
}

/**
 * Un gasto de rendición que ya generó su compra tiene una OC (submódulo de origen = Rendición de Gastos, proceso = id del gasto).
 * Si se reemplaza el producto del gasto, la OC generada debe cambiar con él: se agrega al alcance para que la compra, su kardex y el
 * gasto queden con el mismo producto (una sola verdad).
 */
async function expandirRendiciones(db, alcance) {
  if (alcance.tipo !== "DOCUMENTOS" || alcance.rendicionIds.length === 0) return alcance;
  const ordenes = await db.$queryRawUnsafe(
    `SELECT o.id FROM "OrdenCompra" o
     WHERE o."submoduloOrigenId" IN (SELECT id FROM "SubmoduloSistema" WHERE "nombreModeloOrigen" = 'DetMovsEntregaRendir')
       AND o."procesoOrigenId" = ANY($1::bigint[])`,
    alcance.rendicionIds,
  );
  return { ...alcance, ordenCompraIds: aNumeros([...alcance.ordenCompraIds, ...ordenes.map((o) => o.id)]) };
}

/** Columnas con llave foránea a Producto (descubiertas en el catálogo de PostgreSQL) */
async function columnasQueApuntanAProducto(db) {
  return db.$queryRawUnsafe(
    `SELECT cl.relname AS tabla, a.attname AS columna
     FROM pg_constraint c
     JOIN pg_class cl ON cl.oid = c.conrelid
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'f' AND c.confrelid = '"Producto"'::regclass
     ORDER BY cl.relname, a.attname`,
  );
}

async function cargarProducto(db, id, rol) {
  const producto = await db.producto.findUnique({ where: { id: BigInt(id) } });
  if (!producto) throw new NotFoundError(`El producto ${rol} (${id}) no existe.`);
  return producto;
}

/** Movimientos de almacén que se verán afectados según el alcance (solo los que tienen líneas del producto origen) */
async function movimientosAlmacenAfectados(db, origenId, alcance) {
  if (alcance.tipo === "GLOBAL") {
    const filas = await db.$queryRawUnsafe(
      `SELECT DISTINCT "movimientoAlmacenId" AS id FROM "DetalleMovimientoAlmacen" WHERE "productoId" = $1::bigint ORDER BY 1`,
      Number(origenId),
    );
    return aNumeros(filas.map((f) => f.id));
  }
  const filas = await db.$queryRawUnsafe(
    `SELECT DISTINCT m.id
     FROM "MovimientoAlmacen" m
     JOIN "DetalleMovimientoAlmacen" d ON d."movimientoAlmacenId" = m.id AND d."productoId" = $1::bigint
     WHERE m."pedidoVentaId" = ANY($2::bigint[])
        OR m."ordenCompraId" = ANY($3::bigint[])
        OR m.id IN (SELECT "movSalidaAlmacenId" FROM "PreFactura" WHERE id = ANY($2::bigint[]) AND "movSalidaAlmacenId" IS NOT NULL)
        OR m.id = ANY($4::bigint[])
     ORDER BY m.id`,
    Number(origenId),
    alcance.preFacturaIds,
    alcance.ordenCompraIds,
    alcance.movimientoAlmacenIds,
  );
  return aNumeros(filas.map((f) => f.id));
}

/** Filas que cambiarían en cada tabla (solo lectura) */
async function calcularImpacto(db, origenId, alcance, movimientosIds) {
  const impacto = [];
  const agregar = (tabla, columna, filas) => {
    if (num(filas) > 0) impacto.push({ tabla, columna, filas: num(filas) });
  };
  const contar = async (sql, ...params) => num((await db.$queryRawUnsafe(sql, ...params))[0]?.n);
  const origen = Number(origenId);

  if (alcance.tipo === "GLOBAL") {
    for (const { tabla, columna } of await columnasQueApuntanAProducto(db)) {
      if (TABLAS_ALMACEN.includes(tabla)) continue;
      agregar(tabla, columna, await contar(`SELECT COUNT(*)::int AS n FROM ${ident(tabla)} WHERE ${ident(columna)} = $1::bigint`, origen));
    }
  } else {
    agregar(
      "DetallePreFactura",
      "productoId",
      await contar(`SELECT COUNT(*)::int AS n FROM "DetallePreFactura" WHERE "productoId" = $1::bigint AND "preFacturaId" = ANY($2::bigint[])`, origen, alcance.preFacturaIds),
    );
    agregar(
      "DetalleComprobante",
      "productoId",
      await contar(
        `SELECT COUNT(*)::int AS n FROM "DetalleComprobante" d JOIN "ComprobanteElectronico" c ON c.id = d."comprobanteElectronicoId"
         WHERE d."productoId" = $1::bigint AND c."preFacturaId" = ANY($2::bigint[])`,
        origen,
        alcance.preFacturaIds,
      ),
    );
    agregar(
      "DetalleOrdenCompra",
      "productoId",
      await contar(`SELECT COUNT(*)::int AS n FROM "DetalleOrdenCompra" WHERE "productoId" = $1::bigint AND "ordenCompraId" = ANY($2::bigint[])`, origen, alcance.ordenCompraIds),
    );
    agregar(
      "DetMovsEntregaRendir",
      "productoId",
      await contar(`SELECT COUNT(*)::int AS n FROM "DetMovsEntregaRendir" WHERE "productoId" = $1::bigint AND id = ANY($2::bigint[])`, origen, alcance.rendicionIds),
    );
    // Ítems (repuestos y servicios) de los presupuestos de contratistas de las OT marcadas
    agregar(
      "DetRepuestosContratistaOT",
      "productoId",
      await contar(
        `SELECT COUNT(*)::int AS n FROM "DetRepuestosContratistaOT" d JOIN "DetContratistasOT" c ON c.id = d."detContratistaOTId"
         WHERE d."productoId" = $1::bigint AND c."otMantenimientoId" = ANY($2::bigint[])`,
        origen,
        alcance.otMantenimientoIds,
      ),
    );
  }

  agregar(
    "DetalleMovimientoAlmacen",
    "productoId",
    movimientosIds.length > 0
      ? await contar(`SELECT COUNT(*)::int AS n FROM "DetalleMovimientoAlmacen" WHERE "productoId" = $1::bigint AND "movimientoAlmacenId" = ANY($2::bigint[])`, origen, movimientosIds)
      : 0,
  );
  agregar(
    "KardexAlmacen (se reprocesa)",
    "productoId",
    movimientosIds.length > 0
      ? await contar(`SELECT COUNT(*)::int AS n FROM "KardexAlmacen" WHERE "productoId" = $1::bigint AND "movimientoAlmacenId" = ANY($2::bigint[])`, origen, movimientosIds)
      : 0,
  );
  return impacto;
}

/** Períodos contables cerrados o bloqueados que tienen documentos afectados (impiden el reemplazo) */
async function periodosNoEditables(db, origenId, alcance, movimientosIds) {
  const origen = Number(origenId);
  const estados = ESTADOS_PERIODO_NO_EDITABLES.map(Number);
  const global = alcance.tipo === "GLOBAL";
  const encontrados = new Map();
  const registrar = (filas, documento) =>
    filas.forEach((f) => encontrados.set(`${documento}|${f.empresaId}|${f.periodo}`, { documento, empresaId: num(f.empresaId), periodo: f.periodo }));

  registrar(
    await db.$queryRawUnsafe(
      `SELECT DISTINCT pc."empresaId", pc."nombrePeriodo" AS periodo
       FROM "DetallePreFactura" d JOIN "PreFactura" p ON p.id = d."preFacturaId" JOIN "PeriodoContable" pc ON pc.id = p."periodoContableId"
       WHERE d."productoId" = $1::bigint AND pc."estadoId" = ANY($2::bigint[]) AND ($3::boolean OR p.id = ANY($4::bigint[]))`,
      origen, estados, global, global ? [] : alcance.preFacturaIds,
    ),
    "Ventas",
  );
  registrar(
    await db.$queryRawUnsafe(
      `SELECT DISTINCT pc."empresaId", pc."nombrePeriodo" AS periodo
       FROM "DetalleOrdenCompra" d JOIN "OrdenCompra" o ON o.id = d."ordenCompraId" JOIN "PeriodoContable" pc ON pc.id = o."periodoContableId"
       WHERE d."productoId" = $1::bigint AND pc."estadoId" = ANY($2::bigint[]) AND ($3::boolean OR o.id = ANY($4::bigint[]))`,
      origen, estados, global, global ? [] : alcance.ordenCompraIds,
    ),
    "Compras",
  );
  registrar(
    await db.$queryRawUnsafe(
      `SELECT DISTINCT pc."empresaId", pc."nombrePeriodo" AS periodo
       FROM "DetMovsEntregaRendir" d JOIN "PeriodoContable" pc ON pc."empresaId" = d."empresaId" AND d."fechaMovimiento" BETWEEN pc."fechaInicio" AND pc."fechaFin"
       WHERE d."productoId" = $1::bigint AND pc."estadoId" = ANY($2::bigint[]) AND ($3::boolean OR d.id = ANY($4::bigint[]))`,
      origen, estados, global, global ? [] : alcance.rendicionIds,
    ),
    "Rendición de gastos",
  );
  if (movimientosIds.length > 0) {
    registrar(
      await db.$queryRawUnsafe(
        `SELECT DISTINCT pc."empresaId", pc."nombrePeriodo" AS periodo
         FROM "MovimientoAlmacen" m JOIN "PeriodoContable" pc ON pc."empresaId" = m."empresaId" AND m."fechaDocumento" BETWEEN pc."fechaInicio" AND pc."fechaFin"
         WHERE m.id = ANY($1::bigint[]) AND pc."estadoId" = ANY($2::bigint[])`,
        movimientosIds, estados,
      ),
      "Almacén",
    );
  }
  return [...encontrados.values()];
}

const CUENTAS_COMPARADAS = [
  ["cuentaComprasId", "compras"],
  ["cuentaVentasId", "ventas"],
  ["cuentaInventarioId", "inventario"],
  ["cuentaCostoVentasId", "costo de ventas"],
  ["cuentaVariacionId", "variación de existencias"],
];

/**
 * Movimientos de almacén marcados directamente en la lista de Almacén: solo se aceptan los que NO provienen de otro documento
 * (inventario inicial, ajustes, traslados). Si el movimiento nace de una compra, una venta, una descarga de faena, una entrega a
 * rendir, etc., cambiar solo el producto del movimiento lo dejaría distinto del documento de origen: ese reemplazo se hace desde la
 * lista del documento, que cambia ambos a la vez.
 */
async function bloqueosPorOrigenDocumental(db, movimientoIds) {
  if (!movimientoIds || movimientoIds.length === 0) return [];
  const bloqueos = [];
  const propios = await db.$queryRawUnsafe(
    `SELECT id, "numeroDocumento", ("ordenCompraId" IS NOT NULL) AS compra, ("pedidoVentaId" IS NOT NULL) AS venta
     FROM "MovimientoAlmacen" WHERE id = ANY($1::bigint[]) AND ("ordenCompraId" IS NOT NULL OR "pedidoVentaId" IS NOT NULL)`,
    movimientoIds,
  );
  propios.forEach((m) =>
    bloqueos.push(
      `El movimiento ${m.numeroDocumento || m.id} proviene de ${m.compra ? "una compra" : "una venta"}: reemplace el producto desde la lista de ${m.compra ? "Compras" : "Ventas"}, que cambia el documento y el almacén a la vez.`,
    ),
  );
  const referencias = await db.$queryRawUnsafe(
    `SELECT cl.relname AS tabla, a.attname AS columna
     FROM pg_constraint c
     JOIN pg_class cl ON cl.oid = c.conrelid
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'f' AND c.confrelid = '"MovimientoAlmacen"'::regclass
       AND cl.relname NOT LIKE '\\_%' AND cl.relname NOT IN ('DetalleMovimientoAlmacen', 'KardexAlmacen')
     ORDER BY cl.relname, a.attname`,
  );
  for (const { tabla, columna } of referencias) {
    const n = num((await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM ${ident(tabla)} WHERE ${ident(columna)} = ANY($1::bigint[])`, movimientoIds))[0]?.n);
    if (n > 0) {
      bloqueos.push(`${n} de los movimientos marcados están ligados a otro proceso (${tabla}): el producto se reemplaza desde ese proceso para no dejarlos distintos.`);
    }
  }
  return bloqueos;
}

/** Bloqueos y avisos por la compatibilidad entre ambos productos */
async function evaluarCompatibilidad(db, origen, destino, alcance, impacto) {
  const bloqueos = [];
  const avisos = [];
  const nombre = (p) => `${p.id} - ${p.descripcionArmada || p.descripcionBase}`;

  if (Number(origen.id) === Number(destino.id)) bloqueos.push("El producto de reemplazo debe ser distinto del producto a retirar.");
  if (destino.cesado) bloqueos.push(`El producto de reemplazo (${nombre(destino)}) está cesado.`);
  if (Number(origen.unidadMedidaId) !== Number(destino.unidadMedidaId)) {
    bloqueos.push("Los productos tienen distinta unidad de medida: el reemplazo cambiaría el significado de las cantidades.");
  }

  const tablas = new Set(impacto.map((i) => i.tabla));
  const usaVentas = ["DetallePreFactura", "DetalleComprobante", "DetCotizacionVentas"].some((t) => tablas.has(t));
  const usaCompras = ["DetalleOrdenCompra", "DetalleReqCompra", "DetalleCotizacionProveedor"].some((t) => tablas.has(t));
  if (usaVentas && !destino.esParaVentas) bloqueos.push(`El producto de reemplazo (${nombre(destino)}) no está habilitado para ventas.`);
  if (usaCompras && !destino.esParaCompras) bloqueos.push(`El producto de reemplazo (${nombre(destino)}) no está habilitado para compras.`);

  const cuentasDistintas = [];
  for (const [campo, etiqueta] of CUENTAS_COMPARADAS) {
    if (String(origen[campo] ?? "") !== String(destino[campo] ?? "")) cuentasDistintas.push(etiqueta);
  }
  if (cuentasDistintas.length > 0) {
    avisos.push(
      `Las cuentas contables de ${cuentasDistintas.join(", ")} son distintas entre ambos productos. Los asientos ya registrados no se modifican; los que se generen desde ahora usarán las cuentas del producto de reemplazo.`,
    );
  }
  if (String(origen.tipoAfectacionIGVId ?? "") !== String(destino.tipoAfectacionIGVId ?? "") || Boolean(origen.exoneradoIgv) !== Boolean(destino.exoneradoIgv)) {
    avisos.push("La afectación al IGV es distinta entre ambos productos. Los importes de los documentos ya emitidos no cambian.");
  }
  if (String(origen.tipoDetraccionId ?? "") !== String(destino.tipoDetraccionId ?? "") || num(origen.porcentajeDetraccion) !== num(destino.porcentajeDetraccion)) {
    avisos.push("La detracción configurada es distinta entre ambos productos. Las detracciones ya calculadas no cambian.");
  }
  if (String(origen.tipoAlmacenamientoId ?? "") !== String(destino.tipoAlmacenamientoId ?? "")) {
    avisos.push("El tipo de almacenamiento es distinto entre ambos productos.");
  }
  return { bloqueos, avisos };
}

/** Análisis completo (solo lectura): impacto, bloqueos y avisos */
async function analizar(db, { productoOrigenId, productoDestinoId, alcance }) {
  if (!productoOrigenId || !productoDestinoId) throw new ValidationError("Seleccione el producto a retirar y el producto de reemplazo.");
  const alcanceNormalizado = await expandirRendiciones(db, normalizarAlcance(alcance));
  const [origen, destino] = await Promise.all([cargarProducto(db, productoOrigenId, "a retirar"), cargarProducto(db, productoDestinoId, "de reemplazo")]);
  const movimientosIds = await movimientosAlmacenAfectados(db, origen.id, alcanceNormalizado);
  const impacto = await calcularImpacto(db, origen.id, alcanceNormalizado, movimientosIds);
  const { bloqueos, avisos } = await evaluarCompatibilidad(db, origen, destino, alcanceNormalizado, impacto);

  if (impacto.length === 0) bloqueos.push("El producto a retirar no se usa en los registros seleccionados: no hay nada que reemplazar.");
  if (alcanceNormalizado.tipo === "DOCUMENTOS") {
    bloqueos.push(...(await bloqueosPorOrigenDocumental(db, alcanceNormalizado.movimientoAlmacenIds)));
  }
  const periodos = await periodosNoEditables(db, origen.id, alcanceNormalizado, movimientosIds);
  periodos.forEach((p) =>
    bloqueos.push(`${p.documento}: hay documentos en el período ${p.periodo} (empresa ${p.empresaId}), que está cerrado o bloqueado. Reabra el período antes de reemplazar.`),
  );

  return {
    alcance: alcanceNormalizado,
    origen,
    destino,
    movimientosIds,
    impacto,
    avisos,
    bloqueos,
    puedeEjecutar: bloqueos.length === 0,
  };
}

const resumenProducto = (p) => ({ id: Number(p.id), descripcion: p.descripcionArmada || p.descripcionBase, cesado: Boolean(p.cesado) });

/** Vista previa (no modifica nada) */
export async function previsualizarReemplazo(datos) {
  const a = await analizar(prisma, datos);
  return {
    alcance: a.alcance.tipo,
    productoOrigen: resumenProducto(a.origen),
    productoDestino: resumenProducto(a.destino),
    impacto: a.impacto,
    movimientosAlmacen: a.movimientosIds.length,
    avisos: a.avisos,
    bloqueos: a.bloqueos,
    puedeEjecutar: a.puedeEjecutar,
  };
}

/**
 * Precios por entidad: todas las filas pasan al producto nuevo para que el retirado quede sin relaciones y pueda eliminarse.
 * Si el producto nuevo ya tiene un precio vigente para la misma entidad y moneda, el precio que llega queda INACTIVO (historial) y se
 * conserva el del producto nuevo. El UPDATE ve la foto previa de la tabla, así que solo compara contra los precios que el nuevo ya tenía.
 */
async function reemplazarPrecios(tx, origenId, destinoId) {
  const filas = await tx.$queryRawUnsafe(
    `UPDATE "PrecioEntidad" o
     SET "productoId" = $2::bigint,
         "activo" = CASE WHEN o."activo" = true AND EXISTS (
             SELECT 1 FROM "PrecioEntidad" d WHERE d."productoId" = $2::bigint AND d."activo" = true
               AND d."entidadComercialId" = o."entidadComercialId" AND d."monedaId" = o."monedaId") THEN false ELSE o."activo" END
     WHERE o."productoId" = $1::bigint
     RETURNING o.id`,
    Number(origenId),
    Number(destinoId),
  );
  return { movidos: filas.length };
}

/**
 * Todas las relaciones que tiene un producto con otras tablas (cualquier columna con llave foránea a Producto, descubierta en el
 * catálogo de PostgreSQL, incluidas las tablas que se agreguen después). Se usa para validar el borrado: un producto solo se
 * puede eliminar si no tiene ninguna.
 * @returns {Promise<Array<{tabla: string, columna: string, filas: number}>>} solo las tablas con relaciones (filas > 0)
 */
export async function relacionesDeProducto(db, productoId) {
  const relaciones = [];
  for (const { tabla, columna } of await columnasQueApuntanAProducto(db)) {
    const filas = num((await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM ${ident(tabla)} WHERE ${ident(columna)} = $1::bigint`, Number(productoId)))[0]?.n);
    if (filas > 0) relaciones.push({ tabla, columna, filas });
  }
  return relaciones;
}

/** Ejecuta el reemplazo en una sola transacción */
export async function ejecutarReemplazo(datos, usuarioId) {
  if (!usuarioId || !(await esSuperUsuario(usuarioId))) {
    throw new ForbiddenError("Solo un superusuario puede reemplazar productos.");
  }

  return prisma.$transaction(
    async (tx) => {
      const a = await analizar(tx, datos);
      if (datos.eliminarOrigen && a.alcance.tipo !== "GLOBAL") {
        throw new ValidationError("Solo se puede eliminar el producto retirado en un reemplazo global (desde la lista de Productos).");
      }
      if (!a.puedeEjecutar) {
        throw new ValidationError(`No se puede reemplazar el producto:\n- ${a.bloqueos.join("\n- ")}`);
      }
      const origenId = Number(a.origen.id);
      const destinoId = Number(a.destino.id);
      const alcance = a.alcance;
      const filasActualizadas = [];

      // 1) Detalle de movimientos de almacén: se cambia el producto y se REPROCESA el movimiento con el código que genera el kardex
      let movimientosReprocesados = 0;
      if (a.movimientosIds.length > 0) {
        await tx.$executeRawUnsafe(
          `UPDATE "DetalleMovimientoAlmacen" SET "productoId" = $2::bigint, "actualizadoEn" = now()
           WHERE "productoId" = $1::bigint AND "movimientoAlmacenId" = ANY($3::bigint[])`,
          origenId, destinoId, a.movimientosIds,
        );
        for (const movimientoId of a.movimientosIds) {
          await regenerarKardexYSaldosCompletoSAP(movimientoId, tx);
          movimientosReprocesados += 1;
        }
      }

      // 2) Resto de tablas
      if (alcance.tipo === "GLOBAL") {
        for (const { tabla, columna } of await columnasQueApuntanAProducto(tx)) {
          if (TABLAS_ALMACEN.includes(tabla) || tabla === TABLA_PRECIOS) continue;
          const n = await tx.$executeRawUnsafe(`UPDATE ${ident(tabla)} SET ${ident(columna)} = $2::bigint WHERE ${ident(columna)} = $1::bigint`, origenId, destinoId);
          if (n > 0) filasActualizadas.push({ tabla, columna, filas: n });
        }
        const precios = await reemplazarPrecios(tx, origenId, destinoId);
        if (precios.movidos > 0) filasActualizadas.push({ tabla: TABLA_PRECIOS, columna: "productoId", filas: precios.movidos });
      } else {
        const hechos = [
          ["DetallePreFactura", `UPDATE "DetallePreFactura" SET "productoId" = $2::bigint WHERE "productoId" = $1::bigint AND "preFacturaId" = ANY($3::bigint[])`, alcance.preFacturaIds],
          [
            "DetalleComprobante",
            `UPDATE "DetalleComprobante" d SET "productoId" = $2::bigint FROM "ComprobanteElectronico" c
             WHERE c.id = d."comprobanteElectronicoId" AND d."productoId" = $1::bigint AND c."preFacturaId" = ANY($3::bigint[])`,
            alcance.preFacturaIds,
          ],
          ["DetalleOrdenCompra", `UPDATE "DetalleOrdenCompra" SET "productoId" = $2::bigint WHERE "productoId" = $1::bigint AND "ordenCompraId" = ANY($3::bigint[])`, alcance.ordenCompraIds],
          ["DetMovsEntregaRendir", `UPDATE "DetMovsEntregaRendir" SET "productoId" = $2::bigint WHERE "productoId" = $1::bigint AND id = ANY($3::bigint[])`, alcance.rendicionIds],
          [
            "DetRepuestosContratistaOT",
            `UPDATE "DetRepuestosContratistaOT" d SET "productoId" = $2::bigint FROM "DetContratistasOT" c
             WHERE c.id = d."detContratistaOTId" AND d."productoId" = $1::bigint AND c."otMantenimientoId" = ANY($3::bigint[])`,
            alcance.otMantenimientoIds,
          ],
        ];
        for (const [tabla, sql, ids] of hechos) {
          if (!ids || ids.length === 0) continue;
          const n = await tx.$executeRawUnsafe(sql, origenId, destinoId, ids);
          if (n > 0) filasActualizadas.push({ tabla, columna: "productoId", filas: n });
        }
      }

      // 3) Verificaciones: el kardex y los saldos del producto retirado no pueden quedar con movimiento propio
      if (alcance.tipo === "GLOBAL") {
        const kardexRestante = num((await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "KardexAlmacen" WHERE "productoId" = $1::bigint`, origenId))[0]?.n);
        if (kardexRestante > 0) {
          throw new ValidationError(`Tras el reprocesamiento el producto retirado conserva ${kardexRestante} registro(s) de kardex sin movimiento de almacén asociado. No se reemplazó nada.`);
        }
        const saldoRestante = (
          await tx.$queryRawUnsafe(
            `SELECT (SELECT COALESCE(SUM(ABS("saldoCantidad")), 0) FROM "SaldosProductoCliente" WHERE "productoId" = $1::bigint) +
                    (SELECT COALESCE(SUM(ABS("saldoCantidad")), 0) FROM "SaldosDetProductoCliente" WHERE "productoId" = $1::bigint) AS saldo`,
            origenId,
          )
        )[0]?.saldo;
        if (num(saldoRestante) !== 0) {
          throw new ValidationError(
            `El producto retirado conserva saldo de almacén (${num(saldoRestante)}) sin respaldo en un movimiento. Regularice ese saldo antes de reemplazarlo. No se reemplazó nada.`,
          );
        }
      }

      // 4) GLOBAL: el producto retirado se da de baja. Con "eliminarOrigen" se ELIMINA (fase de pruebas / depuración del maestro) solo si
      //    ya no queda ninguna relación en ninguna tabla; si no, se deja CESADO.
      let cesado = false;
      let eliminado = false;
      if (alcance.tipo === "GLOBAL") {
        // Filas de saldo en cero (el total ya se verificó en 0): sin saldo ni kardex no aportan nada y bloquearían la eliminación
        await tx.$executeRawUnsafe(`DELETE FROM "SaldosProductoCliente" WHERE "productoId" = $1::bigint`, origenId);
        await tx.$executeRawUnsafe(`DELETE FROM "SaldosDetProductoCliente" WHERE "productoId" = $1::bigint`, origenId);
        if (datos.eliminarOrigen) {
          const restantes = await relacionesDeProducto(tx, origenId);
          if (restantes.length > 0) {
            throw new ValidationError(
              `El producto retirado aún tiene relaciones y no se puede eliminar: ${restantes.map((r) => `${r.tabla}.${r.columna}: ${r.filas}`).join("; ")}. No se reemplazó nada.`,
            );
          }
          await tx.producto.delete({ where: { id: a.origen.id } });
          eliminado = true;
        } else {
          await tx.producto.update({ where: { id: a.origen.id }, data: { cesado: true } });
          cesado = true;
        }
      }

      const reporte = {
        alcance: alcance.tipo,
        productoOrigen: resumenProducto(a.origen),
        productoDestino: resumenProducto(a.destino),
        filasActualizadas,
        movimientosAlmacenReprocesados: movimientosReprocesados,
        avisos: a.avisos,
        productoOrigenCesado: cesado,
        productoOrigenEliminado: eliminado,
      };
      console.log("[REEMPLAZO_PRODUCTO]", JSON.stringify({ ...reporte, usuarioId: Number(usuarioId), fecha: new Date().toISOString() }));
      return reporte;
    },
    { maxWait: 20000, timeout: 600000 },
  );
}

export default { previsualizarReemplazo, ejecutarReemplazo, relacionesDeProducto };
