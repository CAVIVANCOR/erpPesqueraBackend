🔄 FLUJO COMPLETO DE VENTAS CON FACTURACIÓN BLANCA Y NEGRA (GERENCIAL)
📊 DIAGRAMA GENERAL DEL PROCESO
┌─────────────────────────────────────────────────────────────────────┐
│                    COTIZACIÓN DE VENTAS                              │
│              (Local o Exportación - Aprobada)                        │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         PREFACTURA                                   │
│                  (Usuario define distribución)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
              ┌──────────────┴──────────────┐
              │   DECISIÓN DE FACTURACIÓN   │
              └──────────────┬──────────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
   CASO 1                CASO 2               CASO 3
100% NEGRO            MIXTO (NEGRO+BLANCO)   100% BLANCO
(Gerencial)           (Parcial cada uno)     (Formal)
📋 TABLA COMPARATIVA DE LOS 3 CASOS
Aspecto	CASO 1: 100% Negro	CASO 2: Mixto	CASO 3: 100% Blanco
PreFactura	Total Gerencial	Dividida en 2 partes	Total Formal
% Negro	100%	Variable (ej: 40%)	0%
% Blanco	0%	Variable (ej: 60%)	100%
Comprobante Electrónico	❌ NO genera	✅ SÍ (solo parte blanca)	✅ SÍ (total)
Envío SUNAT	❌ NO	✅ SÍ (parte blanca)	✅ SÍ
CxC Negra	✅ SÍ (total)	✅ SÍ (parte negra)	❌ NO
CxC Blanca	❌ NO	✅ SÍ (parte blanca)	✅ SÍ (total)
Contabilización	Cuentas Gerenciales	Ambas cuentas	Cuentas Formales
Visible en reportes SUNAT	❌ NO	✅ Parcial	✅ SÍ
🎯 CASO 1: FACTURACIÓN 100% NEGRA (GERENCIAL)
Flujo Detallado:
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: COTIZACIÓN APROBADA                                    │
│  Cliente: EMPRESA XYZ SAC                                       │
│  Total: S/ 10,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR PREFACTURA                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Tipo Facturación: NEGRO (Gerencial) ⚫                    │ │
│  │ Monto Total: S/ 10,000.00                                 │ │
│  │ % Negro: 100%                                             │ │
│  │ % Blanco: 0%                                              │ │
│  │ Motivo: Operación gerencial interna                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR PREFACTURA                                     │
│  Sistema valida y aprueba                                       │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: GENERACIÓN AUTOMÁTICA                                  │
│  ❌ NO genera Comprobante Electrónico                           │
│  ❌ NO envía a SUNAT                                            │
│  ✅ SÍ genera CUENTA POR COBRAR NEGRA                           │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  CUENTA POR COBRAR NEGRA (Gerencial)                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Cliente: EMPRESA XYZ SAC                                  │ │
│  │ Monto: S/ 10,000.00                                       │ │
│  │ Tipo: GERENCIAL (Negro) ⚫                                │ │
│  │ Estado: PENDIENTE                                         │ │
│  │ Vencimiento: Según condiciones                            │ │
│  │ Referencia: PreFactura #123                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: CONTABILIZACIÓN                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ASIENTO CONTABLE GERENCIAL:                               │ │
│  │                                                            │ │
│  │ DEBE:                                                      │ │
│  │ 12XX - Cuentas por Cobrar Gerenciales    S/ 10,000.00     │ │
│  │                                                            │ │
│  │ HABER:                                                     │ │
│  │ 70XX - Ventas Gerenciales                S/ 10,000.00     │ │
│  │                                                            │ │
│  │ Glosa: Venta gerencial según PreFactura #123              │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: PAGO DEL CLIENTE                                       │
│  Cliente paga → Registrar en Caja Gerencial                     │
│  CxC Negro: PAGADA ✅                                           │
└─────────────────────────────────────────────────────────────────┘
Características:
Característica	Detalle
Visibilidad SUNAT	❌ No visible
Documentos generados	Solo internos (PreFactura)
Reportes	Solo gerenciales/internos
Impuestos	No declarados formalmente
Uso	Operaciones internas, pruebas, gerencia
🎯 CASO 2: FACTURACIÓN MIXTA (NEGRO + BLANCO)
Flujo Detallado:
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: COTIZACIÓN APROBADA                                    │
│  Cliente: DISTRIBUIDORA ABC SAC                                 │
│  Total: S/ 20,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR PREFACTURA MIXTA                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Tipo Facturación: MIXTO (Negro + Blanco) ⚫⚪              │ │
│  │                                                            │ │
│  │ DISTRIBUCIÓN:                                              │ │
│  │ ├─ Parte NEGRA (Gerencial): S/ 8,000.00 (40%) ⚫          │ │
│  │ └─ Parte BLANCA (Formal):   S/ 12,000.00 (60%) ⚪         │ │
│  │                                                            │ │
│  │ Total PreFactura: S/ 20,000.00                            │ │
│  │ Motivo división: Acuerdo comercial con cliente            │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR PREFACTURA                                     │
│  Sistema valida distribución y aprueba                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
┌──────────────────────┐      ┌──────────────────────┐
│   RAMA NEGRA ⚫      │      │   RAMA BLANCA ⚪     │
│   S/ 8,000.00        │      │   S/ 12,000.00       │
└──────┬───────────────┘      └──────┬───────────────┘
       ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│ CUENTA POR COBRAR    │      │ COMPROBANTE          │
