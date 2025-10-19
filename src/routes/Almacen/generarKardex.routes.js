// src/routes/Almacen/generarKardex.routes.js
import express from 'express';
import { generarKardex } from '../../controllers/Almacen/generarKardex.controller.js';

const router = express.Router();

/**
 * @route POST /api/almacen/generar-kardex/:movimientoAlmacenId
 * @desc Genera Kardex completo para un MovimientoAlmacen
 * @access Private
 */
router.post('/:movimientoAlmacenId', generarKardex);

export default router;