import { Router } from 'express';
import * as prestamoBancarioController from '../../controllers/Tesoreria/prestamoBancario.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', prestamoBancarioController.listar);
router.get('/vigentes', prestamoBancarioController.listarVigentes);
router.get('/empresa/:empresaId', prestamoBancarioController.listarPorEmpresa);
router.get('/:id', prestamoBancarioController.obtenerPorId);
router.get('/:id/cronograma', prestamoBancarioController.obtenerCronograma);
router.post('/', prestamoBancarioController.crear);
router.put('/:id', prestamoBancarioController.actualizar);
router.delete('/:id', prestamoBancarioController.eliminar);

export default router;
