import express from 'express';
import movimientoCajaRoutes from './movimientoCaja.routes.js';

const router = express.Router();

router.use('/movimientos-caja', movimientoCajaRoutes);

export default router;
