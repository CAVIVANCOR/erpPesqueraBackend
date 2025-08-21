/**
 * Rutas para manejo de fotos de embarcación
 * 
 * Endpoints:
 * - POST /subir/:embarcacionId - Subir foto de embarcación
 * - GET /archivo/:filename - Servir fotos con autenticación JWT
 * 
 * @author ERP Megui
 * @version 1.0.0
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';

const router = express.Router();

// Carpeta destino para fotos de embarcación (ruta absoluta desde la raíz del proyecto)
const FOTO_DIR = path.join(process.cwd(), 'uploads', 'embarcaciones');
if (!fs.existsSync(FOTO_DIR)) {
  fs.mkdirSync(FOTO_DIR, { recursive: true });
}

// Configuración de Multer para guardar con nombre profesional
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FOTO_DIR);
  },
  filename: function (req, file, cb) {
    // Guarda como foto-<productoId>.<extensión>
    const ext = path.extname(file.originalname);
    cb(null, `foto-${req.params.id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB máximo
  fileFilter: (req, file, cb) => {
    // Solo imágenes JPG o PNG
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Solo se permiten archivos JPG o PNG.'));
    }
    cb(null, true);
  }
});


/**
 * POST /api/embarcacion-foto/:id/foto
 * Sube una foto para una embarcación
 */
router.post('/:id/foto', upload.single('foto'), async (req, res) => {
  try {
    const EmbarcacionId = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const newFilename = req.file.filename;

    // Actualizar el campo urlFotoEmbarcacion en la embarcación
    const embarcacion = await prisma.embarcacion.update({
      where: { id: EmbarcacionId },
      data: { urlFotoEmbarcacion: newFilename }
    });

    res.json({
      message: 'Foto de embarcación subida correctamente.',
      foto: newFilename,
      url: `/public/embarcaciones/${newFilename}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir foto de embarcación.', details: err.message });
  }
});

export default router;
