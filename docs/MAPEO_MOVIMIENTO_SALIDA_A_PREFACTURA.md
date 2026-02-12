# Mapeo de Datos: Movimiento de Salida → PreFactura

## 📊 Análisis de Datos Disponibles

### **Contexto Disponible en `finalizarDescargaConMovimientos`:**

```javascript
// Objetos disponibles:
- temporada (TemporadaPesca)
- descarga (DescargaFaenaPesca)
- descarga.faenaPesca (FaenaPesca)
- producto (Producto)
- costoUnitario (calculado)
- movimientoSalida (resultado de crearMovimientoAlmacenCompleto)
- parametroAprobador (ParametroAprobador)
```

---

## 🔄 Mapeo de Campos: Cabecera PreFactura

### **Campos Obligatorios:**

| Campo PreFactura | Origen | Valor/Cálculo |
|------------------|--------|---------------|
| `empresaId` | `temporada.empresaId` | ✅ Disponible |
| `tipoDocumentoId` | **FALTA DEFINIR** | ⚠️ ¿Qué ID usar para PreFactura? (ej: BigInt(20)) |
| `serieDocId` | **FALTA DEFINIR** | ⚠️ Necesita serie específica para PreFacturas |
| `fechaDocumento` | `new Date()` o `descarga.fechaHoraInicioDescarga` | ✅ Disponible |
| `clienteId` | `descarga.clienteId` | ✅ Disponible |
| `respVentasId` | **FALTA DEFINIR** | ⚠️ ¿Usar `parametroAprobador.personalRespId`? |
| `tipoProductoId` | `producto.tipoProductoId` | ✅ Disponible (necesita incluir en query) |
| `formaPagoId` | **FALTA DEFINIR** | ⚠️ ¿Valor por defecto o desde configuración? |
| `monedaId` | **FALTA DEFINIR** | ⚠️ ¿Valor por defecto (PEN=1, USD=2)? |
| `tipoCambio` | **FALTA OBTENER** | ⚠️ Consultar tipo de cambio SUNAT del día |
| `subtotal` | `descarga.toneladas * precioUnitario` | ⚠️ **FALTA DEFINIR** precio de venta |
| `totalIGV` | `subtotal * 0.18` | ✅ Calculable (si no está exonerado) |
| `total` | `subtotal + totalIGV` | ✅ Calculable |
| `estadoId` | **FALTA DEFINIR** | ⚠️ ¿Estado inicial de PreFactura? (ej: BigInt(40) - Pendiente) |

### **Campos Opcionales Importantes:**

| Campo PreFactura | Origen | Valor/Cálculo |
|------------------|--------|---------------|
| `fechaVencimiento` | `fechaDocumento + días crédito` | ⚠️ Depende de forma de pago |
| `contactoClienteId` | **FALTA DEFINIR** | ⚠️ Opcional - necesita consulta adicional |
| `dirEntregaId` | **FALTA DEFINIR** | ⚠️ Opcional - dirección del cliente |
| `dirFiscalId` | **FALTA DEFINIR** | ⚠️ Opcional - dirección fiscal del cliente |
| `autorizaVentaId` | **FALTA DEFINIR** | ⚠️ Opcional - quien autoriza |
| `bancoId` | **FALTA DEFINIR** | ⚠️ Opcional - si forma pago requiere banco |
| `exoneradoIgv` | **FALTA DEFINIR** | ⚠️ Depende del cliente o producto |
| `porcentajeIgv` | `18.00` | ✅ Valor estándar (si aplica IGV) |
| `centroCostoId` | `temporada.centroCostoId` o configuración | ⚠️ Opcional |
| `movSalidaAlmacenId` | `movimientoSalida.movimiento.id` | ✅ **IMPORTANTE** - Vincula con movimiento |
| `unidadNegocioId` | `temporada.unidadNegocioId` | ✅ Disponible |
| `observaciones` | Concatenar info de temporada/faena/descarga | ✅ Similar a movimiento |

