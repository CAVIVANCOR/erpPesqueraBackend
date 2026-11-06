import { Router } from 'express';
import * as planillaController from '../../controllers/RecursosHumanos/planilla.controller.js';

const router = Router();

router.get('/', planillaController.listar);
router.get('/afpnet', planillaController.obtenerDatosAfpnet);
router.get('/plame', planillaController.obtenerDatosPlame);
router.get('/:id', planillaController.obtenerPorId);
router.post('/', planillaController.generar);
router.put('/conceptos/:conceptoId', planillaController.corregirConcepto);
router.post('/:id/regenerar', planillaController.regenerar);
router.post('/:id/aprobar-jefe-personal', planillaController.aprobarJefePersonal);
router.post('/:id/aprobar-gerencia', planillaController.aprobarGerencia);
router.post('/:id/reabrir', planillaController.reabrir);
router.post('/:id/revertir-aprobacion', planillaController.revertirAprobacionGerencia);
router.delete('/:id', planillaController.eliminar);

export default router;
