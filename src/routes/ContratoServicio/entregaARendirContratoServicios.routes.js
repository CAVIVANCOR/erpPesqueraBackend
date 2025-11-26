import { Router } from 'express';
import * as entregaARendirContratoServiciosController from '../../controllers/ContratoServicio/entregaARendirContratoServicios.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/contrato/:contratoServicioId', entregaARendirContratoServiciosController.obtenerPorContrato);

// Rutas CRUD para EntregaARendirContratoServicios
router.get('/', entregaARendirContratoServiciosController.listar);
router.get('/:id', entregaARendirContratoServiciosController.obtenerPorId);
router.post('/', entregaARendirContratoServiciosController.crear);
router.put('/:id', entregaARendirContratoServiciosController.actualizar);
router.delete('/:id', entregaARendirContratoServiciosController.eliminar);

export default router;
