import express from "express";
import reemplazoProductoController from "../../controllers/Maestros/reemplazoProducto.controller.js";
import { autenticarJWT } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/reemplazo-producto/previsualizar  { productoOrigenId, productoDestinoId, alcance }
router.post("/previsualizar", autenticarJWT, reemplazoProductoController.previsualizar);
// POST /api/reemplazo-producto/ejecutar       { productoOrigenId, productoDestinoId, alcance } (solo superusuario)
router.post("/ejecutar", autenticarJWT, reemplazoProductoController.ejecutar);

export default router;
