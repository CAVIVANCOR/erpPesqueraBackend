-- ============================================
-- SCRIPT DE VERIFICACIÓN DE REQUISITOS
-- Para Finalización de Faena con Movimientos de Almacén
-- ============================================

-- ============================================
-- 1. VERIFICAR SERIES DE DOCUMENTO
-- ============================================
SELECT 
    'SERIES DE DOCUMENTO' as verificacion,
    id,
    serie,
    correlativo,
    "tipoDocumentoId",
    "tipoAlmacenId",
    activo,
    CASE 
        WHEN id = 1 AND "tipoDocumentoId" = 13 AND serie = '001' AND activo = true 
            THEN '✅ OK - Serie INGRESO'
        WHEN id = 2 AND "tipoDocumentoId" = 14 AND serie = '001' AND activo = true 
            THEN '✅ OK - Serie SALIDA'
        ELSE '❌ ERROR - Configuración incorrecta'
    END as estado
FROM "SerieDoc" 
WHERE id IN (1, 2)
ORDER BY id;

-- ============================================
-- 2. VERIFICAR CONCEPTOS DE MOVIMIENTO
-- ============================================
SELECT 
    'CONCEPTOS DE MOVIMIENTO' as verificacion,
    id,
    descripcion,
    "llevaKardexOrigen",
    "llevaKardexDestino",
    activo,
    CASE 
        WHEN id = 1 AND "llevaKardexDestino" = true AND activo = true 
            THEN '✅ OK - Concepto INGRESO'
        WHEN id = 3 AND "llevaKardexOrigen" = true AND activo = true 
            THEN '✅ OK - Concepto SALIDA'
        ELSE '❌ ERROR - Configuración incorrecta'
    END as estado
FROM "ConceptoMovAlmacen"
WHERE id IN (1, 3)
ORDER BY id;

-- ============================================
-- 3. VERIFICAR RESPONSABLE DE ALMACÉN
-- ============================================
SELECT 
    'RESPONSABLE DE ALMACÉN' as verificacion,
    pa.id,
    pa."empresaId",
    pa."moduloSistemaId",
    pa."personalRespId",
    p."nombreCompleto" as responsable_nombre,
    pa.cesado,
    CASE 
        WHEN pa."moduloSistemaId" = 6 AND pa.cesado = false 
            THEN '✅ OK - Responsable configurado'
        ELSE '❌ ERROR - Configuración incorrecta'
    END as estado
FROM "ParametroAprobador" pa
LEFT JOIN "Personal" p ON p.id = pa."personalRespId"
WHERE pa."moduloSistemaId" = 6
  AND pa.cesado = false
ORDER BY pa."empresaId";

-- ============================================
-- 4. VERIFICAR PRODUCTOS DISPONIBLES
-- ============================================
SELECT 
    'PRODUCTOS CONFIGURADOS' as verificacion,
    p.id,
    p."empresaId",
    p."clienteId",
    ec."razonSocial" as cliente_nombre,
    p."especieId",
    e.nombre as especie_nombre,
    p.cesado,
    CASE 
        WHEN p.cesado = false THEN '✅ OK - Producto activo'
        ELSE '❌ ERROR - Producto cesado'
    END as estado
FROM "Producto" p
LEFT JOIN "EntidadComercial" ec ON ec.id = p."clienteId"
LEFT JOIN "Especie" e ON e.id = p."especieId"
WHERE p.cesado = false
ORDER BY p."empresaId", p."clienteId", p."especieId";

-- ============================================
-- 5. VERIFICAR EMPRESA CON ENTIDAD COMERCIAL
-- ============================================
SELECT 
    'EMPRESA CON ENTIDAD COMERCIAL' as verificacion,
    e.id as empresa_id,
    e."razonSocial" as empresa_nombre,
    e."entidadComercialId",
    ec."razonSocial" as entidad_comercial_nombre,
    CASE 
        WHEN e."entidadComercialId" IS NOT NULL 
            THEN '✅ OK - Empresa tiene entidad comercial'
        ELSE '❌ ERROR - Empresa sin entidad comercial'
    END as estado