│ NEGRA (Gerencial)    │      │ ELECTRÓNICO          │
│                      │      │                      │
│ Monto: S/ 8,000.00   │      │ Serie: F001          │
│ Tipo: GERENCIAL ⚫   │      │ Número: 00000456     │
│ Estado: PENDIENTE    │      │ Monto: S/ 12,000.00  │
│ Ref: PreFactura #456 │      │ Estado: PENDIENTE    │
└──────┬───────────────┘      └──────┬───────────────┘
       ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│ CONTABILIZACIÓN      │      │ ENVIAR A SUNAT       │
│ GERENCIAL            │      │                      │
│                      │      │ Nubefact → SUNAT     │
│ Cuentas Gerenciales  │      │ Estado: ACEPTADO ✅  │
└──────┬───────────────┘      └──────┬───────────────┘
       ↓                              ↓
       │                      ┌──────────────────────┐
       │                      │ CUENTA POR COBRAR    │
       │                      │ BLANCA (Formal)      │
       │                      │                      │
       │                      │ Monto: S/ 12,000.00  │
       │                      │ Tipo: FORMAL ⚪      │
       │                      │ Estado: PENDIENTE    │
       │                      │ Ref: Comprobante     │
       │                      │      F001-00000456   │
       │                      └──────┬───────────────┘
       │                              ↓
       │                      ┌──────────────────────┐
       │                      │ CONTABILIZACIÓN      │
       │                      │ FORMAL               │
       │                      │                      │
       │                      │ Cuentas Formales     │
       │                      └──────────────────────┘
       │                              │
       └──────────────┬───────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO FINAL: PAGO DEL CLIENTE                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Cliente paga S/ 20,000.00 total:                          │ │
