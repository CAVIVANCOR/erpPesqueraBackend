import { Router } from 'express';
import * as tipoDocumentoController from '../../controllers/Almacen/tipoDocumento.controller.js';

const router = Router();

// Rutas CRUD para TipoDocumento
router.get('/', tipoDocumentoController.listar);
router.get('/:id', tipoDocumentoController.obtenerPorId);
router.post('/', tipoDocumentoController.crear);
router.put('/:id', tipoDocumentoController.actualizar);
router.delete('/:id', tipoDocumentoController.eliminar);

export default router;
