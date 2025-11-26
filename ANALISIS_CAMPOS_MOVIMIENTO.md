# 📊 ANÁLISIS DE CAMPOS PARA MOVIMIENTO DE ALMACÉN

## 🔍 COMPARACIÓN: MÓDULO INVENTARIOS vs FINALIZACIÓN FAENA

### ✅ CAMPOS OBLIGATORIOS (Ya implementados)

| Campo | Tipo | Origen en Faena | Estado |
|-------|------|-----------------|--------|
| `empresaId` | BigInt | `temporada.empresaId` | ✅ OK |
| `tipoDocumentoId` | BigInt | 13 (INGRESO) / 14 (SALIDA) | ✅ OK |
| `conceptoMovAlmacenId` | BigInt | 1 (INGRESO) / 3 (SALIDA) | ✅ OK |
| `serieDocId` | BigInt | ID 1 (INGRESO) / ID 2 (SALIDA) | ✅ OK |
| `fechaDocumento` | DateTime | `new Date()` | ✅ OK |
| `estadoDocAlmacenId` | BigInt | 30 (PENDIENTE) | ✅ OK |

### ✅ CAMPOS OPCIONALES (Ya implementados)

| Campo | Tipo | Origen en Faena | Estado |
|-------|------|-----------------|--------|
| `entidadComercialId` | BigInt? | Proveedor MEGUI / Cliente Hayduk | ✅ OK |
| `faenaPescaId` | BigInt? | `faena.id` | ✅ OK |
| `embarcacionId` | BigInt? | `temporada.embarcacionId` | ✅ OK |
| `personalRespAlmacen` | BigInt? | `parametroAprobador.personalRespId` | ✅ OK |
| `esCustodia` | Boolean | `false` | ✅ OK |
| `observaciones` | String? | Descripción automática | ✅ OK |
| `creadoPor` | BigInt? | `usuarioId` | ✅ OK |
| `actualizadoPor` | BigInt? | `usuarioId` | ✅ OK |

### ❓ CAMPOS OPCIONALES (NO implementados - REQUIEREN DECISIÓN)

| Campo | Tipo | ¿Necesario? | Pregunta |
|-------|------|-------------|----------|
| `ordenTrabajoId` | BigInt? | ❓ | ¿Las faenas de pesca se relacionan con órdenes de trabajo? |
| `dirOrigenId` | BigInt? | ❓ | ¿Necesitas especificar dirección de origen del movimiento? |
| `dirDestinoId` | BigInt? | ❓ | ¿Necesitas especificar dirección de destino del movimiento? |
| `numGuiaSunat` | String? | ❓ | ¿Se genera guía de remisión SUNAT al finalizar faena? |
| `fechaGuiaSunat` | DateTime? | ❓ | ¿Fecha de la guía de remisión SUNAT? |
| `transportistaId` | BigInt? | ❓ | ¿Hay un transportista asociado a la descarga? |
| `vehiculoId` | BigInt? | ❓ | ¿Hay un vehículo asociado a la descarga? |
| `agenciaEnvioId` | BigInt? | ❓ | ¿Se usa agencia de envío en el proceso de pesca? |
| `dirAgenciaEnvioId` | BigInt? | ❓ | ¿Dirección de la agencia de envío? |
| `ordenCompraId` | BigInt? | ❓ | ¿La faena está relacionada con una orden de compra? |
| `pedidoVentaId` | BigInt? | ❓ | ¿La faena está relacionada con un pedido de venta? |

---

## 📦 CAMPOS DE DETALLE MOVIMIENTO

### ✅ CAMPOS OBLIGATORIOS (Ya implementados)

| Campo | Tipo | Origen en Descarga | Estado |
|-------|------|-------------------|--------|
| `productoId` | BigInt | Búsqueda por empresa+cliente+especie | ✅ OK |
| `cantidad` | Decimal | `descarga.toneladas` | ✅ OK |
| `empresaId` | BigInt | `temporada.empresaId` | ✅ OK |

### ✅ CAMPOS OPCIONALES (Ya implementados)

| Campo | Tipo | Origen en Descarga | Estado |
|-------|------|-------------------|--------|
| `peso` | Decimal? | `descarga.toneladas` | ✅ OK |
| `lote` | String? | `temporada.numeroResolucion` | ✅ OK |
| `fechaProduccion` | DateTime? | `descarga.fechaHoraInicioDescarga` | ✅ OK |
| `fechaVencimiento` | DateTime? | fechaProduccion + 30 días | ✅ OK |
| `fechaIngreso` | DateTime? | `descarga.fechaHoraInicioDescarga` | ✅ OK |
| `estadoMercaderiaId` | BigInt? | 6 (Liberado) | ✅ OK |
| `estadoCalidadId` | BigInt? | 10 (Calidad A) | ✅ OK |
| `entidadComercialId` | BigInt? | `descarga.clienteId` | ✅ OK |
| `esCustodia` | Boolean | `false` | ✅ OK |
| `costoUnitario` | Decimal? | 0 (por ahora) | ✅ OK |
| `precioUnitario` | Decimal? | 0 (por ahora) | ✅ OK |
| `creadoPor` | BigInt? | `usuarioId` | ✅ OK |
| `actualizadoPor` | BigInt? | `usuarioId` | ✅ OK |