---

## 🔄 Mapeo de Campos: Detalle PreFactura

### **Campos Obligatorios:**

| Campo Detalle | Origen | Valor/Cálculo |
|---------------|--------|---------------|
| `productoId` | `producto.id` | ✅ Disponible |
| `cantidad` | `descarga.toneladas` | ✅ Disponible |
| `precioUnitario` | **FALTA DEFINIR** | ⚠️ **CRÍTICO** - Precio de venta por tonelada |

### **Campos Opcionales:**

| Campo Detalle | Origen | Valor/Cálculo |
|---------------|--------|---------------|
| `centroCostoId` | `temporada.centroCostoId` o configuración | ⚠️ Opcional |

---

## ⚠️ Datos Faltantes Críticos

### **1. Precio de Venta (precioUnitario)**
**Problema:** No tenemos el precio de venta del producto.

**Opciones:**
- a) Obtener desde `Producto.precioVenta` (si existe en el modelo)
- b) Obtener desde `ListaPrecio` asociada al cliente
- c) Obtener desde configuración de la temporada
- d) Parámetro de entrada del usuario

**Recomendación:** Consultar `Producto` con precio de venta o usar lista de precios del cliente.

---

### **2. Serie de PreFactura (serieDocId)**
**Problema:** Necesitamos identificar qué serie usar para PreFacturas.

**Solución:**
```javascript
const seriePreFactura = await tx.serieDoc.findFirst({
  where: {
    empresaId: temporada.empresaId,
    tipoDocumentoId: BigInt(20), // ID de PreFactura
    activo: true
  }
});
```

---

### **3. Tipo de Cambio**
**Problema:** Necesitamos el tipo de cambio del día.

**Solución:**
```javascript
import { validarTipoCambio } from '../../utils/tipoCambio.util.js';

const tipoCambio = await validarTipoCambio(
  null, // null = consulta SUNAT
  new Date()
);
```

---

### **4. Forma de Pago y Moneda**
**Problema:** No sabemos la forma de pago ni moneda del cliente.

**Opciones:**
- a) Consultar configuración por defecto del cliente
- b) Usar valores por defecto del sistema
- c) Parámetro de entrada

**Recomendación:** Consultar `EntidadComercial` (cliente) para obtener forma de pago y moneda preferida.

---

## 📝 Propuesta de Implementación

### **Paso 1: Consultar Datos Adicionales**

```javascript
// Obtener producto con precio de venta
const producto = await tx.producto.findFirst({
  where: {
    empresaId: temporada.empresaId,
    especieId: descarga.especieId,
    cesado: false
  },
  include: {
    tipoProducto: true // Necesario para tipoProductoId
  }
});

// Obtener cliente con configuración comercial
const cliente = await tx.entidadComercial.findUnique({
  where: { id: descarga.clienteId },
  include: {
    formaPagoPreferida: true,
    monedaPreferida: true
  }
});

// Obtener serie de PreFactura
const seriePreFactura = await tx.serieDoc.findFirst({
  where: {
    empresaId: temporada.empresaId,
    tipoDocumentoId: BigInt(20), // PreFactura
    activo: true
  }
});

// Obtener tipo de cambio
const tipoCambio = await validarTipoCambio(null, new Date());
```

---

### **Paso 2: Calcular Montos**

```javascript
// Precio de venta (DEBE DEFINIRSE)
const precioVentaPorTonelada = producto.precioVenta || 0; // ⚠️ AJUSTAR SEGÚN MODELO

// Cálculos
const cantidad = descarga.toneladas;
const subtotal = cantidad * precioVentaPorTonelada;
const exoneradoIgv = cliente.exoneradoIgv || false;
const porcentajeIgv = exoneradoIgv ? 0 : 18.00;
const totalIGV = exoneradoIgv ? 0 : (subtotal * 0.18);
const total = subtotal + totalIGV;
```

