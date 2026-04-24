import { Router } from 'express';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as faenaPescaController from '../../controllers/Pesca/faenaPesca.controller.js';

const router = Router();

// Rutas CRUD para FaenaPesca
router.get('/', faenaPescaController.listar);
router.get('/:id', faenaPescaController.obtenerPorId);
router.post('/', faenaPescaController.crear);
router.put('/:id', faenaPescaController.actualizar);
router.delete('/:id', faenaPescaController.eliminar);
// Ruta para recalcular totales de temporada
router.post('/temporada/:temporadaId/recalcular-totales', faenaPescaController.recalcularTotalesTemporada);
// Ruta para crear faena completa con todos sus registros asociados
router.post('/crear-completa', faenaPescaController.crearFaenaCompleta);

// Ruta para finalizar faena con movimiento de almacén
router.post('/:id/finalizar-con-almacen', faenaPescaController.finalizarFaenaConMovimientoAlmacen);

// Rutas para upload de PDFs (protegidas con JWT)
router.post('/upload-reporte-calas', autenticarJWT, faenaPescaController.uploadReporteCalas[0], faenaPescaController.uploadReporteCalas[1]);
router.post('/upload-declaracion-desembarque', autenticarJWT, faenaPescaController.uploadDeclaracionDesembarque[0], faenaPescaController.uploadDeclaracionDesembarque[1]);

// Rutas para servir archivos (protegidas con JWT, como detMovsEntregaRendir)
router.get('/archivo-reporte-calas/*', autenticarJWT, faenaPescaController.servirArchivoReporteCalas);
router.get('/archivo-declaracion-desembarque/*', autenticarJWT, faenaPescaController.servirArchivoDeclaracionDesembarque);

export default router;
