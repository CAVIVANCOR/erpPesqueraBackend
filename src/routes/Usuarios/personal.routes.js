import { Router } from 'express';
import * as personalController from '../../controllers/Usuarios/personal.controller.js';

const router = Router();

// Rutas CRUD para Personal
router.get('/', personalController.listar);
router.get('/bahias-comerciales/:empresaId', personalController.listarBahiasComerciales);
router.get('/:id', personalController.obtenerPorId);
router.post('/', personalController.crear);
router.put('/:id', personalController.actualizar);
router.delete('/:id', personalController.eliminar);

export default router;
