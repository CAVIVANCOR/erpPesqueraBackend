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
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB máximo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
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

/**
 * GET /api/empresas/:id/logo
 * Sirve el archivo de logo de una empresa específica con headers CORS correctos.
 * Permite acceso programático desde el frontend para generación de tickets PDF.
 * 
 * @param {string} id - ID de la empresa
 * @returns {File} Archivo de imagen del logo
 * @throws {404} Si la empresa no existe o no tiene logo
 * @throws {500} Error interno del servidor
 */
router.get('/:id/logo', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número válido
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        error: 'ID de empresa inválido',
        codigo: 'INVALID_EMPRESA_ID'
      });
    }
    
    // Verificar que la empresa existe en la base de datos
    const empresa = await prisma.empresa.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, logo: true, razonSocial: true }
    });
    
    if (!empresa) {
      return res.status(404).json({
        error: 'Empresa no encontrada',
        codigo: 'EMPRESA_NOT_FOUND'
      });
    }
    
    if (!empresa.logo) {
      return res.status(404).json({
        error: 'La empresa no tiene logo configurado',
        codigo: 'LOGO_NOT_CONFIGURED'
      });
    }
    
    // Construir ruta completa del archivo de logo
    const logoPath = path.join(LOGO_DIR, empresa.logo);
    
    // Verificar que el archivo existe físicamente
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({
        error: 'Archivo de logo no encontrado en el servidor',
        codigo: 'LOGO_FILE_NOT_FOUND',
        archivo: empresa.logo
      });
    }
    
    // Obtener información del archivo
    const stats = fs.statSync(logoPath);
    const ext = path.extname(empresa.logo).toLowerCase();
    
    // Determinar Content-Type basado en la extensión
    let contentType = 'image/jpeg'; // Por defecto
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    // Headers CORS profesionales para permitir acceso programático
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight por 24 horas
    
    // Headers de cache para optimizar rendimiento
    res.header('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
    res.header('ETag', `"${stats.mtime.getTime()}"`); // ETag basado en fecha de modificación
    
    // Headers de información del archivo
    res.header('Content-Type', contentType);
    res.header('Content-Length', stats.size.toString());
    res.header('Content-Disposition', `inline; filename="${empresa.logo}"`);
    
    // Headers adicionales de seguridad
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    
    // Enviar el archivo
    res.sendFile(logoPath, (err) => {
      if (err) {
        console.error(`Error enviando logo ${empresa.logo}:`, err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Error interno al servir el logo',
            codigo: 'LOGO_SERVE_ERROR'
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error en endpoint GET /empresas/:id/logo:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      codigo: 'INTERNAL_SERVER_ERROR',
      detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * OPTIONS /api/empresas/:id/logo
 * Maneja las solicitudes preflight de CORS para el endpoint de logos.
 */
router.options('/:id/logo', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

export default router;
