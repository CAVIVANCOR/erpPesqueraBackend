import { Router } from 'express';
import * as contratoServicioController from '../../controllers/ContratoServicio/contratoServicio.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/series-doc', contratoServicioController.obtenerSeriesDoc);
router.get('/cliente/:clienteId', contratoServicioController.obtenerPorCliente);
router.get('/empresa/:empresaId', contratoServicioController.obtenerPorEmpresa);
router.get('/vigentes/:clienteId', contratoServicioController.obtenerContratosVigentes);

// Rutas CRUD para ContratoServicio
router.get('/', contratoServicioController.listar);
router.get('/:id', contratoServicioController.obtenerPorId);
router.post('/', contratoServicioController.crear);
router.put('/:id', contratoServicioController.actualizar);
router.delete('/:id', contratoServicioController.eliminar);

export default router;
