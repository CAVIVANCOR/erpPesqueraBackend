import { Router } from 'express';
import * as estadoMultiFuncionController from '../../controllers/Maestros/estadoMultiFuncion.controller.js';

const router = Router();

// Rutas CRUD para EstadoMultiFuncion
// IMPORTANTE: Las rutas específicas DEBEN ir ANTES de las rutas con parámetros dinámicos (:id)
router.get('/', estadoMultiFuncionController.listar);
router.get('/productos', estadoMultiFuncionController.listarParaProductos);
router.get('/embarcaciones', estadoMultiFuncionController.listarParaEmbarcaciones);
router.get('/temporada-pesca', estadoMultiFuncionController.listarParaTemporadaPesca);
router.get('/faena-pesca', estadoMultiFuncionController.listarParaFaenaPesca);
router.get('/faena-pesca-consumo', estadoMultiFuncionController.listarParaFaenaPescaConsumo);
// La ruta con :id DEBE ir al final
router.get('/:id', estadoMultiFuncionController.obtenerPorId);
router.post('/', estadoMultiFuncionController.crear);
router.put('/:id', estadoMultiFuncionController.actualizar);
router.delete('/:id', estadoMultiFuncionController.eliminar);

export default router;