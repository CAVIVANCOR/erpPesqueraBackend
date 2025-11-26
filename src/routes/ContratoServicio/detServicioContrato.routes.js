import { Router } from 'express';
import * as detServicioContratoController from '../../controllers/ContratoServicio/detServicioContrato.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/contrato/:contratoServicioId', detServicioContratoController.obtenerPorContrato);
router.get('/contrato/:contratoServicioId/total', detServicioContratoController.calcularTotalContrato);

// Rutas CRUD para DetServicioContrato
router.get('/', detServicioContratoController.listar);
router.get('/:id', detServicioContratoController.obtenerPorId);
router.post('/', detServicioContratoController.crear);
router.put('/:id', detServicioContratoController.actualizar);
router.delete('/:id', detServicioContratoController.eliminar);

export default router;
