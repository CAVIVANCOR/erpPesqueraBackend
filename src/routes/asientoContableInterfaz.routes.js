// Rutas de Express para AsientoContableInterfaz
import { Router } from 'express';
import * as controller from '../controllers/asientoContableInterfaz.controller.js';

const router = Router();

// GET /api/asientos-contables-interfaz
router.get('/', controller.listar);

// GET /api/asientos-contables-interfaz/:id
router.get('/:id', controller.obtenerPorId);

// POST /api/asientos-contables-interfaz
router.post('/', controller.crear);

// PUT /api/asientos-contables-interfaz/:id
router.put('/:id', controller.actualizar);

// DELETE /api/asientos-contables-interfaz/:id
router.delete('/:id', controller.eliminar);

export default router;
