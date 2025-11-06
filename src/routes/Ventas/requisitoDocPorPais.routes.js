import { Router } from 'express';
import * as requisitoDocPorPaisController from '../../controllers/Ventas/requisitoDocPorPais.controller.js';

const router = Router();

// Rutas CRUD para RequisitoDocPorPais
router.get('/', requisitoDocPorPaisController.listar);
router.get('/pais/:paisId', requisitoDocPorPaisController.obtenerPorPais);
router.get('/documento/:docRequeridaVentasId', requisitoDocPorPaisController.obtenerPorDocumento);
router.get('/:id', requisitoDocPorPaisController.obtenerPorId);
router.post('/', requisitoDocPorPaisController.crear);
router.put('/:id', requisitoDocPorPaisController.actualizar);
router.delete('/:id', requisitoDocPorPaisController.eliminar);

export default router;