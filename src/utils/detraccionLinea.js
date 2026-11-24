import { ValidationError } from './errors.js';

/**
 * Detracción por LÍNEA de compra (DetalleOrdenCompra.tipoDetraccionId / porcentajeDetraccion).
 *
 * El producto (Producto.tipoDetraccionId / porcentajeDetraccion) solo SUGIERE el tipo: en Compras el usuario copia de la factura
 * física del proveedor el tipo que corresponde a esa operación y lo elige en la línea. Lo guardado en la línea es lo que cuenta
 * para el cálculo de totales (ordenCompra.service > calcularTotalesEImpuestos). Línea sin tipo = la línea no aplica detracción.
 */

const SIN_DETRACCION = { tipoDetraccionId: null, porcentajeDetraccion: null };

/**
 * Sugerencia de detracción de un producto, lista para copiar a una línea.
 * @param {{ tipoDetraccionId?: any, porcentajeDetraccion?: any }} producto
 */
export const detraccionDeProducto = (producto) =>
  producto?.tipoDetraccionId
    ? { tipoDetraccionId: producto.tipoDetraccionId, porcentajeDetraccion: producto.porcentajeDetraccion ?? null }
    : { ...SIN_DETRACCION };

/**
 * Sugerencias de varios productos con una sola consulta. Devuelve Map(String(productoId) -> sugerencia).
 * Las líneas que se crean solas (requerimiento, rendición, mantenimiento) copian la sugerencia para conservar la
 * detracción que antes salía directamente del producto.
 */
export const detraccionesDeProductos = async (db, productoIds) => {
  const ids = [...new Set((productoIds || []).filter(Boolean).map(Number))];
  if (ids.length === 0) return new Map();
  const productos = await db.producto.findMany({
    where: { id: { in: ids } },
    select: { id: true, tipoDetraccionId: true, porcentajeDetraccion: true },
  });
  return new Map(productos.map((p) => [String(p.id), detraccionDeProducto(p)]));
};

/**
 * Valida y completa lo que el usuario eligió para una línea: el tipo debe existir y estar activo; el porcentaje, si no se
 * indica, es la tasa del tipo. Sin tipo (null/0) la línea queda sin detracción.
 */
export const resolverDetraccionLinea = async (db, { tipoDetraccionId, porcentajeDetraccion } = {}) => {
  if (!tipoDetraccionId) return { ...SIN_DETRACCION };

  const tipo = await db.tipoDetraccion.findUnique({ where: { id: Number(tipoDetraccionId) } });
  if (!tipo) {
    throw new ValidationError(`El tipo de detracción elegido (id ${tipoDetraccionId}) no existe. Elija uno de la lista.`);
  }
  if (!tipo.activo) {
    throw new ValidationError(`El tipo de detracción ${tipo.codigo} - ${tipo.nombre} está inactivo. Elija otro o actívelo en Tipos de Detracción.`);
  }

  const porcentaje = porcentajeDetraccion != null && Number(porcentajeDetraccion) > 0 ? Number(porcentajeDetraccion) : Number(tipo.tasa);
  return { tipoDetraccionId: tipo.id, porcentajeDetraccion: porcentaje };
};
