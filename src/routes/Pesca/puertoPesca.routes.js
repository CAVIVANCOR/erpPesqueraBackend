import { Router } from 'express';
import * as puertoPescaController from '../../controllers/Pesca/puertoPesca.controller.js';

const router = Router();

// Rutas CRUD para PuertoPesca
// IMPORTANTE: Rutas específicas ANTES de rutas dinámicas
router.get('/activos', puertoPescaController.listarActivos); // Solo nacionales activos (DEFAULT)
router.get('/todos-activos', puertoPescaController.listarTodosActivos); // Todos los activos
router.get('/internacionales', puertoPescaController.listarInternacionales); // Solo internacionales
router.get('/zonas-disponibles', puertoPescaController.obtenerZonasDisponibles);
router.get('/', puertoPescaController.listar); // Todos (admin)
router.get('/:id', puertoPescaController.obtenerPorId);
router.post('/', puertoPescaController.crear);
router.put('/:id', puertoPescaController.actualizar);
router.delete('/:id', puertoPescaController.eliminar);

export default router;
