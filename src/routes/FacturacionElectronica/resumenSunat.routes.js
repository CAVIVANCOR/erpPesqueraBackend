import { Router } from 'express';
import * as resumenSunatController from '../../controllers/FacturacionElectronica/resumenSunat.controller.js';

const router = Router();

// Solo lectura: los resúmenes (RC) y bajas (RA) los genera el proceso de facturación electrónica
router.get('/', resumenSunatController.listar);
router.get('/:id', resumenSunatController.obtenerPorId);

export default router;
