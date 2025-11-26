# Casos de Prueba: Finalización de Faena con Movimientos de Almacén

## ✅ CASOS EDGE SOPORTADOS

### 1. **Faena con Múltiples Descargas**

#### Comportamiento Actual:
- ✅ El sistema itera sobre **todas las descargas** de la faena
- ✅ Cada descarga genera **un detalle** en el movimiento de INGRESO
- ✅ Cada descarga genera **un detalle** en el movimiento de SALIDA
- ✅ El costo unitario se calcula **una sola vez** y se aplica a todas las descargas

#### Ejemplo:
```
Faena ID: 80
├── Descarga 1: 50 toneladas, Cliente A, Especie Anchoveta
├── Descarga 2: 30 toneladas, Cliente B, Especie Anchoveta
└── Descarga 3: 20 toneladas, Cliente A, Especie Jurel

Resultado:
├── Movimiento INGRESO con 3 detalles (uno por cada descarga)
└── Movimiento SALIDA con 3 detalles (uno por cada descarga)
```

#### Código Relevante:
```javascript
// Líneas 330-387: Loop sobre todas las descargas
for (const descarga of descargas) {
  // Busca producto por empresa + cliente + especie
  // Si no encuentra, busca por empresa + especie
  // Agrega detalle al array detallesIngreso
}
```

---

### 2. **Diferentes Especies**

#### Comportamiento Actual:
- ✅ Cada descarga tiene su propio `especieId`
- ✅ El sistema busca el producto correspondiente a cada especie
- ✅ Si no existe producto para esa combinación, lanza error descriptivo
- ✅ Cada detalle mantiene su producto específico

#### Búsqueda de Producto (Prioridad):
1. **Primera búsqueda**: `empresaId + clienteId + especieId`
2. **Segunda búsqueda** (fallback): `empresaId + especieId` (sin cliente específico)
3. **Error**: Si no encuentra producto activo

#### Ejemplo:
```
Descarga 1: Especie Anchoveta (ID: 1) → Producto ID: 5
Descarga 2: Especie Jurel (ID: 2) → Producto ID: 8
Descarga 3: Especie Caballa (ID: 3) → Producto ID: 12

Resultado:
├── Detalle 1: productoId = 5
├── Detalle 2: productoId = 8
└── Detalle 3: productoId = 12
```

#### Código Relevante:
```javascript
// Líneas 333-360: Búsqueda flexible de producto
let producto = await tx.producto.findFirst({
  where: {
    empresaId: temporada.empresaId,
    clienteId: descarga.clienteId,
    especieId: descarga.especieId, // ← Especie específica de cada descarga
    cesado: false
  }
});
```

---

### 3. **Diferentes Clientes**

#### Comportamiento Actual:
- ✅ Cada descarga tiene su propio `clienteId`
- ✅ El `clienteId` se almacena en `entidadComercialId` de cada detalle
- ✅ Permite trazabilidad de qué cliente corresponde a cada descarga
- ✅ El movimiento de SALIDA usa el `clientePrincipalId` (primer cliente) en la cabecera

#### Estructura:
```
Movimiento INGRESO:
├── Cabecera: entidadComercialId = Proveedor MEGUI (ID: 5)
├── Detalle 1: entidadComercialId = Cliente A (ID: 8)
├── Detalle 2: entidadComercialId = Cliente B (ID: 10)
└── Detalle 3: entidadComercialId = Cliente A (ID: 8)

Movimiento SALIDA:
├── Cabecera: entidadComercialId = Cliente Principal (ID: 8)
├── Detalle 1: entidadComercialId = Cliente A (ID: 8)
├── Detalle 2: entidadComercialId = Cliente B (ID: 10)
└── Detalle 3: entidadComercialId = Cliente A (ID: 8)
```

