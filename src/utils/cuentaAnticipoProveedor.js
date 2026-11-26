import { ValidationError } from "./errors.js";

/**
 * Cuenta contable de un ANTICIPO entregado a un proveedor (grupo 422: 422101 soles / 422102 dólares).
 *
 * El producto "ANTICIPO A PROVEEDORES" guarda su cuenta en "Cuenta Compras". Un anticipo no es un gasto: si el producto tuviera una
 * cuenta de gasto o de existencias, el pago lo llevaría a resultados o a inventario. Por eso solo se respeta la cuenta del producto
 * cuando pertenece al grupo 422; en cualquier otro caso se usa la cuenta estándar de anticipos según la moneda.
 * Es el espejo de utils/cuentaAnticipoCliente.js (grupo 122) para el lado de compras.
 */
const PREFIJO_ANTICIPOS_PROVEEDORES = "422";

/**
 * @param {object} db - cliente Prisma o transacción
 * @param {object|null} producto - producto del anticipo (con cuentaComprasId)
 * @param {boolean} esMonedaNacional - true = soles (422101), false = dólares (422102)
 * @returns {Promise<bigint|number>} id de la cuenta contable
 */
export async function resolverCuentaAnticipoProveedor(db, producto, esMonedaNacional) {
  if (producto?.cuentaComprasId) {
    const cuentaProducto = await db.planCuentasContable.findUnique({
      where: { id: producto.cuentaComprasId },
      select: { id: true, codigoCuenta: true },
    });
    if (cuentaProducto && String(cuentaProducto.codigoCuenta).startsWith(PREFIJO_ANTICIPOS_PROVEEDORES)) return cuentaProducto.id;
  }
  const codigo = esMonedaNacional ? "422101" : "422102";
  const cuentaEstandar = await db.planCuentasContable.findFirst({
    where: { codigoCuenta: codigo, activo: true },
    select: { id: true },
  });
  if (!cuentaEstandar) {
    throw new ValidationError(`No se encontró la cuenta ${codigo} (Anticipos a proveedores). Configure el plan de cuentas antes de registrar el anticipo.`);
  }
  return cuentaEstandar.id;
}
