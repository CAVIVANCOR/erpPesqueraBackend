// Rutas de Express para TipoReferenciaMovimientoCaja
import { Router } from 'express';
import * as controller from '../../controllers/FlujoCaja/tipoReferenciaMovimientoCaja.controller.js';

const router = Router();

// GET /api/tipos-referencia-movimiento-caja
router.get('/', controller.listar);

// GET /api/tipos-referencia-movimiento-caja/:id
router.get('/:id', controller.obtenerPorId);

// POST /api/tipos-referencia-movimiento-caja
router.post('/', controller.crear);

// PUT /api/tipos-referencia-movimiento-caja/:id
router.put('/:id', controller.actualizar);

// DELETE /api/tipos-referencia-movimiento-caja/:id
router.delete('/:id', controller.eliminar);

export default router;
