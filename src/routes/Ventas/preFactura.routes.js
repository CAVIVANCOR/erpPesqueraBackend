import { Router } from 'express';
import * as preFacturaController from '../../controllers/Ventas/preFactura.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para PreFactura
 * Ruta del submódulo: 'preFactura'
 * 
 * REGLA DE PERMISOS:
 * - Operaciones PROPIAS del modelo: permisos específicos (crear, editar, eliminar, ver)
 * - Operaciones que GENERAN recursos derivados (kardex, asientos, CxP): solo requieren 'ver'
 */

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get(
  '/series-doc',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.obtenerSeriesDoc
);

router.get(
  '/por-cliente',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.obtenerPreFacturasPorCliente
);

// ========================================
// RUTAS DE GENERACIÓN DE COMPROBANTES
// (Operaciones propias de PreFactura)
// ========================================
router.post(
  '/:id/generar-factura',
  autenticarJWT,
  checkPermission('preFactura', 'crear'),
  preFacturaController.generarFactura
);

router.post(
  '/:id/generar-boleta',
  autenticarJWT,
  checkPermission('preFactura', 'crear'),
  preFacturaController.generarBoleta
);

router.put(
  '/:id/partir',
  autenticarJWT,
  checkPermission('preFactura', 'editar'),
  preFacturaController.partirPreFactura
);

router.post(
  '/:id/facturar-negra',
  autenticarJWT,
  checkPermission('preFactura', 'crear'),
  preFacturaController.facturarPreFacturaNegra
);

router.post(
  '/:id/facturar-blanca',
  autenticarJWT,
  checkPermission('preFactura', 'crear'),
  preFacturaController.facturarPreFacturaBlanca
);

router.put(
  '/:id/aprobar',
  autenticarJWT,
  checkPermission('preFactura', 'editar'),
  preFacturaController.aprobar
);

// ========================================
// RUTAS DE KARDEX
// (Generan recursos derivados - solo requieren 'ver')
// ========================================
router.post(
  '/:id/generar-movimiento',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.generarMovimiento
);

router.post(
  '/:id/regenerar-kardex',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.regenerarKardex
);

// ========================================
// RUTAS DE ASIENTOS CONTABLES
// (Generan recursos derivados - solo requieren 'ver')
// ========================================
router.get(
  '/:id/borrador-asiento',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.generarBorradorAsiento
);

router.post(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.guardarAsientoContable
);

router.put(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.guardarAsientoContable
);

router.delete(
  '/:id/asiento/:asientoId',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.eliminarAsientoContable
);

// ========================================
// RUTAS CRUD PARA PREFACTURA
// (Operaciones propias del modelo)
// ========================================
router.get(
  '/',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('preFactura', 'ver'),
  preFacturaController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('preFactura', 'crear'),
  preFacturaController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('preFactura', 'editar'),
  preFacturaController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('preFactura', 'eliminar'),
  preFacturaController.eliminar
);

router.put(
  '/:id/anular',
  autenticarJWT,
  checkPermission('preFactura', 'eliminar'),
  preFacturaController.anular
);

export default router;