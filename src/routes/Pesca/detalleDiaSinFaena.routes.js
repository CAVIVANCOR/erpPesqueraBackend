import { Router } from 'express';
import * as detalleDiaSinFaenaController from '../../controllers/Pesca/detalleDiaSinFaena.controller.js';

const router = Router();

// Rutas especiales (DEBEN IR ANTES de /:id para evitar conflictos)
router.get('/por-temporada', detalleDiaSinFaenaController.listarPorTemporada);
router.get('/por-novedad', detalleDiaSinFaenaController.listarPorNovedad);

// Rutas CRUD básicas
router.get('/', detalleDiaSinFaenaController.listar);
router.get('/:id', detalleDiaSinFaenaController.obtenerPorId);
router.post('/', detalleDiaSinFaenaController.crear);
router.put('/:id', detalleDiaSinFaenaController.actualizar);
router.delete('/:id', detalleDiaSinFaenaController.eliminar);

export default router;