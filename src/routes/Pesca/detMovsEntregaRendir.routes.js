import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as detMovsEntregaRendirController from '../../controllers/Pesca/detMovsEntregaRendir.controller.js';

const router = Router();

// Carpeta base para comprobantes de movimientos de entrega a rendir
const COMPROBANTES_DET_MOVS_DIR = path.join(process.cwd(), 'uploads', 'comprobantes-det-movs-entrega-rendir');
if (!fs.existsSync(COMPROBANTES_DET_MOVS_DIR)) {
  fs.mkdirSync(COMPROBANTES_DET_MOVS_DIR, { recursive: true });
}

// Configuración de Multer para guardar PDFs de comprobantes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // Organiza por año/mes para mejor gestión de archivos
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      // Construir ruta paso a paso
      const baseDir = COMPROBANTES_DET_MOVS_DIR;
      const yearDir = path.join(baseDir, String(year));
      const finalDir = path.join(yearDir, month);
      
      // Crear directorios paso a paso
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      
      if (!fs.existsSync(yearDir)) {
        fs.mkdirSync(yearDir, { recursive: true });
      }
      
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }
      
      // Verificar que el directorio final existe
      if (fs.existsSync(finalDir)) {
        cb(null, finalDir);
      } else {
        console.error(`❌ Error: No se pudo crear el directorio ${finalDir}`);
        cb(new Error(`No se pudo crear el directorio ${finalDir}`), null);
      }
      
    } catch (error) {
      console.error(`❌ Error en destination:`, error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    try {
      // Formato: {ID}-{dia}{mes}{año}.pdf
      const now = new Date();
      const dia = String(now.getDate()).padStart(2, '0');
      const mes = String(now.getMonth() + 1).padStart(2, '0');
      const año = now.getFullYear();
      
      // Generar ID único basado en timestamp
      const id = Date.now();
      const ext = path.extname(file.originalname) || '.pdf';
      
      const fileName = `${id}-${dia}${mes}${año}${ext}`;
      cb(null, fileName);
      
    } catch (error) {
      console.error(`❌ Error en filename:`, error);
      cb(error, null);
    }
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Permite PDFs e imágenes (para conversión posterior)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP).'));
    }
  },
  limits: { fileSize: 15 * 1024 * 1024 } // Máximo 15MB
});

// Rutas CRUD para DetMovsEntregaRendir
router.get('/', detMovsEntregaRendirController.listar);
router.get('/:id', detMovsEntregaRendirController.obtenerPorId);
router.post('/', detMovsEntregaRendirController.crear);
router.put('/:id', detMovsEntregaRendirController.actualizar);
router.delete('/:id', detMovsEntregaRendirController.eliminar);

/**
 * POST /api/det-movs-entrega-rendir/upload
 * Sube un PDF generado a partir de fotos de comprobantes de movimientos.
 * Retorna la URL relativa para guardar en DetMovsEntregaRendir.urlComprobanteMovimiento
 */
router.post('/upload', autenticarJWT, (req, res, next) => {
  upload.single('documento')(req, res, function (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        mensaje: 'El archivo supera el tamaño máximo permitido (15MB).',
        codigo: 'ERR_TAMANO_ARCHIVO'
      });
    } else if (err) {
      return res.status(400).json({
        mensaje: err.message,
        codigo: 'ERR_MULTER'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { detMovsEntregaRendirId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se subió ningún archivo.',
        codigo: 'ERR_NO_ARCHIVO'
      });
    }

    // Construye la ruta relativa para la BD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const rutaRelativa = path.join(
      '/uploads/comprobantes-det-movs-entrega-rendir',
      String(year),
      month,
      req.file.filename
    ).replace(/\\/g, '/'); // Normaliza para Windows/Linux

    // Si se proporciona detMovsEntregaRendirId, actualiza el registro
    if (detMovsEntregaRendirId) {
      await prisma.detMovsEntregaRendir.update({
        where: { id: BigInt(detMovsEntregaRendirId) },
        data: { urlComprobanteMovimiento: rutaRelativa }
      });
    }

    // Respuesta exitosa con la URL para el frontend
    res.json({ 
      success: true, 
      urlDocumento: rutaRelativa,
      nombreArchivo: req.file.filename,
      mensaje: 'Comprobante de movimiento subido exitosamente.'
    });

  } catch (error) {
    console.error('[ERP DET MOVS ENTREGA RENDIR] Error al subir comprobante:', error);
    res.status(500).json({ 
      error: 'Error interno al guardar el comprobante de movimiento.',
      codigo: 'ERR_SERVIDOR'
    });
  }
});

