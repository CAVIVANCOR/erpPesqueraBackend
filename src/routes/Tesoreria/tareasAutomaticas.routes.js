import express from "express";
import * as tareasAutomaticasController from "../../controllers/Tesoreria/tareasAutomaticas.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Ejecutar proceso de cuotas vencidas manualmente
router.post("/procesar-cuotas-vencidas", autenticarJWT, tareasAutomaticasController.procesarCuotasVencidas);

// Ejecutar todas las tareas automáticas manualmente
router.post("/ejecutar-todas", autenticarJWT, tareasAutomaticasController.ejecutarTareasAutomaticas);

export default router;
