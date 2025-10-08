/**
 * Rutas de manejo de resoluciones PDF para NovedadPescaConsumo en el ERP Megui.
 * Permite subir y servir archivos PDF de resoluciones ministeriales usando Multer y Express.
 * Documentado profesionalmente en español técnico.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';

const router = express.Router();

// Carpeta destino para resoluciones de novedades (ruta absoluta desde la raíz del proyecto)
const RESOLUCION_DIR = path.join(process.cwd(), 'uploads', 'resoluciones-novedad');
if (!fs.existsSync(RESOLUCION_DIR)) {
  fs.mkdirSync(RESOLUCION_DIR, { recursive: true });
}

// Configuración de Multer para guardar con nombre profesional
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, RESOLUCION_DIR);
  },
  filename: function (req, file, cb) {
    // Guarda como resolucion-novedad-<novedadId>.<extensión>
    const ext = path.extname(file.originalname);
    const novedadId = req.body.novedadId || req.params.id || 'sin-id';
    cb(null, `resolucion-novedad-${novedadId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    // Solo archivos PDF
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF.'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/novedad-pesca-consumo-resolucion/upload
 * Sube una resolución PDF y la asocia a la novedad de pesca consumo.
 * Actualiza el campo urlResolucionPdf en la base de datos.
 */
router.post('/upload', upload.single('resolucionPdf'), async (req, res) => {
  try {
    const { novedadId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo.' });
    }

    if (!novedadId) {
      return res.status(400).json({ error: 'ID de la novedad es requerido.' });
    }

    // Renombrar archivo con el novedadId
    const oldPath = path.join(RESOLUCION_DIR, req.file.filename);
    const ext = path.extname(req.file.filename);
    const newFilename = `resolucion-novedad-${novedadId}${ext}`;
    const newPath = path.join(RESOLUCION_DIR, newFilename);
    fs.renameSync(oldPath, newPath);

    // Actualiza el campo urlResolucionPdf en la novedad
    const novedad = await prisma.novedadPescaConsumo.update({
      where: { id: BigInt(novedadId) },
      data: { urlResolucionPdf: `/uploads/resoluciones-novedad/${newFilename}` }
    });

    res.json({
      message: 'Resolución subida correctamente.',
      urlResolucionPdf: `/uploads/resoluciones-novedad/${newFilename}`,
      nombreArchivo: newFilename
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir resolución.', details: err.message });
  }
});

/**
 * GET /api/novedad-pesca-consumo-resolucion/archivo/:filename
 * Sirve archivos de resoluciones con autenticación JWT
 */
router.get('/archivo/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(RESOLUCION_DIR, filename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Configurar headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Enviar archivo
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Error al servir archivo', details: err.message });
  }
});

// Eliminar archivo PDF de resolución
router.delete('/delete/:novedadId', async (req, res) => {
  try {
    const { novedadId } = req.params;

    // Buscar la novedad
    const novedad = await prisma.novedadPescaConsumo.findUnique({
      where: { id: BigInt(novedadId) }
    });

    if (!novedad) {
      return res.status(404).json({
        error: 'Novedad no encontrada'
      });
    }

    // Si existe archivo, eliminarlo del sistema de archivos
    if (novedad.urlResolucionPdf) {
      const fileName = path.basename(novedad.urlResolucionPdf);
      const filePath = path.join(RESOLUCION_DIR, fileName);
      
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`No se pudo eliminar el archivo: ${filePath}`, error);
      }
    }

    // Actualizar la base de datos
    const novedadActualizada = await prisma.novedadPescaConsumo.update({
      where: { id: BigInt(novedadId) },
      data: { urlResolucionPdf: null }
    });

    res.json({
      message: 'Resolución PDF eliminada correctamente',
      novedad: novedadActualizada
    });

  } catch (error) {
    console.error('Error al eliminar resolución PDF:', error);
    res.status(500).json({
      error: 'Error interno del servidor al eliminar la resolución'
    });
  }
});

export default router;