FROM "Empresa" e
LEFT JOIN "EntidadComercial" ec ON ec.id = e."entidadComercialId"
ORDER BY e.id;

-- ============================================
-- 6. VERIFICAR ESTADOS MULTIFUNCIÓN
-- ============================================
SELECT 
    'ESTADOS MULTIFUNCIÓN' as verificacion,
    id,
    nombre,
    descripcion,
    CASE 
        WHEN id = 6 THEN '✅ Liberado (estadoMercaderiaId)'
        WHEN id = 10 THEN '✅ Calidad A (estadoCalidadId)'
        WHEN id = 19 THEN '✅ FINALIZADA (estadoFaenaId)'
        WHEN id = 30 THEN '✅ PENDIENTE (estadoDocAlmacenId)'
        ELSE 'Otro estado'
    END as uso
FROM "EstadoMultiFuncion"
WHERE id IN (6, 10, 19, 30)
ORDER BY id;

-- ============================================
-- 7. RESUMEN DE VERIFICACIÓN
-- ============================================
SELECT 
    '=== RESUMEN DE VERIFICACIÓN ===' as titulo,
    (SELECT COUNT(*) FROM "SerieDoc" WHERE id IN (1, 2) AND activo = true) as series_ok,
    (SELECT COUNT(*) FROM "ConceptoMovAlmacen" WHERE id IN (1, 3) AND activo = true) as conceptos_ok,
    (SELECT COUNT(*) FROM "ParametroAprobador" WHERE "moduloSistemaId" = 6 AND cesado = false) as responsables_ok,
    (SELECT COUNT(*) FROM "Producto" WHERE cesado = false) as productos_activos,
    (SELECT COUNT(*) FROM "Empresa" WHERE "entidadComercialId" IS NOT NULL) as empresas_con_entidad,
    CASE 
        WHEN (SELECT COUNT(*) FROM "SerieDoc" WHERE id IN (1, 2) AND activo = true) = 2
         AND (SELECT COUNT(*) FROM "ConceptoMovAlmacen" WHERE id IN (1, 3) AND activo = true) = 2
         AND (SELECT COUNT(*) FROM "ParametroAprobador" WHERE "moduloSistemaId" = 6 AND cesado = false) > 0
         AND (SELECT COUNT(*) FROM "Producto" WHERE cesado = false) > 0
         AND (SELECT COUNT(*) FROM "Empresa" WHERE "entidadComercialId" IS NOT NULL) > 0
        THEN '✅ SISTEMA LISTO PARA FINALIZAR FAENAS'
        ELSE '❌ FALTAN CONFIGURACIONES'
    END as estado_general;

-- ============================================
-- 8. VERIFICAR ÚLTIMA FAENA EN ZARPE
-- ============================================
SELECT 
    'FAENAS EN ZARPE' as verificacion,
    fp.id as faena_id,
    fp."temporadaPescaId",
    tp."numeroResolucion" as temporada,
    fp."estadoFaenaId",
    emf.nombre as estado_nombre,
    COUNT(dfp.id) as cantidad_descargas,
    CASE 
        WHEN fp."estadoFaenaId" = 18 AND COUNT(dfp.id) > 0 
            THEN '✅ OK - Lista para finalizar'
        WHEN fp."estadoFaenaId" = 18 AND COUNT(dfp.id) = 0 
            THEN '⚠️ ADVERTENCIA - Sin descargas'
        ELSE 'No está en zarpe'
    END as estado
FROM "FaenaPesca" fp
LEFT JOIN "TemporadaPesca" tp ON tp.id = fp."temporadaPescaId"
LEFT JOIN "EstadoMultiFuncion" emf ON emf.id = fp."estadoFaenaId"
LEFT JOIN "DescargaFaenaPesca" dfp ON dfp."faenaPescaId" = fp.id
WHERE fp."estadoFaenaId" = 18 -- EN ZARPE
GROUP BY fp.id, fp."temporadaPescaId", tp."numeroResolucion", fp."estadoFaenaId", emf.nombre
ORDER BY fp.id DESC
LIMIT 5;
