/**
 * Observación de una línea de compra apta para imprimir o copiar a otros documentos.
 *
 * DetalleOrdenCompra.observaciones es una descripción complementaria que escribe el usuario, pero el sistema también guarda ahí
 * textos internos que NO deben salir en un documento:
 *  - la nota de la importación SIRE ("📋 CONCEPTO ORIGINAL (XML): ... ACCIÓN REQUERIDA: Asignar producto correcto");
 *  - la marca de anticipos ("ANTICIPO-OC:<id> "), que se quita y deja el texto del usuario si lo hubiera.
 *
 * @param {string|null|undefined} texto - Valor de DetalleOrdenCompra.observaciones
 * @returns {string|null} Texto imprimible o null si no hay nada que mostrar
 */
export const observacionImprimible = (texto) => {
  const limpio = String(texto ?? '').trim();
  if (!limpio || limpio.startsWith('📋 CONCEPTO ORIGINAL')) return null;
  return limpio.replace(/^ANTICIPO-OC:\d+\s*/, '').trim() || null;
};

export default { observacionImprimible };
