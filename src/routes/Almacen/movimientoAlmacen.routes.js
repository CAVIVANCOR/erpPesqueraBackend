import { Router } from 'express';
import * as movimientoAlmacenController from '../../controllers/Almacen/movimientoAlmacen.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para MovimientoAlmacen
 * Ruta del submódulo: 'movimientoAlmacen'
 */

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get(
  '/stock/consultar', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.consultarStock
);

router.get(
  '/series-doc', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.obtenerSeriesDoc
);

router.post(
  '/upload-pdf', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'crear'),
  movimientoAlmacenController.uploadPdf
);

// Rutas CRUD para MovimientoAlmacen
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'crear'),
  movimientoAlmacenController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'editar'),
  movimientoAlmacenController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'eliminar'),
  movimientoAlmacenController.eliminar
);

// Rutas para operaciones de cierre, anulación y reactivación
router.post(
  '/:id/cerrar', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'editar'),
  movimientoAlmacenController.cerrarMovimiento
);

router.post(
  '/:id/anular', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'eliminar'),
  movimientoAlmacenController.anularMovimiento
);

router.post(
  '/:id/reactivar', 
  autenticarJWT, 
  checkPermission('movimientoAlmacen', 'editar'),
  movimientoAlmacenController.reactivarDocumento
);

// ========================================
// RUTAS PARA ASIENTOS CONTABLES
// (Generan recursos derivados - solo requieren 'ver')
// ========================================
router.get(
  '/:id/borrador-asiento-saldo-inicial',
  autenticarJWT,
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.generarBorradorAsientoSaldoInicial
);

router.post(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.guardarAsientoContable
);

// ⭐ NUEVO: Ruta PUT para actualizar asiento existente
router.put(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.guardarAsientoContable
);

router.delete(
  '/:id/asiento/:asientoId',
  autenticarJWT,
  checkPermission('movimientoAlmacen', 'ver'),
  movimientoAlmacenController.eliminarAsientoContable
);


export default router;