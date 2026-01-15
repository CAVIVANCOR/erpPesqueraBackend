📘 FLUJO DE COMPRAS CON FACTURACIÓN BLANCA Y NEGRA (GERENCIAL)
Sistema ERP Pesquera - Módulo de Compras Versión: 1.0
Fecha: Enero 2026
📑 TABLA DE CONTENIDO
Introducción
Conceptos Fundamentales
Análisis Comparativo: Ventas vs Compras
Estados del Sistema
Tabla Comparativa de los 3 Casos
Caso 1: Compra 100% Negra
Caso 2: Compra Mixta
Caso 3: Compra 100% Blanca
Cambios en el Schema
Validaciones y Reglas de Negocio
Resumen Ejecutivo

🎯 INTRODUCCIÓN
Objetivo
Implementar un sistema de facturación dual (Blanca/Negra) en el módulo de Compras, replicando la funcionalidad existente en el módulo de Ventas, permitiendo:

Compras Blancas (Formales): Operaciones con comprobante del proveedor, registradas en SUNAT
Compras Negras (Gerenciales): Operaciones sin comprobante, solo para control interno
Compras Mixtas: Partición de una compra en parte blanca y parte negra
Alcance
Modificación del modelo OrdenCompra para soportar facturación dual
Modificación del modelo CuentaPorPagar para diferenciar CxP formales de gerenciales
Uso de estados existentes del sistema (IDs 38-110 para OC, 111-115 para CxP)
Generación automática de asientos contables diferenciados
💡 CONCEPTOS FUNDAMENTALES
1. Facturación Blanca (Formal)
Característica	Descripción
Definición	Compra con comprobante electrónico del proveedor (Factura/Boleta)
Registro SUNAT	✅ SÍ - Aparece en libros contables fiscales
Comprobante	Proveedor emite y envía a SUNAT
Cuenta Contable	60 Compras / 40 IGV / 42 CxP (cuentas formales)
Deducible IR	✅ SÍ - Deducible para Impuesto a la Renta
Crédito Fiscal	✅ SÍ - IGV deducible
2. Facturación Negra (Gerencial)
Característica	Descripción
Definición	Compra sin comprobante, solo para control interno
Registro SUNAT	❌ NO - Solo en libros gerenciales
Comprobante	No se recibe comprobante del proveedor
Cuenta Contable	60XX Compras Gerenciales / 42XX CxP Gerenciales
Deducible IR	❌ NO - No deducible
Crédito Fiscal	❌ NO - IGV no deducible
3. Facturación Mixta (Particionada)
Característica	Descripción
Definición	Una compra dividida en parte blanca y parte negra
Proceso	OC original se particiona en 2 OCs hijas
Ejemplo	Compra de S/ 10,000 → S/ 6,000 Blanca + S/ 4,000 Negra
Resultado	2 CxP independientes (1 formal + 1 gerencial)

📊 ANÁLISIS COMPARATIVO: VENTAS VS COMPRAS
Diferencias Fundamentales
Aspecto	VENTAS	COMPRAS
Documento Origen	Cotización de Ventas	Requerimiento de Compra
Documento Intermedio	PreFactura	Orden de Compra (OC)
Comprobante Electrónico	Nosotros generamos y enviamos a SUNAT	Proveedor genera y envía a SUNAT
Datos SUNAT	PreFactura guarda: serie, número, hash, CDR, XML, PDF	OC guarda: serie y número del comprobante del proveedor
Cuenta Generada	Cuenta por Cobrar (CxC)	Cuenta por Pagar (CxP)
Cuándo se genera	Al aprobar/facturar/validar PreFactura	Al aprobar/facturar/recibir comprobante OC
Flujo de Dinero	💰 Ingreso (Cliente nos paga)	💸 Egreso (Nosotros pagamos)
Contabilización Blanca	12 CxC / 70 Ventas / 40 IGV	60 Compras / 40 IGV / 42 CxP
Contabilización Negra	12XX CxC Gerencial / 70XX Ventas Gerencial	60XX Compras Gerencial / 42XX CxP Gerencial
Similitudes Clave
Aspecto	Ambos Módulos
Campo esGerencial	✅ Diferencia Blanco (false) de Negro (true)
Campo esParticionada	✅ Indica si el documento fue dividido
Campo facturado	✅ Indica si ya se generó la cuenta (CxC/CxP)
Relación 1:1	✅ PreFactura → CxC / OC → CxP
Partición	✅ Documento original → 2 documentos hijos

