import { Router } from 'express';
import * as estadoMultiFuncionController from '../../controllers/Maestros/estadoMultiFuncion.controller.js';

const router = Router();

// Rutas CRUD para EstadoMultiFuncion
router.get('/', estadoMultiFuncionController.listar);
router.get('/productos', estadoMultiFuncionController.listarParaProductos);
router.get('/embarcaciones', estadoMultiFuncionController.listarParaEmbarcaciones);
router.get('/:id', estadoMultiFuncionController.obtenerPorId);
router.post('/', estadoMultiFuncionController.crear);
router.put('/:id', estadoMultiFuncionController.actualizar);
router.delete('/:id', estadoMultiFuncionController.eliminar);

export default router;
