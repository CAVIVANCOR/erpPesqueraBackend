# Preferencias del proyecto (ERP Pesquera)

## Errores al usuario
- El sistema siempre debe informar al usuario de los errores que ocurren, de forma ESPECÍFICA, para que pueda corregirlos.
  No usar mensajes genéricos como "No se pudo guardar".
- Backend: lanzar errores con mensaje concreto (qué dato, qué registro, qué hacer). `errorHandler` responde `mensaje` y `message`.
- Frontend: mostrar el mensaje del servidor en un toast rojo. Usar `src/utils/mensajeError.js` (`mensajeDeError(error, accionFallida)`).
- Datos obligatorios: toast que nombre el campo obligatorio.

## Operaciones de Tesorería
- Todos los movimientos de caja nacen en Tesorería Pendientes con `refOperacionEspecializadaMovCaja`.
- La reversión se hace por operación (`/api/tesoreria/operaciones`), no por movimiento suelto.
- ITF y comisión bancaria SIEMPRE son movimientos de caja (egresos) y asientos aparte y adicionales: nunca se restan del monto principal ni del depósito del banco.
- Factoring: el banco financia el 100 % de cada factura; todas se cancelan (canje) por su saldo completo aunque el monto del préstamo no las cubra (solo se avisa).
  La modalidad del interés la define el préstamo (`PrestamoBancario.interesDescontado`): DESCONTADO por adelantado (el banco deposita el neto: un ingreso, un asiento,
  cuotas solo de capital) o DIFERIDO en las cuotas (el banco deposita el bruto, sin descuento). En ambos, el pasivo 454911 va por el bruto. El factoring admite N cuotas (normalmente 1).
- Terminología de préstamos con accionistas y terceros: solo "Prestamista" y "Deudor" (valores internos OTORGADO = la empresa es el Prestamista, RECIBIDO = la empresa es el Deudor); operaciones: Desembolso y Devolución.
- Orden de la cadena de saldos de cuenta: fecha e id (el id desempata; siempre `orderBy: [{ fecha: 'desc' }, { id: 'desc' }]`).
- Tarjetas de crédito empresariales: cada tarjeta es una `CuentaCorriente` cuyo `TipoCuentaCorriente.esTarjetaCredito = true`, con cuenta contable 454611 (soles) / 454612 (dólares),
  `limiteCredito`, `diaCierre` y `diaPago`. El saldo negativo de la tarjeta es la deuda; disponible = límite + saldo (`obtenerSaldoCuenta`).
  Compra: pago normal de la CxP o gasto con la cuenta tarjeta (DEBE 421201 / HABER 454611, movimiento de caja reversible). Pago de la tarjeta: transferencia interna
  banco → tarjeta (DEBE 454611 / HABER banco). Intereses y comisiones que el banco carga a la tarjeta: Gastos Bancarios sobre la cuenta tarjeta (DEBE 673111 o 679401 / HABER 454611).
  No hay cronograma por compra: las cuotas se pagan con el monto del estado de cuenta. Un `PrestamoBancario` de tipo `esTarjetaCredito` no se desembolsa en caja.
  El saldo consolidado de caja excluye las tarjetas; su deuda, línea, disponible y fechas de cierre y pago se informan aparte (`tarjetasCredito`).
- Factoring de ventas: una cuota por factura (`CuotaPrestamo.cuentaPorCobrarId`), creadas en Préstamo Bancario con el vencimiento escrito por el usuario; el desembolso toma las facturas
  de las cuotas (un préstamo sin cuotas amarradas conserva la selección manual). El cobro del cliente cancela el capital de SU cuota; si MEGUI paga la cuota, vuelve a cartera solo esa factura.
  Servicio: `facturasCuotaPrestamo.service.js`. Interés descontado = `montoAprobado - montoDesembolsado` del préstamo.
- Factoring indirecto (compras): el proveedor cedió sus facturas a un banco; MEGUI las paga al banco. Es un `PrestamoBancario` de tipo `TipoPrestamo.esFactoringCompras` con banco y SIN cuenta corriente,
  una cuota por factura de compra (`CuotaPrestamo.cuentaPorPagarId`, todas de un mismo proveedor, sin detracción/retención/percepción), vencimiento escrito por el usuario, cuotas solo de capital (tasa 0 permitida).
  Servicios: `facturasCuotaPrestamo.service.js` (cuotas) y `factoringIndirectoPrestamo.service.js` (desembolso e intereses).
  DESEMBOLSO sin caja (Tesorería Pendientes → `DesembolsoFactoringIndirectoForm`): por factura, pago de CxP con medio FACTORING (sin movimiento, ligado al préstamo, con número de operación), CxP CANJEADA y asiento
  DEBE 421201/421202 (proveedor) / HABER 421203/421204 (banco); el préstamo pasa a DESEMBOLSADO. Las cuotas ya no se editan.
  PAGO de cuota: flujo normal de pago de cuotas, capital a 421203/421204 a nombre del banco (parcial permitido). REVERSIÓN: por operación en `/api/tesoreria/operaciones`; el motor reconoce las operaciones sin caja por los
  pagos de canje (`reversionOperacionCaja.service.js`) y bloquea si hay cuotas pagadas (revertir primero esos pagos).
  INTERESES: el banco los cobra al proveedor y el proveedor emite una factura (compra "INTERES FINANCIEROS") que se paga al proveedor como cualquier CxP y se enlaza con la cuota (`CuotaPrestamo.cuentaPorPagarInteresId`).
- Movimientos de rendición sin proceso (p. ej. gerencia): origen TESORERÍA (módulo con modelo `DetMovsEntregaRendir`) y el propio id; al generar la compra pasa a COMPRAS + id de la OC.
  Su unidad de negocio es la marcada `UnidadNegocio.esGastosGenerales`.

## Esquema de base de datos (PROHIBIDO modificar: solo lo hace el usuario)
- NUNCA editar `prisma/schema.prisma`, NUNCA crear ni ejecutar migraciones (`prisma migrate`, `db push`, SQL de estructura). Solo el usuario modifica el esquema.
- Si un cambio necesita un campo o modelo nuevo: proponerlo por escrito (modelo, campo, tipo, valor por defecto y línea donde iría), esperar a que el usuario lo aplique y migre, y recién entonces implementar el código que lo usa.
- Aunque el usuario diga "implementa todo", el esquema sigue siendo solo del usuario.

## Fechas (CRÍTICO: error grave ya cometido, no repetir)
- Frontend: toda fecha que se envía al backend para guardarse (fecha de operación, pago, desembolso, emisión, vencimiento, etc.)
  se envía con `fecha.toISOString()` (medianoche local). NUNCA como texto `YYYY-MM-DD`, ni con `aISO`/`toISOString().split("T")[0]`/`slice(0, 10)`:
  el servidor lo interpreta como UTC y en Perú (UTC-5) la fecha retrocede un día en movimientos, asientos y saldos.
- El formato `YYYY-MM-DD` solo se permite para CONSULTAS (p. ej. tipo de cambio SUNAT), nunca para datos que se persisten.
- Al crear cualquier formulario o diálogo nuevo con fechas: copiar el patrón de `OperacionPrestamoForm.jsx` (`fecha.toISOString()`) y
  revisar TODOS los campos de fecha del payload antes de dar el trabajo por terminado.
- Backend: los cálculos por fecha de los módulos de letras usan UTC (`getUTC*`); una fecha ISO de medianoche local cae en el mismo día UTC.

## Forma de trabajo
- Producción crítica: no ejecutar verificaciones innecesarias; sí probar con rollback cuando se toquen flujos contables.
