import { Router } from 'express';
import * as comprobanteElectronicoController from '../../controllers/FacturacionElectronica/comprobanteElectronico.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', comprobanteElectronicoController.listar);
router.get('/:id', comprobanteElectronicoController.obtenerPorId);
router.post('/', comprobanteElectronicoController.crear);
router.put('/:id', comprobanteElectronicoController.actualizar);
router.delete('/:id', comprobanteElectronicoController.eliminar);

// Rutas específicas por empresa y cliente
router.get('/empresa/:empresaId', comprobanteElectronicoController.listarPorEmpresa);
router.get('/cliente/:clienteId', comprobanteElectronicoController.listarPorCliente);

// Rutas de gestión SUNAT
router.post('/:id/marcar-enviado', comprobanteElectronicoController.marcarEnviado);
router.post('/:id/marcar-cdr-recibido', comprobanteElectronicoController.marcarCDRRecibido);

export default router;
