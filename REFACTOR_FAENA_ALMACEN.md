# 📋 REFACTORIZACIÓN: FINALIZACIÓN DE FAENA CON MOVIMIENTOS DE ALMACÉN

## 🎯 OBJETIVO
Refactorizar la funcionalidad de "Fin de Faena" para que utilice las funciones genéricas probadas del módulo de Inventarios, generando automáticamente DOS movimientos de almacén con sus respectivos kardex y saldos.

---

## 📦 CAMBIOS IMPLEMENTADOS

### 1. **Nuevo Servicio: `finalizarFaenaConMovimientos.service.js`**
**Ubicación:** `src/services/Pesca/finalizarFaenaConMovimientos.service.js`

**Función Principal:** `finalizarFaenaConMovimientosAlmacen(faenaPescaId, temporadaPescaId, usuarioId)`

#### **Proceso Completo:**

```
1. VALIDACIÓN Y OBTENCIÓN DE DATOS
   ├─ Obtener temporada de pesca
   ├─ Obtener faena de pesca
   ├─ Obtener descargas de la faena
   ├─ Obtener responsable de almacén (ParametroAprobador)
   ├─ Obtener entidad comercial de la empresa (Proveedor MEGUI)
   └─ Obtener cliente principal (Hayduk)

2. ACTUALIZAR ESTADO DE FAENA
   └─ Cambiar estado a FINALIZADA (ID: 19)

3. GENERAR MOVIMIENTO DE INGRESO (Concepto 1)
   ├─ Buscar serie de documento (Tipo: 13, Serie: 001)
   ├─ Generar número de documento automáticamente
   ├─ Crear detalles desde descargas
   ├─ Crear MovimientoAlmacen con estado PENDIENTE (30)
   ├─ Actualizar correlativo de serie
   └─ Generar kardex completo

4. GENERAR MOVIMIENTO DE SALIDA (Concepto 3)
   ├─ Buscar serie de documento (Tipo: 14, Serie: 001)
   ├─ Generar número de documento automáticamente
   ├─ Crear detalles desde descargas
   ├─ Crear MovimientoAlmacen con estado PENDIENTE (30)
   ├─ Actualizar correlativo de serie
   └─ Generar kardex completo

5. RETORNAR RESULTADO COMPLETO
   └─ Información de faena y ambos movimientos
```

---

## 🔄 MOVIMIENTOS GENERADOS

### **Movimiento 1: INGRESO (Concepto ID: 1)**
- **Descripción:** "INGRESO MATERIA PRIMA DE PROVEEDOR MEGUI A MATERIA PRIMA RECURSO HIDROBIOLOGICO MP"
- **Tipo Documento:** NOTA DE INGRESO ALMACEN (ID: 13)
- **Serie:** 001
- **Entidad Comercial:** Proveedor MEGUI (entidadComercialId de la empresa)
- **Estado Inicial:** PENDIENTE (ID: 30)
- **Kardex:** Se genera automáticamente con ingreso al almacén destino

### **Movimiento 2: SALIDA (Concepto ID: 3)**
- **Descripción:** "SALIDA MATERIA PRIMA DE MATERIA PRIMA RECURSO HIDROBIOLOGICO A CLIENTE MEGUI PREFACTURA"
- **Tipo Documento:** NOTA DE SALIDA ALMACEN (ID: 14)
- **Serie:** 001
- **Entidad Comercial:** Cliente (Hayduk - desde DescargaFaenaPesca.clienteId)
- **Estado Inicial:** PENDIENTE (ID: 30)
- **Kardex:** Se genera automáticamente con egreso del almacén origen

---

## 📊 MAPEO DE DATOS: DESCARGA → DETALLE MOVIMIENTO

Cada descarga de la faena se convierte en un detalle de movimiento:

```javascript
DescargaFaenaPesca {
  toneladas              → cantidad, peso
  especieId              → buscar Producto
  clienteId              → entidadComercialId, buscar Producto
  fechaHoraInicioDescarga → fechaProduccion, fechaIngreso
}

DetalleMovimientoAlmacen {
  productoId: Producto(empresaId, clienteId, especieId)
  cantidad: descarga.toneladas
  peso: descarga.toneladas
  lote: temporada.numeroResolucion
  fechaProduccion: descarga.fechaHoraInicioDescarga
  fechaVencimiento: fechaHoraInicioDescarga + 30 días
  fechaIngreso: descarga.fechaHoraInicioDescarga
  estadoMercaderiaId: 6 (Liberado)
  estadoCalidadId: 10 (Calidad A)
  entidadComercialId: descarga.clienteId
  esCustodia: false
  empresaId: temporada.empresaId
  costoUnitario: 0
  precioUnitario: 0
}
```

---

## 🔧 FUNCIONES GENÉRICAS UTILIZADAS

### **Del Módulo de Inventarios:**

1. **Creación de Movimiento** (Patrón de `movimientoAlmacen.service.js::crear()`)
   - ✅ Generación automática de número de documento
   - ✅ Actualización de correlativo de serie
   - ✅ Creación de MovimientoAlmacen + DetalleMovimientoAlmacen
   - ✅ Transacciones atómicas

2. **Generación de Kardex** (`generarKardex.service.js::generarKardexMovimiento()`)
   - ✅ Procesamiento de kardex origen y destino
   - ✅ Cálculo de saldos con costos promedio ponderados
   - ✅ Actualización de `SaldosDetProductoCliente`
   - ✅ Actualización de `SaldosProductoCliente`
   - ✅ Manejo de trazabilidad completa

---

## 🔗 CONTROLADOR ACTUALIZADO

