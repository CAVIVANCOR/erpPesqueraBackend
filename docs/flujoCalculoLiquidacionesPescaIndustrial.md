📊 RESUMEN EJECUTIVO: SISTEMA DE LIQUIDACIONES PESCA INDUSTRIAL
🎯 OBJETIVO DEL SISTEMA
Calcular automáticamente las comisiones y liquidaciones del personal de pesca basándose en:

Cuotas asignadas (cálculo estimado)
Toneladas capturadas (cálculo real)
📐 DIAGRAMA DE FLUJO DE CÁLCULO
┌─────────────────────────────────────────────────────────────────┐
│                    MÓDULO PESCA INDUSTRIAL                       │
│                   LIQUIDACIÓN DE PERSONAL                        │
└─────────────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: DATOS DE ENTRADA (Parámetros de Empresa)               │
├─────────────────────────────────────────────────────────────────┤
│  • Porcentaje Base Liquidación Pesca: 30%                       │
│  • Porcentaje Comisión Patrón: 10%                              │
│  • Personal Cálculo Motorista: 10 personas                      │
│  • Divisoria Cálculo Motorista: 2                               │
│  • Porcentaje Cálculo Panguero: 50%                             │
│  • Moneda de Cálculos: USD (Dólares)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: DATOS DE CUOTAS Y PRECIOS                              │
├─────────────────────────────────────────────────────────────────┤
│  CUOTA PROPIA:                                                   │
│  • Toneladas asignadas: 1,500 Ton                               │
│  • Precio por tonelada: $105 USD                                │
│                                                                  │
│  CUOTA ALQUILADA:                                                │
│  • Toneladas asignadas: 350 Ton                                 │
│  • Precio por tonelada: $110 USD                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3A: CÁLCULO ESTIMADO (Basado en Cuotas Asignadas)        │
├─────────────────────────────────────────────────────────────────┤
│  ① Total Toneladas Estimadas                                    │
│     = Cuota Propia + Cuota Alquilada                            │
│     = 1,500 + 350 = 1,850 Ton                                   │
│                                                                  │
│  ② Valor Total Estimado                                         │
│     = Total Toneladas × Precio Cuota Propia                     │
│     = 1,850 × $105 = $194,250.00                                │
│                                                                  │
│  ③ BASE DE CÁLCULO ESTIMADA ⭐                                  │
│     = Valor Total × Porcentaje Base Liquidación                 │
│     = $194,250.00 × 30% = $58,275.00                            │
│                                                                  │
│  ④ Comisión Patrón Estimada                                     │
│     = Base Estimada × Porcentaje Comisión Patrón                │
│     = $58,275.00 × 10% = $5,827.50                              │
│                                                                  │
│  ⑤ Comisión Motorista Estimada                                  │
│     = Base Estimada ÷ Personal ÷ Divisoria                      │
│     = $58,275.00 ÷ 10 ÷ 2 = $2,913.75                           │
│                                                                  │
│  ⑥ Comisión Panguero Estimada                                   │
│     = Comisión Motorista × Porcentaje Panguero                  │
│     = $2,913.75 × 50% = $1,456.88                               │
│                                                                  │
│  ⑦ Total Liquidación Estimada                                   │
│     = Patrón + Motorista + Panguero                             │
│     = $5,827.50 + $2,913.75 + $1,456.88 = $10,198.13            │
│                                                                  │
│  ⑧ Comisión Alquiler de Cuota                                   │
│     = Cuota Alquilada × Precio Alquilada                        │
│     = 350 × $110 = $38,500.00                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3B: CÁLCULO REAL (Basado en Toneladas Capturadas)        │
├─────────────────────────────────────────────────────────────────┤
│  ① Toneladas Realmente Capturadas                               │
│     = Campo: TemporadaPesca.toneladasCapturadasTemporada        │
│     = 1,855.025 Ton                                             │
│                                                                  │
│  ② Valor Total Real                                             │
│     = Toneladas Capturadas × Precio Cuota Propia                │
│     = 1,855.025 × $105 = $194,777.63                            │
│                                                                  │
│  ③ BASE DE CÁLCULO REAL ⭐                                      │
│     = Valor Total Real × Porcentaje Base Liquidación            │
│     = $194,777.63 × 30% = $58,433.29                            │
│                                                                  │
│  ④ Comisión Patrón Real                                         │
│     = Base Real × Porcentaje Comisión Patrón                    │
│     = $58,433.29 × 10% = $5,843.33                              │
│                                                                  │
│  ⑤ Comisión Motorista Real                                      │
│     = Base Real ÷ Personal ÷ Divisoria                          │
│     = $58,433.29 ÷ 10 ÷ 2 = $2,921.66                           │
│                                                                  │
│  ⑥ Comisión Panguero Real                                       │
│     = Comisión Motorista Real × Porcentaje Panguero             │
│     = $2,921.66 × 50% = $1,460.83                               │
│                                                                  │
│  ⑦ Total Liquidación Real                                       │
│     = Patrón + Motorista + Panguero                             │
│     = $5,843.33 + $2,921.66 + $1,460.83 = $10,225.82            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: PRESENTACIÓN EN PANTALLA                               │
├─────────────────────────────────────────────────────────────────┤
│  LIQUIDACIONES ESTIMADAS:                                        │
│  ✓ Base de Cálculo Estimada: $58,275.00 USD                     │
│  ✓ Tripulantes Pesca: 15                                        │
│  ✓ Comisión Patrón: $5,827.50 USD                               │
│  ✓ Comisión Motorista: $2,913.75 USD                            │
│  ✓ Comisión Panguero: $1,456.88 USD                             │
│  ✓ Total Liquidación: $10,198.13 USD                            │
│  ✓ Comisión Alquiler Cuota: $38,500.00 USD                      │
│                                                                  │
│  LIQUIDACIONES REALES:                                           │
│  ✓ Base de Cálculo Real: $58,433.29 USD                         │
│  ✓ Tripulantes Pesca: 15                                        │
│  ✓ Comisión Patrón: $5,843.33 USD                               │
│  ✓ Comisión Motorista: $2,921.66 USD                            │
│  ✓ Comisión Panguero: $1,460.83 USD                             │
│  ✓ Total Liquidación: $10,225.82 USD                            │
│                                                                  │
│  📌 TODOS LOS CAMPOS SON DE SOLO LECTURA (CALCULADOS)           │
└─────────────────────────────────────────────────────────────────┘
🔑 CONCEPTOS CLAVE
1. BASE DE CÁLCULO
Es el monto sobre el cual se calculan todas las comisiones del personal.

