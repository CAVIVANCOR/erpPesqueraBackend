import { Router } from 'express';
import * as precioEntidadController from '../../controllers/Maestros/precioEntidad.controller.js';

const router = Router();

// Rutas CRUD para PrecioEntidad
router.get('/', precioEntidadController.listar);
router.get('/entidad/:entidadComercialId', precioEntidadController.obtenerPorEntidad);
router.get('/especial/:entidadComercialId/:productoId', precioEntidadController.obtenerPrecioEspecialActivo);
router.get('/precio-vigente', precioEntidadController.obtenerPrecioVigente);
router.get('/precio-venta-vigente', precioEntidadController.obtenerPrecioVentaVigente);
router.get('/combustible', precioEntidadController.obtenerPrecioCombustibleVigente); // ANTES de /:id
router.get('/:id', precioEntidadController.obtenerPorId); // DESPUÉS de rutas específicas
router.post('/', precioEntidadController.crear);
router.put('/:id', precioEntidadController.actualizar);
router.delete('/:id', precioEntidadController.eliminar);

export default router;