🔄 ESTADOS DEL SISTEMA
ORDEN DE COMPRA (Tipo Proviene: ID=12)
ID	Descripción	Severity	Uso	Análogo en Ventas
38	PENDIENTE	SECONDARY	OC creada, pendiente de aprobación	45 (PreFactura PENDIENTE)
39	APROBADA	CONTRAST	OC aprobada, lista para procesar	46 (PreFactura APROBADA)
40	ANULADA	DANGER	OC anulada manualmente	47 (PreFactura ANULADA)
50	PARTICIONADA	SUCCESS	OC dividida en Blanca/Negra	48 (PreFactura PARTICIONADA)
106	FACTURADA	INFO	OC Negra completada (sin comprobante, CxP generada)	95 (PreFactura FACTURADA)
107	EMITIDA	SUCCESS	OC Blanca emitida, esperando comprobante	96 (PreFactura EMITIDA)
108	COMPROBANTE ELECTRONICO RECIBIDO	WARNING	Comprobante del proveedor recibido y registrado	97 (PreFactura COMP. ELECTRÓNICO GENERADO)
109	VALIDADO SUNAT	SUCCESS	Comprobante validado, CxP generada	98 (PreFactura VALIDADO SUNAT)
110	NO VALIDADO SUNAT	DANGER	Comprobante con problemas/rechazado	99 (PreFactura NO VALIDADO SUNAT)
CUENTAS POR PAGAR (Tipo Proviene: ID=25)
ID	Descripción	Severity	Uso
111	PENDIENTE DE PAGO	DANGER	CxP creada, pendiente de pago
112	PAGO PARCIAL	WARNING	CxP con pago parcial
113	PAGADO	SUCCESS	CxP pagada completamente
114	VENCIDO	DANGER	CxP vencida sin pagar
115	ANULADO	SECONDARY	CxP anulada

📋 TABLA COMPARATIVA DE LOS 3 CASOS
Aspecto	CASO 1: 100% Negro	CASO 2: Mixto	CASO 3: 100% Blanco
OC Inicial	Total Gerencial	Total (sin definir)	Total Formal
Estado Inicial OC	38 (PENDIENTE)	38 (PENDIENTE)	38 (PENDIENTE)
Estado Aprobado OC	39 (APROBADA)	39 (APROBADA)	39 (APROBADA)
¿Se particiona?	❌ NO	✅ SÍ (en 2 OC)	❌ NO
Estado Final OC	106 (FACTURADA)	50 (PARTICIONADA)	109 (VALIDADO SUNAT)
OC Generadas	1 OC Negra	1 Original + 2 Hijas	1 OC Blanca
% Negro	100%	Variable (ej: 40%)	0%
% Blanco	0%	Variable (ej: 60%)	100%
Comprobante Proveedor	❌ NO se recibe	✅ SÍ (solo parte blanca)	✅ SÍ (total)
Estados OC Hijas (Mixto)	N/A	Negra: 106 / Blanca: 109	N/A
Datos SUNAT en OC	null	Solo en OC Blanca	Serie y número del proveedor
CxP Negra	✅ SÍ (total)	✅ SÍ (parte negra)	❌ NO
Estado CxP Negra	111 (PENDIENTE)	111 (PENDIENTE)	N/A
CxP Blanca	❌ NO	✅ SÍ (parte blanca)	✅ SÍ (total)
Estado CxP Blanca	N/A	111 (PENDIENTE)	111 (PENDIENTE)
Contabilización	Cuentas Gerenciales	Ambas cuentas	Cuentas Formales
Visible en reportes SUNAT	❌ NO	✅ Parcial	✅ SÍ

