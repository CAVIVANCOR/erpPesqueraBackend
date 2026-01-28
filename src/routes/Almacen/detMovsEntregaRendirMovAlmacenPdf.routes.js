// src/routes/Almacen/detMovsEntregaRendirMovAlmacenPdf.routes.js
// Rutas para manejo de PDFs de Detalles de Entrega a Rendir - Movimiento Almacén
// SISTEMA PDF V2 - Estándar profesional

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../../config/prismaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configuración de Multer para subida de PDFs
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const moduleName = req.body.moduleName || "det-movs-entrega-rendir-mov-almacen-comprobante";
    
    let uploadDir;
    if (moduleName === "det-movs-entrega-rendir-mov-almacen-comprobante") {
      uploadDir = path.join(__dirname, '../../../uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-comprobante');
    } else if (moduleName === "det-movs-entrega-rendir-mov-almacen-operacion") {
      uploadDir = path.join(__dirname, '../../../uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-operacion');
    } else {
      return cb(new Error('Módulo no válido'));
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nombre temporal, se renombrará después con el estándar
    const tempName = `temp-${Date.now()}-${file.originalname}`;
    cb(null, tempName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

/**
 * POST /upload
 * Sube PDF con nombre estándar según el módulo
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const { entityId, moduleName } = req.body;

    if (!entityId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'entityId es requerido' });
    }

    // Determinar el nombre estándar según el módulo
    let standardFileName;
    let relativePath;
    let fieldToUpdate;
    
    if (moduleName === 'det-movs-entrega-rendir-mov-almacen-comprobante') {
      standardFileName = `DetMovsEntregaRendirMovAlmacen-Comprobante-${entityId}.pdf`;
      relativePath = `/uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-comprobante/${standardFileName}`;
      fieldToUpdate = 'urlComprobanteMovimiento';
    } else if (moduleName === 'det-movs-entrega-rendir-mov-almacen-operacion') {
      standardFileName = `DetMovsEntregaRendirMovAlmacen-Operacion-${entityId}.pdf`;
      relativePath = `/uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-operacion/${standardFileName}`;
      fieldToUpdate = 'urlComprobanteOperacionMovCaja';
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Módulo no válido' });
    }

    // Renombrar archivo con nombre estándar
    const finalPath = path.join(path.dirname(req.file.path), standardFileName);
    fs.renameSync(req.file.path, finalPath);

    // Actualizar base de datos
    try {
      await prisma.detMovsEntregaRendirMovAlmacen.update({
        where: { id: BigInt(entityId) },
        data: { [fieldToUpdate]: relativePath }
      });
    } catch (updateError) {
      console.error('Error actualizando registro:', updateError);
    }

    res.json({
      success: true,
      url: relativePath,
      filename: standardFileName,
      message: 'PDF subido correctamente'
    });
  } catch (error) {
    console.error('Error al subir PDF:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error al subir el PDF', details: error.message });
  }
});

/**
 * GET /file/:moduleName/:filename
 * Sirve PDF según el módulo
 */
router.get('/file/:moduleName/:filename', (req, res) => {
  try {
    const { moduleName, filename } = req.params;
    
    let filePath;
    if (moduleName === 'det-movs-entrega-rendir-mov-almacen-comprobante') {
      filePath = path.join(__dirname, '../../../uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-comprobante', filename);
    } else if (moduleName === 'det-movs-entrega-rendir-mov-almacen-operacion') {
      filePath = path.join(__dirname, '../../../uploads/pdf-system/det-movs-entrega-rendir-mov-almacen-operacion', filename);
    } else {
      return res.status(400).json({ error: 'Módulo no válido' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error al servir PDF:', error);
    res.status(500).json({ error: 'Error al servir el PDF' });
  }
});

export default router;