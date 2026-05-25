/**
 * Rutas de manejo de firma para Personal en el ERP Megui.
 * Permite subir y servir archivos de firma usando Multer y Express.
 * Documentado profesionalmente en español técnico.
 * Replica el patrón de personal.foto.routes.js
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';

const router = express.Router();

// Carpeta destino para firmas de personal (ruta absoluta desde la raíz del proyecto)
const FIRMA_DIR = path.join(process.cwd(), 'uploads', 'personal-firmas');
if (!fs.existsSync(FIRMA_DIR)) {
  fs.mkdirSync(FIRMA_DIR, { recursive: true });
}

// Configuración de Multer para guardar con nombre profesional
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FIRMA_DIR);
  },
  filename: function (req, file, cb) {
    // Guarda como firma-<personalId>.<extensión>
    const ext = path.extname(file.originalname);
    cb(null, `firma-${req.params.id}${ext}`);
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
 * POST /api/personal/:id/firma
 * Sube y asocia una firma al personal indicado.
 * Actualiza el campo urlFirma en la base de datos con el nombre del archivo.
 */
router.post('/:id/firma', upload.single('firma'), async (req, res) => {
  try {
    const personalId = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo.' });
    }
    // Actualiza el campo urlFirma en el personal
    const persona = await prisma.personal.update({
      where: { id: personalId },
      data: { urlFirma: req.file.filename }
    });
    res.json({
      message: 'Firma subida correctamente.',
      firma: req.file.filename,
      url: `/public/personal-firmas/${req.file.filename}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir firma.', details: err.message });
  }
});

export default router;