🎯 CASO 1: COMPRA 100% NEGRA (GERENCIAL)
Descripción
Compra sin comprobante del proveedor, solo para control interno. No genera crédito fiscal ni es deducible para IR.
Ejemplo Práctico
Proveedor: DISTRIBUIDORA XYZ SAC
Monto: S/ 10,000.00
Motivo: Compra gerencial interna (sin comprobante)Flujo Detallado:
Plaintext
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: REQUERIMIENTO DE COMPRA APROBADO                       │
│  Proveedor: DISTRIBUIDORA XYZ SAC                               │
│  Total: S/ 10,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR ORDEN DE COMPRA                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 38 (PENDIENTE)                                    │ │
│  │ esGerencial: true                                         │ │
│  │ Monto Total: S/ 10,000.00                                 │ │
│  │ Motivo: Compra gerencial interna                          │ │
│  │                                                           │ │
│  │ Campos SUNAT (todos null):                                │ │
│  │ - tipoDocumentoFinalId: null                              │ │
│  │ - numeroDocumentoFinal: null                              │ │
│  │ - numSerieDocFinal: null                                  │ │
│  │ - numCorreDocFinal: null                                  │ │
│  │ - comprobanteRecibido: false                              │ │
│  │ - fechaRecepcionComprobante: null                         │ │
│  │ - facturado: false                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR ORDEN DE COMPRA                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 38 → 39 (APROBADA)                                │ │
│  │ Sistema valida y aprueba                                  │ │
│  │ Aprobado por: [Usuario]                                   │ │
│  │ Fecha aprobación: [Timestamp]                             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: FACTURAR NEGRA (GERENCIAL)                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 39 → 106 (FACTURADA)                              │ │
│  │ ❌ NO se espera comprobante del proveedor                 │ │
│  │ ✅ SÍ genera CUENTA POR PAGAR NEGRA automáticamente       │ │
│  │ facturado: true                                           │ │
│  │ fechaFacturacion: [Timestamp]                             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  CUENTA POR PAGAR NEGRA (Gerencial)                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 111 (PENDIENTE DE PAGO)                           │ │
│  │ Proveedor: DISTRIBUIDORA XYZ SAC                          │ │
│  │ Monto: S/ 10,000.00                                       │ │
│  │ esGerencial: true                                         │ │
│  │ Vencimiento: Según forma de pago                          │ │
│  │ Referencia: OC #001-0000004                               │ │
│  │ numeroFacturaProveedor: null                              │ │
│  │ fechaFacturaProveedor: null                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: CONTABILIZACIÓN GERENCIAL                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ASIENTO CONTABLE GERENCIAL:                               │ │
│  │ Libro: GERENCIAL                                          │ │
│  │                                                           │ │
│  │ DEBE:                                                     │ │
│  │ 60XX - Compras Gerenciales           S/ 10,000.00         │ │
│  │                                                           │ │
│  │ HABER:                                                    │ │
│  │ 42XX - Cuentas por Pagar Gerenciales S/ 10,000.00         │ │
│  │                                                           │ │
│  │ Glosa: Compra gerencial según OC #001-0000004             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: PAGO AL PROVEEDOR                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Pagamos al proveedor → Registrar en Caja Gerencial        │ │
│  │ Estado CxP: 111 → 113 (PAGADO)                            │ │
│  │ montoPagado: S/ 10,000.00                                 │ │
│  │ saldoPendiente: S/ 0.00                                   │ │
│  │                                                           │ │
│  │ ASIENTO CONTABLE:                                         │ │
│  │ DEBE:  42XX - CxP Gerenciales    S/ 10,000.00             │ │
│  │ HABER: 10XX - Caja Gerencial     S/ 10,000.00             │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
Resumen del Caso 1
| Concepto | Valor |
| :--- | :--- |
| Documentos generados | 1 OC + 1 CxP |
| Comprobante proveedor | ❌ NO |
| Visible en SUNAT | ❌ NO |
| Deducible IR | ❌ NO |
| Crédito Fiscal IGV | ❌ NO |



