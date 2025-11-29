// src/routes/ContratoServicio/detMovsEntregaRendirContratoPdf.routes.js
// Rutas para upload y serving de PDFs de Movimientos de Entrega a Rendir de Contratos
// Patrón profesional replicado EXACTAMENTE de contratoServicioPdf.routes.js

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../../config/prismaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configuración de multer para PDFs de comprobantes de movimiento
const storageComprobante = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/det-movs-entrega-rendir-contrato/comprobantes-movimiento');
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const movimientoId = req.body.movimientoId;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    const filename = `comprobante-mov-contrato-${movimientoId || 'temp'}-${timestamp}${extension}`;
    cb(null, filename);
  }
});

const uploadComprobante = multer({
  storage: storageComprobante,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Configuración de multer para PDFs de comprobantes de operación MovCaja
const storageOperacion = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/det-movs-entrega-rendir-contrato/comprobantes-operacion');
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const movimientoId = req.body.movimientoId;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    const filename = `comprobante-operacion-contrato-${movimientoId || 'temp'}-${timestamp}${extension}`;
    cb(null, filename);
  }
});

const uploadOperacion = multer({
  storage: storageOperacion,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

/**
 * POST /upload-pdf-comprobante
 * Sube PDF del comprobante de movimiento (factura, boleta, recibo, etc.)
 * MISMO PATRÓN QUE contratoServicioPdf.routes.js
 */
router.post('/upload-pdf-comprobante', uploadComprobante.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se recibió ningún archivo',
        codigo: 'ERR_NO_FILE'
      });
    }
    
    const rutaRelativa = `/uploads/det-movs-entrega-rendir-contrato/comprobantes-movimiento/${req.file.filename}`;
    
    // Si se proporciona movimientoId, actualiza el registro
    const movimientoId = req.body.movimientoId;
    if (movimientoId) {
      try {
        await prisma.detMovsEntregaRendirContratoServicio.update({
          where: { id: BigInt(movimientoId) },
          data: { urlComprobanteMovimiento: rutaRelativa }
        });
      } catch (updateError) {
        console.error('Error actualizando movimiento:', updateError);
      }
    }
    
    res.json({
      mensaje: 'PDF del comprobante subido exitosamente',
      urlDocumento: rutaRelativa,
      archivo: req.file.filename,
      tamaño: req.file.size
    });
  } catch (error) {
    console.error('Error al subir PDF:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al subir PDF',
      codigo: 'ERR_UPLOAD_PDF'
    });
  }
});

/**
 * POST /upload-pdf-operacion
 * Sube PDF del comprobante de operación MovCaja (voucher, transferencia, etc.)
 * MISMO PATRÓN QUE contratoServicioPdf.routes.js
 */
router.post('/upload-pdf-operacion', uploadOperacion.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se recibió ningún archivo',
        codigo: 'ERR_NO_FILE'
      });
    }
    
    const rutaRelativa = `/uploads/det-movs-entrega-rendir-contrato/comprobantes-operacion/${req.file.filename}`;
    
    // Si se proporciona movimientoId, actualiza el registro
    const movimientoId = req.body.movimientoId;
    if (movimientoId) {
      try {
        await prisma.detMovsEntregaRendirContratoServicio.update({
          where: { id: BigInt(movimientoId) },
          data: { urlComprobanteOperacionMovCaja: rutaRelativa }
        });
      } catch (updateError) {
        console.error('Error actualizando movimiento:', updateError);
      }
    }
    
    res.json({
      mensaje: 'PDF del comprobante de operación subido exitosamente',
      urlDocumento: rutaRelativa,
      archivo: req.file.filename,
      tamaño: req.file.size
    });
  } catch (error) {
    console.error('Error al subir PDF:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al subir PDF',
      codigo: 'ERR_UPLOAD_PDF'
    });
  }
});

/**
 * GET /archivo-comprobante/:filename
 * Obtiene PDF del comprobante de movimiento
 */
router.get('/archivo-comprobante/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../../uploads/det-movs-entrega-rendir-contrato/comprobantes-movimiento', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error al obtener PDF:', error);
    res.status(500).json({ message: 'Error al obtener el archivo' });
  }
});

/**
 * GET /archivo-operacion/:filename
 * Obtiene PDF del comprobante de operación MovCaja
 */
router.get('/archivo-operacion/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../../uploads/det-movs-entrega-rendir-contrato/comprobantes-operacion', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error al obtener PDF:', error);
    res.status(500).json({ message: 'Error al obtener el archivo' });
  }
});

export default router;