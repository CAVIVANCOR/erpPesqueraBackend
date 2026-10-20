import express from 'express';
import * as prestamoRelacionadoController from '../../controllers/Tesoreria/prestamoRelacionado.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Préstamos entre empresas relacionadas.
 * Los préstamos nuevos nacen en Tesorería (transferencia con tipos PRESTAMOS RELACIONADOS);
 * esta API consulta, registra saldos iniciales, edita datos básicos y elimina los que no tienen respaldo en caja.
 */

// GET /api/tesoreria/prestamos-relacionados
router.get('/', autenticarJWT, checkPermission('prestamoRelacionado', 'ver'), prestamoRelacionadoController.listar);

// GET /api/tesoreria/prestamos-relacionados/vigentes?empresaPrestamistaId=&empresaPrestatariaId=  (DEBE IR ANTES DE /:id)
router.get('/vigentes', autenticarJWT, prestamoRelacionadoController.listarVigentes);

router.get('/:id', autenticarJWT, checkPermission('prestamoRelacionado', 'ver'), prestamoRelacionadoController.obtenerPorId);

// Asientos de apertura de un préstamo anterior al sistema (saldo inicial)
router.get('/:id/asientos', autenticarJWT, checkPermission('prestamoRelacionado', 'ver'), prestamoRelacionadoController.obtenerAsientos);

router.post('/:id/asientos', autenticarJWT, checkPermission('prestamoRelacionado', 'crear'), prestamoRelacionadoController.generarAsientoApertura);

router.delete('/:id/asientos', autenticarJWT, checkPermission('prestamoRelacionado', 'eliminar'), prestamoRelacionadoController.eliminarAsientos);

router.post('/', autenticarJWT, checkPermission('prestamoRelacionado', 'crear'), prestamoRelacionadoController.crear);

router.put('/:id', autenticarJWT, checkPermission('prestamoRelacionado', 'editar'), prestamoRelacionadoController.actualizar);

router.delete('/:id', autenticarJWT, checkPermission('prestamoRelacionado', 'eliminar'), prestamoRelacionadoController.eliminar);

export default router;
