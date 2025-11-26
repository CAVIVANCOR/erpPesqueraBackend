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
    const tipo = req.body.tipo || 'fotos-antes';
    let uploadPath;
    
    if (tipo === 'fotos-despues') {
      uploadPath = path.join(__dirname, '../../../uploads/ot-mantenimiento/fotos-despues');
    } else if (tipo === 'orden-trabajo') {
      uploadPath = path.join(__dirname, '../../../uploads/ot-mantenimiento/orden-trabajo');
    } else {
      uploadPath = path.join(__dirname, '../../../uploads/ot-mantenimiento/fotos-antes');
    }
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const otMantenimientoId = req.body.otMantenimientoId;
    const tipo = req.body.tipo || 'fotos-antes';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    let prefix = 'fotos-antes';
    if (tipo === 'fotos-despues') prefix = 'fotos-despues';
    if (tipo === 'orden-trabajo') prefix = 'orden-trabajo';
    
    const filename = `${prefix}-ot-${otMantenimientoId}-${timestamp}${extension}`;
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
 * POST /upload-fotos-antes
 * Sube PDF de fotos antes del mantenimiento
 */
router.post('/upload-fotos-antes', upload.single('pdf'), async (req, res) => {
  try {
    const { otMantenimientoId } = req.body;
    
    if (!otMantenimientoId) {
      return res.status(400).json({ message: 'Se requiere otMantenimientoId' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }
    
    const url = `/uploads/ot-mantenimiento/fotos-antes/${req.file.filename}`;
    
    // Actualizar en la base de datos
    await prisma.oTMantenimiento.update({
      where: { id: BigInt(otMantenimientoId) },
      data: { urlFotosAntesPdf: url }
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
 * POST /upload-fotos-despues
 * Sube PDF de fotos después del mantenimiento
 */
router.post('/upload-fotos-despues', upload.single('pdf'), async (req, res) => {
  try {
    const { otMantenimientoId } = req.body;
    
    if (!otMantenimientoId) {
      return res.status(400).json({ message: 'Se requiere otMantenimientoId' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }
    
    const url = `/uploads/ot-mantenimiento/fotos-despues/${req.file.filename}`;
    
    // Actualizar en la base de datos
    await prisma.oTMantenimiento.update({
      where: { id: BigInt(otMantenimientoId) },
      data: { urlFotosDespuesPdf: url }
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
 * POST /upload-orden-trabajo
 * Sube PDF de orden de trabajo
 */
router.post('/upload-orden-trabajo', upload.single('pdf'), async (req, res) => {
  try {
    const { otMantenimientoId } = req.body;
    
    if (!otMantenimientoId) {
      return res.status(400).json({ message: 'Se requiere otMantenimientoId' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }
    
    const url = `/uploads/ot-mantenimiento/orden-trabajo/${req.file.filename}`;
    
    // Actualizar en la base de datos
    await prisma.oTMantenimiento.update({
      where: { id: BigInt(otMantenimientoId) },
      data: { urlOrdenTrabajoPdf: url }
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
 * GET /archivo-fotos-antes/:filename
 * Obtiene PDF de fotos antes
 */
router.get('/archivo-fotos-antes/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../../uploads/ot-mantenimiento/fotos-antes', filename);
    
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
 * GET /archivo-fotos-despues/:filename
 * Obtiene PDF de fotos después
 */
router.get('/archivo-fotos-despues/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../../uploads/ot-mantenimiento/fotos-despues', filename);
    
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
 * GET /archivo-orden-trabajo/:filename
 * Obtiene PDF de orden de trabajo
 */
router.get('/archivo-orden-trabajo/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../../uploads/ot-mantenimiento/orden-trabajo', filename);
    
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
 * DELETE /:otMantenimientoId/fotos-antes
 * Elimina PDF de fotos antes
 */
router.delete('/:otMantenimientoId/fotos-antes', async (req, res) => {
  try {
    const { otMantenimientoId } = req.params;
    
    const ot = await prisma.oTMantenimiento.findUnique({
      where: { id: BigInt(otMantenimientoId) }
    });
    
    if (!ot) {
      return res.status(404).json({ message: 'OT no encontrada' });
    }
    
    // Eliminar archivo físico si existe
    if (ot.urlFotosAntesPdf) {
      const filename = path.basename(ot.urlFotosAntesPdf);
      const filePath = path.join(__dirname, '../../../uploads/ot-mantenimiento/fotos-antes', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Actualizar base de datos
    await prisma.oTMantenimiento.update({
      where: { id: BigInt(otMantenimientoId) },
      data: { urlFotosAntesPdf: null }
    });
    
    res.json({ message: 'PDF eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar PDF:', error);
    res.status(500).json({ message: 'Error al eliminar el archivo' });
  }
});

/**
 * DELETE /:otMantenimientoId/fotos-despues
 * Elimina PDF de fotos después
 */
router.delete('/:otMantenimientoId/fotos-despues', async (req, res) => {
  try {
    const { otMantenimientoId } = req.params;
    
    const ot = await prisma.oTMantenimiento.findUnique({
      where: { id: BigInt(otMantenimientoId) }
    });
    
    if (!ot) {
      return res.status(404).json({ message: 'OT no encontrada' });
    }
    
    // Eliminar archivo físico si existe
    if (ot.urlFotosDespuesPdf) {
      const filename = path.basename(ot.urlFotosDespuesPdf);
      const filePath = path.join(__dirname, '../../../uploads/ot-mantenimiento/fotos-despues', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Actualizar base de datos
    await prisma.oTMantenimiento.update({
      where: { id: BigInt(otMantenimientoId) },
      data: { urlFotosDespuesPdf: null }
    });
    
    res.json({ message: 'PDF eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar PDF:', error);
    res.status(500).json({ message: 'Error al eliminar el archivo' });
  }
});

/**
 * DELETE /:otMantenimientoId/orden-trabajo
 * Elimina PDF de orden de trabajo
 */
router.delete('/:otMantenimientoId/orden-trabajo', async (req, res) => {
  try {
    const { otMantenimientoId } = req.params;
    
    const ot = await prisma.oTMantenimiento.findUnique({
      where: { id: BigInt(otMantenimientoId) }
    });
    
    if (!ot) {
      return res.status(404).json({ message: 'OT no encontrada' });
    }
    
    // Eliminar archivo físico si existe
    if (ot.urlOrdenTrabajoPdf) {
      const filename = path.basename(ot.urlOrdenTrabajoPdf);
      const filePath = path.join(__dirname, '../../../uploads/ot-mantenimiento/orden-trabajo', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Actualizar base de datos
    await prisma.oTMantenimiento.update({
      where: { id: BigInt(otMantenimientoId) },
      data: { urlOrdenTrabajoPdf: null }
    });
    
    res.json({ message: 'PDF eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar PDF:', error);
    res.status(500).json({ message: 'Error al eliminar el archivo' });
  }
});

export default router;
