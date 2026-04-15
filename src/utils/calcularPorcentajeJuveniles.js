/**
 * Función genérica para calcular el porcentaje de juveniles según normativa PRODUCE
 * Talla mínima legal para Anchoveta: 12 cm
 * 
 * @param {Object} detalle - Objeto con campos talla_9_50 hasta talla_16_00
 * @returns {Object} { porcentajeJuveniles, totalEjemplares }
 */
export function calcularPorcentajeJuveniles(detalle) {
  const TALLA_MINIMA_LEGAL = 12; // cm (PRODUCE)
  
  // Array de tallas con sus cantidades
  const tallas = [
    { talla: 9.50, cantidad: detalle.talla_9_50 || 0 },
    { talla: 10.00, cantidad: detalle.talla_10_00 || 0 },
    { talla: 10.50, cantidad: detalle.talla_10_50 || 0 },
    { talla: 11.00, cantidad: detalle.talla_11_00 || 0 },
    { talla: 11.50, cantidad: detalle.talla_11_50 || 0 },
    { talla: 12.00, cantidad: detalle.talla_12_00 || 0 },
    { talla: 12.50, cantidad: detalle.talla_12_50 || 0 },
    { talla: 13.00, cantidad: detalle.talla_13_00 || 0 },
    { talla: 13.50, cantidad: detalle.talla_13_50 || 0 },
    { talla: 14.00, cantidad: detalle.talla_14_00 || 0 },
    { talla: 14.50, cantidad: detalle.talla_14_50 || 0 },
    { talla: 15.00, cantidad: detalle.talla_15_00 || 0 },
    { talla: 15.50, cantidad: detalle.talla_15_50 || 0 },
    { talla: 16.00, cantidad: detalle.talla_16_00 || 0 },
  ];
  
  // Contar juveniles (< 12 cm)
  const juveniles = tallas
    .filter(t => t.talla < TALLA_MINIMA_LEGAL)
    .reduce((sum, t) => sum + t.cantidad, 0);
  
  // Total de ejemplares medidos
  const totalEjemplares = tallas
    .reduce((sum, t) => sum + t.cantidad, 0);
  
  // Calcular porcentaje
  const porcentajeJuveniles = totalEjemplares > 0 
    ? Math.round((juveniles / totalEjemplares) * 1000) / 10 
    : 0;
  
  return {
    porcentajeJuveniles,
    totalEjemplares
  };
}