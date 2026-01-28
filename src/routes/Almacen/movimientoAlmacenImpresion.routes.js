import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prismaClient.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = Router();

// ✅ Carpeta base para PDFs de movimientos de almacén - SISTEMA PDF V2
const MOVIMIENTOS_ALMACEN_DIR = path.join(process.cwd(), 'uploads', 'pdf-system', 'movimientos-almacen');
if (!fs.existsSync(MOVIMIENTOS_ALMACEN_DIR)) {
  fs.mkdirSync(MOVIMIENTOS_ALMACEN_DIR, { recursive: true });
}

// ✅ Configuración de Multer - SISTEMA PDF V2 ESTÁNDAR
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // ✅ Guardar directamente en la carpeta del módulo (sin subcarpetas año/mes)
      if (!fs.existsSync(MOVIMIENTOS_ALMACEN_DIR)) {
        fs.mkdirSync(MOVIMIENTOS_ALMACEN_DIR, { recursive: true });
      }
      
      cb(null, MOVIMIENTOS_ALMACEN_DIR);
      
    } catch (error) {
      console.error(`❌ Error en destination:`, error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    try {
      // ✅ Generar nombre temporal (req.body no está disponible aquí)
      const timestamp = Date.now();
      const ext = path.extname(file.originalname) || '.pdf';
      const tempFileName = `temp-${timestamp}${ext}`;
      
      cb(null, tempFileName);
      
    } catch (error) {
      console.error(`❌ Error en filename:`, error);
      cb(error, null);
    }
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Permite PDFs e imágenes (para conversión posterior)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP).'));
    }
  },
  limits: { fileSize: 15 * 1024 * 1024 } // Máximo 15MB
});

/**
 * POST /api/movimiento-almacen/upload-pdf
 * Sube un PDF generado del movimiento de almacén.
 * Retorna la URL relativa para guardar en MovimientoAlmacen.urlMovAlmacenPdf o urlMovAlmacenConCostosPdf
 */
router.post('/upload-pdf', autenticarJWT, (req, res, next) => {
  upload.single('pdf')(req, res, function (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        mensaje: 'El archivo supera el tamaño máximo permitido (15MB).',
        codigo: 'ERR_TAMANO_ARCHIVO'
      });
    } else if (err) {
      return res.status(400).json({
        mensaje: err.message,
        codigo: 'ERR_MULTER'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { movimientoId, incluirCostos } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se subió ningún archivo.',
        codigo: 'ERR_NO_ARCHIVO'
      });
    }

    if (!movimientoId) {
      return res.status(400).json({ 
        error: 'movimientoId es requerido.',
        codigo: 'ERR_MOVIMIENTO_ID_REQUERIDO'
      });
    }

    // ✅ Renombrar archivo con el formato estándar
    const ext = path.extname(req.file.filename);
    const prefijo = incluirCostos === 'true' ? 'MovimientoAlmacenConCostos' : 'MovimientoAlmacenSinCostos';
    const nuevoNombre = `${prefijo}-${movimientoId}${ext}`;
    
    const rutaAntigua = req.file.path;
    const rutaNueva = path.join(MOVIMIENTOS_ALMACEN_DIR, nuevoNombre);
    
    // Renombrar el archivo
    fs.renameSync(rutaAntigua, rutaNueva);

    // ✅ Construye la ruta relativa para la BD - SISTEMA PDF V2 ESTÁNDAR
    const rutaRelativa = path.join(
      '/uploads/pdf-system/movimientos-almacen',
      nuevoNombre
    ).replace(/\\/g, '/'); // Normaliza para Windows/Linux

    // Actualiza el registro con la ruta del PDF
    const campoActualizar = incluirCostos === 'true' 
      ? 'urlMovAlmacenConCostosPdf' 
      : 'urlMovAlmacenPdf';
    
    await prisma.movimientoAlmacen.update({
      where: { id: BigInt(movimientoId) },
      data: { [campoActualizar]: rutaRelativa }
    });

    // Respuesta exitosa con la URL para el frontend
    res.json({ 
      success: true, 
      urlPdf: rutaRelativa,
      urlDocumento: rutaRelativa,
      urlMovAlmacenPdf: rutaRelativa,
      urlMovAlmacenConCostosPdf: rutaRelativa,
      url: rutaRelativa,
      nombreArchivo: nuevoNombre,
      mensaje: 'PDF del movimiento de almacén subido exitosamente.'
    });

  } catch (error) {
    console.error('[ERP MOVIMIENTO ALMACEN] Error al subir PDF:', error);
    res.status(500).json({ 
      error: 'Error interno al guardar el PDF del movimiento de almacén.',
      codigo: 'ERR_SERVIDOR'
    });
  }
});

/**
 * GET /api/movimiento-almacen/archivo/*
 * Sirve archivos PDF de movimientos con autenticación JWT
 */
router.get('/archivo/*', autenticarJWT, (req, res) => {
  try {
    // Extraer la ruta del archivo desde la URL
    const rutaArchivo = req.params[0]; // Captura todo después de /archivo/
    
    if (!rutaArchivo) {
      return res.status(400).json({
        error: 'Ruta de archivo no especificada',
        codigo: 'ERR_RUTA_VACIA'
      });
    }

    // ✅ Construir ruta completa del archivo - SISTEMA PDF V2
    const rutaCompleta = path.join(process.cwd(), 'uploads', 'pdf-system', 'movimientos-almacen', rutaArchivo);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({
        error: 'PDF del movimiento no encontrado',
        codigo: 'ERR_ARCHIVO_NO_ENCONTRADO',
        ruta: rutaArchivo
      });
    }

    // Verificar que es un archivo PDF
    const extension = path.extname(rutaCompleta).toLowerCase();
    if (extension !== '.pdf') {
      return res.status(400).json({
        error: 'Solo se permiten archivos PDF',
        codigo: 'ERR_TIPO_ARCHIVO'
      });
    }

    // Configurar headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline'); // Para mostrar en navegador    
    
    // Enviar archivo
    res.sendFile(rutaCompleta, (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Error interno del servidor',
            codigo: 'ERR_ENVIO_ARCHIVO'
          });
        }
      }
    });

  } catch (error) {
    console.error('Error sirviendo PDF de movimiento de almacén:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      codigo: 'ERR_SERVIDOR',
      detalle: error.message
    });
  }
});

export default router;