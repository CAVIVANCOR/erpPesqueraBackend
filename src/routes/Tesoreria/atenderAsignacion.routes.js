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

export default router;