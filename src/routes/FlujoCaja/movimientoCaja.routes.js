// c:\Proyectos\megui\erp\erp-pesquera-backend\src\routes\FlujoCaja\movimientoCaja.routes.js
import express from "express";
import movimientoCajaController, {
  subirComprobante,
  subirDocumento,
  servirArchivoComprobante,
  servirArchivoDocumento,
} from "../../controllers/FlujoCaja/movimientoCaja.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";

const router = express.Router();

/**
 * Rutas CRUD para MovimientoCaja
 * Ruta del submódulo: 'movimientoCaja'
 */

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (1/8)
router.post(
  "/upload-comprobante",
  autenticarJWT,
  checkPermission("movimientoCaja", "crear"),
  subirComprobante,
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (2/8)
router.post(
  "/upload-documento",
  autenticarJWT,
  checkPermission("movimientoCaja", "crear"),
  subirDocumento,
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (3/8)
router.get(
  "/archivo-comprobante/*",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  servirArchivoComprobante,
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (4/8)
router.get(
  "/archivo-documento/*",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  servirArchivoDocumento,
);

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  "/",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  movimientoCajaController.listar,
);



// GET /api/movimiento-caja/filtros-avanzados (DEBE IR ANTES DE /:id)
router.get(
  "/filtros-avanzados",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  movimientoCajaController.listarConFiltrosAvanzados,
);

router.get(
  "/correlativo/:correlativo",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  movimientoCajaController.obtenerPorCorrelativo
);

router.get(
  "/:id",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  movimientoCajaController.obtenerPorId,
);
router.post(
  "/",
  autenticarJWT,
  checkPermission("movimientoCaja", "crear"),
  movimientoCajaController.crear,
);

router.put(
  "/:id",
  autenticarJWT,
  checkPermission("movimientoCaja", "editar"),
  movimientoCajaController.actualizar,
);

router.delete(
  "/:id",
  autenticarJWT,
  checkPermission("movimientoCaja", "eliminar"),
  movimientoCajaController.eliminar,
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (5/8)
router.post(
  "/:id/validar",
  autenticarJWT,
  checkPermission("movimientoCaja", "editar"),
  movimientoCajaController.validarMovimiento,
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (6/8)
router.post(
  "/:id/aprobar",
  autenticarJWT,
  checkPermission("movimientoCaja", "aprobar"),
  movimientoCajaController.aprobar,
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (7/8)
router.post(
  "/:id/rechazar",
  autenticarJWT,
  checkPermission("movimientoCaja", "rechazar"),
  movimientoCajaController.rechazar,
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (8/8)
router.post(
  "/:id/revertir",
  autenticarJWT,
  checkPermission("movimientoCaja", "editar"),
  movimientoCajaController.revertir,
);

export default router;
