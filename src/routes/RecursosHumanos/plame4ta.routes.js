import { Router } from 'express';
import * as plame4taController from '../../controllers/RecursosHumanos/plame4ta.controller.js';

const router = Router();

router.get('/recibos', plame4taController.listarRecibos);
router.get('/archivos', plame4taController.generarArchivos);

export default router;
