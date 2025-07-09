import { Router } from 'express';
import * as entidadComercialController from '../../controllers/Maestros/entidadComercial.controller.js';

const router = Router();

// Rutas CRUD para EntidadComercial
router.get('/', entidadComercialController.listar);
router.get('/:id', entidadComercialController.obtenerPorId);
router.post('/', entidadComercialController.crear);
router.put('/:id', entidadComercialController.actualizar);
router.delete('/:id', entidadComercialController.eliminar);

export default router;
