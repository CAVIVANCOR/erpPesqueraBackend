import { Router } from 'express';
import { 
  descargarComprasSIRE, 
  importarDocumentos, 
  generarPDFIndividual,
  descargarPDFParaOrdenCompra,
  crearOCIndividual,
  crearOCMasivo
} from '../../controllers/SIRE/sireCompras.controller.js';
import * as sireComprasController from '../../controllers/SIRE/sireCompras.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para SIRE Compras (SUNAT)
 * Ruta del submódulo: 'sireCompras'
 */

// Descargar propuesta de compras desde SUNAT SIRE
router.post(
  '/descargar',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  sireComprasController.descargarComprasSIRE
);

// Importar documentos seleccionados como OrdenCompra
router.post(
  '/importar',
  autenticarJWT,
  checkPermission('ordenCompra', 'crear'),
  sireComprasController.importarDocumentos
);

// Descargar XMLs masivamente para un periodo
router.post(
  '/descargar-xmls',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  sireComprasController.descargarXMLsMasivo
);

// Generar PDF individual por CAR
router.post(
  '/generar-pdf-individual',
  autenticarJWT,
  checkPermission('ordenCompra', 'ver'),
  sireComprasController.generarPDFIndividual
);

// Descargar PDF de SUNAT y guardarlo en el sistema PDF V2 para Orden de Compra
router.post(
  '/descargar-pdf-orden-compra',
  autenticarJWT,
  checkPermission('ordenCompra', 'editar'),
  sireComprasController.descargarPDFParaOrdenCompra
);

// Crear Orden de Compra individual desde SIRE
router.post(
  '/crear-oc-individual',
  autenticarJWT,
  checkPermission('ordenCompra', 'crear'),
  sireComprasController.crearOCIndividual
);

// Crear Órdenes de Compra masivo desde SIRE
router.post(
  '/crear-oc-masivo',
  autenticarJWT,
  checkPermission('ordenCompra', 'crear'),
  sireComprasController.crearOCMasivo
);

export default router;