🎯 CASO 2: COMPRA MIXTA (NEGRO + BLANCO)
Descripción
Una compra se divide en dos partes: una con comprobante (blanca) y otra sin comprobante (negra).

Ejemplo Práctico
Proveedor: COMERCIAL ABC SAC
Monto Total: S/ 20,000.00
Partición: S/ 8,000 Negra (40%) + S/ 12,000 Blanca (60%)
Flujo Detallado:
Plaintext
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: REQUERIMIENTO DE COMPRA APROBADO                       │
│  Proveedor: COMERCIAL ABC SAC                                   │
│  Total: S/ 20,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR ORDEN DE COMPRA ORIGINAL                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 38 (PENDIENTE)                                    │ │
│  │ Monto Total: S/ 20,000.00                                 │ │
│  │ esGerencial: null (aún no definido)                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR ORDEN DE COMPRA                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 38 → 39 (APROBADA)                                │ │
│  │ Sistema valida y aprueba                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: PARTICIONAR EN BLANCA/NEGRA                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Usuario selecciona productos/montos:                      │ │
│  │ ├─ Parte NEGRA: S/ 8,000.00 (40%)                        │ │
│  │ └─ Parte BLANCA: S/ 12,000.00 (60%)                      │ │
│  │                                                           │ │
│  │ Sistema ejecuta:                                          │ │
│  │ 1. OC Original:                                           │ │
│  │    Estado: 39 → 50 (PARTICIONADA)                         │ │
│  │    esParticionada: true                                   │ │
│  │                                                           │ │
│  │ 2. Crear OC NEGRA (Hija 1):                               │ │
│  │    Estado: 39 (APROBADA)                                  │ │
│  │    esGerencial: true                                      │ │
│  │    ordenCompraOrigenId: [ID Original]                     │ │
│  │    Monto: S/ 8,000.00                                     │ │
│  │                                                           │ │
│  │ 3. Crear OC BLANCA (Hija 2):                              │ │
│  │    Estado: 39 (APROBADA)                                  │ │
│  │    esGerencial: false                                     │ │
│  │    ordenCompraOrigenId: [ID Original]                     │ │
│  │    Monto: S/ 12,000.00                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ↓                               ↓
┌──────────────────────┐      ┌──────────────────────┐
│   RAMA NEGRA         │      │   RAMA BLANCA        │
│   S/ 8,000.00        │      │   S/ 12,000.00       │
│   Estado: 39         │      │   Estado: 39         │
└──────┬───────────────┘      └──────┬───────────────┘
       ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│ FACTURAR NEGRA       │      │ EMITIR OC BLANCA     │
│ Estado: 39 → 106     │      │ Estado: 39 → 107     │
│ (FACTURADA)          │      │ (EMITIDA)            │
│                      │      │                      │
│ facturado: true      │      │ Esperando comprobante│
│ fechaFacturacion: [] │      │ comprobanteRecibido: │
└──────┬───────────────┘      │ false                │
       ↓                      └──────┬───────────────┘
┌──────────────────────┐             ↓
│ CUENTA POR PAGAR     │      ┌──────────────────────┐
│ NEGRA (Gerencial)    │      │ PROVEEDOR EMITE      │
│                      │      │ FACTURA              │
│ Estado: 111          │      │                      │
│ (PENDIENTE)          │      │ Serie: F001          │
│ Monto: S/ 8,000.00   │      │ Número: 00000456     │
│ esGerencial: true    │      │ Monto: S/ 12,000.00  │
│ numeroFactura: null  │      └──────┬───────────────┘
└──────┬───────────────┘             ↓
       ↓                      ┌──────────────────────┐
