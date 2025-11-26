// src/routes/ContratoServicio/contratoServicioPdf.routes.js
// Rutas para upload y serving de PDFs de Contratos de Servicio
// Patrón profesional replicado de OTMantenimiento

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../../config/prismaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configuración de multer para almacenamiento de PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/contratos-servicio');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const contratoServicioId = req.body.contratoServicioId;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    const filename = `contrato-servicio-${contratoServicioId}-${timestamp}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
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
 * POST /upload-pdf
 * Sube PDF del contrato de servicio (usado por DocumentoCapture)
 */
router.post('/upload-pdf', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se recibió ningún archivo',
        codigo: 'ERR_NO_FILE'
      });
    }
    
    const rutaRelativa = `/uploads/contratos-servicio/${req.file.filename}`;
    
    // Si se proporciona contratoServicioId, actualiza el registro
    const contratoServicioId = req.body.contratoServicioId;
    if (contratoServicioId) {
      try {
        await prisma.contratoServicio.update({
          where: { id: BigInt(contratoServicioId) },
          data: { urlContratoPdf: rutaRelativa }
        });
      } catch (updateError) {
        console.error('Error actualizando contrato:', updateError);
      }
    }
    
    res.json({
      mensaje: 'PDF del contrato subido exitosamente',
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
 * POST /upload-contrato
 * Sube PDF del contrato de servicio (método alternativo)
 */
router.post('/upload-contrato', upload.single('pdf'), async (req, res) => {
  try {
    const { contratoServicioId } = req.body;
    
    if (!contratoServicioId) {
      return res.status(400).json({ message: 'Se requiere contratoServicioId' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }
    
    const url = `/uploads/contratos-servicio/${req.file.filename}`;
    
    // Actualizar en la base de datos
    await prisma.contratoServicio.update({
      where: { id: BigInt(contratoServicioId) },
      data: { urlContratoPdf: url }
    });
    
    res.json({
      message: 'PDF subido correctamente',
      url: url,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error al subir PDF:', error);
    res.status(500).json({ message: 'Error al subir el archivo' });
  }
});

/**
 * GET /archivo-contrato/:filename
 * Obtiene PDF del contrato de servicio
 */
router.get('/archivo-contrato/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../../uploads/contratos-servicio', filename);
    
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
 * DELETE /:contratoServicioId/contrato
 * Elimina PDF del contrato de servicio
 */
router.delete('/:contratoServicioId/contrato', async (req, res) => {
  try {
    const { contratoServicioId } = req.params;
    
    const contrato = await prisma.contratoServicio.findUnique({
      where: { id: BigInt(contratoServicioId) }
    });
    
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato no encontrado' });
    }
    
    // Eliminar archivo físico si existe
    if (contrato.urlContratoPdf) {
      const filename = path.basename(contrato.urlContratoPdf);
      const filePath = path.join(__dirname, '../../../uploads/contratos-servicio', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Actualizar base de datos
    await prisma.contratoServicio.update({
      where: { id: BigInt(contratoServicioId) },
      data: { urlContratoPdf: null }
    });
    
    res.json({ message: 'PDF eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar PDF:', error);
    res.status(500).json({ message: 'Error al eliminar el archivo' });
  }
});

export default router;
