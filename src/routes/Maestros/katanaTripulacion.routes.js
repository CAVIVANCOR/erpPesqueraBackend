import { Router } from 'express';
import * as katanaTripulacionController from '../../controllers/Maestros/katanaTripulacion.controller.js';

const router = Router();

// Rutas CRUD para KatanaTripulacion
router.get('/', katanaTripulacionController.listar);
router.get('/:id', katanaTripulacionController.obtenerPorId);
router.post('/', katanaTripulacionController.crear);
router.put('/:id', katanaTripulacionController.actualizar);
router.delete('/:id', katanaTripulacionController.eliminar);

export default router;