### ❓ CAMPOS OPCIONALES (NO implementados - REQUIEREN DECISIÓN)

| Campo | Tipo | ¿Necesario? | Pregunta |
|-------|------|-------------|----------|
| `nroSerie` | String? | ❓ | ¿Los productos de pesca tienen número de serie? |
| `nroContenedor` | String? | ❓ | ¿Se usa número de contenedor en las descargas? |
| `observaciones` | String? | ❓ | ¿Necesitas observaciones específicas por cada descarga? |

---

## 🎯 PREGUNTAS CRÍTICAS PARA EL USUARIO

### 1. **Direcciones de Origen y Destino**
¿Los movimientos de almacén de faena necesitan especificar direcciones físicas?
- `dirOrigenId`: Dirección de donde sale la mercadería
- `dirDestinoId`: Dirección a donde llega la mercadería

**Opciones:**
- ✅ **SÍ** → ¿De dónde obtengo estas direcciones? (¿De la embarcación? ¿Del cliente? ¿De la empresa?)
- ❌ **NO** → Se dejan en `null`

---

### 2. **Guía de Remisión SUNAT**
¿Se genera guía de remisión SUNAT al finalizar la faena?
- `numGuiaSunat`: Número de la guía
- `fechaGuiaSunat`: Fecha de emisión

**Opciones:**
- ✅ **SÍ** → ¿Cómo se genera el número? ¿Es manual o automático?
- ❌ **NO** → Se dejan en `null`

---

### 3. **Transporte**
¿Las descargas tienen información de transporte?
- `transportistaId`: Empresa transportista
- `vehiculoId`: Vehículo que transporta

**Opciones:**
- ✅ **SÍ** → ¿Esta información está en `DescargaFaenaPesca`? ¿O en otro modelo?
- ❌ **NO** → Se dejan en `null`

---

### 4. **Órdenes de Compra/Venta**
¿Las faenas están relacionadas con órdenes de compra o pedidos de venta?
- `ordenCompraId`: Orden de compra relacionada
- `pedidoVentaId`: Pedido de venta relacionado

**Opciones:**
- ✅ **SÍ** → ¿De dónde obtengo estos IDs?
- ❌ **NO** → Se dejan en `null`

---

### 5. **Costos y Precios**
Actualmente están en `0`. ¿Necesitas calcular costos reales?
- `costoUnitario`: Costo por unidad del producto
- `precioUnitario`: Precio de venta por unidad

**Opciones:**
- ✅ **SÍ** → ¿Cómo se calcula? ¿Hay una tabla de costos/precios?
- ❌ **NO** → Se mantienen en `0`

---

### 6. **Número de Contenedor**
¿Las descargas usan contenedores?
- `nroContenedor`: Número de contenedor

**Opciones:**
- ✅ **SÍ** → ¿Esta información está en `DescargaFaenaPesca`?
- ❌ **NO** → Se deja en `null`

---

### 7. **Fecha de Vencimiento**
Actualmente se calcula como `fechaProduccion + 30 días`. ¿Es correcto?

**Opciones:**
- ✅ **SÍ** → Se mantiene la lógica actual
- ❌ **NO** → ¿Cuál es la lógica correcta? ¿Depende del producto/especie?

---

### 8. **Estados de Mercadería y Calidad**
Actualmente se usan valores fijos:
- `estadoMercaderiaId = 6` (Liberado)
- `estadoCalidadId = 10` (Calidad A)

**Opciones:**
- ✅ **SÍ** → Se mantienen los valores fijos
- ❌ **NO** → ¿De dónde se obtienen? ¿Dependen de la descarga?

---

## 📋 RESUMEN DE IMPLEMENTACIÓN ACTUAL

### ✅ LO QUE YA ESTÁ IMPLEMENTADO:

1. **Cabecera del Movimiento:**
   - Empresa, tipo documento, concepto, serie
   - Fecha de documento
   - Entidad comercial (proveedor/cliente)
   - Faena y embarcación
   - Responsable de almacén
   - Estado inicial (PENDIENTE)
   - Auditoría (creado por, actualizado por)

2. **Detalles del Movimiento:**
   - Producto (búsqueda automática)
   - Cantidad y peso (desde toneladas)
   - Lote (desde número de resolución)
   - Fechas (producción, vencimiento, ingreso)
   - Estados (mercadería, calidad)
   - Cliente
   - Auditoría

3. **Generación de Kardex:**
   - Kardex completo con doble entrada
   - Saldos actualizados en ambas tablas
   - Costos promedio ponderados

### ❓ LO QUE NECESITA DECISIÓN:

1. Direcciones (origen/destino)
2. Guía de remisión SUNAT
3. Transporte (transportista/vehículo)
4. Órdenes de compra/venta
5. Costos y precios reales
6. Número de contenedor
7. Validación de fecha de vencimiento
8. Validación de estados

---

## 🎯 RECOMENDACIÓN

**Para una implementación MVP (Mínimo Producto Viable):**

Los campos actualmente implementados son **SUFICIENTES** para:
- ✅ Crear movimientos de almacén válidos
- ✅ Generar kardex correctamente
- ✅ Actualizar saldos
- ✅ Mantener trazabilidad básica

**Los campos opcionales pueden agregarse después** según las necesidades del negocio.

---

**¿Cuáles de estos campos opcionales necesitas que implemente?**
