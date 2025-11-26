import { Router } from 'express';
import * as detMovsEntregaRendirContratoServiciosController from '../../controllers/ContratoServicio/detMovsEntregaRendirContratoServicios.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/entrega/:entregaId', detMovsEntregaRendirContratoServiciosController.obtenerPorEntrega);

// Rutas CRUD para DetMovsEntregaRendirContratoServicios
router.get('/', detMovsEntregaRendirContratoServiciosController.listar);
router.get('/:id', detMovsEntregaRendirContratoServiciosController.obtenerPorId);
router.post('/', detMovsEntregaRendirContratoServiciosController.crear);
router.put('/:id', detMovsEntregaRendirContratoServiciosController.actualizar);
router.delete('/:id', detMovsEntregaRendirContratoServiciosController.eliminar);

export default router;