---

### **Paso 3: Preparar Cabecera de PreFactura**

```javascript
const cabeceraPreFactura = {
  empresaId: temporada.empresaId,
  tipoDocumentoId: BigInt(20), // PreFactura
  serieDocId: seriePreFactura.id,
  fechaDocumento: new Date(),
  fechaVencimiento: null, // O calcular según forma de pago
  
  clienteId: descarga.clienteId,
  respVentasId: parametroAprobador.personalRespId, // O definir otro
  
  tipoProductoId: producto.tipoProductoId,
  formaPagoId: cliente.formaPagoPreferidaId || BigInt(1), // Contado por defecto
  monedaId: cliente.monedaPreferidaId || BigInt(1), // PEN por defecto
  tipoCambio: tipoCambio,
  
  subtotal: subtotal,
  totalDescuentos: 0,
  totalIGV: totalIGV,
  total: total,
  
  estadoId: BigInt(40), // Pendiente (VERIFICAR ID CORRECTO)
  
  exoneradoIgv: exoneradoIgv,
  porcentajeIgv: porcentajeIgv,
  
  movSalidaAlmacenId: movimientoSalida.movimiento.id, // ✅ VINCULA CON MOVIMIENTO
  unidadNegocioId: temporada.unidadNegocioId,
  
  observaciones: `PreFactura automática - Temporada ID: ${temporada.id} - Resolución: ${temporada.numeroResolucion || 'N/A'} - Faena ID: ${descarga.faenaPescaId} - Descarga ID: ${descarga.id}`
};
```

---

### **Paso 4: Preparar Detalles de PreFactura**

```javascript
const detallesPreFactura = [{
  productoId: producto.id,
  cantidad: descarga.toneladas,
  precioUnitario: precioVentaPorTonelada,
  centroCostoId: null // O desde configuración
}];
```

---

### **Paso 5: Crear PreFactura**

```javascript
import crearPreFacturaCompletaService from '../Ventas/crearPreFacturaCompleta.service.js';

const preFactura = await crearPreFacturaCompletaService.crearPreFacturaCompleta(
  cabeceraPreFactura,
  detallesPreFactura,
  usuarioId,
  tx // Usar misma transacción
);
```

---

## 🎯 Campos que Necesitan Definición del Usuario

1. **Precio de Venta del Producto** ⚠️ CRÍTICO
   - ¿Dónde se almacena el precio de venta?
   - ¿Hay lista de precios por cliente?
   - ¿Precio fijo o variable?

2. **Tipo de Documento PreFactura**
   - ¿Qué ID tiene el tipo de documento "PreFactura"?
   - Verificar en tabla `TipoDocumento`

3. **Estado Inicial de PreFactura**
   - ¿Qué ID tiene el estado "Pendiente" para PreFacturas?
   - Verificar en tabla `EstadoMultiFuncion`

4. **Responsable de Ventas**
   - ¿Usar `parametroAprobador.personalRespId`?
   - ¿O hay un responsable específico de ventas?

5. **Forma de Pago y Moneda**
   - ¿Valores por defecto del sistema?
   - ¿Consultar desde configuración del cliente?

---

## ✅ Resumen

**Datos Disponibles:** ✅
- empresaId, clienteId, productoId, cantidad, unidadNegocioId, movSalidaAlmacenId

**Datos Calculables:** ⚠️
- subtotal, totalIGV, total (REQUIEREN precio de venta)

**Datos Faltantes:** ❌
- precioUnitario (precio de venta)
- serieDocId (serie de PreFactura)
- tipoDocumentoId (ID de PreFactura)
- estadoId (estado inicial)
- formaPagoId, monedaId
- respVentasId

**Acción Requerida:**
Definir de dónde obtener el **precio de venta** y los IDs de configuración (tipoDocumento, serie, estado).