│  │                                                            │ │
│  │ Opción A - Pago separado:                                 │ │
│  │ ├─ S/ 8,000.00  → Caja Gerencial (Negro) ⚫              │ │
│  │ └─ S/ 12,000.00 → Caja Formal (Blanco) ⚪                │ │
│  │                                                            │ │
│  │ Opción B - Pago único:                                    │ │
│  │ └─ S/ 20,000.00 → Sistema distribuye automáticamente     │ │
│  │                                                            │ │
│  │ Resultado:                                                 │ │
│  │ ├─ CxC Negra: PAGADA ✅                                   │ │
│  │ └─ CxC Blanca: PAGADA ✅                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
Tabla de Distribución Mixta:
Concepto	Parte Negra ⚫	Parte Blanca ⚪	Total
Monto	S/ 8,000.00	S/ 12,000.00	S/ 20,000.00
Porcentaje	40%	60%	100%
Comprobante SUNAT	❌ NO	✅ SÍ (F001-456)	Parcial
CxC Generada	✅ Gerencial	✅ Formal	2 CxC
Contabilización	Cuentas 12XX/70XX Gerencial	Cuentas 12/70 Formal	Ambas
Visible SUNAT	❌ NO	✅ SÍ	Parcial
🎯 CASO 3: FACTURACIÓN 100% BLANCA (FORMAL)
Flujo Detallado:
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: COTIZACIÓN APROBADA                                    │
│  Cliente: COMERCIAL DEF SAC                                     │
│  Total: S/ 15,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR PREFACTURA                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Tipo Facturación: BLANCO (Formal) ⚪                      │ │
│  │ Monto Total: S/ 15,000.00                                 │ │
│  │ % Negro: 0%                                               │ │
│  │ % Blanco: 100%                                            │ │
│  │ Operación: Venta formal estándar                          │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR PREFACTURA                                     │
│  Sistema valida y aprueba                                       │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: GENERACIÓN AUTOMÁTICA                                  │
│  ✅ SÍ genera COMPROBANTE ELECTRÓNICO                           │
│  ❌ NO genera CxC Negra                                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  COMPROBANTE ELECTRÓNICO                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Serie: F001                                               │ │
│  │ Número: 00000789                                          │ │
│  │ Cliente: COMERCIAL DEF SAC                                │ │
│  │ RUC: 20123456789                                          │ │
│  │                                                            │ │
│  │ Subtotal: S/ 12,711.86                                    │ │
│  │ IGV 18%:  S/ 2,288.14                                     │ │
│  │ TOTAL:    S/ 15,000.00                                    │ │
│  │                                                            │ │
│  │ Estado: PENDIENTE                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: ENVIAR A SUNAT                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Sistema → Nubefact OSE → SUNAT                            │ │
│  │                                                            │ │
│  │ SUNAT valida:                                             │ │
│  │ ✅ RUC válido                                             │ │
│  │ ✅ Numeración correcta                                    │ │
│  │ ✅ Montos correctos                                       │ │
│  │ ✅ Firma digital válida                                   │ │
│  │                                                            │ │
│  │ Resultado: ACEPTADO ✅                                    │ │
│  │                                                            │ │
│  │ Documentos recibidos:                                     │ │
│  │ ├─ PDF: https://nubefact.com/pdf/F001-789.pdf            │ │
│  │ ├─ XML: https://nubefact.com/xml/F001-789.xml            │ │
│  │ ├─ CDR: https://nubefact.com/cdr/F001-789.zip            │ │
│  │ ├─ Hash: A1B2C3D4E5F6...                                 │ │
│  │ └─ QR: [Código QR]                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: GENERACIÓN AUTOMÁTICA CxC BLANCA                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ CUENTA POR COBRAR BLANCA (Formal)                         │ │
│  │                                                            │ │
│  │ Cliente: COMERCIAL DEF SAC                                │ │
│  │ Comprobante: F001-00000789                                │ │
│  │ Monto: S/ 15,000.00                                       │ │
│  │ Tipo: FORMAL ⚪                                           │ │
│  │ Estado: PENDIENTE                                         │ │
│  │ Fecha emisión: 06/01/2026                                 │ │
│  │ Vencimiento: 05/02/2026 (30 días crédito)                │ │
│  │ Saldo pendiente: S/ 15,000.00                             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 7: CONTABILIZACIÓN FORMAL                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ASIENTO CONTABLE FORMAL:                                  │ │
│  │                                                            │ │
│  │ DEBE:                                                      │ │
│  │ 12 - Cuentas por Cobrar Comerciales  S/ 15,000.00        │ │
│  │                                                            │ │
│  │ HABER:                                                     │ │
│  │ 70 - Ventas                          S/ 12,711.86        │ │
│  │ 40 - Tributos por Pagar (IGV)        S/ 2,288.14         │ │
│  │                                                            │ │
│  │ Glosa: Venta según Factura F001-00000789                  │ │
│  │ Comprobante SUNAT: Aceptado                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 8: ENVÍO AL CLIENTE                                       │
│  Email con PDF adjunto → cliente@comercialdef.com               │
│  Cliente puede descargar XML para su contabilidad               │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 9: PAGO DEL CLIENTE (30 días después)                     │
│  Cliente paga S/ 15,000.00 → Caja Formal                        │
│  CxC Blanca: PAGADA ✅                                          │
└─────────────────────────────────────────────────────────────────┘
Características:
Característica	Detalle
Visibilidad SUNAT	✅ 100% visible
Documentos generados	PDF, XML, CDR oficiales
Reportes	Formales y tributarios
Impuestos	Declarados en PDT
Uso	Operaciones comerciales estándar
📊 TABLA RESUMEN: COMPARACIÓN DE DOCUMENTOS GENERADOS
Documento	Caso 1: 100% Negro	Caso 2: Mixto	Caso 3: 100% Blanco
PreFactura	✅ 1 (Total negro)	✅ 1 (Dividida)	✅ 1 (Total blanco)
Comprobante Electrónico	❌ 0	✅ 1 (Parte blanca)	✅ 1 (Total)
CxC Negra	✅ 1	✅ 1 (Parcial)	❌ 0
CxC Blanca	❌ 0	✅ 1 (Parcial)	✅ 1
Asiento Gerencial	✅ 1	✅ 1 (Parte negra)	❌ 0
Asiento Formal	❌ 0	✅ 1 (Parte blanca)	✅ 1
PDF SUNAT	❌ 0	✅ 1	✅ 1
XML SUNAT	❌ 0	✅ 1	✅ 1
CDR SUNAT	❌ 0	✅ 1	✅ 1
🔄 DIAGRAMA DE FLUJO COMPLETO INTEGRADO
                ┌─────────────────────────┐
                │   COTIZACIÓN APROBADA   │
                └───────────┬─────────────┘
                            ↓
                ┌─────────────────────────┐
                │    CREAR PREFACTURA     │
                │  (Usuario elige tipo)   │
                └───────────┬─────────────┘
                            ↓
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  100% NEGRO ⚫  │ │ MIXTO ⚫⚪  │ │  100% BLANCO ⚪ │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         ↓                 ↓                  ↓
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ ❌ No Comp.     │ │ División:   │ │ ✅ Comprobante  │
│    Electrónico  │ │ Negro/Blanco│ │    Electrónico  │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         ↓                 ↓                  ↓
┌─────────────────┐       │         ┌─────────────────┐
│ ✅ CxC Negra    │       │         │ Enviar a SUNAT  │
│    (Total)      │       │         └────────┬────────┘
└────────┬────────┘       │                  ↓
         ↓                ↓         ┌─────────────────┐
┌─────────────────┐ ┌─────────────┐│ ✅ CxC Blanca   │
│ Contabilización │ │ ✅ CxC Negra││    (Total)      │
│   Gerencial     │ │   (Parcial) │└────────┬────────┘
└────────┬────────┘ └──────┬──────┘         ↓
         ↓                 ↓         ┌─────────────────┐
         │         ┌─────────────────┤ Contabilización │
         │         │ Comprobante     │    Formal       │
         │         │ Electrónico     └────────┬────────┘
         │         │ (Parte blanca)           │
         │         └──────┬──────────┘        │
         │                ↓                   │
         │         ┌─────────────────┐        │
         │         │ Enviar a SUNAT  │        │
         │         └──────┬──────────┘        │
         │                ↓                   │
         │         ┌─────────────────┐        │
         │         │ ✅ CxC Blanca   │        │
         │         │   (Parcial)     │        │
         │         └──────┬──────────┘        │
         │                ↓                   │
         │         ┌─────────────────┐        │
         │         │ Contabilización │        │
         │         │    Formal       │        │
         │         └──────┬──────────┘        │
         │                │                   │
         └────────────────┼───────────────────┘
                          ↓
                ┌─────────────────────┐
                │   PAGO DEL CLIENTE  │
                │  (Caja Gerencial y  │
                │   Caja Formal)      │
                └─────────────────────┘
