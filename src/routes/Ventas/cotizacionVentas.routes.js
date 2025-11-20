import { Router } from 'express';
import * as cotizacionVentasController from '../../controllers/Ventas/cotizacionVentas.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/series-doc', cotizacionVentasController.obtenerSeriesDoc);
router.post('/:id/cargar-costos-incoterm', cotizacionVentasController.cargarCostosSegunIncoterm);
router.post('/:id/generar-documentos', cotizacionVentasController.generarDocumentosRequeridos);

// Rutas CRUD para CotizacionVentas
router.get('/', cotizacionVentasController.listar);
router.get('/:id', cotizacionVentasController.obtenerPorId);
router.post('/', cotizacionVentasController.crear);
router.put('/:id', cotizacionVentasController.actualizar);
router.delete('/:id', cotizacionVentasController.eliminar);

export default router;
