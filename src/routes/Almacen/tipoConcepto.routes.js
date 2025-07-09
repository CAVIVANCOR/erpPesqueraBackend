import { Router } from 'express';
import * as tipoConceptoController from '../../controllers/Almacen/tipoConcepto.controller.js';

const router = Router();

// Rutas CRUD para TipoConcepto
router.get('/', tipoConceptoController.listar);
router.get('/:id', tipoConceptoController.obtenerPorId);
router.post('/', tipoConceptoController.crear);
router.put('/:id', tipoConceptoController.actualizar);
router.delete('/:id', tipoConceptoController.eliminar);

export default router;