💰 EJEMPLO PRÁCTICO COMPLETO - CASO MIXTO
Datos iniciales:
Cliente: PESQUERA MAR AZUL SAC
Total venta: S/ 50,000.00
Acuerdo: 30% Negro + 70% Blanco
Desglose:
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUCIÓN DE LA VENTA                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TOTAL VENTA: S/ 50,000.00                                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PARTE NEGRA (Gerencial) ⚫                30%              │ │
│  │ Monto: S/ 15,000.00                                        │ │
│  │ ├─ No genera comprobante SUNAT                            │ │
│  │ ├─ Genera CxC Negra: S/ 15,000.00                         │ │
│  │ └─ Contabiliza en cuentas gerenciales                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PARTE BLANCA (Formal) ⚪                  70%              │ │
│  │ Monto: S/ 35,000.00                                        │ │
│  │ ├─ Genera Factura F001-00001234                           │ │
│  │ ├─ Envía a SUNAT → ACEPTADO ✅                            │ │
│  │ ├─ Genera CxC Blanca: S/ 35,000.00                        │ │
│  │ └─ Contabiliza en cuentas formales                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
Asientos contables generados:
Cuenta	Descripción	Debe	Haber
ASIENTO 1: Parte Negra (Gerencial)			
12XX	Cuentas por Cobrar Gerenciales	S/ 15,000.00	
70XX	Ventas Gerenciales		S/ 15,000.00
ASIENTO 2: Parte Blanca (Formal)			
12	Cuentas por Cobrar Comerciales	S/ 35,000.00	
70	Ventas		S/ 29,661.02
40	Tributos por Pagar (IGV 18%)		S/ 5,338.98
Cuentas por cobrar generadas:
┌─────────────────────────────────────────────────────────────────┐
│               CUENTAS POR COBRAR GENERADAS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CxC #1 - NEGRA (Gerencial) ⚫                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Cliente: PESQUERA MAR AZUL SAC                             │ │
│  │ Tipo: GERENCIAL                                            │ │
│  │ Monto: S/ 15,000.00                                        │ │
│  │ Saldo: S/ 15,000.00                                        │ │
│  │ Estado: PENDIENTE                                          │ │
│  │ Vencimiento: 05/02/2026                                    │ │
│  │ Referencia: PreFactura #789 (Parte negra)                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  CxC #2 - BLANCA (Formal) ⚪                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Cliente: PESQUERA MAR AZUL SAC                             │ │
│  │ Tipo: FORMAL                                               │ │
│  │ Comprobante: F001-00001234                                 │ │
│  │ Monto: S/ 35,000.00                                        │ │
│  │ Saldo: S/ 35,000.00                                        │ │
│  │ Estado: PENDIENTE                                          │ │
│  │ Vencimiento: 05/02/2026                                    │ │
│  │ Referencia: Factura F001-00001234                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  TOTAL POR COBRAR: S/ 50,000.00                                 │
└─────────────────────────────────────────────────────────────────┘
Este flujo completo muestra cómo el sistema ERP Megui maneja las tres modalidades de facturación (100% Negro, Mixto, 100% Blanco), generando automáticamente los documentos, cuentas por cobrar y asientos contables correspondientes según el tipo de operación. 🚀