┌──────────────────────┐      │ REGISTRAR COMPROBANTE│
│ CONTABILIZACIÓN      │      │ Usuario registra:    │
│ GERENCIAL            │      │ - tipoDocumentoFinal │
│                      │      │   Id: 1 (Factura)    │
│ Libro: GERENCIAL     │      │ - numeroDocumento    │
│                      │      │   Final: "F001-456"  │
│ DEBE:                │      │ - numSerieDocFinal:  │
│ 60XX Compras Ger.    │      │   "F001"             │
│ S/ 8,000.00          │      │ - numCorreDocFinal:  │
│                      │      │   "00000456"         │
│ HABER:               │      │ - fechaRecepcion: [] │
│ 42XX CxP Ger.        │      │ - comprobanteRecibido│
│ S/ 8,000.00          │      │   : true             │
└──────────────────────┘      │                      │
                              │ Estado: 107 → 108    │
                              │ (COMPROBANTE         │
                              │  ELECTRONICO RECIBIDO)│
                              └──────┬───────────────┘
                                     ↓
                              ┌──────────────────────┐
                              │ VALIDAR COMPROBANTE  │
                              │ Sistema valida:      │
                              │ ✅ Datos completos   │
                              │ ✅ Montos coinciden  │
                              │ ✅ Proveedor correcto│
                              │                      │
                              │ Estado: 108 → 109    │
                              │ (VALIDADO SUNAT)     │
                              │                      │
                              │ facturado: true      │
                              │ fechaFacturacion: [] │
                              │                      │
                              │ ✅ Genera CxP BLANCA │
                              └──────┬───────────────┘
                                     ↓
                              ┌──────────────────────┐
                              │ CUENTA POR PAGAR     │
                              │ BLANCA (Formal)      │
                              │                      │
                              │ Estado: 111          │
                              │ (PENDIENTE)          │
                              │ Monto: S/ 12,000.00  │
                              │ esGerencial: false   │
                              │ numeroFactura:       │
                              │ "F001-00000456"      │
                              │ fechaFactura: []     │
                              └──────┬───────────────┘
                                     ↓
                              ┌──────────────────────┐
                              │ CONTABILIZACIÓN      │
                              │ FORMAL               │
                              │                      │
                              │ Libro: FISCAL        │
                              │                      │
                              │ DEBE:                │
                              │ 60 Compras           │
                              │ S/ 10,169.49         │
                              │ 40 IGV               │
                              │ S/ 1,830.51          │
                              │                      │
                              │ HABER:               │
                              │ 42 CxP               │
                              │ S/ 12,000.00         │
                              └──────────────────────┘
Resumen del Caso 2
| Concepto | Valor |
| :--- | :--- |
| Documentos generados | 1 OC Original + 2 OC Hijas + 2 CxP |
| Comprobante proveedor | ✅ SÍ (solo parte blanca) |
| Visible en SUNAT | ✅ Parcial (solo S/ 12,000) |
| Deducible IR | ✅ Parcial (solo S/ 12,000) |
| Crédito Fiscal IGV | ✅ Parcial (solo parte blanca) |

🎯 CASO 3: COMPRA 100% BLANCA (FORMAL)
Descripción: Compra formal con comprobante del proveedor. Genera crédito fiscal y es deducible para IR.
Ejemplo Práctico:

Proveedor: IMPORTADORA DEF SAC


Monto: S/ 15,000.00


Comprobante: Factura F001-00000789

