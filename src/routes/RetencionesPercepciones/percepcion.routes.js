import { Router } from 'express';
import * as percepcionController from '../../controllers/RetencionesPercepciones/percepcion.controller.js';

const router = Router();

router.get('/', percepcionController.listar);
router.get('/:id', percepcionController.obtenerPorId);
router.post('/', percepcionController.crear);
router.put('/:id', percepcionController.actualizar);
router.delete('/:id', percepcionController.eliminar);

router.get('/empresa/:empresaId', percepcionController.listarPorEmpresa);
router.get('/empresa/:empresaId/periodo', percepcionController.listarPorPeriodo);
router.get('/cliente/:clienteId', percepcionController.listarPorCliente);

export default router;
