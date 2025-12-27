import { Router } from 'express';
import * as configuracionCuentaContableController from '../../controllers/Contabilidad/configuracionCuentaContable.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', configuracionCuentaContableController.listar);
router.get('/:id', configuracionCuentaContableController.obtenerPorId);
router.post('/', configuracionCuentaContableController.crear);
router.put('/:id', configuracionCuentaContableController.actualizar);
router.delete('/:id', configuracionCuentaContableController.eliminar);

// Rutas específicas por empresa
router.get('/empresa/:empresaId', configuracionCuentaContableController.listarPorEmpresa);
router.get('/empresa/:empresaId/tipo/:tipoOperacion', configuracionCuentaContableController.listarPorTipoOperacion);
router.get('/empresa/:empresaId/tipo/:tipoOperacion/concepto/:concepto', configuracionCuentaContableController.obtenerPorConcepto);

// Ruta para copiar configuraciones entre empresas
router.post('/copiar', configuracionCuentaContableController.copiarConfiguraciones);

export default router;
