import faenaPescaService from '../../services/Pesca/faenaPesca.service.js';
import wmsService from '../../services/Almacen/wms.service.js';
import finalizarFaenaService from '../../services/Pesca/finalizarFaenaConMovimientos.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Controlador para FaenaPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const faenas = await faenaPescaService.listar();
    res.json(toJSONBigInt(faenas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const faena = await faenaPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(faena));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await faenaPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await faenaPescaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await faenaPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

// Configuración de directorios para PDFs
const REPORTES_CALAS_DIR = path.join(process.cwd(), 'uploads', 'reportes-faena-calas');
const DECLARACIONES_DESEMBARQUE_DIR = path.join(process.cwd(), 'uploads', 'declaraciones-desembarque');

// Crear directorios si no existen
[REPORTES_CALAS_DIR, DECLARACIONES_DESEMBARQUE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de Multer para reportes de calas
const storageReporteCalas = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const finalDir = path.join(REPORTES_CALAS_DIR, String(year), month);
      
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }
      
      cb(null, finalDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    try {
      const now = new Date();
      const dia = String(now.getDate()).padStart(2, '0');
      const mes = String(now.getMonth() + 1).padStart(2, '0');
      const año = now.getFullYear();
      
      const id = Date.now();
      const ext = path.extname(file.originalname) || '.pdf';
      
      const fileName = `reporte-calas-${id}-${dia}${mes}${año}${ext}`;
      cb(null, fileName);
    } catch (error) {
      cb(error, null);
    }
  }
});

// Configuración de Multer para declaraciones de desembarque
const storageDeclaracionDesembarque = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const finalDir = path.join(DECLARACIONES_DESEMBARQUE_DIR, String(year), month);
      
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }
      
      cb(null, finalDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    try {
      const now = new Date();
      const dia = String(now.getDate()).padStart(2, '0');
      const mes = String(now.getMonth() + 1).padStart(2, '0');
      const año = now.getFullYear();
      
      const id = Date.now();
      const ext = path.extname(file.originalname) || '.pdf';
      
      const fileName = `declaracion-desembarque-${id}-${dia}${mes}${año}${ext}`;
      cb(null, fileName);
    } catch (error) {
      cb(error, null);
    }
  }
});

const uploadReporteCalasMiddleware = multer({
  storage: storageReporteCalas,
  fileFilter: (req, file, cb) => {
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
  limits: { fileSize: 15 * 1024 * 1024 }
});

const uploadDeclaracionDesembarqueMiddleware = multer({
  storage: storageDeclaracionDesembarque,
  fileFilter: (req, file, cb) => {
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
  limits: { fileSize: 15 * 1024 * 1024 }
});

/**
 * Upload de reporte de faena calas
 */
export const uploadReporteCalas = [
  uploadReporteCalasMiddleware.single('documento'),
  async (req, res) => {
    try {
      const { faenaPescaId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No se subió ningún archivo.',
          codigo: 'ERR_NO_ARCHIVO'
        });
      }

      // Construye la ruta relativa para la BD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const rutaRelativa = path.join(
        '/uploads/reportes-faena-calas',
        String(year),
        month,
        req.file.filename
      ).replace(/\\/g, '/');

      // Si se proporciona faenaPescaId, actualiza el registro
      if (faenaPescaId) {
        try {
          await faenaPescaService.actualizar(Number(faenaPescaId), {
            urlReporteFaenaCalas: rutaRelativa
          });
        } catch (updateError) {
          console.error('Error actualizando faena:', updateError);
        }
      }

      res.json({
        mensaje: 'Reporte de faena calas subido exitosamente',
        urlDocumento: rutaRelativa,
        archivo: req.file.filename,
        tamaño: req.file.size
      });

    } catch (error) {
      console.error('Error en upload reporte calas:', error);
      res.status(500).json({
        error: 'Error interno del servidor al subir reporte',
        codigo: 'ERR_UPLOAD_REPORTE'
      });
    }
  }
];

/**
 * Upload de declaración de desembarque
 */
