import { Router } from 'express';
import { descargarPDFParaPreFactura } from '../../controllers/Ventas/ventas.controller.js';

const router = Router();

/**
 * Rutas para Ventas (Descargar PDFs SUNAT)
 * Ruta del submódulo: 'ventas'
 */

// Descargar PDF de SUNAT y guardarlo en el sistema PDF para Pre-Factura
router.post(
  '/descargar-pdf-pre-factura',
  descargarPDFParaPreFactura
);

export default router;
