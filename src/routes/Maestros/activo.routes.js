import { Router } from 'express';
import * as activoController from '../../controllers/Maestros/activo.controller.js';

const router = Router();

// Rutas CRUD para Activo
router.get('/', activoController.listar);
router.get('/vehiculos-por-ruc/:ruc', activoController.obtenerVehiculosPorRuc);
router.get('/por-empresa-tipo/:empresaId/:tipoId', activoController.obtenerPorEmpresaYTipo);
router.get('/:id', activoController.obtenerPorId);
router.post('/', activoController.crear);
router.put('/:id', activoController.actualizar);
router.delete('/:id', activoController.eliminar);

export default router;
