import { Router } from 'express';
import * as cotizacionProveedorController from '../../controllers/Compras/cotizacionProveedor.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.put('/detalle/:detalleId', cotizacionProveedorController.actualizarDetalle);
router.patch('/detalle/:detalleId/seleccionar', cotizacionProveedorController.marcarSeleccionadoParaOC);
router.post('/:id/producto-alternativo', cotizacionProveedorController.agregarProductoAlternativo);
router.delete('/detalle/:detalleId', cotizacionProveedorController.eliminarDetalle);

// Rutas CRUD para CotizacionProveedor
router.get('/', cotizacionProveedorController.listar);
router.get('/:id', cotizacionProveedorController.obtenerPorId);
router.post('/', cotizacionProveedorController.crear);
router.put('/:id', cotizacionProveedorController.actualizar);
router.delete('/:id', cotizacionProveedorController.eliminar);

export default router;