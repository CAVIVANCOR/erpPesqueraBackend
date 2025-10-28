import { Router } from 'express';
import * as movimientoAlmacenController from '../../controllers/Almacen/movimientoAlmacen.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/stock/consultar', movimientoAlmacenController.consultarStock);
router.get('/series-doc', movimientoAlmacenController.obtenerSeriesDoc);
router.post('/upload-pdf', movimientoAlmacenController.uploadPdf);

// Rutas CRUD para MovimientoAlmacen
router.get('/', movimientoAlmacenController.listar);
router.get('/:id', movimientoAlmacenController.obtenerPorId);
router.post('/', movimientoAlmacenController.crear);
router.put('/:id', movimientoAlmacenController.actualizar);
router.delete('/:id', movimientoAlmacenController.eliminar);

// Rutas para operaciones de cierre y anulación
router.post('/:id/cerrar', movimientoAlmacenController.cerrarMovimiento);
router.post('/:id/anular', movimientoAlmacenController.anularMovimiento);

export default router;
