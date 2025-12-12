import { Router } from 'express';
import * as detCuotaPescaController from '../../controllers/Pesca/detCuotaPesca.controller.js';

const router = Router();

// Rutas CRUD para DetCuotaPesca
router.get('/', detCuotaPescaController.listar);
router.get('/:id', detCuotaPescaController.obtenerPorId);
router.post('/', detCuotaPescaController.crear);
router.put('/:id', detCuotaPescaController.actualizar);
router.delete('/:id', detCuotaPescaController.eliminar);

// Ruta para obtener resumen de cuotas por empresa
router.get('/resumen/empresa/:empresaId', detCuotaPescaController.obtenerResumenPorEmpresa);

export default router;