# 🔄 FLUJO COMPLETO DE VENTAS CON FACTURACIÓN BLANCA Y NEGRA (GERENCIAL)
## 📊 DIAGRAMA GENERAL DEL PROCESO
```text
┌─────────────────────────────────────────────────────────────────────┐
│                    COTIZACIÓN DE VENTAS                              │
│              (Local o Exportación - Aprobada)                        │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         PREFACTURA                                   │
│                  (Usuario define distribución)                       │
│                    Estado: 45 (PENDIENTE)                            │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
              ┌──────────────┴──────────────┐
              │   APROBAR PREFACTURA        │
              │   Estado: 46 (APROBADA)     │
              └──────────────┬──────────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
   CASO 1                CASO 2               CASO 3
100% NEGRO            MIXTO (NEGRO+BLANCO)   100% BLANCO
(Gerencial)           (Parcial cada uno)     (Formal)
📋 ESTADOS DEL SISTEMA
PREFACTURA (Tipo Proviene ID=14)
ID	Descripción	Severity	Uso
45	PENDIENTE	SECONDARY	PreFactura creada, pendiente aprobación
46	APROBADA	CONTRAST	PreFactura aprobada, lista para facturar
47	ANULADA	DANGER	PreFactura anulada manualmente
48	PARTICIONADA	WARNING	PreFactura partida en Blanca/Negra
95	FACTURADA	INFO	PreFactura facturada (Negra - Gerencial)
96	EMITIDA	SUCCESS	PreFactura emitida
97	COMPROBANTE ELECTRONICO GENERADO	WARNING	Comprobante generado, esperando SUNAT
98	VALIDADO SUNAT	SUCCESS	Comprobante aceptado por SUNAT
99	NO VALIDADO SUNAT	DANGER	Comprobante rechazado por SUNAT
CUENTAS POR COBRAR (Tipo Proviene ID=24)
ID	Descripción	Severity	Uso
100	PENDIENTE DE PAGO	DANGER	CxC creada, pendiente de pago
101	PAGO PARCIAL	WARNING	CxC con pago parcial
102	PAGADO	SUCCESS	CxC pagada completamente
103	VENCIDO	DANGER	CxC vencida
104	ANULADO	SECONDARY	CxC anulada
105	CANJEADO	CONTRAST	CxC canjeada por otro documento
📋 TABLA COMPARATIVA DE LOS 3 CASOS
Aspecto	CASO 1: 100% Negro	CASO 2: Mixto	CASO 3: 100% Blanco
PreFactura	Total Gerencial	Dividida en 2 partes	Total Formal
Estado Inicial	45 (PENDIENTE)	45 (PENDIENTE)	45 (PENDIENTE)
Estado Aprobado	46 (APROBADA)	46 (APROBADA)	46 (APROBADA)
Estado Final PreFactura	95 (FACTURADA)	48 (PARTICIONADA)	98 (VALIDADO SUNAT)
% Negro	100%	Variable (ej: 40%)	0%
% Blanco	0%	Variable (ej: 60%)	100%
Comprobante Electrónico	❌ NO genera	✅ SÍ (solo parte blanca)	✅ SÍ (total)
Estado Comprobante	N/A	97 → 98	97 → 98
Envío SUNAT	❌ NO	✅ SÍ (parte blanca)	✅ SÍ
CxC Negra	✅ SÍ (total)	✅ SÍ (parte negra)	❌ NO
Estado CxC Negra	100 (PENDIENTE)	100 (PENDIENTE)	N/A
CxC Blanca	❌ NO	✅ SÍ (parte blanca)	✅ SÍ (total)
Estado CxC Blanca	N/A	100 (PENDIENTE)	100 (PENDIENTE)
Contabilización	Cuentas Gerenciales	Ambas cuentas	Cuentas Formales
Visible en reportes SUNAT	❌ NO	✅ Parcial	✅ SÍ
🎯 CASO 1: FACTURACIÓN 100% NEGRA (GERENCIAL)
Flujo Detallado con Estados
text
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: COTIZACIÓN APROBADA                                    │
│  Cliente: EMPRESA XYZ SAC                                       │
│  Total: S/ 10,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR PREFACTURA                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 45 (PENDIENTE)                                    │ │
│  │ esGerencial: true                                         │ │
│  │ Monto Total: S/ 10,000.00                                 │ │
│  │ % Negro: 100%                                             │ │
│  │ % Blanco: 0%                                              │ │
│  │ Motivo: Operación gerencial interna                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR PREFACTURA                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 45 → 46 (APROBADA)                                │ │
│  │ Sistema valida y aprueba                                  │ │
│  │ Aprobado por: [Usuario]                                   │ │
│  │ Fecha aprobación: [Timestamp]                             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: FACTURAR NEGRA (GERENCIAL)                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 46 → 95 (FACTURADA)                               │ │
│  │ ❌ NO genera Comprobante Electrónico                      │ │
│  │ ❌ NO envía a SUNAT                                       │ │
│  │ ✅ SÍ genera CUENTA POR COBRAR NEGRA                      │ │
│  │ facturado: true                                           │ │
│  │ fechaFacturacion: [Timestamp]                             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  CUENTA POR COBRAR NEGRA (Gerencial)                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 100 (PENDIENTE DE PAGO)                           │ │
│  │ Cliente: EMPRESA XYZ SAC                                  │ │
│  │ Monto: S/ 10,000.00                                       │ │
│  │ esGerencial: true                                         │ │
│  │ Vencimiento: Según condiciones                            │ │
│  │ Referencia: PreFactura #123                               │ │
│  │ comprobanteElectronicoId: null                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: CONTABILIZACIÓN                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ASIENTO CONTABLE GERENCIAL:                               │ │
│  │                                                            │ │
│  │ DEBE:                                                      │ │
│  │ 12XX - Cuentas por Cobrar Gerenciales    S/ 10,000.00     │ │
│  │                                                            │ │
│  │ HABER:                                                     │ │
│  │ 70XX - Ventas Gerenciales                S/ 10,000.00     │ │
│  │                                                            │ │
│  │ Glosa: Venta gerencial según PreFactura #123              │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: PAGO DEL CLIENTE                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Cliente paga → Registrar en Caja Gerencial                │ │
│  │ Estado CxC: 100 → 102 (PAGADO)                            │ │
│  │ montoPagado: S/ 10,000.00                                 │ │
│  │ saldoPendiente: S/ 0.00                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
Características
Característica	Detalle
Visibilidad SUNAT	❌ No visible
Documentos generados	Solo internos (PreFactura)
Reportes	Solo gerenciales/internos
Impuestos	No declarados formalmente
Uso	Operaciones internas, gerencia
🎯 CASO 2: FACTURACIÓN MIXTA (NEGRO + BLANCO)
Flujo Detallado con Estados
text
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: COTIZACIÓN APROBADA                                    │
│  Cliente: DISTRIBUIDORA ABC SAC                                 │
│  Total: S/ 20,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR PREFACTURA ORIGINAL                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 45 (PENDIENTE)                                    │ │
│  │ Monto Total: S/ 20,000.00                                 │ │
│  │ esGerencial: null (aún no definido)                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR PREFACTURA                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 45 → 46 (APROBADA)                                │ │
│  │ Sistema valida y aprueba                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: PARTICIONAR EN BLANCA/NEGRA                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Usuario selecciona productos:                             │ │
│  │ ├─ Parte NEGRA: S/ 8,000.00 (40%)                        │ │
│  │ └─ Parte BLANCA: S/ 12,000.00 (60%)                      │ │
│  │                                                            │ │
│  │ Sistema ejecuta:                                          │ │
│  │ 1. PreFactura Original:                                   │ │
│  │    Estado: 46 → 48 (PARTICIONADA)                         │ │
│  │    esParticionada: true                                   │ │
│  │                                                            │ │
│  │ 2. Crear PreFactura NEGRA:                                │ │
│  │    Estado: 46 (APROBADA)                                  │ │
│  │    esGerencial: true                                      │ │
│  │    preFacturaOrigenId: [ID Original]                      │ │
│  │    Monto: S/ 8,000.00                                     │ │
│  │                                                            │ │
│  │ 3. Crear PreFactura BLANCA:                               │ │
│  │    Estado: 46 (APROBADA)                                  │ │
│  │    esGerencial: false                                     │ │
│  │    preFacturaOrigenId: [ID Original]                      │ │
│  │    Monto: S/ 12,000.00                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
┌──────────────────────┐      ┌──────────────────────┐
│   RAMA NEGRA         │      │   RAMA BLANCA        │
│   S/ 8,000.00        │      │   S/ 12,000.00       │
└──────┬───────────────┘      └──────┬───────────────┘
       ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│ FACTURAR NEGRA       │      │ GENERAR COMPROBANTE  │
│ Estado: 46 → 95      │      │ Estado: 46 → 97      │
│ (FACTURADA)          │      │ (COMP. GENERADO)     │
└──────┬───────────────┘      └──────┬───────────────┘
       ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│ CUENTA POR COBRAR    │      │ ENVIAR A SUNAT       │
│ NEGRA (Gerencial)    │      │ Nubefact → SUNAT     │
│                      │      │ Estado: 97 → 98      │
│ Estado: 100          │      │ (VALIDADO SUNAT)     │
│ (PENDIENTE)          │      └──────┬───────────────┘
│ Monto: S/ 8,000.00   │             ↓
│ esGerencial: true    │      ┌──────────────────────┐
└──────┬───────────────┘      │ CUENTA POR COBRAR    │
       ↓                      │ BLANCA (Formal)      │
┌──────────────────────┐      │                      │
│ CONTABILIZACIÓN      │      │ Estado: 100          │
│ GERENCIAL            │      │ (PENDIENTE)          │
│                      │      │ Monto: S/ 12,000.00  │
│ Cuentas Gerenciales  │      │ esGerencial: false   │
└──────────────────────┘      │ comprobanteId: [ID]  │
                              └──────┬───────────────┘
                                     ↓
                              ┌──────────────────────┐
                              │ CONTABILIZACIÓN      │
                              │ FORMAL               │
                              │                      │
                              │ Cuentas Formales     │
                              └──────────────────────┘
Tabla de Distribución Mixta
Concepto	Parte Negra	Parte Blanca	Total
Monto	S/ 8,000.00	S/ 12,000.00	S/ 20,000.00
Porcentaje	40%	60%	100%
Estado PreFactura	95 (FACTURADA)	98 (VALIDADO)	48 (PARTICIONADA)
Comprobante SUNAT	❌ NO	✅ SÍ (F001-456)	Parcial
CxC Generada	✅ Gerencial	✅ Formal	2 CxC
Estado CxC	100 (PENDIENTE)	100 (PENDIENTE)	Ambas
Contabilización	Cuentas 12XX/70XX	Cuentas 12/70	Ambas
Visible SUNAT	❌ NO	✅ SÍ	Parcial
🎯 CASO 3: FACTURACIÓN 100% BLANCA (FORMAL)
Flujo Detallado con Estados
text
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: COTIZACIÓN APROBADA                                    │
│  Cliente: COMERCIAL DEF SAC                                     │
│  Total: S/ 15,000.00                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: CREAR PREFACTURA                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 45 (PENDIENTE)                                    │ │
│  │ esGerencial: false                                        │ │
│  │ Monto Total: S/ 15,000.00                                 │ │
│  │ % Negro: 0%                                               │ │
│  │ % Blanco: 100%                                            │ │
│  │ Operación: Venta formal estándar                          │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: APROBAR PREFACTURA                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 45 → 46 (APROBADA)                                │ │
│  │ Sistema valida y aprueba                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: GENERAR COMPROBANTE ELECTRÓNICO                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Estado: 46 → 97 (COMPROBANTE ELECTRONICO GENERADO)       │ │
│  │                                                            │ │
│  │ Serie: F001                                               │ │
│  │ Número: 00000789                                          │ │
│  │ Cliente: COMERCIAL DEF SAC                                │ │
│  │ RUC: 20123456789                                          │ │
│  │                                                            │ │
│  │ Subtotal: S/ 12,711.86                                    │ │
│  │ IGV 18%:  S/ 2,288.14                                     │ │
│  │ TOTAL:    S/ 15,000.00                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: ENVIAR A SUNAT                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Sistema → Nubefact OSE → SUNAT                            │ │
│  │                                                            │ │
│  │ SUNAT valida:                                             │ │
│  │ ✅ RUC válido                                             │ │
│  │ ✅ Numeración correcta                                    │ │
│  │ ✅ Montos correctos                                       │ │
│  │ ✅ Firma digital válida                                   │ │
│  │                                                            │ │
│  │ Estado: 97 → 98 (VALIDADO SUNAT)                          │ │
│  │                                                            │ │
│  │ Documentos recibidos:                                     │ │
│  │ ├─ PDF: [https://nubefact.com/pdf/F001-789.pdf](https://nubefact.com/pdf/F001-789.pdf)            │ │
│  │ ├─ XML: [https://nubefact.com/xml/F001-789.xml](https://nubefact.com/xml/F001-789.xml)            │ │
│  │ ├─ CDR: [https://nubefact.com/cdr/F001-789.zip](https://nubefact.com/cdr/F001-789.zip)            │ │
│  │ ├─ Hash: A1B2C3D4E5F6...                                 │ │
│  │ └─ QR: [Código QR]                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 6: GENERACIÓN AUTOMÁTICA CxC BLANCA                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ CUENTA POR COBRAR BLANCA (Formal)                         │ │
│  │                                                            │ │
│  │ Estado: 100 (PENDIENTE DE PAGO)                           │ │
│  │ Cliente: COMERCIAL DEF SAC                                │ │
│  │ Comprobante: F001-00000789                                │ │
│  │ Monto: S/ 15,000.00                                       │ │
│  │ esGerencial: false                                        │ │
│  │ comprobanteElectronicoId: [ID]                            │ │
│  │ Fecha emisión: 06/01/2026                                 │ │
│  │ Vencimiento: 05/02/2026 (30 días crédito)                │ │
│  │ saldoPendiente: S/ 15,000.00                              │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 7: CONTABILIZACIÓN FORMAL                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ASIENTO CONTABLE FORMAL:                                  │ │
│  │                                                            │ │
│  │ DEBE:                                                      │ │
│  │ 12 - Cuentas por Cobrar Comerciales  S/ 15,000.00        │ │
│  │                                                            │ │
│  │ HABER:                                                     │ │
│  │ 70 - Ventas                          S/ 12,711.86        │ │
│  │ 40 - Tributos por Pagar (IGV)        S/ 2,288.14         │ │
│  │                                                            │ │
│  │ Glosa: Venta según Factura F001-00000789                  │ │
│  │ Comprobante SUNAT: Aceptado                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 8: ENVÍO AL CLIENTE                                       │
│  Email con PDF adjunto → cliente@comercialdef.com               │
│  Cliente puede descargar XML para su contabilidad               │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 9: PAGO DEL CLIENTE (30 días después)                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Cliente paga S/ 15,000.00 → Caja Formal                   │ │
│  │ Estado CxC: 100 → 102 (PAGADO)                            │ │
│  │ montoPagado: S/ 15,000.00                                 │ │
│  │ saldoPendiente: S/ 0.00                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
Características
Característica	Detalle
Visibilidad SUNAT	✅ 100% visible
Documentos generados	PDF, XML, CDR oficiales
Reportes	Formales y tributarios
Impuestos	Declarados en PDT
Uso	Operaciones comerciales estándar
📊 TABLA RESUMEN: COMPARACIÓN DE DOCUMENTOS GENERADOS
Documento	Caso 1: 100% Negro	Caso 2: Mixto	Caso 3: 100% Blanco
PreFactura	✅ 1 (Estado 95)	✅ 3 (Original 48 + 2 nuevas)	✅ 1 (Estado 98)
Comprobante Electrónico	❌ 0	✅ 1 (Parte blanca)	✅ 1 (Total)
CxC Negra	✅ 1 (Estado 100)	✅ 1 (Estado 100)	❌ 0
CxC Blanca	❌ 0	✅ 1 (Estado 100)	✅ 1 (Estado 100)
Asiento Gerencial	✅ 1	✅ 1 (Parte negra)	❌ 0
Asiento Formal	❌ 0	✅ 1 (Parte blanca)	✅ 1
PDF SUNAT	❌ 0	✅ 1	✅ 1
XML SUNAT	❌ 0	✅ 1	✅ 1
CDR SUNAT	❌ 0	✅ 1	✅ 1
🔄 DIAGRAMA DE FLUJO DE ESTADOS COMPLETO
text
                ┌─────────────────────────┐
                │   COTIZACIÓN APROBADA   │
                └───────────┬─────────────┘
                            ↓
                ┌─────────────────────────┐
                │    CREAR PREFACTURA     │
                │  Estado: 45 (PENDIENTE) │
                └───────────┬─────────────┘
                            ↓
                ┌─────────────────────────┐
                │   APROBAR PREFACTURA    │
                │  Estado: 46 (APROBADA)  │
                └───────────┬─────────────┘
                            ↓
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  100% NEGRO     │ │    MIXTO    │ │  100% BLANCO    │
│  Estado: 46→95  │ │ Estado: 46→48│ │ Estado: 46→97→98│
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         ↓                 ↓                  ↓
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ ❌ No Comp.     │ │ División:   │ │ ✅ Comprobante  │
│    Electrónico  │ │ Negro/Blanco│ │    Electrónico  │
│                 │ │ (2 PreFacturas)│ │ Estado: 97→98 │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         ↓                 ↓                  ↓
┌─────────────────┐       │         ┌─────────────────┐
│ ✅ CxC Negra    │       │         │ ✅ CxC Blanca   │
│ Estado: 100     │       │         │ Estado: 100     │
│ (PENDIENTE)     │       │         │ (PENDIENTE)     │
└────────┬────────┘       │         └────────┬────────┘
         ↓                ↓                  ↓
         │         ┌──────┴──────┐           │
         │         ↓             ↓           │
         │   ┌──────────┐  ┌──────────┐     │
         │   │CxC Negra │  │CxC Blanca│     │
         │   │Estado:100│  │Estado:100│     │
         │   └────┬─────┘  └────┬─────┘     │
         │        │             │            │
         └────────┼─────────────┼────────────┘
                  ↓
         ┌─────────────────────┐
         │   PAGO DEL CLIENTE  │
         │ Estado: 100→101→102 │
         │ (PENDIENTE→PARCIAL→ │
         │       PAGADO)       │
         └─────────────────────┘
💰 EJEMPLO PRÁCTICO COMPLETO - CASO MIXTO
Datos iniciales
Cliente: PESQUERA MAR AZUL SAC
Total venta: S/ 50,000.00
Acuerdo: 30% Negro + 70% Blanco
Desglose
text
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUCIÓN DE LA VENTA                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TOTAL VENTA: S/ 50,000.00                                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PARTE NEGRA (Gerencial)                  30%              │ │
│  │ Monto: S/ 15,000.00                                        │ │
│  │ Estado PreFactura: 46 → 95 (FACTURADA)                    │ │
│  │ ├─ No genera comprobante SUNAT                            │ │
│  │ ├─ Genera CxC Negra: S/ 15,000.00 (Estado: 100)          │ │
│  │ └─ Contabiliza en cuentas gerenciales                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PARTE BLANCA (Formal)                    70%              │ │
│  │ Monto: S/ 35,000.00                                        │ │
│  │ Estado PreFactura: 46 → 97 → 98 (VALIDADO SUNAT)         │ │
│  │ ├─ Genera Factura F001-00001234                           │ │
│  │ ├─ Envía a SUNAT → ACEPTADO ✅                            │ │
│  │ ├─ Genera CxC Blanca: S/ 35,000.00 (Estado: 100)         │ │
│  │ └─ Contabiliza en cuentas formales                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
Asientos contables generados
Cuenta	Descripción	Debe	Haber
ASIENTO 1: Parte Negra		
12XX	Cuentas por Cobrar Gerenciales	S/ 15,000.00	
70XX	Ventas Gerenciales		S/ 15,000.00
ASIENTO 2: Parte Blanca		
12	Cuentas por Cobrar Comerciales	S/ 35,000.00	
70	Ventas		S/ 29,661.02
40	Tributos por Pagar (IGV 18%)		S/ 5,338.98
Cuentas por cobrar generadas
text
┌─────────────────────────────────────────────────────────────────┐
│               CUENTAS POR COBRAR GENERADAS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CxC #1 - NEGRA (Gerencial)                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Estado: 100 (PENDIENTE DE PAGO)                            │ │
│  │ Cliente: PESQUERA MAR AZUL SAC                             │ │
│  │ Tipo: esGerencial = true                                   │ │
│  │ Monto: S/ 15,000.00                                        │ │
│  │ Saldo: S/ 15,000.00                                        │ │
│  │ Vencimiento: 05/02/2026                                    │ │
│  │ Referencia: PreFactura #789 (Parte negra)                 │ │
│  │ comprobanteElectronicoId: null                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  CxC #2 - BLANCA (Formal)                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Estado: 100 (PENDIENTE DE PAGO)                            │ │
│  │ Cliente: PESQUERA MAR AZUL SAC                             │ │
│  │ Tipo: esGerencial = false                                  │ │
│  │ Comprobante: F001-00001234                                 │ │
│  │ Monto: S/ 35,000.00                                        │ │
│  │ Saldo: S/ 35,000.00                                        │ │
│  │ Vencimiento: 05/02/2026                                    │ │
│  │ Referencia: Factura F001-00001234                          │ │
│  │ comprobanteElectronicoId: [ID del comprobante]             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  TOTAL POR COBRAR: S/ 50,000.00                                 │
└─────────────────────────────────────────────────────────────────┘
🎯 RESUMEN EJECUTIVO
Este flujo completo muestra cómo el sistema ERP Megui maneja las tres modalidades de facturación:

100% Negro (Gerencial): Para operaciones internas sin declaración SUNAT
Mixto (Negro + Blanco): Para operaciones parcialmente formales
100% Blanco (Formal): Para operaciones comerciales estándar con SUNAT
El sistema genera automáticamente:

✅ Documentos correspondientes (PreFacturas, Comprobantes Electrónicos)
✅ Cuentas por cobrar (Negras y/o Blancas)
✅ Asientos contables (Gerenciales y/o Formales)
✅ Trazabilidad completa con estados en cada etapa del proceso
🚀 Sistema listo para producción con control total de estados y flujos

