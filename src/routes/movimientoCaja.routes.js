import express from 'express';
import movimientoCajaController from '../controllers/movimientoCaja.controller.js';

const router = express.Router();

router.get('/', movimientoCajaController.listar);
router.get('/:id', movimientoCajaController.obtenerPorId);
router.post('/', movimientoCajaController.crear);
router.put('/:id', movimientoCajaController.actualizar);
router.delete('/:id', movimientoCajaController.eliminar);

export default router;
