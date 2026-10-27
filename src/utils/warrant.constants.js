// WARRANT (préstamo con garantía de mercadería depositada en un AGD).
// El sistema NO tiene campo "esWarrant" en TipoPrestamo: el Warrant se reconoce por su id en la tabla TipoPrestamo
// (id 15, descripción "WARRANT", garantía, refinanciable). Si ese registro cambia de id, actualizar TIPO_PRESTAMO_WARRANT_ID.
//
// Contabilización (Tesorería; el movimiento de mercadería de Almacén 281101 / 201111 es otro módulo, no implementado aquí):
//   DESEMBOLSO   DEBE banco / HABER 454915-454916 (capital)
//                DEBE 373101 / HABER 454915-454916 (intereses totales del cronograma, sin caja, en la misma operación)
//   PAGO CUOTA   DEBE 454915-454916 (capital + interés de la cuota) / HABER banco
//                DEBE 673111 / HABER 373101 (devengo del interés imputado en el pago, sin caja, en la misma operación)
//   Seguro, comisión y mora de la cuota siguen igual que en un préstamo estándar. ITF y comisión bancaria son asientos aparte.
export const TIPO_PRESTAMO_WARRANT_ID = 15;

export const CUENTAS_WARRANT = {
  prestamo: { soles: "454915", dolares: "454916" },
  interesesNoDevengados: "373101",
  gastoIntereses: "673111",
};

export const esPrestamoWarrant = (prestamo) =>
  Number(prestamo?.tipoPrestamo?.id ?? prestamo?.tipoPrestamoId) === TIPO_PRESTAMO_WARRANT_ID;