Flujo Detallado:
Plaintext
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: REQUERIMIENTO DE COMPRA APROBADO                       │
│  Proveedor: IMPORTADORA DEF SAC                                 │
│  Total: S/ 15,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR ORDEN DE COMPRA                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 38 (PENDIENTE)                                    │ │
│  │ esGerencial: false                                        │ │
│  │ Monto Total: S/ 15,000.00                                 │ │
│  │ Operación: Compra formal estándar                         │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR ORDEN DE COMPRA                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 38 → 39 (APROBADA)                                │ │
│  │ Sistema valida y aprueba                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: EMITIR ORDEN DE COMPRA AL PROVEEDOR                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 39 → 107 (EMITIDA)                                │ │
│  │ Se envía OC al proveedor                                  │ │
│  │ Esperando que proveedor emita comprobante                 │ │
│  │ comprobanteRecibido: false                                │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: PROVEEDOR EMITE FACTURA                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Proveedor emite y envía a SUNAT:                          │ │
│  │ Serie: F001                                               │ │
│  │ Número: 00000789                                          │ │
│  │ RUC Proveedor: 20XXXXXXXXX                                │ │
│  │                                                            │ │
│  │ Subtotal: S/ 12,711.86                                    │ │
│  │ IGV 18%:  S/ 2,288.14                                     │ │
│  │ TOTAL:    S/ 15,000.00                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: REGISTRAR COMPROBANTE RECIBIDO                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Usuario registra en la OC:                                │ │
│  │ - tipoDocumentoFinalId: 1 (Factura)                       │ │
│  │ - numeroDocumentoFinal: "F001-00000789"                   │ │
│  │ - numSerieDocFinal: "F001"                                │ │
│  │ - numCorreDocFinal: "00000789"                            │ │
│  │ - fechaRecepcionComprobante: [Fecha]                      │ │
│  │ - comprobanteRecibido: true                               │ │
│  │                                                            │ │
│  │ Estado: 107 → 108 (COMPROBANTE ELECTRONICO RECIBIDO)      │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 7: VALIDAR COMPROBANTE                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Sistema valida:                                           │ │
│  │ ✅ Datos del comprobante completos                        │ │
│  │ ✅ Montos coinciden con OC                                │ │
│  │ ✅ Proveedor correcto                                     │ │
│  │ ✅ Tipo de documento válido                               │ │
│  │                                                            │ │
│  │ Estado: 108 → 109 (VALIDADO SUNAT)                        │ │
│  │ facturado: true                                           │ │
│  │ fechaFacturacion: [Timestamp]                             │ │
│  │                                                            │ │
│  │ ✅ Sistema genera automáticamente CxP BLANCA              │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 8: CUENTA POR PAGAR BLANCA (Generada automáticamente)     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 111 (PENDIENTE DE PAGO)                           │ │
│  │ Proveedor: IMPORTADORA DEF SAC                            │ │
│  │ numeroOrdenCompra: "001-0000006"                          │ │
│  │ numeroFacturaProveedor: "F001-00000789"                   │ │
│  │ fechaFacturaProveedor: [Fecha del comprobante]            │ │
│  │ Monto: S/ 15,000.00                                       │ │
│  │ esGerencial: false                                        │ │
│  │ Vencimiento: [Según forma de pago]                        │ │
│  │ saldoPendiente: S/ 15,000.00                              │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 9: CONTABILIZACIÓN FORMAL                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ASIENTO CONTABLE FORMAL:                                  │ │
│  │ Libro: FISCAL                                             │ │
│  │                                                            │ │
│  │ DEBE:                                                     │ │
│  │ 60 - Compras                         S/ 12,711.86         │ │
│  │ 40 - Tributos por Pagar (IGV)        S/ 2,288.14          │ │
│  │                                                            │ │
│  │ HABER:                                                    │ │
│  │ 42 - Cuentas por Pagar Comerciales   S/ 15,000.00         │ │
│  │                                                           │ │
│  │ Glosa: Compra según Factura F001-00000789 - OC 001-0000006│ │
│  │ RUC Proveedor: 20XXXXXXXXX                                │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 10: PAGO AL PROVEEDOR                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Pagamos S/ 15,000.00 → Caja/Banco Formal                  │ │
│  │ Estado CxP: 111 → 113 (PAGADO)                            │ │
│  │ montoPagado: S/ 15,000.00                                 │ │
│  │ saldoPendiente: S/ 0.00                                   │ │
│  │                                                           │ │
│  │ ASIENTO CONTABLE:                                         │ │
│  │ DEBE:  42 - CxP Comerciales      S/ 15,000.00             │ │
│  │ HABER: 10 - Caja y Bancos         S/ 15,000.00            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
Resumen del Caso 3
| Concepto | Valor |
| :--- | :--- |
| Documentos generados | 1 OC + 1 CxP |
| Comprobante proveedor | ✅ SÍ (Factura F001-00000789) |
| Visible en SUNAT | ✅ SÍ (100%) |
| Deducible IR | ✅ SÍ (100%) |
| Crédito Fiscal IGV | ✅ SÍ (S/ 2,288.14) |

