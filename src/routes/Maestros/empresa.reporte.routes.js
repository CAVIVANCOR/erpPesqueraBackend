/**
 * Rutas de manejo de reportes generados por empresa en el ERP Megui.
 * Permite subir y servir archivos de reportes (PDF, XLSX, etc.) usando Multer y Express.
 * Documentado profesionalmente en español técnico.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

const router = express.Router();

// Carpeta base para reportes generados
const REPORTES_DIR = path.join(process.cwd(), 'uploads', 'reportes');
if (!fs.existsSync(REPORTES_DIR)) {
  fs.mkdirSync(REPORTES_DIR, { recursive: true });
}

// Configuración profesional de Multer para reportes (PDF, XLSX, etc.)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Carpeta destino: /uploads/reportes/empresa-<idEmpresa>/
    const idEmpresa = req.params.idEmpresa;
    const dir = path.join(REPORTES_DIR, `empresa-${idEmpresa}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Renombra el archivo para evitar colisiones: nombreOriginal-timestamp.ext
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    cb(null, `${base}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Máximo 20MB para reportes
  fileFilter: (req, file, cb) => {
    // Permitir solo PDF y XLSX (puedes agregar más tipos si lo deseas)
    const allowed = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF o Excel.'));
  }
});

/**
 * POST /api/empresas-reportes/:idEmpresa/reportes
 * Sube y registra un archivo de reporte generado por empresa.
 * Guarda el registro en la tabla ReporteGenerado.
 */
router.post('/:idEmpresa/reportes', (req, res, next) => {
  upload.single('archivo')(req, res, function (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        mensaje: 'El archivo de reporte supera el tamaño máximo permitido (20MB).',
        codigo: 'ERR_TAMANO_REPORTE'
      });
    } else if (err) {
      return res.status(400).json({
        mensaje: err.message,
        codigo: 'ERR_MULTER_REPORTE'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const idEmpresa = BigInt(req.params.idEmpresa);
    const { subModuloId, usuarioGeneroId } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }
    // Construye la ruta relativa para la BD
    const rutaRelativa = path.join(
      '/uploads/reportes',
      `empresa-${idEmpresa}`,
      req.file.filename
    ).replace(/\\/g, '/');
    // Registra el reporte generado en la BD
    const reporte = await prisma.reporteGenerado.create({
      data: {
        nombreArchivo: req.file.filename,
        rutaRelativa,
        fechaGeneracion: new Date(),
        empresaId: idEmpresa,
        subModuloId: subModuloId ? BigInt(subModuloId) : idEmpresa,
        usuarioGeneroId: usuarioGeneroId ? BigInt(usuarioGeneroId) : null
      }
    });
    res.json({ success: true, reporte: toJSONBigInt(reporte) });
  } catch (error) {
    console.error('[ERP REPORTES] Error al subir/registrar reporte:', error);
    res.status(500).json({ error: 'Error al guardar el archivo de reporte.' });
  }
});

/**
 * GET /api/empresas-reportes/:idEmpresa/ver/:reporteId
 * Permite ver o descargar un reporte generado, validando acceso según AccesosUsuario.
 * Requiere autenticación JWT y permisos en el submódulo correspondiente.
 */
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

router.get('/:idEmpresa/ver/:reporteId', autenticarJWT, async (req, res) => {
  try {
    const { idEmpresa, reporteId } = req.params;
    const usuario = req.usuario; // Asume que el middleware agrega el usuario autenticado

    // 1. Busca el reporte en la BD y valida empresa
    const reporte = await prisma.reporteGenerado.findUnique({
      where: { id: BigInt(reporteId) }
    });
    if (!reporte || reporte.empresaId.toString() !== idEmpresa) {
      return res.status(404).json({ mensaje: 'Reporte no encontrado' });
    }

    // 2. Valida acceso en AccesosUsuario (usuarioId, subModuloId, puedeVer=true)
    const acceso = await prisma.accesosUsuario.findFirst({
      where: {
        usuarioId: usuario.id,
        subModuloId: reporte.subModuloId,
        puedeVer: true
      }
    });
    if (!acceso) {
      return res.status(403).json({ mensaje: 'No tiene permisos para acceder a este reporte' });
    }

    // 3. Envía el archivo para ver/descargar
    const filePath = path.join(process.cwd(), reporte.rutaRelativa);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ mensaje: 'Archivo físico no encontrado' });
    }
    // Para ver en navegador (PDF/Excel):
    res.sendFile(filePath);
    // Para forzar descarga, puedes usar: res.download(filePath, reporte.nombreArchivo);
  } catch (error) {
    console.error('[ERP REPORTES] Error al servir reporte:', error);
    res.status(500).json({ mensaje: 'Error interno al servir el reporte' });
  }
});

export default router;
