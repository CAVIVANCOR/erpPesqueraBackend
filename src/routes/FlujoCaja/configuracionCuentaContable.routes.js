import express from 'express';
import configuracionCuentaContableController from '../../controllers/FlujoCaja/configuracionCuentaContable.controller.js';

const router = express.Router();

// Rutas CRUD para ConfiguracionCuentaContable
router.get('/', configuracionCuentaContableController.listar);
router.get('/obtener-configuracion', configuracionCuentaContableController.obtenerConfiguracion);
router.get('/:id', configuracionCuentaContableController.obtenerPorId);
router.post('/', configuracionCuentaContableController.crear);
router.put('/:id', configuracionCuentaContableController.actualizar);
router.delete('/:id', configuracionCuentaContableController.eliminar);

export default router;
