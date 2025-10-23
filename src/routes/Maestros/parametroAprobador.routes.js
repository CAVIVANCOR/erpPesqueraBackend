import { Router } from 'express';
import * as parametroAprobadorController from '../../controllers/Maestros/parametroAprobador.controller.js';

const router = Router();

// Rutas CRUD para ParametroAprobador
router.get('/', parametroAprobadorController.listar);
router.get('/por-modulo', parametroAprobadorController.listarPorModulo);
router.get('/:id', parametroAprobadorController.obtenerPorId);
router.post('/', parametroAprobadorController.crear);
router.put('/:id', parametroAprobadorController.actualizar);
router.delete('/:id', parametroAprobadorController.eliminar);

export default router;