export const uploadDeclaracionDesembarque = [
  uploadDeclaracionDesembarqueMiddleware.single('documento'),
  async (req, res) => {
    try {
      const { faenaPescaId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No se subió ningún archivo.',
          codigo: 'ERR_NO_ARCHIVO'
        });
      }

      // Construye la ruta relativa para la BD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const rutaRelativa = path.join(
        '/uploads/declaraciones-desembarque',
        String(year),
        month,
        req.file.filename
      ).replace(/\\/g, '/');

      // Si se proporciona faenaPescaId, actualiza el registro
      if (faenaPescaId) {
        try {
          await faenaPescaService.actualizar(Number(faenaPescaId), {
            urlDeclaracionDesembarqueArmador: rutaRelativa
          });
        } catch (updateError) {
          console.error('Error actualizando faena:', updateError);
        }
      }

      res.json({
        mensaje: 'Declaración de desembarque subida exitosamente',
        urlDocumento: rutaRelativa,
        archivo: req.file.filename,
        tamaño: req.file.size
      });

    } catch (error) {
      console.error('Error en upload declaración:', error);
      res.status(500).json({
        error: 'Error interno del servidor al subir declaración',
        codigo: 'ERR_UPLOAD_DECLARACION'
      });
    }
  }
];

/**
 * Servir archivo de reporte de calas
 */
export async function servirArchivoReporteCalas(req, res) {
  try {
    // Extraer la ruta del archivo desde la URL
    const rutaArchivo = req.params[0]; // Captura todo después de /archivo-reporte-calas/
    
    if (!rutaArchivo) {
      return res.status(400).json({
        error: 'Ruta de archivo no especificada',
        codigo: 'ERR_RUTA_VACIA'
      });
    }

    // Construir ruta completa del archivo
    const rutaCompleta = path.join(process.cwd(), 'uploads', 'reportes-faena-calas', rutaArchivo);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({
        error: 'Reporte no encontrado',
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
    console.error('Error sirviendo archivo reporte calas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Servir archivo de declaración de desembarque
 */
export async function servirArchivoDeclaracionDesembarque(req, res) {
  try {
    // Extraer la ruta del archivo desde la URL
    const rutaArchivo = req.params[0]; // Captura todo después de /archivo-declaracion-desembarque/
    
    if (!rutaArchivo) {
      return res.status(400).json({
        error: 'Ruta de archivo no especificada',
        codigo: 'ERR_RUTA_VACIA'
      });
    }

    // Construir ruta completa del archivo
    const rutaCompleta = path.join(process.cwd(), 'uploads', 'declaraciones-desembarque', rutaArchivo);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({
        error: 'Declaración no encontrada',
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
    console.error('Error sirviendo archivo declaración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Finaliza una faena de pesca y genera automáticamente DOS movimientos de almacén:
 * 1. INGRESO (Concepto 1): De Proveedor MEGUI a Almacén MP Recurso Hidrobiológico
 * 2. SALIDA (Concepto 3): De Almacén MP Recurso Hidrobiológico a Cliente MEGUI
 * 
 * Utiliza las funciones genéricas del módulo de Inventarios para garantizar
 * consistencia con el resto del sistema.
 * 
 * @param {Object} req.params.id - ID de la faena de pesca
 * @param {Object} req.body.temporadaPescaId - ID de la temporada de pesca
 * @param {Object} req.user.id - ID del usuario logueado (desde middleware de autenticación)
 */
export async function finalizarFaenaConMovimientoAlmacen(req, res, next) {
  try {
    const faenaPescaId = BigInt(req.params.id);
    const { temporadaPescaId } = req.body;
    const usuarioId = BigInt(req.user?.id || 1); // ID del usuario logueado

    if (!temporadaPescaId) {
      return res.status(400).json({
        error: 'El ID de la temporada de pesca es requerido',
      });
    }

    // Ejecutar el proceso completo de finalización con movimientos de almacén
    const resultado = await finalizarFaenaService.finalizarFaenaConMovimientosAlmacen(
      faenaPescaId,
      BigInt(temporadaPescaId),
      usuarioId
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
