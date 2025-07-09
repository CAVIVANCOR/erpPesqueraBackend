import { Router } from 'express';
import * as detPermisoGestionadoOTController from '../../controllers/Mantenimiento/detPermisoGestionadoOT.controller.js';

const router = Router();

// Rutas CRUD para DetPermisoGestionadoOT
router.get('/', detPermisoGestionadoOTController.listar);
router.get('/:id', detPermisoGestionadoOTController.obtenerPorId);
router.post('/', detPermisoGestionadoOTController.crear);
router.put('/:id', detPermisoGestionadoOTController.actualizar);
router.delete('/:id', detPermisoGestionadoOTController.eliminar);

export default router;
