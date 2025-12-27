import { Router } from 'express';
import * as retencionController from '../../controllers/RetencionesPercepciones/retencion.controller.js';

const router = Router();

router.get('/', retencionController.listar);
router.get('/:id', retencionController.obtenerPorId);
router.post('/', retencionController.crear);
router.put('/:id', retencionController.actualizar);
router.delete('/:id', retencionController.eliminar);

router.get('/empresa/:empresaId', retencionController.listarPorEmpresa);
router.get('/empresa/:empresaId/periodo', retencionController.listarPorPeriodo);
router.get('/proveedor/:proveedorId', retencionController.listarPorProveedor);

export default router;
