import { Router } from 'express';
import * as tipoAlmacenamientoController from '../../controllers/Maestros/tipoAlmacenamiento.controller.js';

const router = Router();

// Rutas CRUD para TipoAlmacenamiento
router.get('/', tipoAlmacenamientoController.listar);
router.get('/:id', tipoAlmacenamientoController.obtenerPorId);
router.post('/', tipoAlmacenamientoController.crear);
router.put('/:id', tipoAlmacenamientoController.actualizar);
router.delete('/:id', tipoAlmacenamientoController.eliminar);

export default router;
