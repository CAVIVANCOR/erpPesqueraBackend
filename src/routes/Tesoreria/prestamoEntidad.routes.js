import express from 'express';
import * as prestamoEntidadController from '../../controllers/Tesoreria/prestamoEntidad.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Préstamos con accionistas y terceros (recibidos y otorgados, solo capital).
 * Los préstamos nuevos y sus pagos/cobros nacen en Tesorería (POST /desembolsos y /pagos);
 * la pantalla consulta, registra saldos iniciales, edita datos básicos y elimina los que no tienen respaldo en caja.
 * Submódulo de permisos: 'prestamoEntidad'.
 */

router.get('/', autenticarJWT, checkPermission('prestamoEntidad', 'ver'), prestamoEntidadController.listar);

// Rutas fijas ANTES de /:id
router.get('/vigentes', autenticarJWT, prestamoEntidadController.listarVigentes);
router.post('/desembolsos', autenticarJWT, prestamoEntidadController.desembolsar);
router.post('/pagos', autenticarJWT, prestamoEntidadController.pagar);

router.get('/:id', autenticarJWT, checkPermission('prestamoEntidad', 'ver'), prestamoEntidadController.obtenerPorId);
// Asiento de apertura de un préstamo anterior al sistema (saldo inicial)
router.get('/:id/asientos', autenticarJWT, checkPermission('prestamoEntidad', 'ver'), prestamoEntidadController.obtenerAsientos);
router.post('/:id/asientos', autenticarJWT, checkPermission('prestamoEntidad', 'crear'), prestamoEntidadController.generarAsientoApertura);
router.delete('/:id/asientos', autenticarJWT, checkPermission('prestamoEntidad', 'eliminar'), prestamoEntidadController.eliminarAsientos);

router.post('/', autenticarJWT, checkPermission('prestamoEntidad', 'crear'), prestamoEntidadController.crear);
router.put('/:id', autenticarJWT, checkPermission('prestamoEntidad', 'editar'), prestamoEntidadController.actualizar);
router.delete('/:id', autenticarJWT, checkPermission('prestamoEntidad', 'eliminar'), prestamoEntidadController.eliminar);

export default router;
