# ❓ PREGUNTAS SOBRE CAMPOS ADICIONALES PARA MOVIMIENTOS DE ALMACÉN

## 📊 ESTADO ACTUAL

He revisado el módulo de Inventarios y comparado con la implementación actual de finalización de faena.

### ✅ **CAMPOS YA IMPLEMENTADOS (SUFICIENTES PARA FUNCIONAR):**

**Cabecera del Movimiento:**
- ✅ empresaId, tipoDocumentoId, conceptoMovAlmacenId
- ✅ serieDocId, fechaDocumento, estadoDocAlmacenId
- ✅ entidadComercialId (proveedor/cliente)
- ✅ faenaPescaId, embarcacionId
- ✅ personalRespAlmacen
- ✅ esCustodia, observaciones
- ✅ creadoPor, actualizadoPor

**Detalles del Movimiento:**
- ✅ productoId, cantidad, peso
- ✅ lote, fechaProduccion, fechaVencimiento, fechaIngreso
- ✅ estadoMercaderiaId, estadoCalidadId
- ✅ entidadComercialId, empresaId
- ✅ costoUnitario, precioUnitario (en 0 por ahora)

---

## ❓ PREGUNTAS SOBRE CAMPOS OPCIONALES

### 1️⃣ **DIRECCIONES (dirOrigenId, dirDestinoId)**

El modelo `DescargaFaenaPesca` tiene:
- `puertoDescargaId`: Puerto donde se descarga
- `puertoFondeoId`: Puerto de fondeo

**PREGUNTA:** 
¿Necesitas que los movimientos de almacén tengan direcciones específicas?

**Opciones:**
- **A)** SÍ, usar `puertoDescargaId` como dirección de origen
- **B)** SÍ, pero usar direcciones de la empresa/cliente
- **C)** NO, dejar en `null` (no es necesario para el proceso)

---

### 2️⃣ **GUÍA DE REMISIÓN SUNAT (numGuiaSunat, fechaGuiaSunat)**

**PREGUNTA:** 
¿Se emite guía de remisión SUNAT al finalizar la faena?

**Opciones:**
- **A)** SÍ, se genera automáticamente (necesito saber cómo)
- **B)** SÍ, pero se ingresa manualmente después
- **C)** NO, no se usa guía de remisión en este proceso

---

### 3️⃣ **TRANSPORTE (transportistaId, vehiculoId)**

El modelo `DescargaFaenaPesca` NO tiene campos de transporte.

**PREGUNTA:** 
¿Hay información de transporte que deba incluirse en los movimientos?

**Opciones:**
- **A)** SÍ, hay transportista y vehículo (¿dónde está esa info?)
- **B)** NO, no se usa transporte en este proceso

---

### 4️⃣ **AGENCIA DE ENVÍO (agenciaEnvioId, dirAgenciaEnvioId)**

**PREGUNTA:** 
¿Se usa agencia de envío en el proceso de pesca?

**Opciones:**
- **A)** SÍ (¿dónde está esa información?)
- **B)** NO, no aplica para este proceso

---

### 5️⃣ **ÓRDENES (ordenCompraId, pedidoVentaId, ordenTrabajoId)**

**PREGUNTA:** 
¿Las faenas están relacionadas con órdenes de compra, pedidos de venta u órdenes de trabajo?

**Opciones:**
- **A)** SÍ, con orden de compra (¿dónde está el ID?)
- **B)** SÍ, con pedido de venta (¿dónde está el ID?)
- **C)** SÍ, con orden de trabajo (¿dónde está el ID?)
- **D)** NO, no hay relación con órdenes

---

### 6️⃣ **NÚMERO DE CONTENEDOR (nroContenedor en detalle)**

**PREGUNTA:** 
¿Los productos de pesca se almacenan en contenedores con número?

**Opciones:**
- **A)** SÍ, usar `numPlataformaDescarga` de DescargaFaenaPesca
- **B)** SÍ, pero está en otro campo (¿cuál?)
- **C)** NO, no se usa número de contenedor

---

### 7️⃣ **COSTOS Y PRECIOS**

Actualmente están en `0`.

**PREGUNTA:** 
¿Necesitas calcular costos y precios reales al crear los movimientos?

**Opciones:**
- **A)** SÍ, hay una tabla de costos/precios por producto
- **B)** SÍ, se calcula de alguna forma (¿cómo?)
- **C)** NO, se mantienen en `0` por ahora

---

### 8️⃣ **FECHA DE VENCIMIENTO**

Actualmente: `fechaProduccion + 30 días`

**PREGUNTA:** 
¿Es correcto calcular el vencimiento como 30 días después de la producción?

**Opciones:**
- **A)** SÍ, siempre son 30 días
- **B)** NO, depende del producto/especie (¿cómo se determina?)
- **C)** NO, hay otra lógica (¿cuál?)

---

### 9️⃣ **OBSERVACIONES EN DETALLE**

**PREGUNTA:** 
¿Necesitas agregar observaciones específicas en cada detalle del movimiento?

**Opciones:**
- **A)** SÍ, usar `observaciones` de DescargaFaenaPesca
- **B)** SÍ, pero con otra información (¿cuál?)
- **C)** NO, no es necesario

---

### 🔟 **INFORMACIÓN ADICIONAL DE DESCARGA**

El modelo `DescargaFaenaPesca` tiene campos que podrían ser útiles:
- `numWinchaPesaje`: Número de wincha de pesaje
- `numReporteRecepcion`: Número de reporte de recepción
- `porcentajeJuveniles`: Porcentaje de juveniles
- `latitud/longitud`: Coordenadas de descarga
- `urlComprobanteWincha`: URL del comprobante
- `urlInformeDescargaProduce`: URL del informe PRODUCE

**PREGUNTA:** 
¿Alguno de estos datos debe incluirse en los movimientos de almacén?

**Opciones:**
- **A)** SÍ, incluir en observaciones del movimiento
- **B)** SÍ, incluir en observaciones del detalle
- **C)** NO, no es necesario

---

## 🎯 MI RECOMENDACIÓN

**Para iniciar, la implementación actual es SUFICIENTE:**

✅ Crea movimientos válidos
✅ Genera kardex correctamente
✅ Actualiza saldos
✅ Mantiene trazabilidad básica

**Los campos opcionales pueden agregarse después** según las necesidades del negocio.

---

## 📝 RESPONDE SOLO LO QUE NECESITES

**Formato sugerido:**
```
1. Direcciones: C (no necesario)
2. Guía SUNAT: C (no se usa)
3. Transporte: B (no aplica)
4. Agencia: B (no aplica)
5. Órdenes: D (sin relación)
6. Contenedor: C (no se usa)
7. Costos: C (mantener en 0)
8. Vencimiento: A (30 días está bien)
9. Observaciones detalle: C (no necesario)
10. Info adicional: C (no necesario)
```

O simplemente dime: **"Procede con la implementación actual"** si todo está bien.
