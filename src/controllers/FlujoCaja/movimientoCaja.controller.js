// c:\Proyectos\megui\erp\erp-pesquera-backend\src\controllers\FlujoCaja\movimientoCaja.controller.js
import movimientoCajaService from '../../services/FlujoCaja/movimientoCaja.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Directorios base para uploads
const COMPROBANTES_DIR = path.join(process.cwd(), 'uploads', 'comprobantes-movimiento-caja');
const DOCUMENTOS_DIR = path.join(process.cwd(), 'uploads', 'documentos-movimiento-caja');

// Crear directorios si no existen
if (!fs.existsSync(COMPROBANTES_DIR)) {
  fs.mkdirSync(COMPROBANTES_DIR, { recursive: true });
}
if (!fs.existsSync(DOCUMENTOS_DIR)) {
  fs.mkdirSync(DOCUMENTOS_DIR, { recursive: true });
}

// Configuración de Multer para comprobantes de operación
const storageComprobante = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const finalDir = path.join(COMPROBANTES_DIR, String(year), month);
      
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
      
      const fileName = `comprobante-movcaja-${id}-${dia}${mes}${año}${ext}`;
      cb(null, fileName);
    } catch (error) {
      cb(error, null);
    }
  }
});

// Configuración de Multer para documentos afectos
const storageDocumento = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const finalDir = path.join(DOCUMENTOS_DIR, String(year), month);
      
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
      
      const fileName = `documento-movcaja-${id}-${dia}${mes}${año}${ext}`;
      cb(null, fileName);
    } catch (error) {
      cb(error, null);
    }
  }
});

const uploadComprobante = multer({
  storage: storageComprobante,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF e imágenes.'));
    }
  }
});

const uploadDocumento = multer({
  storage: storageDocumento,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF e imágenes.'));
    }
  }
});

const listar = async (req, res, next) => {
  try {
    const movimientos = await movimientoCajaService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
};

const obtenerPorId = async (req, res, next) => {
  try {
    const movimiento = await movimientoCajaService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await movimientoCajaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const actualizado = await movimientoCajaService.actualizar(Number(req.params.id), req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await movimientoCajaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
};

const validarMovimiento = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const movimientoValidado = await movimientoCajaService.validarMovimiento(id);
    res.json(toJSONBigInt(movimientoValidado));
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware para subir comprobante de operación
 */
export const subirComprobante = [
  uploadComprobante.single('documento'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No se recibió ningún archivo',
          codigo: 'ERR_NO_FILE'
        });
      }

      // Construye la ruta relativa para la BD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const rutaRelativa = path.join(
        '/uploads/comprobantes-movimiento-caja',
        String(year),
        month,
        req.file.filename
      ).replace(/\\/g, '/');

      // Si se proporciona movimientoCajaId, actualiza el registro
      const movimientoCajaId = req.body.movimientoCajaId;
      if (movimientoCajaId) {
        try {
          await movimientoCajaService.actualizar(Number(movimientoCajaId), {
            urlComprobanteOperacionMovCaja: rutaRelativa
          });
        } catch (updateError) {
          console.error('Error actualizando movimiento caja:', updateError);
        }
      }

      res.json({
        mensaje: 'Comprobante de operación subido exitosamente',
        urlDocumento: rutaRelativa,
        archivo: req.file.filename,
        tamaño: req.file.size
      });

    } catch (error) {
      console.error('Error en upload comprobante:', error);
      res.status(500).json({
        error: 'Error interno del servidor al subir comprobante',
        codigo: 'ERR_UPLOAD_COMPROBANTE'
      });
    }
  }
];

/**
 * Middleware para subir documento afecto
 */
export const subirDocumento = [
  uploadDocumento.single('documento'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No se recibió ningún archivo',
          codigo: 'ERR_NO_FILE'
        });
      }

      // Construye la ruta relativa para la BD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const rutaRelativa = path.join(
        '/uploads/documentos-movimiento-caja',
        String(year),
        month,
        req.file.filename
      ).replace(/\\/g, '/');

      // Si se proporciona movimientoCajaId, actualiza el registro
      const movimientoCajaId = req.body.movimientoCajaId;
      if (movimientoCajaId) {
        try {
          await movimientoCajaService.actualizar(Number(movimientoCajaId), {
            urlDocumentoMovCaja: rutaRelativa
          });
        } catch (updateError) {
          console.error('Error actualizando movimiento caja:', updateError);
        }
      }

      res.json({
        mensaje: 'Documento afecto subido exitosamente',
        urlDocumento: rutaRelativa,
        archivo: req.file.filename,
        tamaño: req.file.size
      });

    } catch (error) {
      console.error('Error en upload documento:', error);
      res.status(500).json({
        error: 'Error interno del servidor al subir documento',
        codigo: 'ERR_UPLOAD_DOCUMENTO'
      });
    }
  }
];

/**
 * Servir archivo de comprobante
 */
export async function servirArchivoComprobante(req, res) {
  try {
    const rutaArchivo = req.params[0];
    const archivoPath = path.join(COMPROBANTES_DIR, rutaArchivo);

    if (!fs.existsSync(archivoPath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.sendFile(archivoPath);
  } catch (error) {
    console.error('Error al servir archivo comprobante:', error);
    res.status(500).json({ error: 'Error al servir el archivo' });
  }
}

/**
 * Servir archivo de documento
 */
export async function servirArchivoDocumento(req, res) {
  try {
    const rutaArchivo = req.params[0];
    const archivoPath = path.join(DOCUMENTOS_DIR, rutaArchivo);

    if (!fs.existsSync(archivoPath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.sendFile(archivoPath);
  } catch (error) {
    console.error('Error al servir archivo documento:', error);
    res.status(500).json({ error: 'Error al servir el archivo' });
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  validarMovimiento,
  subirComprobante,
  subirDocumento,
  servirArchivoComprobante,
  servirArchivoDocumento
};