import { Router } from 'express';
import * as operacionPrestamoController from '../../controllers/Tesoreria/operacionPrestamo.controller.js';

const router = Router();

// Pago de cuotas de un préstamo (egreso consolidado + ITF + comisión)
router.post('/pagar-cuotas', operacionPrestamoController.pagarCuotas);

// Copia los adjuntos (voucher consolidado y comprobante) de un pago a los demás de su operación
router.put('/pagos/:pagoId/sincronizar-adjuntos', operacionPrestamoController.sincronizarAdjuntos);

// Desembolso del préstamo (ingreso + ITF + comisión)
router.post('/desembolsar', operacionPrestamoController.desembolsar);

export default router;
