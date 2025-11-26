# ✅ IMPLEMENTACIÓN FINAL - FINALIZACIÓN DE FAENA CON MOVIMIENTOS DE ALMACÉN

## 🎯 RESUMEN DE IMPLEMENTACIÓN

Se ha completado la refactorización del proceso de finalización de faena con **TODAS** las especificaciones solicitadas.

---

## 📊 FLUJO COMPLETO IMPLEMENTADO

```
1. VALIDACIÓN Y OBTENCIÓN DE DATOS
   ├─ Temporada de pesca
   ├─ Faena de pesca
   ├─ Descargas de la faena
   ├─ Responsable de almacén (ParametroAprobador)
   ├─ Entidad comercial de la empresa (Proveedor MEGUI)
   └─ Cliente principal (desde DescargaFaenaPesca.clienteId)

2. ACTUALIZAR ESTADO DE FAENA
   └─ Cambiar a FINALIZADA (ID: 19)

3. CALCULAR COSTOS Y PRECIOS
   ├─ Costo Unitario: Prorrateo de egresos de EntregaARendir
   └─ Precio Unitario: Precio especial del cliente o precio estándar

4. GENERAR MOVIMIENTO DE INGRESO (Concepto 1)
   ├─ Crear con estado PENDIENTE (30)
   ├─ Cambiar a CERRADO (31)
   ├─ Generar Kardex
   └─ Cambiar a KARDEX GENERADO (33)

5. GENERAR MOVIMIENTO DE SALIDA (Concepto 3)
   ├─ Crear con estado PENDIENTE (30)
   ├─ Cambiar a CERRADO (31)
   ├─ Generar Kardex
   └─ Cambiar a KARDEX GENERADO (33)

6. RETORNAR RESULTADO COMPLETO
```

---

## 💰 CÁLCULO DE COSTOS

### **Costo Unitario:**

```javascript
// 1. Buscar EntregaARendir asociada a la faena
const entregaRendir = await tx.entregaARendir.findFirst({
  where: { faenaPescaId: faenaPescaId },
  include: {
    detMovsEntregaRendir: {
      where: { tipoMovimientoId: BigInt(2) } // Solo EGRESOS
    }
  }
});

// 2. Sumar todos los egresos
const totalEgresos = entregaRendir.detMovsEntregaRendir.reduce((sum, detalle) => {
  return sum + Number(detalle.monto || 0);
}, 0);

// 3. Sumar todas las toneladas
const totalToneladas = descargas.reduce((sum, descarga) => {
  return sum + Number(descarga.toneladas || 0);
}, 0);

// 4. Calcular costo unitario prorrateado
const costoUnitario = totalEgresos / totalToneladas;
```

**Ejemplo:**
- Total egresos: S/ 10,000
- Total toneladas: 50 TM
- **Costo unitario: S/ 200 por TM**

---

## 💵 CÁLCULO DE PRECIOS

### **Precio Unitario (con prioridad):**

```javascript
// 1. PRIORIDAD 1: Buscar precio especial del cliente
const precioEspecial = await tx.precioEntidad.findFirst({
  where: {
    entidadComercialId: clienteId, // Cliente de la descarga
    productoId: producto.id,
    activo: true,
    fechaVigenciaInicio: { lte: fechaActual },
    OR: [
      { fechaVigenciaFin: { gte: fechaActual } },
      { fechaVigenciaFin: null }
    ]
  }
});

// 2. PRIORIDAD 2: Buscar precio estándar de la empresa (Proveedor MEGUI)
const precioEstandar = await tx.precioEntidad.findFirst({
  where: {
    entidadComercialId: proveedorMeguiId, // Empresa.entidadComercialId
    productoId: producto.id,
    activo: true,
    fechaVigenciaInicio: { lte: fechaActual },
    OR: [
      { fechaVigenciaFin: { gte: fechaActual } },
      { fechaVigenciaFin: null }
    ]
  }
});

// 3. Usar el precio encontrado (especial tiene prioridad)
const precioUnitario = precioEspecial?.precio || precioEstandar?.precio || 0;
```

---

## 🔄 ESTADOS DEL MOVIMIENTO

### **Flujo de Estados:**

| Paso | Estado | ID | Descripción |
|------|--------|----|----|
| 1 | PENDIENTE | 30 | Al crear el movimiento con cabecera y detalles |
| 2 | CERRADO | 31 | Después de agregar todos los datos (antes de kardex) |
| 3 | KARDEX GENERADO | 33 | Después de generar kardex y actualizar saldos |

### **Implementación:**

```javascript
// 1. Crear movimiento con estado PENDIENTE (30)
const movimientoCreado = await tx.movimientoAlmacen.create({
  data: {
    ...dataMovimiento,
    estadoDocAlmacenId: BigInt(30), // PENDIENTE
    detalles: { create: detalles }
  }
});

// 2. Cambiar a CERRADO (31)
await tx.movimientoAlmacen.update({
  where: { id: movimientoCreado.id },
  data: { estadoDocAlmacenId: BigInt(31) } // CERRADO
});

// 3. Generar kardex
const kardex = await generarKardexService.generarKardexMovimiento(movimientoCreado.id);

// 4. Cambiar a KARDEX GENERADO (33)
await tx.movimientoAlmacen.update({
  where: { id: movimientoCreado.id },
  data: { estadoDocAlmacenId: BigInt(33) } // KARDEX GENERADO
});
```

