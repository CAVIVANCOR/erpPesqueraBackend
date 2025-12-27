import { Router } from 'express';
import * as letraCambioController from '../../controllers/LetrasCambio/letraCambio.controller.js';

const router = Router();

router.get('/', letraCambioController.listar);
router.get('/:id', letraCambioController.obtenerPorId);
router.post('/', letraCambioController.crear);
router.put('/:id', letraCambioController.actualizar);
router.delete('/:id', letraCambioController.eliminar);

router.get('/empresa/:empresaId', letraCambioController.listarPorEmpresa);
router.get('/empresa/:empresaId/tipo/:tipoLetra', letraCambioController.listarPorTipo);
router.get('/empresa/:empresaId/vencidas', letraCambioController.listarVencidas);
router.post('/:id/marcar-protestada', letraCambioController.marcarProtestada);
router.post('/:id/marcar-renovada', letraCambioController.marcarRenovada);

export default router;
