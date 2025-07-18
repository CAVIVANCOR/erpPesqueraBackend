/**
 * Rutas de manejo de foto para Personal en el ERP Megui.
 * Permite subir y servir archivos de foto usando Multer y Express.
 * Documentado profesionalmente en español técnico.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';

const router = express.Router();

// Carpeta destino para fotos de personal (ruta absoluta desde la raíz del proyecto)
const FOTO_DIR = path.join(process.cwd(), 'uploads', 'personal');
if (!fs.existsSync(FOTO_DIR)) {
  fs.mkdirSync(FOTO_DIR, { recursive: true });
}

// Configuración de Multer para guardar con nombre profesional
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FOTO_DIR);
  },
  filename: function (req, file, cb) {
    // Guarda como foto-<personalId>.<extensión>
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
 * POST /api/personal/:id/foto
 * Sube y asocia una foto al personal indicado.
 * Actualiza el campo urlFotoPersona en la base de datos con el nombre del archivo.
 */
router.post('/:id/foto', upload.single('foto'), async (req, res) => {
  try {
    const personalId = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo.' });
    }
    // Actualiza el campo urlFotoPersona en el personal
    const persona = await prisma.personal.update({
      where: { id: personalId },
      data: { urlFotoPersona: req.file.filename }
    });
    res.json({
      message: 'Foto subida correctamente.',
      foto: req.file.filename,
      url: `/public/personal/${req.file.filename}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir foto.', details: err.message });
  }
});

export default router;
