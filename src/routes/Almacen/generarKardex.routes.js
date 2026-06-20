// src/routes/Almacen/generarKardex.routes.js
import express from 'express';
import * as generarKardexController from '../../controllers/Almacen/generarKardex.controller.js';

const router = express.Router();

/**
 * @route POST /api/generar-kardex/:movimientoAlmacenId
 * @desc Genera Kardex completo para un MovimientoAlmacen
 * @access Private
 */
router.post('/:movimientoAlmacenId', generarKardexController.generarKardex);

/**
 * @route POST /api/generar-kardex/:id/regenerar-sap
 * @desc Regenera kardex usando sistema SAP (elimina anterior y recalcula)
 * @access Private
 */
router.post('/:id/regenerar-sap', generarKardexController.regenerarKardexSAP);

export default router;