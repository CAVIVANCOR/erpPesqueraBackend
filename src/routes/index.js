import express from 'express';
import movimientoCajaRoutes from './movimientoCaja.routes.js';
import cuentaCorrienteRoutes from './cuentaCorriente.routes.js';

const router = express.Router();

router.use('/movimientos-caja', movimientoCajaRoutes);
router.use('/cuentas-corrientes', cuentaCorrienteRoutes);

export default router;
