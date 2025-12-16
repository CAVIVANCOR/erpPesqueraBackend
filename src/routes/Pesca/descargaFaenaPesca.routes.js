import { Router } from 'express';
import * as descargaFaenaPescaController from '../../controllers/Pesca/descargaFaenaPesca.controller.js';

const router = Router();

// Rutas CRUD para DescargaFaenaPesca
router.get('/', descargaFaenaPescaController.listar);
router.get('/faena/:faenaPescaId', descargaFaenaPescaController.obtenerPorFaena);
router.get('/:id', descargaFaenaPescaController.obtenerPorId);
router.post('/', descargaFaenaPescaController.crear);
router.put('/:id', descargaFaenaPescaController.actualizar);
router.delete('/:id', descargaFaenaPescaController.eliminar);

// Ruta para finalizar descarga con movimientos de almacén
router.post('/:id/finalizar-con-movimientos', descargaFaenaPescaController.finalizarDescargaConMovimientos);

export default router;
