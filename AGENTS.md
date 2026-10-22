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
  El interés puede ir DESCONTADO del desembolso (un ingreso por el neto, un asiento) o COBRADO APARTE (ingreso por el bruto + egreso del interés); en ambos, el pasivo 454911 va por el bruto.
- Orden de la cadena de saldos de cuenta: fecha e id (el id desempata; siempre `orderBy: [{ fecha: 'desc' }, { id: 'desc' }]`).

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
