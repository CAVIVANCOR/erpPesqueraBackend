import express from 'express';
import multer from 'multer';
import path from 'path';
import * as transferenciaInternaController from '../../controllers/Tesoreria/transferenciaInterna.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * ════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE MULTER PARA VOUCHERS BANCARIOS
 * ════════════════════════════════════════════════════════════
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/vouchers/transferencias/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voucher-bancario-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

/**
 * ════════════════════════════════════════════════════════════
 * RUTAS: TRANSFERENCIA INTERNA
 * ════════════════════════════════════════════════════════════
 * 
 * Endpoints para gestión de transferencias entre cuentas propias con:
 * - Operaciones especializadas con correlativo
 * - 2 movimientos de caja (egreso + ingreso)
 * - Manejo de tipo de cambio
 * - ITF y comisiones
 * - Generación de vouchers
 */

// ════════════════════════════════════════════════════════════
// POST: PROCESAR TRANSFERENCIA INTERNA
// ════════════════════════════════════════════════════════════
router.post('/', autenticarJWT, transferenciaInternaController.procesarTransferenciaInterna);

// ════════════════════════════════════════════════════════════
// PATCH: ACTUALIZAR URL VOUCHER CONSOLIDADO
// ════════════════════════════════════════════════════════════
router.patch(
  '/:id/voucher-consolidado',
  autenticarJWT,
  transferenciaInternaController.actualizarUrlVoucherConsolidado
);

// ════════════════════════════════════════════════════════════
// PATCH: ACTUALIZAR URL VOUCHER INDIVIDUAL
// ════════════════════════════════════════════════════════════
router.patch(
  '/movimiento/:movimientoId/voucher-individual',
  autenticarJWT,
  transferenciaInternaController.actualizarUrlVoucherIndividual
);

// ════════════════════════════════════════════════════════════
// PUT: ACTUALIZAR URL VOUCHER CONTABLE
// ════════════════════════════════════════════════════════════
router.put(
  '/movimiento/:movimientoId/voucher-contable',
  autenticarJWT,
  transferenciaInternaController.actualizarUrlVoucherContable
);

// ════════════════════════════════════════════════════════════
// PATCH: ACTUALIZAR URL VOUCHER BANCARIO
// ════════════════════════════════════════════════════════════
router.patch(
  '/movimiento/:movimientoId/voucher-bancario',
  autenticarJWT,
  transferenciaInternaController.actualizarUrlVoucherBancario
);

// ════════════════════════════════════════════════════════════
// POST: SUBIR VOUCHER BANCARIO
// ════════════════════════════════════════════════════════════
router.post(
  '/upload-voucher',
  autenticarJWT,
  upload.single('voucher'),
  transferenciaInternaController.subirVoucherBancario
);

export default router;