/**
 * POST /api/det-movs-entrega-rendir/upload-comprobante-operacion
 * Sube un PDF de comprobante de operación de movimiento de caja.
 * Retorna la URL relativa para guardar en DetMovsEntregaRendir.urlComprobanteOperacionMovCaja
 */
router.post('/upload-comprobante-operacion', autenticarJWT, (req, res, next) => {
  upload.single('documento')(req, res, function (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        mensaje: 'El archivo supera el tamaño máximo permitido (15MB).',
        codigo: 'ERR_TAMANO_ARCHIVO'
      });
    } else if (err) {
      return res.status(400).json({
        mensaje: err.message,
        codigo: 'ERR_MULTER'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { detMovsEntregaRendirId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se subió ningún archivo.',
        codigo: 'ERR_NO_ARCHIVO'
      });
    }

    // Construye la ruta relativa para la BD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const rutaRelativa = path.join(
      '/uploads/comprobantes-det-movs-entrega-rendir',
      String(year),
      month,
      req.file.filename
    ).replace(/\\/g, '/'); // Normaliza para Windows/Linux

    // Si se proporciona detMovsEntregaRendirId, actualiza el registro
    if (detMovsEntregaRendirId) {
      await prisma.detMovsEntregaRendir.update({
        where: { id: BigInt(detMovsEntregaRendirId) },
        data: { urlComprobanteOperacionMovCaja: rutaRelativa }
      });
    }

    // Respuesta exitosa con la URL para el frontend
    res.json({ 
      success: true, 
      urlDocumento: rutaRelativa,
      nombreArchivo: req.file.filename,
      mensaje: 'Comprobante de operación subido exitosamente.'
    });

  } catch (error) {
    console.error('[ERP DET MOVS ENTREGA RENDIR] Error al subir comprobante de operación:', error);
    res.status(500).json({ 
      error: 'Error interno al guardar el comprobante de operación.',
      codigo: 'ERR_SERVIDOR'
    });
  }
});

/**
 * GET /api/det-movs-entrega-rendir/archivo/*
 * Sirve archivos PDF de comprobantes con autenticación JWT
 */
router.get('/archivo/*', autenticarJWT, (req, res) => {
  try {
    // Extraer la ruta del archivo desde la URL
    const rutaArchivo = req.params[0]; // Captura todo después de /archivo/
    
    if (!rutaArchivo) {
      return res.status(400).json({
        error: 'Ruta de archivo no especificada',
        codigo: 'ERR_RUTA_VACIA'
      });
    }

    // Construir ruta completa del archivo
    const rutaCompleta = path.join(process.cwd(), 'uploads', 'comprobantes-det-movs-entrega-rendir', rutaArchivo);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({
        error: 'Comprobante no encontrado',
        codigo: 'ERR_ARCHIVO_NO_ENCONTRADO',
        ruta: rutaArchivo
      });
    }

    // Verificar que es un archivo PDF
    const extension = path.extname(rutaCompleta).toLowerCase();
    if (extension !== '.pdf') {
      return res.status(400).json({
        error: 'Solo se permiten archivos PDF',
        codigo: 'ERR_TIPO_ARCHIVO'
      });
    }

    // Configurar headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline'); // Para mostrar en navegador    
    
    // Enviar archivo
    res.sendFile(rutaCompleta, (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Error interno del servidor',
            codigo: 'ERR_ENVIO_ARCHIVO'
          });
        }
      }
    });

  } catch (error) {
    console.error('Error sirviendo comprobante de movimiento:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      codigo: 'ERR_SERVIDOR',
      detalle: error.message
    });
  }
});

export default router;
