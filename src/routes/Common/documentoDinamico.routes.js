import { Router } from 'express';
import * as documentoDinamicoController from '../../controllers/Common/documentoDinamico.controller.js';

const router = Router();

// Rutas para DocumentoDinamico
router.get('/:modeloNombre', documentoDinamicoController.obtenerDocumentos);

export default router;