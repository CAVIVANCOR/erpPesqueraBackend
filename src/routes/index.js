import express from 'express';
import movimientoCajaRoutes from './movimientoCaja.routes.js';
import cuentaCorrienteRoutes from './cuentaCorriente.routes.js';
import asientoContableInterfazRoutes from './asientoContableInterfaz.routes.js';

const router = express.Router();

router.use('/movimientos-caja', movimientoCajaRoutes);
router.use('/cuentas-corrientes', cuentaCorrienteRoutes);
router.use('/asientos-contables-interfaz', asientoContableInterfazRoutes);

export default router;
