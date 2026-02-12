import { Router } from 'express';
import * as preFacturaController from '../../controllers/Ventas/preFactura.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/series-doc', preFacturaController.obtenerSeriesDoc);

// ========================================
// RUTAS DE GENERACIÓN DE COMPROBANTES
// ========================================
router.post('/:id/generar-factura', preFacturaController.generarFactura);
router.post('/:id/generar-boleta', preFacturaController.generarBoleta);
router.post('/:id/partir', preFacturaController.partirPreFactura);
router.post('/:id/facturar-negra', preFacturaController.facturarPreFacturaNegra);

// Rutas CRUD para PreFactura
router.get('/', preFacturaController.listar);
router.get('/:id', preFacturaController.obtenerPorId);
router.post('/', preFacturaController.crear);
router.put('/:id', preFacturaController.actualizar);
router.delete('/:id', preFacturaController.eliminar);
router.put('/:id/anular', preFacturaController.anular);

export default router;