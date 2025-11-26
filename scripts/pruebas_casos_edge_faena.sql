-- =====================================================
-- SCRIPT DE PRUEBAS: CASOS EDGE FINALIZACIÓN DE FAENA
-- =====================================================
-- Este script ayuda a verificar los diferentes escenarios
-- de finalización de faena con múltiples descargas,
-- diferentes especies y diferentes clientes.
-- =====================================================

-- =====================================================
-- CASO 1: VERIFICAR FAENA CON MÚLTIPLES DESCARGAS
-- =====================================================
-- Muestra todas las descargas de una faena específica
-- con sus clientes y especies

SELECT 
    f.id as faena_id,
    f.numeroFaena,
    f.estadoFaenaId,
    ef.nombre as estado_faena,
    t.id as temporada_id,
    t.numeroResolucion as lote,
    COUNT(d.id) as num_descargas,
    SUM(d.toneladas) as total_toneladas
FROM FaenaPesca f
JOIN TemporadaPesca t ON t.id = f.temporadaPescaId
JOIN EstadoMultiFuncion ef ON ef.id = f.estadoFaenaId
LEFT JOIN DescargaFaenaPesca d ON d.faenaPescaId = f.id
WHERE f.id = 80  -- Cambiar por el ID de la faena a probar
GROUP BY f.id, f.numeroFaena, f.estadoFaenaId, ef.nombre, t.id, t.numeroResolucion;

-- Detalle de cada descarga
SELECT 
    d.id as descarga_id,
    d.faenaPescaId,
    d.toneladas,
    d.clienteId,
    ec.razonSocial as cliente,
    d.especieId,
    e.nombre as especie,
    d.fechaHoraInicioDescarga,
    -- Verificar si existe producto para esta combinación
    (SELECT p.id 
     FROM Producto p 
     WHERE p.empresaId = 1 
       AND p.clienteId = d.clienteId 
       AND p.especieId = d.especieId 
       AND p.cesado = false 
     LIMIT 1) as producto_con_cliente,
    (SELECT p.id 
     FROM Producto p 
     WHERE p.empresaId = 1 
       AND p.especieId = d.especieId 
       AND p.cesado = false 
     LIMIT 1) as producto_sin_cliente
FROM DescargaFaenaPesca d
LEFT JOIN EntidadComercial ec ON ec.id = d.clienteId
LEFT JOIN Especie e ON e.id = d.especieId
WHERE d.faenaPescaId = 80  -- Cambiar por el ID de la faena a probar
ORDER BY d.id;

-- =====================================================
-- CASO 2: VERIFICAR PRODUCTOS DISPONIBLES POR ESPECIE
-- =====================================================
-- Lista todos los productos activos agrupados por especie
-- para verificar qué combinaciones están configuradas

SELECT 
    e.id as especie_id,
    e.nombre as especie,
    p.id as producto_id,
    p.nombre as producto,
    p.clienteId,
    ec.razonSocial as cliente_especifico,
    p.cesado
FROM Producto p
JOIN Especie e ON e.id = p.especieId
LEFT JOIN EntidadComercial ec ON ec.id = p.clienteId
WHERE p.empresaId = 1
  AND p.cesado = false
ORDER BY e.nombre, p.clienteId;

-- =====================================================
-- CASO 3: VERIFICAR COSTO UNITARIO
-- =====================================================
-- Calcula el costo unitario que se aplicará
-- basado en las entregas a rendir de la temporada

SELECT 
    t.id as temporada_id,
    t.numeroResolucion,
    COUNT(DISTINCT ear.id) as num_entregas_rendir,
    -- Total de egresos de todas las entregas a rendir
    (SELECT COALESCE(SUM(dmer.monto), 0)
     FROM EntregaARendir ear2
     JOIN DetMovsEntregaRendir dmer ON dmer.entregaARendirId = ear2.id
     WHERE ear2.temporadaPescaId = t.id
       AND dmer.tipoMovimientoId = 2  -- Egresos
    ) as total_egresos,
    -- Total de toneladas de la faena actual
    (SELECT COALESCE(SUM(d.toneladas), 0)
     FROM DescargaFaenaPesca d
     WHERE d.faenaPescaId = 80  -- Cambiar por el ID de la faena
    ) as total_toneladas_faena,
    -- Costo unitario calculado
    CASE 
        WHEN (SELECT SUM(d.toneladas) FROM DescargaFaenaPesca d WHERE d.faenaPescaId = 80) > 0
        THEN (SELECT SUM(dmer.monto) FROM EntregaARendir ear2 
              JOIN DetMovsEntregaRendir dmer ON dmer.entregaARendirId = ear2.id
              WHERE ear2.temporadaPescaId = t.id AND dmer.tipoMovimientoId = 2) 
             / (SELECT SUM(d.toneladas) FROM DescargaFaenaPesca d WHERE d.faenaPescaId = 80)
        ELSE 0
    END as costo_unitario_calculado
