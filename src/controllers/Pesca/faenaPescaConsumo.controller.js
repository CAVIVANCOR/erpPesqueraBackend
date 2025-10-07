import faenaPescaConsumoService from '../../services/Pesca/faenaPescaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Controlador para FaenaPescaConsumo
 * Documentado en español.
 */

// Directorio base para uploads
const INFORMES_FAENA_DIR = path.join(process.cwd(), 'uploads', 'informes-faena-consumo');

// Crear directorio si no existe
if (!fs.existsSync(INFORMES_FAENA_DIR)) {
  fs.mkdirSync(INFORMES_FAENA_DIR, { recursive: true });
}

// Configuración de Multer para informes de faena
const storageInformeFaena = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const finalDir = path.join(INFORMES_FAENA_DIR, String(year), month);
      
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
      
      const fileName = `informe-faena-consumo-${id}-${dia}${mes}${año}${ext}`;
      cb(null, fileName);
    } catch (error) {
      cb(error, null);
    }
  }
});

const uploadInformeFaenaMiddleware = multer({
  storage: storageInformeFaena,
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

export async function listar(req, res, next) {
  try {
    const faenas = await faenaPescaConsumoService.listar();
    res.json(toJSONBigInt(faenas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const faena = await faenaPescaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(faena));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await faenaPescaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await faenaPescaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await faenaPescaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Upload de informe de faena consumo
 */
export const uploadInformeFaena = [
  uploadInformeFaenaMiddleware.single('documento'),
  async (req, res) => {
    try {
      const { faenaPescaConsumoId } = req.body;
      
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
        '/uploads/informes-faena-consumo',
        String(year),
        month,
        req.file.filename
      ).replace(/\\/g, '/');

      // Si se proporciona faenaPescaConsumoId, actualiza el registro
      if (faenaPescaConsumoId) {
        try {
          await faenaPescaConsumoService.actualizar(Number(faenaPescaConsumoId), {
            urlInformeFaena: rutaRelativa
          });
        } catch (updateError) {
          console.error('Error actualizando faena consumo:', updateError);
        }
      }

      res.json({
        mensaje: 'Informe de faena subido exitosamente',
        urlDocumento: rutaRelativa,
        archivo: req.file.filename,
        tamaño: req.file.size
      });

    } catch (error) {
      console.error('Error en upload informe faena consumo:', error);
      res.status(500).json({
        error: 'Error interno del servidor al subir informe',
        codigo: 'ERR_UPLOAD_INFORME'
      });
    }
  }
];

/**
 * Servir archivo de informe de faena consumo
 */
export async function servirArchivoInformeFaena(req, res) {
  try {
    // Extraer la ruta del archivo desde la URL
    const rutaArchivo = req.params[0];
    const archivoPath = path.join(INFORMES_FAENA_DIR, rutaArchivo);

    if (!fs.existsSync(archivoPath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.sendFile(archivoPath);
  } catch (error) {
    console.error('Error al servir archivo informe faena consumo:', error);
    res.status(500).json({ error: 'Error al servir el archivo' });
  }
}