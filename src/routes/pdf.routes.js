/**
 * pdf.routes.js - Rutas unificadas para sistema PDF V2
 */

import { Router } from 'express';
import multer from 'multer';
import * as pdfController from '../controllers/pdf/pdfController.js';
import { autenticarJWT } from '../middlewares/authMiddleware.js';

const router = Router();

// Configuración de multer para manejo de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB máximo
  }
});

// Caso 1: Upload de PDF único (generado)
router.post('/upload', autenticarJWT, upload.single('file'), pdfController.uploadSingle);

// Caso 2: Merge de múltiples archivos
router.post('/merge', autenticarJWT, upload.array('files', 50), pdfController.mergeMultiple);

// Servir archivo PDF (sin autenticación, como el sistema antiguo)
router.get('/:moduleName/*', pdfController.getFile);

// Eliminar archivo
router.delete('/:moduleName/:fileName', autenticarJWT, pdfController.deleteFile);

export default router;
