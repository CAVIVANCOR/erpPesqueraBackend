import { Router } from 'express';
import * as planCuentasContableController from '../../controllers/Contabilidad/planCuentasContable.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', planCuentasContableController.listar);
router.get('/activas', planCuentasContableController.listarActivas);
router.get('/imputables', planCuentasContableController.listarImputables);
router.get('/:id', planCuentasContableController.obtenerPorId);
router.post('/', planCuentasContableController.crear);
router.put('/:id', planCuentasContableController.actualizar);
router.delete('/:id', planCuentasContableController.eliminar);

export default router;
