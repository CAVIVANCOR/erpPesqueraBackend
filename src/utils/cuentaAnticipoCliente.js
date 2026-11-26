import { ValidationError } from "./errors.js";

/**
 * Cuenta contable de un ANTICIPO recibido de un cliente (grupo 122: 122101 soles / 122102 dólares).
 *
 * Convención del maestro de productos: en los productos de anticipo (ANTICIPO DE CLIENTES, ANTICIPO A PROVEEDORES) la cuenta del
 * anticipo (122101 / 422101) se guarda en "Cuenta Compras", mientras que "Cuenta Ventas" puede traer una cuenta de ingresos genérica
 * (p. ej. 703211 Servicios). Un anticipo no es un ingreso: nunca debe contabilizarse contra esa cuenta de ingresos. Por eso se busca,
 * entre las cuentas del producto, la que pertenece al grupo 122; si ninguna lo es se usa la cuenta estándar de anticipos según la moneda.
 */
const PREFIJO_ANTICIPOS_CLIENTES = "122";

/** ids (texto) de las cuentas del grupo 122, para reconocer la cuenta de anticipo de un producto sin consultar la base por línea */
export async function obtenerIdsCuentasAnticipoCliente(db) {
  const cuentas = await db.planCuentasContable.findMany({
    where: { codigoCuenta: { startsWith: PREFIJO_ANTICIPOS_CLIENTES } },
    select: { id: true },
  });
  return new Set(cuentas.map((c) => String(c.id)));
}

/**
 * Cuenta que debe usarse para la línea de un producto en el asiento de venta: la cuenta de anticipo del producto si la tiene
 * (grupo 122, en "Cuenta Compras" o "Cuenta Ventas"); en cualquier otro caso su cuenta de ventas de siempre.
 */
export function cuentaDeIngresoDelDetalle(producto, idsCuentasAnticipo) {
  const cuentaAnticipo = [producto?.cuentaComprasId, producto?.cuentaVentasId].find((id) => id && idsCuentasAnticipo.has(String(id)));
  return cuentaAnticipo || producto?.cuentaVentasId || null;
}

/**
 * @param {object} db - cliente Prisma o transacción
 * @param {object|null} producto - producto del anticipo (con cuentaComprasId y cuentaVentasId)
 * @param {boolean} esMonedaNacional - true = soles (122101), false = dólares (122102)
 * @returns {Promise<bigint|number>} id de la cuenta contable
 */
export async function resolverCuentaAnticipoCliente(db, producto, esMonedaNacional) {
  const candidatas = [producto?.cuentaComprasId, producto?.cuentaVentasId].filter(Boolean);
  if (candidatas.length > 0) {
    const cuentas = await db.planCuentasContable.findMany({
      where: { id: { in: candidatas } },
      select: { id: true, codigoCuenta: true },
    });
    const delGrupo = candidatas
      .map((id) => cuentas.find((c) => String(c.id) === String(id)))
      .find((c) => c && String(c.codigoCuenta).startsWith(PREFIJO_ANTICIPOS_CLIENTES));
    if (delGrupo) return delGrupo.id;
  }
  const codigo = esMonedaNacional ? "122101" : "122102";
  const cuentaEstandar = await db.planCuentasContable.findFirst({
    where: { codigoCuenta: codigo, activo: true },
    select: { id: true },
  });
  if (!cuentaEstandar) {
    throw new ValidationError(`No se encontró la cuenta ${codigo} (Anticipos de clientes). Configure el plan de cuentas antes de registrar el anticipo.`);
  }
  return cuentaEstandar.id;
}
