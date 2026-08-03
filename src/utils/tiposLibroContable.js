/**
 * CONSTANTES: Tipos de Libro Contable SUNAT
 * IDs de la tabla TipoLibroContableSunat
 * Usar estas constantes en lugar de IDs hardcodeados
 */

// ============================================
// LIBROS PRINCIPALES
// ============================================
export const TIPO_LIBRO = {
  CAJA_BANCOS: 1,                    // 01 - LIBRO CAJA Y BANCOS
  INGRESOS_GASTOS: 2,                // 02 - LIBRO DE INGRESOS Y GASTOS
  INVENTARIOS_BALANCES: 3,           // 03 - LIBRO DE INVENTARIOS Y BALANCES
  RETENCIONES_RENTA: 4,              // 04 - LIBRO DE RETENCIONES INCISOS E) Y F)
  DIARIO: 5,                         // 05 - LIBRO DIARIO
  MAYOR: 6,                          // 06 - LIBRO MAYOR
  ACTIVOS_FIJOS: 7,                  // 07 - REGISTRO DE ACTIVOS FIJOS
  COMPRAS: 8,                        // 08 - REGISTRO DE COMPRAS
  CONSIGNACIONES: 9,                 // 09 - REGISTRO DE CONSIGNACIONES
  COSTOS: 10,                        // 10 - REGISTRO DE COSTOS
  HUESPEDES: 11,                     // 11 - REGISTRO DE HUESPEDES
  INVENTARIO_UNIDADES: 12,           // 12 - REGISTRO DE INVENTARIO PERMANENTE EN UNIDADES FISICAS
  INVENTARIO_VALORIZADO: 13,         // 13 - REGISTRO DE INVENTARIO PERMANENTE VALORIZADO
  VENTAS: 14,                        // 14 - REGISTRO DE VENTAS E INGRESOS
  VENTAS_ART23: 15,                  // 15 - REGISTRO DE VENTAS E INGRESOS - ARTICULO 23
  PERCEPCIONES: 16,                  // 16 - REGISTRO DEL REGIMEN DE PERCEPCIONES
  RETENCIONES: 17,                   // 17 - REGISTRO DEL REGIMEN DE RETENCIONES
  IVAP: 18,                          // 18 - REGISTRO IVAP
  PLANILLAS: 31,                     // 31 - LIBRO DE PLANILLAS
};

// ============================================
// MAPEO POR MÓDULO
// ============================================
export const TIPO_LIBRO_POR_MODULO = {
  SALDO_INICIAL: TIPO_LIBRO.DIARIO,              // Todos los saldos iniciales
  SALDO_CTA_CTE: TIPO_LIBRO.DIARIO,              // SaldoCuentaCorriente
  DEUDA_TRIBUTARIA: null,                        // Depende de TipoDeudaTributaria.tipoLibroId
  DEUDA_PERSONAL: TIPO_LIBRO.PLANILLAS,          // DeudaConPersonal (provisión)
  PRESTAMO: TIPO_LIBRO.DIARIO,                   // PrestamoBancario
  COMPRA: TIPO_LIBRO.COMPRAS,                    // OrdenCompra
  VENTA: TIPO_LIBRO.VENTAS,                      // PreFactura
  CAJA: TIPO_LIBRO.CAJA_BANCOS,                  // MovimientoCaja
};

// ============================================
// HELPERS
// ============================================

/**
 * Obtiene el tipoLibroId para un asiento contable
 * @param {Object} params
 * @param {boolean} params.esSaldoInicial - Si es saldo inicial
 * @param {string} params.modulo - Módulo origen (COMPRA, VENTA, etc)
 * @param {number} params.tipoDeudaTributariaLibroId - Para deudas tributarias
 * @returns {number} ID del tipo de libro
 */
export function obtenerTipoLibroId({ esSaldoInicial, modulo, tipoDeudaTributariaLibroId }) {
  // Regla 1: Saldos iniciales siempre van a DIARIO
  if (esSaldoInicial) {
    return TIPO_LIBRO.DIARIO;
  }

  // Regla 2: Según módulo
  switch (modulo) {
    case 'DEUDA_TRIBUTARIA':
      return tipoDeudaTributariaLibroId || TIPO_LIBRO.DIARIO;
    case 'DEUDA_PERSONAL':
      return TIPO_LIBRO.PLANILLAS;
    case 'PRESTAMO':
      return TIPO_LIBRO.DIARIO;
    case 'COMPRA':
      return TIPO_LIBRO.COMPRAS;
    case 'VENTA':
      return TIPO_LIBRO.VENTAS;
    case 'CAJA':
      return TIPO_LIBRO.CAJA_BANCOS;
    default:
      return TIPO_LIBRO.DIARIO;
  }
}