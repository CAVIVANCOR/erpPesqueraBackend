import { Router } from "express";
import * as accesoInstalacionController from "../../controllers/AccesoInstalaciones/accesoInstalacion.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";

const router = Router();

/**
 * Rutas CRUD para AccesoInstalacion
 * Ruta del submódulo: 'accesoInstalacion'
 */

router.get(
  "/",
  autenticarJWT,
  checkPermission("accesoInstalacion", "ver"),
  accesoInstalacionController.listar,
);

router.get(
  "/buscar-persona/:numeroDocumento",
  autenticarJWT,
  checkPermission("accesoInstalacion", "ver"),
  accesoInstalacionController.buscarPersonaPorDocumento,
);

router.get(
  "/buscar-vehiculo/:numeroPlaca",
  autenticarJWT,
  checkPermission("accesoInstalacion", "ver"),
  accesoInstalacionController.buscarVehiculoPorPlaca,
);

// ⭐ NUEVO - Búsqueda unificada por DNI (Personal → Histórico → RENIEC)
// IMPORTANTE: Esta ruta debe ir ANTES de '/:id' para evitar conflictos
router.get(
  "/buscar-dni/:dni",
  autenticarJWT,
  checkPermission("accesoInstalacion", "ver"),
  accesoInstalacionController.buscarPersonaPorDNI,
);

router.get(
  "/:id",
  autenticarJWT,
  checkPermission("accesoInstalacion", "ver"),
  accesoInstalacionController.obtenerPorId,
);

router.post(
  "/",
  autenticarJWT,
  checkPermission("accesoInstalacion", "crear"),
  accesoInstalacionController.crear,
);

router.put(
  "/:id",
  autenticarJWT,
  checkPermission("accesoInstalacion", "editar"),
  accesoInstalacionController.actualizar,
);

router.put(
  "/:id/salida-definitiva",
  autenticarJWT,
  checkPermission("accesoInstalacion", "editar"),
  accesoInstalacionController.procesarSalidaDefinitiva,
);

router.delete(
  "/:id",
  autenticarJWT,
  checkPermission("accesoInstalacion", "eliminar"),
  accesoInstalacionController.eliminar,
);

export default router;
