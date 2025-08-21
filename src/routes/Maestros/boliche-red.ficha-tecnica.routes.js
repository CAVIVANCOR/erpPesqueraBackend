/**
 * Rutas de manejo de ficha técnica para Boliche Red en el ERP Megui.
 * Permite subir y servir archivos PDF de fichas técnicas usando Multer y Express.
 * Documentado profesionalmente en español técnico.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';

const router = express.Router();

// Carpeta destino para fichas técnicas de boliche red (ruta absoluta desde la raíz del proyecto)
const FICHA_TECNICA_DIR = path.join(process.cwd(), 'uploads', 'fichas-tecnicas');
if (!fs.existsSync(FICHA_TECNICA_DIR)) {
  fs.mkdirSync(FICHA_TECNICA_DIR, { recursive: true });
}

// Configuración de Multer para guardar con nombre profesional
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FICHA_TECNICA_DIR);
  },
  filename: function (req, file, cb) {
    // Guarda como boliche-red-<bolicheRedId>.<extensión>
    const ext = path.extname(file.originalname);
    const bolicheRedId = req.body.bolicheRedId || req.params.id || 'sin-id';
    cb(null, `boliche-red-${bolicheRedId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (req, file, cb) => {
    // Solo archivos PDF
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF.'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/boliche-red-ficha-tecnica/upload
 * Sube una ficha técnica PDF y la asocia al boliche red.
 * Actualiza el campo urlBolicheRedPdf en la base de datos.
 */
router.post('/upload', upload.single('bolicheRedPdf'), async (req, res) => {
  try {
    const { bolicheRedId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo.' });
    }

    if (!bolicheRedId) {
      return res.status(400).json({ error: 'ID del boliche red es requerido.' });
    }

    // Renombrar archivo con el bolicheRedId
    const oldPath = path.join(FICHA_TECNICA_DIR, req.file.filename);
    const ext = path.extname(req.file.filename);
    const newFilename = `boliche-red-${bolicheRedId}${ext}`;
    const newPath = path.join(FICHA_TECNICA_DIR, newFilename);
    fs.renameSync(oldPath, newPath);

    // Actualiza el campo urlBolicheRedPdf en el boliche red
    const bolicheRed = await prisma.bolicheRed.update({
      where: { id: Number(bolicheRedId) },
      data: { urlBolicheRedPdf: `/uploads/fichas-tecnicas/${newFilename}` }
    });

    res.json({
      message: 'Ficha técnica de boliche red subida correctamente.',
      urlBolicheRedPdf: `/uploads/fichas-tecnicas/${newFilename}`,
      nombreArchivo: newFilename
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir ficha técnica de boliche red.', details: err.message });
  }
});

/**
 * GET /api/boliche-red-ficha-tecnica/archivo/:filename
 * Sirve archivos de fichas técnicas con autenticación JWT
 */
router.get('/archivo/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(FICHA_TECNICA_DIR, filename);

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

export default router;
