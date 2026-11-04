import { Router } from 'express';
import * as comprobanteElectronicoController from '../../controllers/FacturacionElectronica/comprobanteElectronico.controller.js';

const router = Router();

// ========================================
// RUTAS DE INTEGRACIÓN CON EL PROVEEDOR DE FACTURACIÓN ELECTRÓNICA
// ========================================
router.post('/:id/enviar-sunat', comprobanteElectronicoController.enviarASunat);
router.get('/:id/consultar-sunat', comprobanteElectronicoController.consultarEnSunat);
router.post('/:id/anular', comprobanteElectronicoController.anularComprobante);

// Rutas CRUD básicas
router.get('/', comprobanteElectronicoController.listar);
router.get('/:id', comprobanteElectronicoController.obtenerPorId);
router.delete('/:id', comprobanteElectronicoController.eliminar);

// Rutas específicas por empresa y cliente
router.get('/empresa/:empresaId', comprobanteElectronicoController.listarPorEmpresa);
router.get('/cliente/:clienteId', comprobanteElectronicoController.listarPorCliente);
router.get('/pre-factura/:preFacturaId', comprobanteElectronicoController.listarPorPreFactura);


export default router;