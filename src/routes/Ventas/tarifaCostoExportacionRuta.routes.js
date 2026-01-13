import { Router } from 'express';
import * as tarifaCostoExportacionRutaController from '../../controllers/Ventas/tarifaCostoExportacionRuta.controller.js';

const router = Router();

// Rutas CRUD para TarifaCostoExportacionRuta
router.get('/', tarifaCostoExportacionRutaController.listar);
router.get('/costo-incoterm/:costoIncotermId', tarifaCostoExportacionRutaController.obtenerPorCostoIncoterm);
router.get('/ruta/:costoIncotermId/:puertoOrigenId/:puertoDestinoId', tarifaCostoExportacionRutaController.obtenerPorRuta);
router.get('/:id', tarifaCostoExportacionRutaController.obtenerPorId);
router.post('/', tarifaCostoExportacionRutaController.crear);
router.put('/:id', tarifaCostoExportacionRutaController.actualizar);
router.delete('/:id', tarifaCostoExportacionRutaController.eliminar);

export default router;