🗄️ CAMBIOS EN EL SCHEMA
1. Modelo OrdenCompra - Campos a Agregar
Fragmento de código
// ========================================
// ⭐ CAMPOS NUEVOS - DOCUMENTO FINAL (COMPROBANTE DEL PROVEEDOR)
// ========================================
tipoDocumentoFinalId        BigInt?                                    // ⭐ NUEVO: Tipo recibido (01=Factura, 03=Boleta)
numeroDocumentoFinal        String?     @db.VarChar(40)                // ⭐ NUEVO: Número completo (ej: "F001-00000456")
numSerieDocFinal            String?     @db.VarChar(40)                // ⭐ NUEVO: Serie recibida (ej: "F001")
numCorreDocFinal            String?     @db.VarChar(40)                // ⭐ NUEVO: Correlativo recibido (ej: "00000456")
comprobanteRecibido         Boolean?    @default(false)                // ⭐ NUEVO: true = Ya se recibió el comprobante
fechaRecepcionComprobante   DateTime?                                  // ⭐ NUEVO: Fecha de recepción del comprobante
facturado                   Boolean?    @default(false)                // ⭐ NUEVO: true = Ya se generó CxP
fechaFacturacion            DateTime?                                  // ⭐ NUEVO: Fecha de generación de CxP

// ========================================
// ⭐ CAMPOS NUEVOS - TIPO DE FACTURACIÓN Y PARTICIÓN
// ========================================
esGerencial                 Boolean?    @default(false)                // ⭐ NUEVO: true = Negra, false = Blanca
ordenCompraOrigenId         BigInt?                                    // ⭐ NUEVO: ID de OC original si fue particionada
esParticionada              Boolean     @default(false)                // ⭐ NUEVO: true = OC fue partida

// ========================================
// ⭐ RELACIONES NUEVAS
// ========================================
tipoDocumentoFinal   TipoDocumento?          @relation("TipoDocumentoFinalOC", fields: [tipoDocumentoFinalId], references: [id])
ordenCompraOrigen    OrdenCompra?            @relation("ParticionOrdenCompra", fields: [ordenCompraOrigenId], references: [id])
ordenesCompraHijas   OrdenCompra[]           @relation("ParticionOrdenCompra")
cuentaPorPagar       CuentaPorPagar?

// ========================================
// ⭐ ÍNDICES NUEVOS
// ========================================
@@index([comprobanteRecibido])
@@index([tipoDocumentoFinalId])
@@index([facturado])
@@index([esGerencial])
@@index([ordenCompraOrigenId])
@@index([esParticionada])
2. Modelo CuentaPorPagar - Campo a Agregar
Fragmento de código
// ========================================
// ⭐ NUEVO CAMPO - TIPO DE FACTURACIÓN
// ========================================
esGerencial           Boolean?    @default(false)         // ⭐ NUEVO: true = CxP Negra, false = CxP Blanca

