import express from 'express';
import * as enumsContabilidadController from '../../controllers/Contabilidad/enumsContabilidad.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route GET /api/contabilidad/enums
 * @desc Obtiene todos los enums del módulo de contabilidad
 * @access Privado
 */
router.get('/', autenticarJWT, enumsContabilidadController.obtenerEnumsContabilidad);

export default router;
