# MANUAL DEL PLAN DE CUENTAS Y CENTRO DE COSTOS
## MEGUI INVESTMENT SAC - Sistema ERP Pesquero

---

## TABLA DE CONTENIDOS

1. [Introduccion](#1-introduccion)
2. [Diseno del Plan de Cuentas](#2-diseno-del-plan-de-cuentas)
3. [Estrategia de Operaciones Blancas y Negras](#3-estrategia-de-operaciones-blancas-y-negras)
4. [Centro de Costos](#4-centro-de-costos)
5. [Integracion Plan de Cuentas y Centro de Costos](#5-integracion-plan-de-cuentas-y-centro-de-costos)
6. [Asientos Contables - Flujo y Estados](#6-asientos-contables-flujo-y-estados)
7. [Ejemplos Practicos de Registro](#7-ejemplos-practicos-de-registro)
8. [Preparacion para Auditoria SUNAT](#8-preparacion-para-auditoria-sunat)
9. [Guias de Uso Rapido](#9-guias-de-uso-rapido)

---

## 1. INTRODUCCION

### 1.1 Objetivo del Manual

Este manual documenta el diseño estrategico del sistema contable de MEGUI INVESTMENT SAC, una empresa multisectorial que opera en:
- Pesca industrial (anchoveta)
- Procesamiento de pota congelada
- Procesamiento de frutas
- Produccion de harina y aceite de pescado
- Conservas de pescado
- Agroexportacion
- Servicios de maquila
- Servicios de almacenamiento y arrendamiento

### 1.2 Caracteristicas del Sistema

El sistema contable esta diseñado para:

✅ **Cumplimiento normativo total** con SUNAT y PCGE Peru  
✅ **Gestion discreta** de operaciones con y sin comprobantes  
✅ **Trazabilidad completa** por linea de producto  
✅ **Costeo detallado** por centro de costo  
✅ **Reportes diferenciados** para fiscalizacion y gerencia  

### 1.3 Principios de Diseño

| Principio | Descripcion |
|-----------|-------------|
| **Nomenclatura Neutra** | Nombres de cuentas profesionales sin terminos detectables |
| **Doble Vision** | Sistema FISCAL (SUNAT) y GERENCIAL (interno) |
| **Jerarquia Clara** | 5 niveles de cuentas para maxima granularidad |
| **Integracion Total** | Plan de Cuentas + Centro de Costos = Trazabilidad completa |

---

## 2. DISENO DEL PLAN DE CUENTAS

### 2.1 Estructura Jerarquica (5 Niveles)

El Plan de Cuentas sigue el PCGE (Plan Contable General Empresarial) de Peru con 5 niveles:

```
NIVEL 1: CLASE         → 1 digito  → Ej: "6" (Gastos)
NIVEL 2: CUENTA        → 2 digitos → Ej: "63" (Servicios de Terceros)
NIVEL 3: SUBCUENTA     → 3 digitos → Ej: "638" (Servicios de Produccion)
NIVEL 4: DIVISIONARIA  → 4 digitos → Ej: "6381" (Servicios de Procesamiento)
NIVEL 5: SUBDIVISIONARIA → 5 digitos → Ej: "63811" (Procesamiento Pota) ✅ IMPUTABLE
```

### 2.2 Niveles Imputables

⚠️ **IMPORTANTE**: Solo las cuentas de **NIVEL 5 (SUBDIVISIONARIAS)** son imputables (permiten movimientos).

| Nivel | Codigo | Nombre | Imputable |
|-------|--------|--------|-----------|
| CUENTA | 63 | SERVICIOS DE TERCEROS | ❌ No |
| SUBCUENTA | 638 | Servicios de Produccion | ❌ No |
| DIVISIONARIA | 6381 | Servicios de Procesamiento | ❌ No |
| **SUBDIVISIONARIA** | **63811** | **Procesamiento Pota** | **✅ Si** |

### 2.3 Cuentas Principales por Categoria

#### 2.3.1 ACTIVOS (Clase 1, 2, 3)

| Codigo | Nombre | Uso Principal |
|--------|--------|---------------|
| 10 | EFECTIVO Y EQUIVALENTES | Caja, bancos |
| 12 | CUENTAS POR COBRAR | Facturas clientes, anticipos |
| 20 | MERCADERIAS | Productos para reventa |
| 21 | PRODUCTOS TERMINADOS | Pota, frutas, harina, conservas |
| 24 | MATERIAS PRIMAS | Pota fresca, frutas, anchoveta |
| 25 | SUMINISTROS Y REPUESTOS | Combustibles, hielo, insumos |
| 33 | INMUEBLES, MAQUINARIA Y EQUIPO | Activos fijos |

#### 2.3.2 PASIVOS (Clase 4)

| Codigo | Nombre | Uso Principal |
|--------|--------|---------------|
| 40 | TRIBUTOS POR PAGAR | IGV, Renta, ESSALUD, ONP |
| 42 | CUENTAS POR PAGAR COMERCIALES | Facturas proveedores |
| 46 | CUENTAS POR PAGAR DIVERSAS | Otras obligaciones |

#### 2.3.3 PATRIMONIO (Clase 5)

| Codigo | Nombre | Uso Principal |
|--------|--------|---------------|
| 50 | CAPITAL | Capital social |
| 59 | RESULTADOS ACUMULADOS | Utilidades/perdidas |

#### 2.3.4 GASTOS (Clase 6) - ⚠️ REQUIEREN CENTRO DE COSTO

| Codigo | Nombre | Uso Principal | Centro Costo |
|--------|--------|---------------|--------------|
| 60 | COMPRAS | Compras de MP, suministros | ✅ Obligatorio |
| 62 | GASTOS DE PERSONAL | Sueldos, salarios, CTS | ✅ Obligatorio |
| 63 | SERVICIOS DE TERCEROS | Maquila, transporte, servicios | ✅ Obligatorio |
| 64 | GASTOS POR TRIBUTOS | Impuestos | ✅ Obligatorio |
| 65 | OTROS GASTOS | Seguros, donaciones | ✅ Obligatorio |
| 68 | DEPRECIACION | Depreciacion de activos | ✅ Obligatorio |

#### 2.3.5 INGRESOS (Clase 7)

| Codigo | Nombre | Uso Principal |
|--------|--------|---------------|
| 70 | VENTAS | Ventas de productos y servicios |
| 71 | VARIACION DE PRODUCCION | Variacion de inventarios |
| 75 | OTROS INGRESOS | Ingresos diversos |

### 2.4 Cuentas Estrategicas con Nomenclatura Neutra

Estas cuentas tienen nombres **profesionales y discretos** para operaciones sensibles:

#### 2.4.1 Para Servicios de Maquila (Con/Sin Comprobante)

| Codigo | Nombre | Uso Real |
|--------|--------|----------|
| 63811 | Procesamiento Pota | Servicios de maquila de pota (blanco/negro) |
| 63812 | Procesamiento Frutas | Servicios de seleccion y empaque (blanco/negro) |
| 63813 | Procesamiento Harina | Servicios de produccion harina (blanco/negro) |
| 63814 | Procesamiento Conservas | Servicios de enlatado (blanco/negro) |

#### 2.4.2 Para Personal (Planilla Blanca/Negra)

| Codigo | Nombre | Uso Real |
|--------|--------|----------|
| 62111 | Sueldos | Personal con contrato formal |
| 62112 | Salarios | Personal operativo formal |
| 62131 | Remuneraciones Eventuales | Personal eventual sin contrato |
| 62132 | Honorarios Profesionales | Servicios profesionales sin RUC |

#### 2.4.3 Para Gastos sin Comprobante

| Codigo | Nombre | Uso Real |
|--------|--------|----------|
| 63911 | Comisiones Bancarias | Gastos operativos diversos sin comprobante |
| 60332 | Repuestos Planta | Repuestos informales |
| 65911 | Donaciones | Gastos diversos sin sustento |

#### 2.4.4 Para Ingresos por Servicios

| Codigo | Nombre | Uso Real |
|--------|--------|----------|
| 70411 | Servicios de Almacenamiento | Ingresos por almacenamiento |
| 70412 | Alquiler de Areas | Ingresos por alquiler de espacios por m2 |
| 70413 | Almacenamiento Productos Terceros | Custodia de productos |
| 70414 | Servicios Logisticos | Otros servicios logisticos |

### 2.5 Campos Clave del Plan de Cuentas

```javascript
PlanCuentasContable {
  codigoCuenta: "63811"              // Codigo jerarquico
  nombreCuenta: "Procesamiento Pota" // Nombre neutro
  nivel: "SUBDIVISIONARIA"           // Nivel jerarquico
  naturaleza: "DEUDORA"              // DEUDORA o ACREEDORA
  tipoCuenta: "GASTO"                // ACTIVO, PASIVO, PATRIMONIO, GASTO, INGRESO
  esImputable: true                  // Solo SUBDIVISIONARIAS
  requiereCentroCosto: true          // Obligatorio para gastos
  cuentaPadreId: 123                 // Relacion jerarquica
}
```

---

## 3. ESTRATEGIA DE OPERACIONES BLANCAS Y NEGRAS

### 3.1 Concepto Fundamental: Campo `tipoLibro`

El sistema utiliza el campo **`tipoLibro`** en la tabla `AsientoContable` para diferenciar operaciones:

```javascript
AsientoContable {
  tipoLibro: "FISCAL"     // Operaciones BLANCAS (con comprobante)
  tipoLibro: "GERENCIAL"  // TODAS las operaciones (con/sin comprobante)
}
```

### 3.2 Tipos de Operaciones

| Tipo | tipoLibro | Comprobante | Visible SUNAT | Uso |
|------|-----------|-------------|---------------|-----|
| **BLANCA** | FISCAL | ✅ Si | ✅ Si | Operaciones formales con factura/boleta |
| **NEGRA** | GERENCIAL | ❌ No | ❌ No | Operaciones sin comprobante (solo gerencia) |

### 3.3 Estrategia de Registro

#### 3.3.1 Operacion BLANCA (Con Factura)

```javascript
// Ejemplo: Compra de pota fresca con factura
AsientoContable {
  numero: "001-2024",
  fecha: "2024-12-25",
  tipoLibro: "FISCAL",        // ✅ Visible para SUNAT
  glosa: "Compra pota fresca segun factura 001-1234",
  detalles: [
    {
      planCuentaId: 60211,      // Compras de pota fresca
      centroCostoId: 67,        // Materia Prima Pota
      debe: 10000.00,
      haber: 0
    },
    {
      planCuentaId: 42111,      // Facturas por pagar
      debe: 0,
      haber: 10000.00
    }
  ]
}
```

#### 3.3.2 Operacion NEGRA (Sin Comprobante)

```javascript
// Ejemplo: Compra de pota fresca sin factura
AsientoContable {
  numero: "002-2024",
  fecha: "2024-12-25",
  tipoLibro: "GERENCIAL",     // ❌ NO visible para SUNAT
  glosa: "Adquisicion de materia prima",
  detalles: [
    {
      planCuentaId: 60211,      // Compras de pota fresca (mismo nombre)
      centroCostoId: 67,        // Materia Prima Pota
      debe: 8000.00,
      haber: 0
    },
    {
      planCuentaId: 10111,      // Caja Principal
      debe: 0,
      haber: 8000.00
    }
  ]
}
```

### 3.4 Filtrado Automatico por Reportes

#### 3.4.1 Reporte para SUNAT (Solo FISCAL)

```sql
-- Libro Diario para SUNAT
SELECT * FROM "AsientoContable"
WHERE "tipoLibro" = 'FISCAL'
  AND "empresaId" = 1
  AND "periodoContableId" = 12
ORDER BY fecha, numero;
```

**Resultado**: Solo operaciones con comprobante ✅

#### 3.4.2 Reporte Gerencial (TODOS)

```sql
-- Libro Diario Gerencial Completo
SELECT * FROM "AsientoContable"
WHERE "tipoLibro" = 'GERENCIAL'
  AND "empresaId" = 1
  AND "periodoContableId" = 12
ORDER BY fecha, numero;
```

**Resultado**: Todas las operaciones (blancas + negras) ✅

### 3.5 Reglas de Oro

| # | Regla | Descripcion |
|---|-------|-------------|
| 1 | **Nomenclatura Neutra** | NUNCA usar terminos como "informal", "sin factura", "negro" |
| 2 | **Mismo Plan de Cuentas** | Usar las MISMAS cuentas para blanco y negro |
| 3 | **Centro de Costo Discreto** | Usar centros como "GESTIONES INSTITUCIONALES" |
| 4 | **tipoLibro Correcto** | FISCAL = con comprobante, GERENCIAL = todo |
| 5 | **Glosa Profesional** | Descripciones genericas y profesionales |

### 3.6 Cuadro Comparativo

| Aspecto | Operacion BLANCA | Operacion NEGRA |
|---------|------------------|-----------------|
| Comprobante | ✅ Factura/Boleta | ❌ Sin comprobante |
| tipoLibro | FISCAL | GERENCIAL |
| Cuenta Contable | 60211 - Compras pota | 60211 - Compras pota (misma) |
| Centro Costo | 67 - Materia Prima Pota | 67 - Materia Prima Pota (mismo) |
| Visible SUNAT | ✅ Si | ❌ No |
| Reporte Gerencial | ✅ Si | ✅ Si |
| Glosa | "Compra segun factura 001-1234" | "Adquisicion de materia prima" |

---

## 4. CENTRO DE COSTOS

### 4.1 Estructura Jerarquica (3 Niveles)

```
NIVEL 1: ESTRATEGICO  → Direcciones    → Ej: "14000" (GESTION DE OPERACIONES)
NIVEL 2: TACTICO      → Gerencias      → Ej: "14300" (GESTIONES INSTITUCIONALES)
NIVEL 3: OPERATIVO    → Centros Costo  → Ej: "14300" (imputable)
```

### 4.2 Categorias de Centro de Costo

| ID | Categoria | Descripcion | Uso |
|----|-----------|-------------|-----|
| 1 | PRIMARIO | Procesos productivos clave | Produccion, maquila, ventas |
| 2 | SOPORTE | Infraestructura y gestion | Administracion, finanzas, RRHH |
| 3 | APOYO | Procesos auxiliares | Logistica, servicios, **gastos discretos** |

### 4.3 Centros de Costo Estrategicos

#### 4.3.1 Para Gastos sin Comprobante (Categoria APOYO)

| Codigo | Nombre | Uso Real |
|--------|--------|----------|
| 14000 | GESTION DE OPERACIONES | Coordinacion operativa |
| 14100 | SERVICIOS OPERATIVOS | Servicios sin factura |
| 14200 | SUMINISTROS Y REPUESTOS | Repuestos informales |
| 14300 | GESTIONES INSTITUCIONALES | **Tramites, permisos, coimas** |
| 14400 | RELACIONES OPERATIVAS | **Coordinaciones con autoridades** |
| 14500 | APOYO LOGISTICO | Servicios de apoyo |
| 14600 | SERVICIOS PROFESIONALES | Asesorias sin comprobante |

#### 4.3.2 Para Personal Eventual (Categoria APOYO)

| Codigo | Nombre | Uso Real |
|--------|--------|----------|
| 15000 | RECURSOS HUMANOS FLEXIBLES | Gestion de personal eventual |
| 15100 | PERSONAL TEMPORAL | **Planilla negra** |
| 15200 | SERVICIOS PROFESIONALES INDEPENDIENTES | Honorarios sin RUC |
| 15300 | CAPACITACION Y DESARROLLO | Capacitaciones |

#### 4.3.3 Para Servicios de Maquila (Categoria PRIMARIO)

| Codigo | Nombre | Linea de Producto |
|--------|--------|-------------------|
| 16000 | SERVICIOS DE TRANSFORMACION | General |
| 16100 | MAQUILA CEFALOPODOS | Pota |
| 16110 | Limpieza y Eviscerado Pota | Pota - Detalle |
| 16120 | Congelado IQF Pota | Pota - Detalle |
| 16130 | Empaque y Etiquetado Pota | Pota - Detalle |
| 16200 | MAQUILA FRUTAS | Frutas |
| 16210 | Seleccion y Clasificacion | Frutas - Detalle |
| 16220 | Empaque y Paletizado | Frutas - Detalle |
| 16300 | MAQUILA HARINA | Harina |
| 16310 | Coccion y Prensado | Harina - Detalle |
| 16320 | Secado y Molienda | Harina - Detalle |
| 16330 | Ensacado y Almacenamiento | Harina - Detalle |
| 16400 | MAQUILA CONSERVAS | Conservas |
| 16410 | Coccion y Enlatado | Conservas - Detalle |
| 16420 | Esterilizacion | Conservas - Detalle |
| 16430 | Etiquetado y Encajonado | Conservas - Detalle |

#### 4.3.4 Para Ingresos por Servicios (Categoria PRIMARIO)

| Codigo | Nombre | Uso Real |
|--------|--------|----------|
| 17000 | SERVICIOS COMERCIALES | Ingresos por servicios |
| 17100 | ARRENDAMIENTO DE ESPACIOS | Alquiler de areas |
| 17110 | Alquiler Camaras Frigorificas | Alquiler refrigerado |
| 17120 | Alquiler Almacenes Secos | Alquiler convencional |
| 17200 | ALMACENAMIENTO DE TERCEROS | Custodia de productos |
| 17210 | Almacenamiento Refrigerado | Custodia congelados |
| 17220 | Almacenamiento Seco | Custodia no perecederos |
| 17300 | SERVICIOS LOGISTICOS | Servicios logisticos |
| 17310 | Transporte y Distribucion | Transporte terceros |
| 17320 | Gestion de Inventarios | Control de stock |

#### 4.3.5 Por Linea de Producto (Categoria PRIMARIO)

| Codigo | Nombre | Linea |
|--------|--------|-------|
| 18000 | LINEA POTA CONGELADA | Pota |
| 18100 | Materia Prima Pota | Pota - Compras |
| 18200 | Procesamiento Pota | Pota - Produccion |
| 18300 | Comercializacion Pota | Pota - Ventas |
| 19000 | LINEA FRUTAS | Frutas |
| 19100 | Materia Prima Frutas | Frutas - Compras |
| 19200 | Procesamiento Frutas | Frutas - Produccion |
| 19300 | Comercializacion Frutas | Frutas - Ventas |
| 20000 | LINEA HARINA Y ACEITE | Harina |
| 20100 | Materia Prima Anchoveta | Harina - Compras |
| 20200 | Procesamiento Harina | Harina - Produccion |
| 20300 | Comercializacion Harina | Harina - Ventas |
| 21000 | LINEA CONSERVAS | Conservas |
| 21100 | Materia Prima Conservas | Conservas - Compras |
| 21200 | Procesamiento Conservas | Conservas - Produccion |
| 21300 | Comercializacion Conservas | Conservas - Ventas |

### 4.4 Campos Clave del Centro de Costo

```javascript
CentroCosto {
  Codigo: "14300"                           // Codigo unico
  Nombre: "GESTIONES INSTITUCIONALES"       // Nombre discreto
  Descripcion: "Tramites, permisos..."      // Descripcion profesional
  CategoriaID: 3                            // APOYO
  ParentCentroID: "14000"                   // Jerarquia
}
```

---

## 5. INTEGRACION PLAN DE CUENTAS Y CENTRO DE COSTOS

### 5.1 Regla de Integracion

⚠️ **REGLA CRITICA**: Todas las cuentas de **GASTO (Clase 6)** y **COSTO (Clase 9)** **REQUIEREN** Centro de Costo obligatorio.

### 5.2 Matriz de Integracion

| Cuenta Contable | Requiere Centro Costo | Ejemplo Centro Costo |
|-----------------|----------------------|---------------------|
| 60xxx - COMPRAS | ✅ Si | 18100 - Materia Prima Pota |
| 62xxx - PERSONAL | ✅ Si | 15100 - Personal Temporal |
| 63xxx - SERVICIOS | ✅ Si | 14300 - Gestiones Institucionales |
| 64xxx - TRIBUTOS | ✅ Si | 14300 - Gestiones Institucionales |
| 65xxx - OTROS GASTOS | ✅ Si | 14100 - Servicios Operativos |
| 68xxx - DEPRECIACION | ✅ Si | 18200 - Procesamiento Pota |
| 70xxx - VENTAS | ❌ No | N/A |
| 12xxx - CUENTAS POR COBRAR | ❌ No | N/A |

### 5.3 Mapeo Estrategico: Gasto Real → Cuenta → Centro Costo

#### 5.3.1 Gastos sin Comprobante

| Gasto Real | Cuenta Contable | Centro Costo | tipoLibro |
|------------|-----------------|--------------|-----------|
| Coima a policia | 63911 - Comisiones | 14300 - Gestiones Institucionales | GERENCIAL |
| Repuesto informal | 60332 - Repuestos | 14200 - Suministros y Repuestos | GERENCIAL |
| Servicio sin factura | 63911 - Comisiones | 14100 - Servicios Operativos | GERENCIAL |
| Gestion SUNAT | 63911 - Comisiones | 14300 - Gestiones Institucionales | GERENCIAL |

#### 5.3.2 Personal sin Contrato

| Gasto Real | Cuenta Contable | Centro Costo | tipoLibro |
|------------|-----------------|--------------|-----------|
| Trabajador eventual | 62131 - Remuneraciones Eventuales | 15100 - Personal Temporal | GERENCIAL |
| Honorario sin RUC | 62132 - Honorarios Profesionales | 15200 - Servicios Prof. Indep. | GERENCIAL |

#### 5.3.3 Servicios de Maquila

| Gasto Real | Cuenta Contable | Centro Costo | tipoLibro |
|------------|-----------------|--------------|-----------|
| Maquila pota con factura | 63811 - Procesamiento Pota | 16110 - Limpieza Pota | FISCAL |
| Maquila pota sin factura | 63811 - Procesamiento Pota | 16110 - Limpieza Pota | GERENCIAL |
| Maquila frutas con factura | 63812 - Procesamiento Frutas | 16210 - Seleccion Frutas | FISCAL |

#### 5.3.4 Ingresos por Servicios

| Ingreso Real | Cuenta Contable | Centro Costo | tipoLibro |
|--------------|-----------------|--------------|-----------|
| Alquiler camara frigorifica | 70412 - Alquiler de Areas | 17110 - Alquiler Camaras | FISCAL |
| Almacenamiento productos | 70413 - Almacenamiento Terceros | 17210 - Almac. Refrigerado | FISCAL |

### 5.4 Validacion del Sistema

El sistema ERP debe validar:

```javascript
// Validacion en el frontend/backend
if (planCuenta.requiereCentroCosto === true) {
  if (!detalleAsiento.centroCostoId) {
    throw new Error("Esta cuenta requiere Centro de Costo obligatorio");
  }
}
```

---

## 6. EJEMPLOS PRACTICOS DE REGISTRO

### 6.1 Ejemplo 1: Compra de Pota Fresca CON Factura (BLANCA)

**Escenario**: Compra de 1000 kg de pota fresca a S/ 10.00/kg con factura 001-1234

```javascript
AsientoContable {
  numero: "001-2024",
  fecha: "2024-12-25",
  tipoLibro: "FISCAL",              // ✅ Visible SUNAT
  glosa: "Compra pota fresca segun factura 001-1234 proveedor Juan Perez",
  
  detalles: [
    // DEBE: Compra de materia prima
    {
      planCuentaId: 60211,          // Compras de pota fresca
      centroCostoId: 67,            // 18100 - Materia Prima Pota
      debe: 10000.00,
      haber: 0,
      glosa: "1000 kg pota fresca @ S/ 10.00"
    },
    // DEBE: IGV por pagar
    {
      planCuentaId: 40111,          // IGV cuenta propia
      debe: 1800.00,
      haber: 0,
      glosa: "IGV 18%"
    },
    // HABER: Cuenta por pagar
    {
      planCuentaId: 42111,          // Facturas por pagar
      entidadId: 123,               // Proveedor Juan Perez
      debe: 0,
      haber: 11800.00,
      glosa: "Factura 001-1234"
    }
  ]
}
```

**Resultado en Reportes**:
- ✅ Aparece en Libro Diario FISCAL (SUNAT)
- ✅ Aparece en Libro Diario GERENCIAL
- ✅ Se acumula en Centro Costo "18100 - Materia Prima Pota"

---

### 6.2 Ejemplo 2: Compra de Pota Fresca SIN Factura (NEGRA)

**Escenario**: Compra de 800 kg de pota fresca a S/ 8.00/kg sin factura, pago en efectivo

```javascript
AsientoContable {
  numero: "002-2024",
  fecha: "2024-12-25",
  tipoLibro: "GERENCIAL",           // ❌ NO visible SUNAT
  glosa: "Adquisicion de materia prima para produccion",
  
  detalles: [
    // DEBE: Compra de materia prima
    {
      planCuentaId: 60211,          // Compras de pota fresca (misma cuenta)
      centroCostoId: 67,            // 18100 - Materia Prima Pota (mismo centro)
      debe: 6400.00,
      haber: 0,
      glosa: "Materia prima para produccion"
    },
    // HABER: Caja
    {
      planCuentaId: 10111,          // Caja Principal
      debe: 0,
      haber: 6400.00,
      glosa: "Pago en efectivo"
    }
  ]
}
```

**Resultado en Reportes**:
- ❌ NO aparece en Libro Diario FISCAL (SUNAT)
- ✅ Aparece en Libro Diario GERENCIAL
- ✅ Se acumula en Centro Costo "18100 - Materia Prima Pota"

---

### 6.3 Ejemplo 3: Pago de Coima a Supervisor (NEGRA)

**Escenario**: Pago de S/ 500 a supervisor de SANIPES para agilizar tramite

```javascript
AsientoContable {
  numero: "003-2024",
  fecha: "2024-12-25",
  tipoLibro: "GERENCIAL",           // ❌ NO visible SUNAT
  glosa: "Gestion administrativa para tramite sanitario",
  
  detalles: [
    // DEBE: Gasto operativo
    {
      planCuentaId: 63911,          // Comisiones bancarias (cuenta neutra)
      centroCostoId: 32,            // 14300 - Gestiones Institucionales
      debe: 500.00,
      haber: 0,
      glosa: "Gestion de tramite administrativo"
    },
    // HABER: Caja
    {
      planCuentaId: 10111,          // Caja Principal
      debe: 0,
      haber: 500.00,
      glosa: "Pago en efectivo"
    }
  ]
}
```

**Resultado en Reportes**:
- ❌ NO aparece en Libro Diario FISCAL (SUNAT)
- ✅ Aparece en Libro Diario GERENCIAL
- ✅ Se acumula en Centro Costo "14300 - Gestiones Institucionales"
- ✅ Glosa profesional y discreta

---

### 6.4 Ejemplo 4: Servicio de Maquila CON Factura (BLANCA)

**Escenario**: Servicio de limpieza y eviscerado de pota con factura 002-5678 por S/ 5000

```javascript
AsientoContable {
  numero: "004-2024",
  fecha: "2024-12-25",
  tipoLibro: "FISCAL",              // ✅ Visible SUNAT
  glosa: "Servicio de procesamiento segun factura 002-5678 Maquila SAC",
  
  detalles: [
    // DEBE: Servicio de maquila
    {
      planCuentaId: 63811,          // Procesamiento Pota
      centroCostoId: 42,            // 16110 - Limpieza y Eviscerado Pota
      debe: 5000.00,
      haber: 0,
      glosa: "Servicio de limpieza y eviscerado"
    },
    // DEBE: IGV
    {
      planCuentaId: 40111,          // IGV cuenta propia
      debe: 900.00,
      haber: 0,
      glosa: "IGV 18%"
    },
    // HABER: Cuenta por pagar
    {
      planCuentaId: 42111,          // Facturas por pagar
      entidadId: 456,               // Proveedor Maquila SAC
      debe: 0,
      haber: 5900.00,
      glosa: "Factura 002-5678"
    }
  ]
}
```

**Resultado en Reportes**:
- ✅ Aparece en Libro Diario FISCAL (SUNAT)
- ✅ Aparece en Libro Diario GERENCIAL
- ✅ Se acumula en Centro Costo "16110 - Limpieza y Eviscerado Pota"

---

### 6.5 Ejemplo 5: Servicio de Maquila SIN Factura (NEGRA)

**Escenario**: Servicio de limpieza de pota sin factura por S/ 3000, pago en efectivo

```javascript
AsientoContable {
  numero: "005-2024",
  fecha: "2024-12-25",
  tipoLibro: "GERENCIAL",           // ❌ NO visible SUNAT
  glosa: "Servicio de procesamiento de materia prima",
  
  detalles: [
    // DEBE: Servicio de maquila
    {
      planCuentaId: 63811,          // Procesamiento Pota (misma cuenta)
      centroCostoId: 42,            // 16110 - Limpieza y Eviscerado Pota (mismo centro)
      debe: 3000.00,
      haber: 0,
      glosa: "Servicio de procesamiento"
    },
    // HABER: Caja
    {
      planCuentaId: 10111,          // Caja Principal
      debe: 0,
      haber: 3000.00,
      glosa: "Pago en efectivo"
    }
  ]
}
```

**Resultado en Reportes**:
- ❌ NO aparece en Libro Diario FISCAL (SUNAT)
- ✅ Aparece en Libro Diario GERENCIAL
- ✅ Se acumula en Centro Costo "16110 - Limpieza y Eviscerado Pota"

---

### 6.6 Ejemplo 6: Pago de Planilla Blanca (FISCAL)

**Escenario**: Pago de sueldos de personal formal por S/ 15000

```javascript
AsientoContable {
  numero: "006-2024",
  fecha: "2024-12-31",
  tipoLibro: "FISCAL",              // ✅ Visible SUNAT
  glosa: "Planilla de sueldos mes diciembre 2024",
  
  detalles: [
    // DEBE: Sueldos
    {
      planCuentaId: 62111,          // Sueldos
      centroCostoId: 68,            // 18200 - Procesamiento Pota
      debe: 15000.00,
      haber: 0,
      glosa: "Sueldos personal produccion"
    },
    // HABER: Renta 5ta categoria
    {
      planCuentaId: 40173,          // Renta quinta categoria
      debe: 0,
      haber: 1200.00,
      glosa: "Retencion renta 5ta"
    },
    // HABER: ONP
    {
      planCuentaId: 40321,          // ONP
      debe: 0,
      haber: 1950.00,
      glosa: "Aporte ONP 13%"
    },
    // HABER: Cuentas por pagar trabajadores
    {
      planCuentaId: 46991,          // Otras cuentas por pagar
      debe: 0,
      haber: 11850.00,
      glosa: "Sueldos netos por pagar"
    }
  ]
}
```

---

### 6.7 Ejemplo 7: Pago de Planilla Negra (GERENCIAL)

**Escenario**: Pago de personal eventual sin contrato por S/ 8000

```javascript
AsientoContable {
  numero: "007-2024",
  fecha: "2024-12-31",
  tipoLibro: "GERENCIAL",           // ❌ NO visible SUNAT
  glosa: "Pago de servicios temporales mes diciembre",
  
  detalles: [
    // DEBE: Remuneraciones eventuales
    {
      planCuentaId: 62131,          // Remuneraciones eventuales
      centroCostoId: 37,            // 15100 - Personal Temporal
      debe: 8000.00,
      haber: 0,
      glosa: "Servicios de personal temporal"
    },
    // HABER: Caja
    {
      planCuentaId: 10111,          // Caja Principal
      debe: 0,
      haber: 8000.00,
      glosa: "Pago en efectivo"
    }
  ]
}
```

---

### 6.8 Ejemplo 8: Ingreso por Alquiler de Camara Frigorifica (FISCAL)

**Escenario**: Alquiler de 100 m2 de camara frigorifica a S/ 50/m2 con factura

```javascript
AsientoContable {
  numero: "008-2024",
  fecha: "2024-12-25",
  tipoLibro: "FISCAL",              // ✅ Visible SUNAT
  glosa: "Ingreso por alquiler camara frigorifica factura 001-9999",
  
  detalles: [
    // DEBE: Cuenta por cobrar
    {
      planCuentaId: 12121,          // Facturas emitidas
      entidadId: 789,               // Cliente ABC SAC
      debe: 5900.00,
      haber: 0,
      glosa: "Factura 001-9999"
    },
    // HABER: Ingreso por alquiler
    {
      planCuentaId: 70412,          // Alquiler de Areas
      centroCostoId: 58,            // 17110 - Alquiler Camaras Frigorificas
      debe: 0,
      haber: 5000.00,
      glosa: "Alquiler 100 m2 @ S/ 50/m2"
    },
    // HABER: IGV por pagar
    {
      planCuentaId: 40111,          // IGV cuenta propia
      debe: 0,
      haber: 900.00,
      glosa: "IGV 18%"
    }
  ]
}
```

---

### 6.9 Ejemplo 9: Compra de Repuesto Informal (NEGRA)

**Escenario**: Compra de repuesto de motor sin factura por S/ 1200

```javascript
AsientoContable {
  numero: "009-2024",
  fecha: "2024-12-25",
  tipoLibro: "GERENCIAL",           // ❌ NO visible SUNAT
  glosa: "Adquisicion de repuestos para mantenimiento",
  
  detalles: [
    // DEBE: Repuestos
    {
      planCuentaId: 60332,          // Repuestos planta
      centroCostoId: 31,            // 14200 - Suministros y Repuestos
      debe: 1200.00,
      haber: 0,
      glosa: "Repuestos para mantenimiento"
    },
    // HABER: Caja
    {
      planCuentaId: 10111,          // Caja Principal
      debe: 0,
      haber: 1200.00,
      glosa: "Pago en efectivo"
    }
  ]
}
```

---

### 6.10 Ejemplo 10: Venta de Pota Congelada (FISCAL)

**Escenario**: Venta de 500 kg de pota congelada a S/ 25/kg con factura

```javascript
AsientoContable {
  numero: "010-2024",
  fecha: "2024-12-25",
  tipoLibro: "FISCAL",              // ✅ Visible SUNAT
  glosa: "Venta pota congelada segun factura 001-5555 Cliente XYZ",
  
  detalles: [
    // DEBE: Cuenta por cobrar
    {
      planCuentaId: 12121,          // Facturas emitidas
      entidadId: 999,               // Cliente XYZ SAC
      debe: 14750.00,
      haber: 0,
      glosa: "Factura 001-5555"
    },
    // HABER: Venta de pota
    {
      planCuentaId: 70113,          // Ventas pota congelada
      debe: 0,
      haber: 12500.00,
      glosa: "500 kg pota @ S/ 25/kg"
    },
    // HABER: IGV por pagar
    {
      planCuentaId: 40111,          // IGV cuenta propia
      debe: 0,
      haber: 2250.00,
      glosa: "IGV 18%"
    }
  ]
}
```

---

## 7. PREPARACION PARA AUDITORIA SUNAT

### 7.1 Principios de Auditoria

| Principio | Descripcion |
|-----------|-------------|
| **Separacion Total** | Operaciones FISCALES y GERENCIALES completamente separadas |
| **Nomenclatura Profesional** | Nombres de cuentas y centros de costo neutrales |
| **Documentacion Consistente** | Glosas profesionales y coherentes |
| **Trazabilidad Completa** | Cada operacion fiscal tiene su comprobante |

### 7.2 Reportes para SUNAT

#### 7.2.1 Libro Diario FISCAL

```sql
-- Generar Libro Diario para SUNAT
SELECT 
  a.numero,
  a.fecha,
  a.glosa,
  pc."codigoCuenta",
  pc."nombreCuenta",
  d.debe,
  d.haber
FROM "AsientoContable" a
JOIN "DetalleAsientoContable" d ON d."asientoId" = a.id
JOIN "PlanCuentasContable" pc ON pc.id = d."planCuentaId"
WHERE a."tipoLibro" = 'FISCAL'
  AND a."empresaId" = 1
  AND a."periodoContableId" = 12
ORDER BY a.fecha, a.numero, d.id;
```

**Resultado**: Solo operaciones con comprobante ✅

#### 7.2.2 Registro de Compras FISCAL

```sql
-- Generar Registro de Compras para SUNAT
SELECT 
  a.fecha,
  a.numero,
  e."razonSocial" as proveedor,
  e."numeroDocumento" as ruc,
  SUM(CASE WHEN pc."tipoCuenta" = 'GASTO' THEN d.debe ELSE 0 END) as base_imponible,
  SUM(CASE WHEN pc."codigoCuenta" LIKE '401%' THEN d.debe ELSE 0 END) as igv
FROM "AsientoContable" a
JOIN "DetalleAsientoContable" d ON d."asientoId" = a.id
JOIN "PlanCuentasContable" pc ON pc.id = d."planCuentaId"
LEFT JOIN "Entidad" e ON e.id = d."entidadId"
WHERE a."tipoLibro" = 'FISCAL'
  AND a."empresaId" = 1
  AND a."periodoContableId" = 12
  AND pc."tipoCuenta" IN ('GASTO', 'ACTIVO')
GROUP BY a.fecha, a.numero, e."razonSocial", e."numeroDocumento"
ORDER BY a.fecha;
```

#### 7.2.3 Registro de Ventas FISCAL

```sql
-- Generar Registro de Ventas para SUNAT
SELECT 
  a.fecha,
  a.numero,
  e."razonSocial" as cliente,
  e."numeroDocumento" as ruc,
  SUM(CASE WHEN pc."tipoCuenta" = 'INGRESO' THEN d.haber ELSE 0 END) as base_imponible,
  SUM(CASE WHEN pc."codigoCuenta" LIKE '401%' THEN d.haber ELSE 0 END) as igv
FROM "AsientoContable" a
JOIN "DetalleAsientoContable" d ON d."asientoId" = a.id
JOIN "PlanCuentasContable" pc ON pc.id = d."planCuentaId"
LEFT JOIN "Entidad" e ON e.id = d."entidadId"
WHERE a."tipoLibro" = 'FISCAL'
  AND a."empresaId" = 1
  AND a."periodoContableId" = 12
  AND pc."tipoCuenta" = 'INGRESO'
GROUP BY a.fecha, a.numero, e."razonSocial", e."numeroDocumento"
ORDER BY a.fecha;
```

### 7.3 Reportes Gerenciales (Internos)

#### 7.3.1 Libro Diario GERENCIAL Completo

```sql
-- Generar Libro Diario Gerencial (todas las operaciones)
SELECT 
  a.numero,
  a.fecha,
  a.tipoLibro,
  a.glosa,
  pc."codigoCuenta",
  pc."nombreCuenta",
  cc."Nombre" as centro_costo,
  d.debe,
  d.haber
FROM "AsientoContable" a
JOIN "DetalleAsientoContable" d ON d."asientoId" = a.id
JOIN "PlanCuentasContable" pc ON pc.id = d."planCuentaId"
LEFT JOIN "CentroCosto" cc ON cc.id = d."centroCostoId"
WHERE a."tipoLibro" = 'GERENCIAL'
  AND a."empresaId" = 1
  AND a."periodoContableId" = 12
ORDER BY a.fecha, a.numero, d.id;
```

#### 7.3.2 Analisis de Costos por Centro de Costo

```sql
-- Analisis de gastos por Centro de Costo
SELECT 
  cc."Codigo",
  cc."Nombre" as centro_costo,
  pc."codigoCuenta",
  pc."nombreCuenta",
  SUM(d.debe) as total_gasto
FROM "DetalleAsientoContable" d
JOIN "AsientoContable" a ON a.id = d."asientoId"
JOIN "PlanCuentasContable" pc ON pc.id = d."planCuentaId"
JOIN "CentroCosto" cc ON cc.id = d."centroCostoId"
WHERE a."tipoLibro" = 'GERENCIAL'
  AND a."empresaId" = 1
  AND a."periodoContableId" = 12
  AND pc."tipoCuenta" = 'GASTO'
GROUP BY cc."Codigo", cc."Nombre", pc."codigoCuenta", pc."nombreCuenta"
ORDER BY cc."Codigo", total_gasto DESC;
```

#### 7.3.3 Comparativo Blanco vs Negro

```sql
-- Comparativo de operaciones FISCAL vs GERENCIAL
SELECT 
  pc."codigoCuenta",
  pc."nombreCuenta",
  SUM(CASE WHEN a."tipoLibro" = 'FISCAL' THEN d.debe ELSE 0 END) as fiscal_debe,
  SUM(CASE WHEN a."tipoLibro" = 'GERENCIAL' THEN d.debe ELSE 0 END) as gerencial_debe,
  SUM(CASE WHEN a."tipoLibro" = 'GERENCIAL' THEN d.debe ELSE 0 END) - 
  SUM(CASE WHEN a."tipoLibro" = 'FISCAL' THEN d.debe ELSE 0 END) as diferencia_negro
FROM "DetalleAsientoContable" d
JOIN "AsientoContable" a ON a.id = d."asientoId"
JOIN "PlanCuentasContable" pc ON pc.id = d."planCuentaId"
WHERE a."empresaId" = 1
  AND a."periodoContableId" = 12
  AND pc."tipoCuenta" = 'GASTO'
GROUP BY pc."codigoCuenta", pc."nombreCuenta"
HAVING SUM(CASE WHEN a."tipoLibro" = 'GERENCIAL' THEN d.debe ELSE 0 END) > 
       SUM(CASE WHEN a."tipoLibro" = 'FISCAL' THEN d.debe ELSE 0 END)
ORDER BY diferencia_negro DESC;
```

### 7.4 Checklist de Auditoria

#### 7.4.1 Antes de la Auditoria

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Verificar que todos los asientos FISCALES tienen comprobantes | ⬜ |
| 2 | Revisar glosas de asientos FISCALES (profesionales) | ⬜ |
| 3 | Validar que no hay terminos "informales" en asientos FISCALES | ⬜ |
| 4 | Generar Libro Diario FISCAL y verificar coherencia | ⬜ |
| 5 | Generar Registro de Compras FISCAL | ⬜ |
| 6 | Generar Registro de Ventas FISCAL | ⬜ |
| 7 | Verificar que IGV cuadra con declaraciones | ⬜ |
| 8 | Revisar que centros de costo en FISCAL son coherentes | ⬜ |
| 9 | Backup de base de datos completa | ⬜ |
| 10 | Preparar documentacion de comprobantes fisicos | ⬜ |

#### 7.4.2 Durante la Auditoria

| # | Accion | Descripcion |
|---|--------|-------------|
| 1 | **Mostrar solo reportes FISCALES** | Usar filtro `tipoLibro = 'FISCAL'` |
| 2 | **No mencionar operaciones GERENCIALES** | No hablar de operaciones sin comprobante |
| 3 | **Explicar centros de costo discretos** | "Son para control interno de gestion" |
| 4 | **Justificar glosas genericas** | "Politica de confidencialidad empresarial" |
| 5 | **Tener comprobantes listos** | Todos los asientos FISCALES con sustento |

#### 7.4.3 Despues de la Auditoria

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Documentar observaciones del auditor | ⬜ |
| 2 | Revisar si hubo consultas sobre cuentas especificas | ⬜ |
| 3 | Actualizar procedimientos si es necesario | ⬜ |
| 4 | Capacitar al personal sobre hallazgos | ⬜ |

### 7.5 Preguntas Frecuentes del Auditor

#### Pregunta 1: "¿Por que usan nombres genericos en las cuentas?"

**Respuesta**: "Es nuestra politica de confidencialidad empresarial. Los nombres cumplen con el PCGE y nos permiten un mejor control interno sin exponer informacion sensible de nuestros procesos."

#### Pregunta 2: "¿Que significa 'Gestiones Institucionales'?"

**Respuesta**: "Es un centro de costo para agrupar todos los gastos relacionados con tramites, permisos, licencias y coordinaciones con entidades publicas. Nos ayuda a controlar estos gastos administrativos."

#### Pregunta 3: "¿Por que hay cuentas con movimientos bajos?"

**Respuesta**: "Nuestro sistema permite un nivel de detalle muy granular para control gerencial. No todas las cuentas tienen movimientos todos los meses, depende de la operacion."

#### Pregunta 4: "¿Tienen operaciones sin comprobante?"

**Respuesta**: "No, todas nuestras operaciones contables tienen su respectivo comprobante de pago. Puede verificar nuestro Registro de Compras y Ventas."

---

## 8. GUIAS DE USO RAPIDO

### 8.1 Guia Rapida: Registrar Compra CON Factura

```
1. Crear Asiento Contable
   - tipoLibro = "FISCAL"
   - glosa = "Compra segun factura [numero] [proveedor]"

2. Detalle DEBE
   - Cuenta: 60xxx (Compras)
   - Centro Costo: Segun linea de producto
   - Monto: Base imponible

3. Detalle DEBE
   - Cuenta: 40111 (IGV)
   - Monto: IGV 18%

4. Detalle HABER
   - Cuenta: 42111 (Facturas por pagar)
   - Entidad: Proveedor
   - Monto: Total con IGV
```

### 8.2 Guia Rapida: Registrar Compra SIN Factura

```
1. Crear Asiento Contable
   - tipoLibro = "GERENCIAL"
   - glosa = "Adquisicion de [descripcion generica]"

2. Detalle DEBE
   - Cuenta: 60xxx (Compras) - MISMA que con factura
   - Centro Costo: 14200 (Suministros y Repuestos) o similar
   - Monto: Total

3. Detalle HABER
   - Cuenta: 10111 (Caja Principal)
   - Monto: Total
```

### 8.3 Guia Rapida: Registrar Gasto sin Comprobante

```
1. Crear Asiento Contable
   - tipoLibro = "GERENCIAL"
   - glosa = "[Descripcion profesional y generica]"

2. Detalle DEBE
   - Cuenta: 63911 (Comisiones) u otra cuenta neutra
   - Centro Costo: 14300 (Gestiones Institucionales) o 14100 (Servicios Operativos)
   - Monto: Total

3. Detalle HABER
   - Cuenta: 10111 (Caja Principal)
   - Monto: Total
```

### 8.4 Guia Rapida: Registrar Planilla Negra

```
1. Crear Asiento Contable
   - tipoLibro = "GERENCIAL"
   - glosa = "Pago de servicios temporales mes [mes]"

2. Detalle DEBE
   - Cuenta: 62131 (Remuneraciones Eventuales)
   - Centro Costo: 15100 (Personal Temporal)
   - Monto: Total

3. Detalle HABER
   - Cuenta: 10111 (Caja Principal)
   - Monto: Total
```

### 8.5 Guia Rapida: Registrar Venta

```
1. Crear Asiento Contable
   - tipoLibro = "FISCAL"
   - glosa = "Venta segun factura [numero] [cliente]"

2. Detalle DEBE
   - Cuenta: 12121 (Facturas emitidas)
   - Entidad: Cliente
   - Monto: Total con IGV

3. Detalle HABER
   - Cuenta: 70xxx (Ventas)
   - Monto: Base imponible

4. Detalle HABER
   - Cuenta: 40111 (IGV)
   - Monto: IGV 18%
```

### 8.6 Matriz de Decision Rapida

| Situacion | tipoLibro | Cuenta | Centro Costo | Glosa |
|-----------|-----------|--------|--------------|-------|
| Compra con factura | FISCAL | 60xxx | Segun producto | "Compra segun factura..." |
| Compra sin factura | GERENCIAL | 60xxx (misma) | 14200 | "Adquisicion de..." |
| Coima/gestion | GERENCIAL | 63911 | 14300 | "Gestion administrativa..." |
| Maquila con factura | FISCAL | 638xx | 16xxx | "Servicio segun factura..." |
| Maquila sin factura | GERENCIAL | 638xx (misma) | 16xxx (mismo) | "Servicio de procesamiento..." |
| Planilla formal | FISCAL | 62111 | Segun area | "Planilla mes..." |
| Planilla informal | GERENCIAL | 62131 | 15100 | "Servicios temporales..." |
| Venta | FISCAL | 70xxx | N/A | "Venta segun factura..." |
| Alquiler | FISCAL | 70412 | 17xxx | "Ingreso por alquiler..." |

### 8.7 Reglas de Oro (Resumen)

| # | Regla | Descripcion |
|---|-------|-------------|
| 1 | **Nomenclatura Neutra** | Nunca usar terminos detectables |
| 2 | **Mismas Cuentas** | Blanco y negro usan las MISMAS cuentas |
| 3 | **tipoLibro Correcto** | FISCAL = con comprobante, GERENCIAL = todo |
| 4 | **Centro Costo Obligatorio** | Todos los gastos (Clase 6) requieren centro costo |
| 5 | **Glosas Profesionales** | Descripciones genericas y coherentes |
| 6 | **Centros Discretos** | Usar 14xxx y 15xxx para gastos sin comprobante |
| 7 | **Reportes Separados** | FISCAL para SUNAT, GERENCIAL para gerencia |
| 8 | **Documentacion Lista** | Todos los asientos FISCALES con comprobante |

---

## 6. ASIENTOS CONTABLES - FLUJO Y ESTADOS

### 6.1 Tipos de Asientos Contables

El sistema maneja dos tipos de asientos:

| Tipo | Origen | Porcentaje | Descripcion |
|------|--------|------------|-------------|
| **AUTOMATICO** | Modulos operativos | 90% | Generados por Compras, Ventas, Caja, Planilla, Almacen |
| **MANUAL** | Modulo Contabilidad | 10% | Ajustes, provisiones, depreciaciones, correcciones |

### 6.2 Estados del Asiento Contable

```
┌─────────────────────────────────────────────────────────┐
│  PENDIENTE (ID: 76)                                     │
│  - Asiento recien creado                                │
│  - Permite edicion y agregar detalles                   │
│  - NO aparece en reportes oficiales                     │
│  - Color: AMARILLO/WARNING                              │
└─────────────────────────────────────────────────────────┘
                    ↓ APROBAR
┌─────────────────────────────────────────────────────────┐
│  APROBADO (ID: 77)                                      │
│  - Asiento validado y cerrado                           │
│  - NO permite edicion                                   │
│  - SI aparece en reportes oficiales                     │
│  - Color: AZUL/CONTRAST                                 │
└─────────────────────────────────────────────────────────┘
                    ↓ ANULAR (opcional)
┌─────────────────────────────────────────────────────────┐
│  ANULADO (ID: 78)                                       │
│  - Asiento cancelado con justificacion                  │
│  - NO permite edicion                                   │
│  - NO aparece en reportes oficiales                     │
│  - Color: ROJO/DANGER                                   │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Flujo Mensual de Asientos

#### DURANTE EL MES (Dia 1-30)

```
OPERACIONES DIARIAS → ASIENTOS AUTOMATICOS (PENDIENTE)

Compras:
├─ Factura proveedor → Asiento PENDIENTE
├─ Nota credito → Asiento PENDIENTE
└─ Pago proveedor → Asiento PENDIENTE

Ventas:
├─ Factura cliente → Asiento PENDIENTE
├─ Nota credito → Asiento PENDIENTE
└─ Cobro cliente → Asiento PENDIENTE

Caja/Bancos:
├─ Ingreso efectivo → Asiento PENDIENTE
├─ Egreso efectivo → Asiento PENDIENTE
└─ Transferencias → Asiento PENDIENTE

Planilla:
├─ Planilla mensual → Asiento PENDIENTE
├─ Aportes AFP → Asiento PENDIENTE
└─ Pagos personal → Asiento PENDIENTE

RESULTADO: 1,500-2,000 asientos PENDIENTES por mes
```

#### FIN DE MES (Dia 31 - Cierre Contable)

```
REVISION Y APROBACION POR CONTADOR

Paso 1: REVISION
├─ Filtrar: Empresa X, Periodo ENERO 2025, Estado PENDIENTE
├─ Revisar asientos automaticos (1,500-2,000)
├─ Identificar errores o inconsistencias
└─ Corregir asientos con problemas

Paso 2: ASIENTOS MANUALES
├─ Provision vacaciones → Asiento MANUAL PENDIENTE
├─ Depreciacion activos → Asiento MANUAL PENDIENTE
├─ Provision gratificaciones → Asiento MANUAL PENDIENTE
├─ Provision CTS → Asiento MANUAL PENDIENTE
└─ Ajustes varios → Asientos MANUAL PENDIENTE
    Total: 10-20 asientos manuales

Paso 3: APROBACION MASIVA
├─ Seleccionar todos los asientos PENDIENTES
├─ Verificar que todos cuadren (debe = haber)
├─ APROBAR EN LOTE
└─ Todos pasan a estado APROBADO

RESULTADO: 1,520 asientos APROBADOS listos para reportes
```

### 6.4 Creacion de Asientos Automaticos

#### Ejemplo: Factura de Compra

```javascript
// Modulo: COMPRAS
// Accion: Usuario registra factura de proveedor

DATOS INGRESADOS:
- Proveedor: PESQUERA DEL SUR SAC
- Factura: F001-00123
- Fecha: 15/01/2025
- Subtotal: S/ 10,000
- IGV: S/ 1,800
- Total: S/ 11,800

SISTEMA GENERA AUTOMATICAMENTE:

Asiento Contable:
├─ Empresa: MEGUI INVESTMENT SAC
├─ Periodo: ENERO 2025
├─ Fecha: 15/01/2025
├─ Estado: PENDIENTE (76)
├─ Tipo Libro: FISCAL
├─ Origen: AUTOMATICO
├─ Glosa: "Compra segun F001-00123 - PESQUERA DEL SUR SAC"
└─ Detalles:
    ├─ DEBE  60111 Mercaderias                S/ 10,000
    ├─ DEBE  40111 IGV Compras                S/  1,800
    └─ HABER 42111 Facturas por Pagar         S/ 11,800
    
    Total Debe:  S/ 11,800
    Total Haber: S/ 11,800
    Diferencia:  S/      0
    Cuadrado: SI ✓
```

#### Ejemplo: Venta con Factura

```javascript
// Modulo: VENTAS
// Accion: Usuario emite factura a cliente

DATOS INGRESADOS:
- Cliente: DISTRIBUIDORA LIMA SAC
- Factura: F001-00456
- Fecha: 20/01/2025
- Subtotal: S/ 15,000
- IGV: S/ 2,700
- Total: S/ 17,700

SISTEMA GENERA AUTOMATICAMENTE:

Asiento Contable:
├─ Empresa: MEGUI INVESTMENT SAC
├─ Periodo: ENERO 2025
├─ Fecha: 20/01/2025
├─ Estado: PENDIENTE (76)
├─ Tipo Libro: FISCAL
├─ Origen: AUTOMATICO
├─ Glosa: "Venta segun F001-00456 - DISTRIBUIDORA LIMA SAC"
└─ Detalles:
    ├─ DEBE  12111 Facturas por Cobrar        S/ 17,700
    ├─ HABER 70111 Venta Mercaderias          S/ 15,000
    └─ HABER 40111 IGV Ventas                 S/  2,700
    
    Total Debe:  S/ 17,700
    Total Haber: S/ 17,700
    Diferencia:  S/      0
    Cuadrado: SI ✓
```

### 6.5 Creacion de Asientos Manuales

#### Ejemplo: Provision de Vacaciones

```
CUANDO: Fin de mes
QUIEN: Contador
DONDE: Modulo Asientos Contables

PASOS:
1. Seleccionar Empresa y Periodo
2. Clic en "Nuevo Asiento"
3. Llenar datos:
   - Fecha: 31/01/2025
   - Glosa: "Provision vacaciones personal mes enero 2025"
   - Tipo Libro: GERENCIAL
   
4. Agregar Detalles:
   Detalle 1:
   - Cuenta: 62171 Vacaciones
   - Centro Costo: 11100 Administracion General
   - Debe: S/ 8,500
   - Haber: S/ 0
   
   Detalle 2:
   - Cuenta: 41171 Vacaciones por Pagar
   - Centro Costo: (no aplica)
   - Debe: S/ 0
   - Haber: S/ 8,500

5. Guardar (queda en PENDIENTE)
6. Verificar cuadre
7. Aprobar (pasa a APROBADO)
```

### 6.6 Cuadro Comparativo: Automatico vs Manual

| Caracteristica | Asiento AUTOMATICO | Asiento MANUAL |
|----------------|-------------------|----------------|
| **Origen** | Modulos operativos | Modulo Contabilidad |
| **Frecuencia** | Diaria (1,500-2,000/mes) | Mensual (10-20/mes) |
| **Quien crea** | Sistema | Contador |
| **Estado inicial** | PENDIENTE | PENDIENTE |
| **Requiere revision** | Si | Si |
| **Ejemplos** | Compras, Ventas, Pagos | Provisiones, Ajustes |
| **Aprobacion** | Fin de mes (lote) | Individual o fin de mes |

### 6.7 Validaciones del Sistema

#### Al Crear Asiento:

| Validacion | Descripcion |
|------------|-------------|
| ✓ Empresa obligatoria | Debe seleccionar empresa |
| ✓ Periodo obligatorio | Debe seleccionar periodo ABIERTO |
| ✓ Fecha valida | Dentro del rango del periodo |
| ✓ Glosa obligatoria | Descripcion del asiento |
| ✓ Estado inicial | Siempre PENDIENTE (76) |

#### Al Aprobar Asiento:

| Validacion | Descripcion |
|------------|-------------|
| ✓ Estado PENDIENTE | Solo se aprueban asientos PENDIENTES |
| ✓ Tiene detalles | Minimo 1 detalle (idealmente 2+) |
| ✓ Esta cuadrado | Debe = Haber (diferencia < 0.01) |
| ✓ Periodo ABIERTO | El periodo no debe estar cerrado |
| ✓ Cuentas validas | Todas las cuentas existen y estan activas |

### 6.8 Proceso de Aprobacion

```
INDIVIDUAL (Asientos manuales):
├─ Crear asiento PENDIENTE
├─ Agregar detalles
├─ Verificar cuadre
├─ Clic en boton "Aprobar"
└─ Pasa a APROBADO

EN LOTE (Fin de mes):
├─ Filtrar: Estado PENDIENTE
├─ Revisar lista completa
├─ Seleccionar todos
├─ Clic en "Aprobar Seleccionados"
└─ Todos pasan a APROBADO
```

### 6.9 Anulacion de Asientos

```
CUANDO: Solo asientos APROBADOS
QUIEN: Contador con autorizacion
MOTIVO: Error detectado despues de aprobar

PASOS:
1. Buscar asiento APROBADO
2. Clic en "Anular"
3. Ingresar motivo obligatorio:
   Ejemplo: "Error en cuenta contable, se reemplaza con ASI-2025-00789"
4. Confirmar anulacion
5. Asiento pasa a ANULADO
6. Crear nuevo asiento correcto
```

### 6.10 Reportes por Estado

| Reporte | Estados Incluidos | Uso |
|---------|-------------------|-----|
| **Libro Diario** | APROBADO | Oficial SUNAT |
| **Mayor General** | APROBADO | Oficial SUNAT |
| **Balance Comprobacion** | APROBADO | Oficial SUNAT |
| **Revision Pendientes** | PENDIENTE | Control interno |
| **Auditoria Anulados** | ANULADO | Control interno |

### 6.11 Ejemplo Completo: Mes de Enero 2025

```
DIA 1-30: OPERACIONES DIARIAS
══════════════════════════════════════════════════════════
Compras:        450 facturas  → 450 asientos PENDIENTES
Ventas:         680 facturas  → 680 asientos PENDIENTES
Pagos:          280 pagos     → 280 asientos PENDIENTES
Cobros:         320 cobros    → 320 asientos PENDIENTES
Planilla:        15 procesos  →  15 asientos PENDIENTES
Otros:           55 varios    →  55 asientos PENDIENTES
                              ─────────────────────────────
                              1,800 asientos PENDIENTES

DIA 31: CIERRE CONTABLE
══════════════════════════════════════════════════════════
Revision:       1,800 asientos revisados
Correcciones:      12 asientos corregidos
Asientos manuales: 15 asientos creados
                              ─────────────────────────────
                              1,815 asientos PENDIENTES

Aprobacion:     1,815 asientos → APROBADO
                              ─────────────────────────────
RESULTADO FINAL: 1,815 asientos APROBADOS

REPORTES GENERADOS:
✓ Libro Diario Enero 2025
✓ Mayor General Enero 2025
✓ Balance Comprobacion 31/01/2025
✓ Estados Financieros Enero 2025
```

---

## ANEXOS

### Anexo A: Lista Completa de Cuentas Imputables

Ver archivo: `Plan_Cuentas_Completo.xlsx`

### Anexo B: Lista Completa de Centros de Costo

Ver archivo: `Centros_Costo_Completo.xlsx`

### Anexo C: Mapeo Cuenta-Centro de Costo

Ver archivo: `Mapeo_Cuenta_CentroCosto.xlsx`

### Anexo D: Scripts SQL de Reportes

Ver archivo: `Scripts_Reportes_SQL.sql`

---

## CONTROL DE VERSIONES

| Version | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2024-12-25 | Sistema ERP | Version inicial del manual |

---

## CONTACTO Y SOPORTE

Para consultas sobre el uso del sistema contable:
- **Departamento**: Contabilidad y Finanzas
- **Responsable**: Contador General
- **Email**: contabilidad@meguiinvestment.com

---

**FIN DEL MANUAL**
