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
- Orden de la cadena de saldos de cuenta: fecha e id (el id desempata; siempre `orderBy: [{ fecha: 'desc' }, { id: 'desc' }]`).

## Forma de trabajo
- Producción crítica: no ejecutar verificaciones innecesarias; sí probar con rollback cuando se toquen flujos contables.