// ========================================
// ⭐ ÍNDICE NUEVO
// ========================================
@@index([esGerencial])
3. Estados - Ya Existen en el Sistema
No es necesario crear nuevos estados. Los estados ya existen:

Orden de Compra: IDs 38, 39, 40, 50, 106, 107, 108, 109, 110


Cuentas por Pagar: IDs 111, 112, 113, 114, 115


✅ VALIDACIONES Y REGLAS DE NEGOCIO
Categoría	Regla / Validación	Acción o Resultado
OC Estado 115 (PENDIENTE)	Solo se puede aprobar si cumple requisitos.	Debe tener detalles (productos/servicios) y un proveedor válido asignado.
OC Estado 116 (APROBADA)	Opción A: Facturarse como Negra.	Si esGerencial = true → Pasa a Estado 119 → Genera CxP.
	Opción B: Emitirse como Blanca.	Si esGerencial = false → Pasa a Estado 120 → Espera comprobante.
	Opción C: Particionarse.	Se divide en Blanca/Negra → Pasa a Estado 118.
Partición	Validación de montos.	La suma de las partes (hijas) debe ser igual al total de la OC original.
OC Negra (Estado 119)	FACTURADA	No requiere comprobante del proveedor. Genera CxP inmediatamente. Los campos SUNAT quedan null.
OC Blanca (Flujo)	Estado 120 (EMITIDA)	El documento ha sido enviado al proveedor; se queda a la espera del comprobante.
	Estado 121 (COMP. RECIBIDO)	El usuario registró manualmente los datos del comprobante del proveedor.
	Estado 122 (VALIDADO)	El sistema validó los datos y generó la CxP formal automáticamente.
Generación de CxP	Caso Negra	Se genera automáticamente al cambiar el estado a 119 (FACTURADA).
	Caso Blanca	Se genera automáticamente al cambiar el estado a 122 (VALIDADO).
Contabilización	Ejecución del asiento.	La contabilización es automática en el momento exacto en que se genera la CxP.

📋 RESUMEN EJECUTIVO
Documento	Caso 1: 100% Negro	Caso 2: Mixto	Caso 3: 100% Blanco
OC Original	Estado 106	Estado 50	Estado 109
Hijas	0	2 (Negra/Blanca)	0
CxP Negra	✅ 1 (Estado 111)	✅ 1 (Estado 111)	❌ 0
CxP Blanca	❌ 0	✅ 1 (Estado 111)	✅ 1 (Estado 111)
Asiento Gerencial	✅ 1	✅ 1 (Parte negra)	❌ 0
Asiento Formal	❌ 0	✅ 1 (Parte blanca)	✅ 1
Campos Clave del Schema
Campo	Modelo	Propósito
esGerencial	OrdenCompra, CuentaPorPagar	Diferencia Blanco (false) de Negro (true)
esParticionada	OrdenCompra	Indica si la OC fue dividida
facturado	OrdenCompra	Indica si ya se generó la CxP
comprobanteRecibido	OrdenCompra	Indica si se recibió comprobante del proveedor
ordenCompraOrigenId	OrdenCompra	Referencia a OC madre (si fue particionada)
Flujo de Estados Principales

COMPRA NEGRA:

38 (PENDIENTE) → 39 (APROBADA) → 106 (FACTURADA) → [Genera CxP 111]


COMPRA BLANCA:

38 (PENDIENTE) → 39 (APROBADA) → 107 (EMITIDA) → 108 (COMPROBANTE RECIBIDO) → 109 (VALIDADO SUNAT) → [Genera CxP 111]


COMPRA MIXTA:

38 (PENDIENTE) → 39 (APROBADA) → 50 (PARTICIONADA) → [Crea 2 Hijas]


FIN DEL DOCUMENTO
