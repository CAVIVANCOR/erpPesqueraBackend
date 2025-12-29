import express from 'express';
import * as enumsTesoreriaController from '../../controllers/Tesoreria/enumsTesoreria.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route GET /api/tesoreria/enums
 * @desc Obtiene todos los enums del módulo de tesorería
 * @access Privado
 */
router.get('/', autenticarJWT, enumsTesoreriaController.obtenerEnumsTesoreria);

export default router;