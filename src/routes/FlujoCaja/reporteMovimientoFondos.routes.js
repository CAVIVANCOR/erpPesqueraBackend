import express from "express";
import reporteMovimientoFondosController from "../../controllers/FlujoCaja/reporteMovimientoFondos.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";

const router = express.Router();

// Datos de apoyo contable (contrapartidas, asientos y saldos) para el reporte Movimiento de Fondos
router.post(
  "/datos",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  reporteMovimientoFondosController.obtenerDatos
);

// Saldos de todas las cuentas bancarias / cajas activas de todas las empresas (reporte Saldos por Cuentas Bancarias)
router.post(
  "/cuentas-saldos",
  autenticarJWT,
  checkPermission("movimientoCaja", "ver"),
  reporteMovimientoFondosController.obtenerCuentasSaldos
);

export default router;
