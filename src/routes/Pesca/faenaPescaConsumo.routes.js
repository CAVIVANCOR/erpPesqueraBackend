import { Router } from 'express';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as faenaPescaConsumoController from '../../controllers/Pesca/faenaPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para FaenaPescaConsumo
router.get('/', faenaPescaConsumoController.listar);
router.get('/:id', faenaPescaConsumoController.obtenerPorId);
router.post('/', faenaPescaConsumoController.crear);
router.put('/:id', faenaPescaConsumoController.actualizar);
router.delete('/:id', faenaPescaConsumoController.eliminar);

// Ruta para upload de informe (protegida con JWT)
router.post('/upload-informe-faena', autenticarJWT, faenaPescaConsumoController.uploadInformeFaena[0], faenaPescaConsumoController.uploadInformeFaena[1]);

// Ruta para servir archivos (protegida con JWT)
router.get('/archivo-informe-faena/*', autenticarJWT, faenaPescaConsumoController.servirArchivoInformeFaena);

export default router;