Fórmula:

Base = (Toneladas × Precio por Tonelada) × Porcentaje Base Liquidación
2. DIFERENCIA ESTIMADO vs REAL
Concepto	Estimado	Real
Fuente de Toneladas	Cuotas asignadas (propia + alquilada)	Toneladas realmente capturadas
Cuándo se usa	Planificación inicial de temporada	Después de finalizar la pesca
Ejemplo	1,850 Ton (cuotas)	1,855.025 Ton (capturadas)
Base Calculada	$58,275.00	$58,433.29
3. DISTRIBUCIÓN DE COMISIONES
BASE DE CÁLCULO ($58,433.29)
    │
    ├─► PATRÓN (10%)          → $5,843.33
    │
    ├─► MOTORISTA             → $2,921.66
    │   (Base ÷ 10 ÷ 2)
    │
    └─► PANGUERO (50% Motorista) → $1,460.83
⚙️ AUTOMATIZACIÓN DEL SISTEMA
Cálculo Automático
✅ Al abrir una temporada, el sistema calcula automáticamente:

Bases de liquidación (estimada y real)
Comisiones de patrón, motorista y panguero
Totales de liquidación
Campos de Solo Lectura
✅ Todos los valores calculados NO son editables ✅ Solo los parámetros de configuración pueden modificarse

Moneda Dinámica
✅ El sistema obtiene la moneda desde la configuración de la empresa ✅ Soporta USD, PEN y otras monedas SUNAT

📋 RESUMEN PARA GERENCIA
El sistema calcula dos escenarios:

ESTIMADO: Basado en las cuotas asignadas al inicio de temporada
Permite planificar costos de personal
Se usa para presupuestos y proyecciones
REAL: Basado en las toneladas realmente capturadas
Refleja el resultado final de la temporada
Se usa para liquidaciones definitivas del personal
Beneficios:

✅ Cálculo automático e instantáneo
✅ Eliminación de errores manuales
✅ Trazabilidad completa de comisiones
✅ Formato profesional con separadores de miles
✅ Soporte multi-moneda
Fecha de Implementación: Enero 2026
Estado: ✅ Desplegado en Producción
Módulo: Pesca Industrial - Liquidaciones de Personal

Feedback submitted




Command Awaiting Approval







Drop to add to Cascade