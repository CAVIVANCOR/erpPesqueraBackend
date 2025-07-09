import { Router } from 'express';
import * as tipoEmbarcacionController from '../../controllers/Pesca/tipoEmbarcacion.controller.js';

const router = Router();

// Rutas CRUD para TipoEmbarcacion
router.get('/', tipoEmbarcacionController.listar);
router.get('/:id', tipoEmbarcacionController.obtenerPorId);
router.post('/', tipoEmbarcacionController.crear);
router.put('/:id', tipoEmbarcacionController.actualizar);
router.delete('/:id', tipoEmbarcacionController.eliminar);

export default router;
