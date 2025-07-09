import { Router } from 'express';
import * as tipoMaterialController from '../../controllers/Maestros/tipoMaterial.controller.js';

const router = Router();

// Rutas CRUD para TipoMaterial
router.get('/', tipoMaterialController.listar);
router.get('/:id', tipoMaterialController.obtenerPorId);
router.post('/', tipoMaterialController.crear);
router.put('/:id', tipoMaterialController.actualizar);
router.delete('/:id', tipoMaterialController.eliminar);

export default router;
