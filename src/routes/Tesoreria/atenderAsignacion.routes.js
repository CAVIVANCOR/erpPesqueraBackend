import express from "express";
import * as atenderAsignacionController from "../../controllers/Tesoreria/atenderAsignacion.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/tesoreria/atender-asignacion
 * @desc    Atender una asignación (Entrega de Fondos)
 * @access  Private
 */
router.post(
  "/",
  autenticarJWT,
  atenderAsignacionController.atenderAsignacion
);

/**
 * @route   PATCH /api/tesoreria/atender-asignacion/:id/url-comprobante
 * @desc    Guardar la URL del voucher de la operación en la asignación
 * @access  Private
 */
router.patch(
  "/:id/url-comprobante",
  autenticarJWT,
  atenderAsignacionController.actualizarUrlComprobante
);

export default router;