FROM TemporadaPesca t
LEFT JOIN EntregaARendir ear ON ear.temporadaPescaId = t.id
WHERE t.id = (SELECT temporadaPescaId FROM FaenaPesca WHERE id = 80)  -- Cambiar ID
GROUP BY t.id, t.numeroResolucion;

-- Detalle de egresos por entrega a rendir
SELECT 
    ear.id as entrega_id,
    ear.temporadaPescaId,
    ear.numeroEntrega,
    dmer.id as detalle_id,
    dmer.tipoMovimientoId,
    tm.nombre as tipo_movimiento,
    dmer.monto
FROM EntregaARendir ear
JOIN DetMovsEntregaRendir dmer ON dmer.entregaARendirId = ear.id
JOIN TipoMovimiento tm ON tm.id = dmer.tipoMovimientoId
WHERE ear.temporadaPescaId = (SELECT temporadaPescaId FROM FaenaPesca WHERE id = 80)
  AND dmer.tipoMovimientoId = 2  -- Solo egresos
ORDER BY ear.id, dmer.id;

-- =====================================================
-- CASO 4: VERIFICAR MOVIMIENTOS GENERADOS
-- =====================================================
-- Después de finalizar la faena, verificar los movimientos creados

SELECT 
    ma.id as movimiento_id,
    ma.numeroDocumento,
    ma.conceptoMovAlmacenId,
    cma.nombre as concepto,
    ma.tipoDocumentoId,
    td.nombre as tipo_documento,
    ma.fechaDocumento,
    ma.entidadComercialId,
    ec.razonSocial as entidad_comercial,
    ma.faenaPescaId,
    ma.embarcacionId,
    e.nombre as embarcacion,
    ma.estadoDocAlmacenId,
    eda.nombre as estado,
    COUNT(dma.id) as num_detalles
FROM MovimientoAlmacen ma
JOIN ConceptoMovAlmacen cma ON cma.id = ma.conceptoMovAlmacenId
JOIN TipoDocumento td ON td.id = ma.tipoDocumentoId
LEFT JOIN EntidadComercial ec ON ec.id = ma.entidadComercialId
LEFT JOIN Embarcacion e ON e.id = ma.embarcacionId
JOIN EstadoMultiFuncion eda ON eda.id = ma.estadoDocAlmacenId
LEFT JOIN DetalleMovimientoAlmacen dma ON dma.movimientoAlmacenId = ma.id
WHERE ma.faenaPescaId = 80  -- Cambiar por el ID de la faena
GROUP BY ma.id, ma.numeroDocumento, ma.conceptoMovAlmacenId, cma.nombre, 
         ma.tipoDocumentoId, td.nombre, ma.fechaDocumento, ma.entidadComercialId,
         ec.razonSocial, ma.faenaPescaId, ma.embarcacionId, e.nombre,
         ma.estadoDocAlmacenId, eda.nombre
ORDER BY ma.conceptoMovAlmacenId;

-- =====================================================
-- CASO 5: VERIFICAR DETALLES DE MOVIMIENTOS
-- =====================================================
-- Muestra todos los detalles de los movimientos generados
-- con información de producto, cliente y cantidades

SELECT 
    ma.id as movimiento_id,
    ma.numeroDocumento,
    ma.conceptoMovAlmacenId,
    cma.nombre as concepto,
    dma.id as detalle_id,
    dma.productoId,
    p.nombre as producto,
    p.especieId,
    esp.nombre as especie,
    dma.cantidad,
    dma.peso,
    dma.lote,
    dma.entidadComercialId,
    ec.razonSocial as cliente_detalle,
    dma.costoUnitario,
    dma.estadoMercaderiaId,
    em.nombre as estado_mercaderia,
    dma.estadoCalidadId,
    ecal.nombre as estado_calidad
