/**
 * Rutas de manejo de adjuntos PDF para Empresa en el ERP Megui.
 * Permite subir y servir archivos PDF usando Multer y Express, siguiendo la convención /uploads/adjuntos/empresa-{idEmpresa}/.
 * Documentado profesionalmente en español técnico.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const router = express.Router();

// Carpeta base para adjuntos de empresa
const ADJUNTOS_DIR = path.join(process.cwd(), 'uploads', 'adjuntos');
if (!fs.existsSync(ADJUNTOS_DIR)) {
  fs.mkdirSync(ADJUNTOS_DIR, { recursive: true });
}

// Configuración de Multer para guardar PDFs profesionalmente
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Obtiene el idEmpresa desde el body
    const idEmpresa = req.body.empresaId || req.params.idEmpresa;
    const dir = path.join(ADJUNTOS_DIR, `empresa-${idEmpresa}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Renombra el archivo para evitar colisiones: nombreOriginal-timestamp.pdf
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    cb(null, `${base}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Solo permite PDFs
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF.'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // Máximo 10MB para adjuntos PDF
});

/**
 * POST /api/empresas/:idEmpresa/adjuntos
 * Sube y registra un archivo PDF como adjunto de empresa.
 * Guarda el registro en la tabla ArchivoAdjunto.
 */
// Middleware profesional para manejar errores de Multer (tamaño de archivo, tipo, etc.)
router.post('/:idEmpresa/adjuntos', (req, res, next) => {
  upload.single('archivo')(req, res, function (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      // Error profesional: archivo demasiado grande
      return res.status(400).json({
        mensaje: 'El archivo PDF supera el tamaño máximo permitido (10MB).',
        codigo: 'ERR_TAMANO_ARCHIVO'
      });
    } else if (err) {
      // Otros errores de Multer
      return res.status(400).json({
        mensaje: err.message,
        codigo: 'ERR_MULTER'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const idEmpresa = BigInt(req.params.idEmpresa);
    const { subModuloId, usuarioSubioId } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }
    // Construye la ruta relativa para la BD
    const rutaRelativa = path.join(
      '/uploads/adjuntos',
      `empresa-${idEmpresa}`,
      req.file.filename
    ).replace(/\\/g, '/'); // Normaliza para Windows/Linux
    // Registra el adjunto en la BD
    const adjunto = await prisma.archivoAdjunto.create({
      data: {
        nombreArchivo: req.file.filename,
        rutaRelativa,
        fechaSubida: new Date(),
        empresaId: idEmpresa,
        subModuloId: subModuloId ? BigInt(subModuloId) : idEmpresa, // Por defecto igual a empresa
        usuarioSubioId: usuarioSubioId ? BigInt(usuarioSubioId) : null
      }
    });
    res.json({ success: true, adjunto: toJSONBigInt(adjunto) });
  } catch (error) {
    console.error('[ERP ADJUNTOS] Error al subir/registrar adjunto:', error);
    res.status(500).json({ error: 'Error al guardar el archivo adjunto.' });
  }
});

export default router;
