// c:\Proyectos\megui\erp\erp-pesquera-backend\src\routes\FlujoCaja\movimientoCaja.routes.js
import express from 'express';
import movimientoCajaController, { 
  subirComprobante, 
  subirDocumento, 
  servirArchivoComprobante, 
  servirArchivoDocumento 
} from '../../controllers/FlujoCaja/movimientoCaja.controller.js';

const router = express.Router();

// Rutas de upload de PDFs (deben ir ANTES de las rutas con parámetros)
router.post('/upload-comprobante', subirComprobante);
router.post('/upload-documento', subirDocumento);

// Rutas para servir archivos (protegidas con JWT por el middleware global)
router.get('/archivo-comprobante/*', servirArchivoComprobante);
router.get('/archivo-documento/*', servirArchivoDocumento);

// Rutas CRUD básicas
router.get('/', movimientoCajaController.listar);
router.get('/:id', movimientoCajaController.obtenerPorId);
router.post('/', movimientoCajaController.crear);
router.put('/:id', movimientoCajaController.actualizar);
router.delete('/:id', movimientoCajaController.eliminar);

// Ruta de validación
router.post('/:id/validar', movimientoCajaController.validarMovimiento);

export default router;