FROM MovimientoAlmacen ma
JOIN ConceptoMovAlmacen cma ON cma.id = ma.conceptoMovAlmacenId
JOIN DetalleMovimientoAlmacen dma ON dma.movimientoAlmacenId = ma.id
JOIN Producto p ON p.id = dma.productoId
LEFT JOIN Especie esp ON esp.id = p.especieId
LEFT JOIN EntidadComercial ec ON ec.id = dma.entidadComercialId
LEFT JOIN EstadoMultiFuncion em ON em.id = dma.estadoMercaderiaId
LEFT JOIN EstadoMultiFuncion ecal ON ecal.id = dma.estadoCalidadId
WHERE ma.faenaPescaId = 80  -- Cambiar por el ID de la faena
ORDER BY ma.conceptoMovAlmacenId, dma.id;

-- =====================================================
-- CASO 6: VERIFICAR KARDEX GENERADO
-- =====================================================
-- Muestra los registros de kardex creados para cada movimiento

SELECT 
    ka.id as kardex_id,
    ka.movimientoAlmacenId,
    ma.numeroDocumento,
    ma.conceptoMovAlmacenId,
    cma.nombre as concepto,
    ka.productoId,
    p.nombre as producto,
    ka.tipoMovimiento,
    ka.ingresoCant,
    ka.ingresoPeso,
    ka.egresoCant,
    ka.egresoPeso,
    ka.saldoFinalCant,
    ka.saldoFinalPeso,
    ka.costoUnitario,
    ka.fechaMovimiento
FROM KardexAlmacen ka
JOIN MovimientoAlmacen ma ON ma.id = ka.movimientoAlmacenId
JOIN ConceptoMovAlmacen cma ON cma.id = ma.conceptoMovAlmacenId
JOIN Producto p ON p.id = ka.productoId
WHERE ma.faenaPescaId = 80  -- Cambiar por el ID de la faena
ORDER BY ka.productoId, ka.fechaMovimiento, ka.id;

-- =====================================================
-- CASO 7: VERIFICAR SALDOS ACTUALIZADOS
-- =====================================================
-- Muestra los saldos finales por producto y cliente

SELECT 
    sdpc.productoId,
    p.nombre as producto,
    p.especieId,
    esp.nombre as especie,
    sdpc.entidadComercialId,
    ec.razonSocial as cliente,
    sdpc.cantidad,
    sdpc.peso,
    sdpc.actualizadoEn
FROM SaldosDetProductoCliente sdpc
JOIN Producto p ON p.id = sdpc.productoId
LEFT JOIN Especie esp ON esp.id = p.especieId
LEFT JOIN EntidadComercial ec ON ec.id = sdpc.entidadComercialId
WHERE sdpc.productoId IN (
    SELECT DISTINCT dma.productoId 
    FROM DetalleMovimientoAlmacen dma
    JOIN MovimientoAlmacen ma ON ma.id = dma.movimientoAlmacenId
    WHERE ma.faenaPescaId = 80  -- Cambiar por el ID de la faena
)
ORDER BY p.nombre, ec.razonSocial;

-- =====================================================
-- CASO 8: RESUMEN COMPLETO DE LA FAENA
-- =====================================================
-- Vista consolidada de toda la información

SELECT 
    'FAENA' as tipo,
    f.id as id,
    f.numeroFaena as numero,
    ef.nombre as estado,
    NULL as cliente,
    NULL as especie,
    NULL as cantidad
FROM FaenaPesca f
JOIN EstadoMultiFuncion ef ON ef.id = f.estadoFaenaId
WHERE f.id = 80

UNION ALL

SELECT 
    'DESCARGA' as tipo,
    d.id,
    NULL,
    NULL,
    ec.razonSocial,
    esp.nombre,
    d.toneladas
FROM DescargaFaenaPesca d
LEFT JOIN EntidadComercial ec ON ec.id = d.clienteId
LEFT JOIN Especie esp ON esp.id = d.especieId
WHERE d.faenaPescaId = 80

UNION ALL

SELECT 
    'MOVIMIENTO' as tipo,
    ma.id,
    ma.numeroDocumento,
    cma.nombre,
    ec.razonSocial,
    NULL,
    NULL
FROM MovimientoAlmacen ma
JOIN ConceptoMovAlmacen cma ON cma.id = ma.conceptoMovAlmacenId
LEFT JOIN EntidadComercial ec ON ec.id = ma.entidadComercialId
WHERE ma.faenaPescaId = 80

