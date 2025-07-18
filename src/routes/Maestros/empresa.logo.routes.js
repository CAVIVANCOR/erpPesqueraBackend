/**
 * Rutas de manejo de logo para Empresa en el ERP Megui.
 * Permite subir y servir archivos de logo usando Multer y Express.
 * Documentado profesionalmente en español técnico.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';

const router = express.Router();

// Carpeta destino para logos (ES Modules: usar import.meta.url)
// Carpeta destino para logos (ruta absoluta desde la raíz del proyecto)
const LOGO_DIR = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}


// Configuración de Multer para guardar con nombre profesional
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, LOGO_DIR);
  },
  filename: function (req, file, cb) {
    // Guarda como logo-<empresaId>.<extensión>
    const ext = path.extname(file.originalname);
    cb(null, `logo-${req.params.id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB máximo
  fileFilter: (req, file, cb) => {
    // Solo imágenes
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten archivos de imagen.'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/empresas/:id/logo
 * Sube y asocia un logo a la empresa indicada.
 * Actualiza el campo logo en la base de datos con el nombre del archivo.
 */
router.post('/:id/logo', upload.single('logo'), async (req, res) => {
  try {
    const empresaId = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo.' });
    }
    // Actualiza el campo logo en la empresa
    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: { logo: req.file.filename }
    });
    res.json({
      message: 'Logo subido correctamente.',
      logo: req.file.filename,
      url: `/public/logos/${req.file.filename}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir logo.', details: err.message });
  }
});

export default router;