#### Código Relevante:
```javascript
// Línea 378: Cliente específico en cada detalle
entidadComercialId: descarga.clienteId, // ← Cliente de cada descarga

// Línea 396: Proveedor MEGUI en cabecera de INGRESO
entidadComercialId: proveedorMeguiId,

// Línea 596: Cliente principal en cabecera de SALIDA
entidadComercialId: clienteId, // clientePrincipalId del primer cliente
```

---

### 4. **Múltiples Faenas en una Temporada**

#### Comportamiento Actual:
- ✅ Cada faena genera sus propios movimientos independientes
- ✅ Los movimientos se vinculan a la faena específica (`faenaPescaId`)
- ✅ El costo unitario se calcula **por temporada** (suma de todas las entregas a rendir)
- ✅ Cada movimiento tiene su propio número de documento (correlativo)

#### Ejemplo:
```
Temporada ID: 25
├── Faena 1 (ID: 80)
│   ├── Movimiento INGRESO: 001-0000000010
│   └── Movimiento SALIDA: 001-0000000001
├── Faena 2 (ID: 81)
│   ├── Movimiento INGRESO: 001-0000000011
│   └── Movimiento SALIDA: 001-0000000002
└── Faena 3 (ID: 82)
    ├── Movimiento INGRESO: 001-0000000012
    └── Movimiento SALIDA: 001-0000000003
```

#### Cálculo de Costo Unitario:
```javascript
// Línea 108: Cálculo a nivel de temporada
const costoUnitario = await calcularCostoUnitario(tx, temporadaPescaId, descargas);

// El costo se calcula:
// Total Egresos de TODAS las entregas a rendir de la temporada
// ÷ Total Toneladas de TODAS las descargas de la faena actual
```

---

## 🧪 ESCENARIOS DE PRUEBA RECOMENDADOS

### Escenario 1: Faena Simple
- **Descripción**: 1 faena, 1 descarga, 1 cliente, 1 especie
- **Esperado**: 2 movimientos (INGRESO y SALIDA) con 1 detalle cada uno

### Escenario 2: Faena con Múltiples Descargas del Mismo Cliente
- **Descripción**: 1 faena, 3 descargas, 1 cliente, 1 especie
- **Esperado**: 2 movimientos con 3 detalles cada uno

### Escenario 3: Faena con Diferentes Clientes
- **Descripción**: 1 faena, 3 descargas, 3 clientes diferentes, 1 especie
- **Esperado**: 2 movimientos con 3 detalles, cada detalle con su cliente específico

### Escenario 4: Faena con Diferentes Especies
- **Descripción**: 1 faena, 3 descargas, 1 cliente, 3 especies diferentes
- **Esperado**: 2 movimientos con 3 detalles, cada detalle con su producto específico

### Escenario 5: Faena Mixta (Clientes y Especies Diferentes)
- **Descripción**: 1 faena, 5 descargas, 2 clientes, 2 especies
- **Esperado**: 2 movimientos con 5 detalles, combinaciones correctas

### Escenario 6: Múltiples Faenas en una Temporada
- **Descripción**: 1 temporada, 3 faenas, cada una con sus descargas
- **Esperado**: 6 movimientos totales (2 por faena), correlativos incrementales

### Escenario 7: Producto No Encontrado
- **Descripción**: Descarga con especie sin producto configurado
- **Esperado**: Error descriptivo indicando empresa y especie faltante

---

## 📊 VALIDACIONES POST-EJECUCIÓN

### En Base de Datos:

#### 1. Verificar Movimientos Creados
```sql
SELECT 
  ma.id,
  ma.numeroDocumento,
  ma.conceptoMovAlmacenId,
  ma.faenaPescaId,
  ma.estadoDocAlmacenId,
  COUNT(dma.id) as num_detalles
FROM MovimientoAlmacen ma
LEFT JOIN DetalleMovimientoAlmacen dma ON dma.movimientoAlmacenId = ma.id
WHERE ma.faenaPescaId = 80
GROUP BY ma.id;
```

