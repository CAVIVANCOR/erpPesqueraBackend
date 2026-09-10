import { Router } from 'express';
import * as retencionController from '../../controllers/Tesoreria/retencion.controller.js';

/**
 * Rutas para el módulo de Retenciones
 * Prefijo: /api/tesoreria/retenciones
 */

const router = Router();

// Rutas CRUD básicas
router.get('/', retencionController.listar);
router.get('/:id', retencionController.obtenerPorId);
router.post('/', retencionController.crear);
router.put('/:id', retencionController.actualizar);
router.delete('/:id', retencionController.eliminar);

export default router;
