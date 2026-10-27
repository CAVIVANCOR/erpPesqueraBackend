import { Router } from 'express';
import * as operacionPrestamoController from '../../controllers/Tesoreria/operacionPrestamo.controller.js';

const router = Router();

// Pago de cuotas de un préstamo (egreso consolidado + ITF + comisión)
router.post('/pagar-cuotas', operacionPrestamoController.pagarCuotas);

// Copia los adjuntos (voucher consolidado y comprobante) de un pago a los demás de su operación
router.put('/pagos/:pagoId/sincronizar-adjuntos', operacionPrestamoController.sincronizarAdjuntos);

// Desembolso del préstamo (ingreso + ITF + comisión)
router.post('/desembolsar', operacionPrestamoController.desembolsar);
router.delete('/prestamos/:prestamoId/asientos-previos/:asientoId', operacionPrestamoController.eliminarAsientoPrevio);

// Factoring: facturas entregadas en descuento y liquidación por cobro de la factura (sin caja)
router.get('/factoring/facturas-disponibles', operacionPrestamoController.facturasFactoringDisponibles);
router.get('/factoring/prestamos', operacionPrestamoController.prestamosFactoring);
router.get('/factoring/prestamos/:id', operacionPrestamoController.detalleFactoring);
router.post('/factoring/liquidar', operacionPrestamoController.liquidarFactoring);

// Factoring indirecto (compras): desembolso sin caja (su reversión es por operación, en /api/tesoreria/operaciones)
router.post('/factoring-indirecto/desembolsar', operacionPrestamoController.desembolsarFactoringIndirecto);
router.get('/factoring-indirecto/:prestamoId/intereses', operacionPrestamoController.interesesFactoringIndirecto);
router.put('/factoring-indirecto/cuotas/:cuotaId/factura-intereses', operacionPrestamoController.enlazarInteresCuotaFactoringIndirecto);

export default router;
