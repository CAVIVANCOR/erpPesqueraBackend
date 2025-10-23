import { Router } from 'express';
import * as cotizacionProveedorController from '../../controllers/Compras/cotizacionProveedor.controller.js';

const router = Router();

// Rutas CRUD para CotizacionProveedor
router.get('/', cotizacionProveedorController.listar);
router.get('/:id', cotizacionProveedorController.obtenerPorId);
router.post('/', cotizacionProveedorController.crear);
router.put('/:id', cotizacionProveedorController.actualizar);
router.delete('/:id', cotizacionProveedorController.eliminar);

// Ruta para seleccionar cotización ganadora
router.post('/:id/seleccionar', cotizacionProveedorController.seleccionar);

export default router;