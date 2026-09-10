import { Router } from 'express';
import * as percepcionController from '../../controllers/Tesoreria/percepcion.controller.js';

/**
 * Rutas para el módulo de Percepciones
 * Prefijo: /api/tesoreria/percepciones
 */

const router = Router();

// Rutas CRUD básicas
router.get('/', percepcionController.listar);
router.get('/:id', percepcionController.obtenerPorId);
router.post('/', percepcionController.crear);
router.put('/:id', percepcionController.actualizar);
router.delete('/:id', percepcionController.eliminar);

export default router;