ORDER BY tipo, id;

-- =====================================================
-- CASO 9: MÚLTIPLES FAENAS EN UNA TEMPORADA
-- =====================================================
-- Verifica todas las faenas de una temporada y sus movimientos

SELECT 
    t.id as temporada_id,
    t.numeroResolucion,
    f.id as faena_id,
    f.numeroFaena,
    f.estadoFaenaId,
    ef.nombre as estado_faena,
    COUNT(DISTINCT d.id) as num_descargas,
    SUM(d.toneladas) as total_toneladas,
    COUNT(DISTINCT ma.id) as num_movimientos
FROM TemporadaPesca t
LEFT JOIN FaenaPesca f ON f.temporadaPescaId = t.id
LEFT JOIN EstadoMultiFuncion ef ON ef.id = f.estadoFaenaId
LEFT JOIN DescargaFaenaPesca d ON d.faenaPescaId = f.id
LEFT JOIN MovimientoAlmacen ma ON ma.faenaPescaId = f.id
WHERE t.id = (SELECT temporadaPescaId FROM FaenaPesca WHERE id = 80)
GROUP BY t.id, t.numeroResolucion, f.id, f.numeroFaena, f.estadoFaenaId, ef.nombre
ORDER BY f.id;

-- =====================================================
-- CASO 10: VALIDACIÓN DE INTEGRIDAD
-- =====================================================
-- Verifica que todo esté correctamente relacionado

-- Verificar que cada movimiento tenga detalles
SELECT 
    ma.id as movimiento_id,
    ma.numeroDocumento,
    COUNT(dma.id) as num_detalles,
    CASE 
        WHEN COUNT(dma.id) = 0 THEN '❌ SIN DETALLES'
        ELSE '✅ OK'
    END as validacion
FROM MovimientoAlmacen ma
LEFT JOIN DetalleMovimientoAlmacen dma ON dma.movimientoAlmacenId = ma.id
WHERE ma.faenaPescaId = 80
GROUP BY ma.id, ma.numeroDocumento;

-- Verificar que cada movimiento tenga kardex
SELECT 
    ma.id as movimiento_id,
    ma.numeroDocumento,
    COUNT(ka.id) as num_kardex,
    CASE 
        WHEN COUNT(ka.id) = 0 THEN '❌ SIN KARDEX'
        ELSE '✅ OK'
    END as validacion
FROM MovimientoAlmacen ma
LEFT JOIN KardexAlmacen ka ON ka.movimientoAlmacenId = ma.id
WHERE ma.faenaPescaId = 80
GROUP BY ma.id, ma.numeroDocumento;

-- Verificar que el número de detalles coincida con el número de descargas
SELECT 
    f.id as faena_id,
    COUNT(DISTINCT d.id) as num_descargas,
    (SELECT COUNT(*) FROM DetalleMovimientoAlmacen dma 
     JOIN MovimientoAlmacen ma ON ma.id = dma.movimientoAlmacenId 
     WHERE ma.faenaPescaId = f.id AND ma.conceptoMovAlmacenId = 1) as detalles_ingreso,
    (SELECT COUNT(*) FROM DetalleMovimientoAlmacen dma 
     JOIN MovimientoAlmacen ma ON ma.id = dma.movimientoAlmacenId 
     WHERE ma.faenaPescaId = f.id AND ma.conceptoMovAlmacenId = 3) as detalles_salida,
    CASE 
        WHEN COUNT(DISTINCT d.id) = 
             (SELECT COUNT(*) FROM DetalleMovimientoAlmacen dma 
              JOIN MovimientoAlmacen ma ON ma.id = dma.movimientoAlmacenId 
              WHERE ma.faenaPescaId = f.id AND ma.conceptoMovAlmacenId = 1)
        AND COUNT(DISTINCT d.id) = 
             (SELECT COUNT(*) FROM DetalleMovimientoAlmacen dma 
              JOIN MovimientoAlmacen ma ON ma.id = dma.movimientoAlmacenId 
              WHERE ma.faenaPescaId = f.id AND ma.conceptoMovAlmacenId = 3)
        THEN '✅ COINCIDE'
        ELSE '❌ NO COINCIDE'
    END as validacion
FROM FaenaPesca f
LEFT JOIN DescargaFaenaPesca d ON d.faenaPescaId = f.id
WHERE f.id = 80
GROUP BY f.id;
