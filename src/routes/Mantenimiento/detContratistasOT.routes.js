import { Router } from 'express';
import * as detContratistasOTController from '../../controllers/Mantenimiento/detContratistasOT.controller.js';

const router = Router();

// Rutas CRUD para DetContratistasOT
router.get('/', detContratistasOTController.listar);
router.get('/orden-trabajo/:otId', detContratistasOTController.listarPorOrdenTrabajo);
router.get('/:id', detContratistasOTController.obtenerPorId);
router.post('/', detContratistasOTController.crear);
router.put('/:id', detContratistasOTController.actualizar);
router.delete('/:id', detContratistasOTController.eliminar);

// Documentos de compra generados desde el presupuesto (OrdenCompra + CxP + asientos)
router.get('/:id/documentos-compra', detContratistasOTController.listarDocumentosCompra);
router.get('/:id/productos-equivalentes', detContratistasOTController.buscarProductosEquivalentes);
router.post('/:id/generar-documento-compra', detContratistasOTController.generarDocumentoCompra);

export default router;