**Archivo:** `src/controllers/Pesca/faenaPesca.controller.js`

**Función:** `finalizarFaenaConMovimientoAlmacen(req, res, next)`

**Cambios:**
- ✅ Importa el nuevo servicio `finalizarFaenaService`
- ✅ Llama a `finalizarFaenaConMovimientosAlmacen()` en lugar de `wmsService.generarMovimientoDesdeTemporadaPesca()`
- ✅ Retorna información completa de ambos movimientos

---

## 📋 REQUISITOS PREVIOS

Para que la funcionalidad opere correctamente, se requiere:

### **1. Configuración de Series de Documento**
```sql
-- Serie para INGRESO (ID: 1)
-- Debe existir con:
--   id = 1
--   tipoDocumentoId = 13 (NOTA DE INGRESO ALMACEN)
--   serie = '001'
--   activo = true

-- Serie para SALIDA (ID: 2)
-- Debe existir con:
--   id = 2
--   tipoDocumentoId = 14 (NOTA DE SALIDA ALMACEN)
--   serie = '001'
--   activo = true

-- Verificar series:
SELECT id, serie, tipoDocumentoId, activo 
FROM "SerieDoc" 
WHERE id IN (1, 2);
```

### **2. Configuración de Responsable de Almacén**
```sql
-- Responsable en ParametroAprobador
INSERT INTO "ParametroAprobador" (
  empresaId, moduloSistemaId, personalRespId, cesado
) VALUES (
  <empresaId>, 6, <personalId>, false
);
```

### **3. Productos Configurados**
- Debe existir un `Producto` para cada combinación de:
  - `empresaId`
  - `clienteId` (de la descarga)
  - `especieId` (de la descarga)
  - `cesado = false`

### **4. Conceptos de Movimiento**
```sql
-- Verificar conceptos:
SELECT id, descripcion, llevaKardexOrigen, llevaKardexDestino, activo
FROM "ConceptoMovAlmacen"
WHERE id IN (1, 3);

-- Concepto 1 (INGRESO): Debe tener llevaKardexDestino = true
-- Concepto 3 (SALIDA): Debe tener llevaKardexOrigen = true
```

---

## ✅ VENTAJAS DE LA REFACTORIZACIÓN

1. **✅ Reutilización de Código Probado**
   - Usa las mismas funciones que el módulo de Inventarios
   - Garantiza consistencia en toda la aplicación

2. **✅ Mantenibilidad**
   - Un solo lugar para lógica de movimientos de almacén
   - Cambios en el módulo de Inventarios se propagan automáticamente

3. **✅ Transaccionalidad**
   - Todo el proceso en una sola transacción
   - Si falla cualquier paso, se revierte todo

4. **✅ Trazabilidad Completa**
   - Kardex con doble entrada (origen/destino)
   - Saldos actualizados en dos tablas independientes
   - Costos promedio ponderados calculados automáticamente

5. **✅ Validaciones Robustas**
   - Validación de series de documento
   - Validación de productos
   - Validación de responsables
   - Mensajes de error descriptivos

---

## 🧪 TESTING

### **Casos de Prueba Recomendados:**

1. **✅ Finalización Exitosa**
   - Faena con múltiples descargas
   - Verificar creación de 2 movimientos
   - Verificar generación de kardex
   - Verificar actualización de saldos

2. **❌ Validaciones de Error**
   - Faena sin descargas
   - Serie de documento no encontrada
   - Producto no encontrado
   - Responsable no configurado
   - Empresa sin entidad comercial

3. **🔄 Transaccionalidad**
   - Simular error en medio del proceso
   - Verificar que no se creen registros parciales

---

## 📝 RESPUESTA DEL ENDPOINT

```json
{
  "faena": {
    "id": "123",
    "estadoFaenaId": "19"
  },
  "movimientoIngreso": {
    "id": "456",
    "numeroDocumento": "001-0000001",
    "cantidadDetalles": 3,
    "kardex": {
      "kardexCreados": 3,
      "kardexActualizados": 0,
      "saldosDetActualizados": 3,
      "saldosGenActualizados": 3,
      "errores": []
    }
  },
  "movimientoSalida": {
    "id": "457",
    "numeroDocumento": "001-0000001",
    "cantidadDetalles": 3,
    "kardex": {
      "kardexCreados": 3,
      "kardexActualizados": 0,
      "saldosDetActualizados": 3,
      "saldosGenActualizados": 3,
      "errores": []
    }
  },
  "mensaje": "Faena finalizada exitosamente. Se generaron 2 movimientos de almacén con sus kardex."
}
```

---

## 🚀 PRÓXIMOS PASOS

1. **Testing en Desarrollo**
   - Probar con datos reales
   - Verificar generación de movimientos
   - Validar kardex y saldos

2. **Ajustes según Necesidad**
   - Ajustar estados de mercadería/calidad
   - Ajustar cálculo de fechas de vencimiento
   - Ajustar costos unitarios si es necesario

3. **Documentación de Usuario**
   - Actualizar manual de usuario
   - Documentar requisitos previos
   - Documentar proceso de finalización

4. **Migración de Datos Históricos** (Opcional)
   - Evaluar si se requiere migrar faenas antiguas
   - Crear script de migración si es necesario

---

## 📞 SOPORTE

Para cualquier duda o ajuste, revisar:
- `src/services/Pesca/finalizarFaenaConMovimientos.service.js`
- `src/services/Almacen/movimientoAlmacen.service.js`
- `src/services/Almacen/generarKardex.service.js`

---

**Fecha de Implementación:** 21 de Noviembre, 2025
**Versión:** 1.0
**Estado:** ✅ Implementado - Pendiente de Testing
