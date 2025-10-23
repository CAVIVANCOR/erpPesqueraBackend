import { Router } from 'express';
import * as modoDespachoRecepcionController from '../../controllers/Ventas/modoDespachoRecepcion.controller.js';

const router = Router();

// Rutas CRUD para ModoDespachoRecepcion
router.get('/', modoDespachoRecepcionController.listar);
router.get('/:id', modoDespachoRecepcionController.obtenerPorId);
router.post('/', modoDespachoRecepcionController.crear);
router.put('/:id', modoDespachoRecepcionController.actualizar);
router.delete('/:id', modoDespachoRecepcionController.eliminar);

export default router;