---

## 📋 CAMPOS IMPLEMENTADOS

### **Cabecera del Movimiento:**

| Campo | Valor | Origen |
|-------|-------|--------|
| `empresaId` | BigInt | `temporada.empresaId` |
| `tipoDocumentoId` | 13 / 14 | INGRESO / SALIDA |
| `conceptoMovAlmacenId` | 1 / 3 | INGRESO / SALIDA |
| `serieDocId` | 1 / 2 | Serie fija por tipo |
| `fechaDocumento` | DateTime | `new Date()` |
| `entidadComercialId` | BigInt | `descarga.clienteId` |
| `faenaPescaId` | BigInt | `faena.id` |
| `embarcacionId` | BigInt | `temporada.embarcacionId` |
| `personalRespAlmacen` | BigInt | `parametroAprobador.personalRespId` |
| `estadoDocAlmacenId` | 30 → 31 → 33 | Flujo de estados |
| `esCustodia` | false | Fijo |
| `observaciones` | String | Descripción automática |

### **Detalles del Movimiento:**

| Campo | Valor | Origen |
|-------|-------|--------|
| `productoId` | BigInt | Búsqueda por empresa+cliente+especie |
| `cantidad` | Decimal | `descarga.toneladas` |
| `peso` | Decimal | `descarga.toneladas` |
| `lote` | String | `temporada.numeroResolucion` |
| `fechaProduccion` | DateTime | `descarga.fechaHoraInicioDescarga` |
| `fechaVencimiento` | DateTime | fechaProduccion + 30 días |
| `fechaIngreso` | DateTime | `descarga.fechaHoraInicioDescarga` |
| `estadoMercaderiaId` | 6 | Liberado (fijo) |
| `estadoCalidadId` | 10 | Calidad A (fijo) |
| `entidadComercialId` | BigInt | `descarga.clienteId` |
| `esCustodia` | false | Fijo |
| `empresaId` | BigInt | `temporada.empresaId` |
| `costoUnitario` | Decimal | **Calculado desde egresos** |
| `precioUnitario` | Decimal | **Calculado desde PrecioEntidad** |

---

## 🔧 CONFIGURACIÓN REQUERIDA

### **1. Series de Documento:**
- **ID 1:** Serie para INGRESO (Tipo Doc 13)
- **ID 2:** Serie para SALIDA (Tipo Doc 14)

### **2. Conceptos de Movimiento:**
- **ID 1:** INGRESO con `llevaKardexDestino = true`
- **ID 3:** SALIDA con `llevaKardexOrigen = true`

### **3. Responsable de Almacén:**
- `ParametroAprobador` con `moduloSistemaId = 6` (Inventarios)

### **4. Productos:**
- Configurados por empresa + cliente + especie

### **5. Precios:**
- `PrecioEntidad` con vigencia activa para productos

### **6. Entrega a Rendir:**
- Debe existir para la faena con egresos registrados

---

## 📤 RESPUESTA DEL ENDPOINT

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

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Cálculo de costo unitario desde egresos de EntregaARendir
- [x] Cálculo de precio unitario (especial > estándar)
- [x] Flujo de estados: 30 → 31 → 33
- [x] Generación de movimiento INGRESO con kardex
- [x] Generación de movimiento SALIDA con kardex
- [x] Uso de series fijas (ID 1 y 2)
- [x] Uso de conceptos fijos (ID 1 y 3)
- [x] Obtención de cliente desde DescargaFaenaPesca
- [x] Transaccionalidad completa
- [x] Logs detallados para debugging

---

## 🧪 TESTING

### **Verificar antes de probar:**

```sql
-- 1. Verificar series
SELECT * FROM "SerieDoc" WHERE id IN (1, 2);

-- 2. Verificar conceptos
SELECT * FROM "ConceptoMovAlmacen" WHERE id IN (1, 3);

-- 3. Verificar responsable
SELECT * FROM "ParametroAprobador" 
WHERE "moduloSistemaId" = 6 AND cesado = false;

-- 4. Verificar productos
SELECT * FROM "Producto" WHERE cesado = false;

-- 5. Verificar precios
SELECT * FROM "PrecioEntidad" WHERE activo = true;

-- 6. Verificar entrega a rendir con egresos
SELECT er.*, COUNT(det.id) as egresos
FROM "EntregaARendir" er
LEFT JOIN "DetMovsEntregaRendir" det ON det."entregaARendirId" = er.id 
  AND det."tipoMovimientoId" = 2
GROUP BY er.id;
```

---

## 🎉 RESULTADO FINAL

**La implementación está COMPLETA y lista para testing con:**

✅ Cálculo automático de costos desde egresos
✅ Cálculo automático de precios (especial > estándar)
✅ Flujo de estados correcto (30 → 31 → 33)
✅ Generación de 2 movimientos con kardex
✅ Transaccionalidad completa
✅ Logs detallados para debugging

**Próximo paso:** Testing en ambiente de desarrollo 🚀
