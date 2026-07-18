import { Router } from 'express';
import * as ordenCompraController from '../../controllers/Compras/ordenCompra.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para OrdenCompra
 * Ruta del submódulo: 'ordenCompra'
 * 
 * REGLA DE PERMISOS:
 * - Operaciones PROPIAS del modelo: permisos específicos (crear, editar, eliminar, ver)
 * - Operaciones que GENERAN recursos derivados (kardex, asientos, CxP): solo requieren 'ver'
 */

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.post(
  '/generar-desde-requerimiento',
  autenticarJWT,
  checkPermission('ordenCompra', 'crear'),
  ordenCompraController.generarDesdeRequerimiento
);



// Ruta específica para selector de documento afectado (NC/ND)
router.get(
  '/por-proveedor',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.obtenerOrdenesCompraPorProveedor
);


// ========================================
// RUTAS CRUD PARA ORDENCOMPRA
// (Operaciones propias del modelo)
// ========================================
router.get(
  '/',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('ordenCompra', 'crear'),
  ordenCompraController.crear
);

// ========================================
// RUTA DE ASIGNACIÓN MASIVA CENTRO COSTO
// (Operación propia del modelo)
// ========================================
router.put(
  '/asignar-centro-costo-masivo',
  autenticarJWT,
  checkPermission('ordenCompra', 'editar'),
  ordenCompraController.asignarCentroCostoMasivo
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('ordenCompra', 'editar'),
  ordenCompraController.actualizar
);


router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('ordenCompra', 'eliminar'),
  ordenCompraController.eliminar
);

// ========================================
// RUTAS PARA OPERACIONES ESPECIALES
// (Operaciones propias del modelo)
// ========================================
router.post(
  '/:id/aprobar',
  autenticarJWT,
  checkPermission('ordenCompra', 'aprobar'),
  ordenCompraController.aprobar
);

router.post(
  '/:id/anular',
  autenticarJWT,
  checkPermission('ordenCompra', 'eliminar'),
  ordenCompraController.anular
);

// Reactivar Orden de Compra
router.put(
  '/:id/reactivar',
  autenticarJWT,
  checkPermission('ordenCompra', 'editar'),
  ordenCompraController.reactivarDocumentoOrdenCompra
);

// ========================================
// RUTAS DE KARDEX
// (Generan recursos derivados - solo requieren 'ver')
// ========================================
router.post(
  '/:id/generar-movimiento',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.generarMovimiento
);

router.post(
  '/:id/generar-kardex',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.generarKardex
);

router.post(
  '/:id/regenerar-kardex',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.regenerarKardex
);

// ========================================
// RUTA DE PARTICIÓN
// (Operación propia del modelo)
// ========================================
router.put(
  '/:id/partir',
  autenticarJWT,
  checkPermission('ordenCompra', 'editar'),
  ordenCompraController.partirOrdenCompra
);

// ========================================
// RUTA DE GENERACIÓN DE CXP
// (Genera recurso derivado - solo requiere 'ver')
// ========================================
router.post(
  '/:id/generar-cxp',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.generarCuentaPorPagar
);

// ========================================
// RUTAS DE ASIENTOS CONTABLES
// (Generan recursos derivados - solo requieren 'ver')
// ========================================
router.get(
  '/:id/borrador-asiento',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.generarBorradorAsiento
);

router.post(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.guardarAsientoContable
);

// ⭐ NUEVO: Ruta PUT para actualizar asiento existente
router.put(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.guardarAsientoContable
);


// ========================================
// RUTA DE ELIMINAR ASIENTO
// (Elimina recurso derivado - solo requiere 'ver')
// ========================================
router.delete(
  '/:id/asiento/:asientoId',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.eliminarAsientoContable
);



export default router;