#### 2. Verificar Detalles por Cliente y Especie
```sql
SELECT 
  dma.id,
  dma.movimientoAlmacenId,
  dma.productoId,
  p.nombre as producto,
  dma.entidadComercialId,
  ec.razonSocial as cliente,
  dma.cantidad,
  dma.costoUnitario
FROM DetalleMovimientoAlmacen dma
JOIN Producto p ON p.id = dma.productoId
LEFT JOIN EntidadComercial ec ON ec.id = dma.entidadComercialId
WHERE dma.movimientoAlmacenId IN (
  SELECT id FROM MovimientoAlmacen WHERE faenaPescaId = 80
);
```

#### 3. Verificar Kardex Generado
```sql
SELECT 
  ka.id,
  ka.movimientoAlmacenId,
  ka.productoId,
  ka.tipoMovimiento,
  ka.ingresoCant,
  ka.egresoCant,
  ka.saldoFinalCant
FROM KardexAlmacen ka
WHERE ka.movimientoAlmacenId IN (
  SELECT id FROM MovimientoAlmacen WHERE faenaPescaId = 80
)
ORDER BY ka.fechaMovimiento, ka.id;
```

#### 4. Verificar Saldos Actualizados
```sql
SELECT 
  sdpc.productoId,
  p.nombre as producto,
  sdpc.entidadComercialId,
  ec.razonSocial as cliente,
  sdpc.cantidad,
  sdpc.peso
FROM SaldosDetProductoCliente sdpc
JOIN Producto p ON p.id = sdpc.productoId
LEFT JOIN EntidadComercial ec ON ec.id = sdpc.entidadComercialId
WHERE sdpc.productoId IN (
  SELECT DISTINCT dma.productoId 
  FROM DetalleMovimientoAlmacen dma
  JOIN MovimientoAlmacen ma ON ma.id = dma.movimientoAlmacenId
  WHERE ma.faenaPescaId = 80
);
```

---

## ✅ CONFIRMACIÓN DE FUNCIONALIDAD

### Características Implementadas:

- ✅ **Múltiples descargas**: Cada descarga genera un detalle independiente
- ✅ **Diferentes especies**: Búsqueda flexible de producto por especie
- ✅ **Diferentes clientes**: Trazabilidad de cliente en cada detalle
- ✅ **Múltiples faenas**: Cada faena genera movimientos independientes
- ✅ **Costo unitario**: Calculado a nivel de temporada
- ✅ **Transaccionalidad**: Todo o nada (atomicidad garantizada)
- ✅ **Kardex automático**: Generado para ambos movimientos
- ✅ **Saldos actualizados**: Inventario actualizado automáticamente
- ✅ **Estados correctos**: PENDIENTE → CERRADO → KARDEX GENERADO

---

## 🚨 CASOS DE ERROR MANEJADOS

1. **Producto no encontrado**: Error descriptivo con empresa y especie
2. **Serie inactiva**: Validación de series activas
3. **Parámetro aprobador no configurado**: Error si no existe responsable
4. **Empresa MEGUI no encontrada**: Error si no está configurada
5. **Temporada no encontrada**: Validación de temporada existente
6. **Faena no encontrada**: Validación de faena existente
7. **Sin descargas**: Error si la faena no tiene descargas
8. **Error en kardex**: Rollback completo de la transacción

---

## 📝 NOTAS IMPORTANTES

1. **Costo Unitario Global**: Se calcula UNA vez por faena usando todas las entregas a rendir de la temporada
2. **Cliente Principal**: El primer cliente de las descargas se usa en la cabecera del movimiento de SALIDA
3. **Lote**: Se usa el `numeroResolucion` de la temporada como lote para todos los detalles
4. **Fecha de Vencimiento**: Se calcula como fecha de producción + 30 días
5. **Estados Fijos**: `estadoMercaderiaId = 6` (Liberado), `estadoCalidadId = 10` (Calidad A)
