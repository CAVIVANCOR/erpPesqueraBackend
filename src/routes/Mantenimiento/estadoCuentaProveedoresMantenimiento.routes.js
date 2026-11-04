import express from "express";
import estadoCuentaController from "../../controllers/Mantenimiento/estadoCuentaProveedoresMantenimiento.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";

const router = express.Router();

// Estado de cuenta (facturado y pagado desde caja) de los proveedores de servicios y repuestos de Mantenimiento
router.post(
  "/",
  autenticarJWT,
  checkPermission("otMantenimiento", "ver"),
  estadoCuentaController.obtenerEstadoCuenta
);

export default router;
