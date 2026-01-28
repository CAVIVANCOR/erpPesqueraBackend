/**
 * Rutas de manejo de PDFs de liquidación para EntregaARendirPCompras en el ERP Megui.
 * Permite subir y servir archivos PDF de liquidaciones usando Multer y Express.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';

const router = express.Router();

const ENTREGAS_RENDIR_COMPRAS_DIR = path.join(process.cwd(), 'uploads', 'entregas-rendir-compras');
if (!fs.existsSync(ENTREGAS_RENDIR_COMPRAS_DIR)) {
  fs.mkdirSync(ENTREGAS_RENDIR_COMPRAS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const baseDir = ENTREGAS_RENDIR_COMPRAS_DIR;
      const yearDir = path.join(baseDir, String(year));
      const finalDir = path.join(yearDir, month);
      
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      
      if (!fs.existsSync(yearDir)) {
        fs.mkdirSync(yearDir, { recursive: true });
      }
      
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }
      
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
      const { entregaId } = req.body;
      const ext = path.extname(file.originalname) || '.pdf';
      
      if (entregaId) {
        const fileName = `LIQUIDACION-COMPRAS-${entregaId}${ext}`;
        cb(null, fileName);
      } else {
        const now = new Date();
        const dia = String(now.getDate()).padStart(2, '0');
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const año = now.getFullYear();
        const id = Date.now();
        const fileName = `${id}-${dia}${mes}${año}${ext}`;
        cb(null, fileName);
      }
      
    } catch (error) {
      console.error(`❌ Error en filename:`, error);
      cb(error, null);
    }
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
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
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.post('/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    const { entregaId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se subió ningún archivo.',
        codigo: 'ERR_NO_ARCHIVO'
      });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const rutaRelativa = path.join(
      '/uploads/entregas-rendir-compras',
      String(year),
      month,
      req.file.filename
    ).replace(/\\/g, '/');

    if (entregaId) {
      await prisma.entregaARendirPCompras.update({
        where: { id: BigInt(entregaId) },
        data: { urlLiquidacionPdf: rutaRelativa }
      });
    }

    res.json({ 
      success: true, 
      urlPdf: rutaRelativa,
      url: rutaRelativa,
      nombreArchivo: req.file.filename,
      mensaje: 'PDF de liquidación de compras subido exitosamente.'
    });

  } catch (error) {
    console.error('[ERP ENTREGA RENDIR COMPRAS] Error al subir PDF:', error);
    res.status(500).json({ 
      error: 'Error interno al guardar el PDF de liquidación.',
      codigo: 'ERR_SERVIDOR'
    });
  }
});

router.get('/archivo/*', async (req, res) => {
  try {
    const rutaArchivo = req.params[0];
    
    if (!rutaArchivo) {
      return res.status(400).json({
        error: 'Ruta de archivo no especificada',
        codigo: 'ERR_RUTA_VACIA'
      });
    }

    const rutaCompleta = path.join(process.cwd(), 'uploads', 'entregas-rendir-compras', rutaArchivo);
    
    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({
        error: 'PDF de liquidación no encontrado',
        codigo: 'ERR_ARCHIVO_NO_ENCONTRADO',
        ruta: rutaArchivo
      });
    }

    const extension = path.extname(rutaCompleta).toLowerCase();
    if (extension !== '.pdf') {
      return res.status(400).json({
        error: 'Solo se permiten archivos PDF',
        codigo: 'ERR_TIPO_ARCHIVO'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    
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
    console.error('Error sirviendo PDF de liquidación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      codigo: 'ERR_SERVIDOR',
      detalle: error.message
    });
  }
});

export default router;