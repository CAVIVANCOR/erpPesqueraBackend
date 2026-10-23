import express from 'express';
import * as gastoBancarioController from '../../controllers/Tesoreria/gastoBancario.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Registro especializado de Gastos Bancarios (comisiones, ITF, portes...).
 * Operación de Tesorería Pendientes: igual que las demás operaciones especializadas, requiere sesión autenticada.
 */
router.get('/conceptos', autenticarJWT, gastoBancarioController.conceptos);
router.post('/', autenticarJWT, gastoBancarioController.registrar);

export default router;
