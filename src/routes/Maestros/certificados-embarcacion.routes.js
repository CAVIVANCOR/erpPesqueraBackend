/**
 * Rutas para manejo de certificados de embarcación
 * 
 * Endpoints:
 * - POST /subir/:embarcacionId/:tipoCertificado - Subir certificado específico
 * - GET /archivo/:filename - Servir archivos de certificados con autenticación JWT
 * 
 * @author ERP Megui
 * @version 1.0.0
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio para almacenar certificados de embarcación
const CERTIFICADOS_DIR = path.join(__dirname, '../../../uploads/certificados-embarcacion');

// Crear directorio si no existe
if (!fs.existsSync(CERTIFICADOS_DIR)) {
  fs.mkdirSync(CERTIFICADOS_DIR, { recursive: true });
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CERTIFICADOS_DIR);
  },
  filename: (req, file, cb) => {
    const { embarcacionId, tipoCertificado } = req.params;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const newFilename = `certificado-${tipoCertificado}-embarcacion-${embarcacionId}-${timestamp}${extension}`;
    cb(null, newFilename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

/**
 * POST /api/pesca/certificados-embarcacion/subir/:embarcacionId/:tipoCertificado
 * Sube un certificado específico para una embarcación
 */
router.post('/subir/:embarcacionId/:tipoCertificado', upload.single('certificado'), async (req, res) => {
  try {
    const { embarcacionId, tipoCertificado } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const newFilename = req.file.filename;
    const urlCertificado = `/uploads/certificados-embarcacion/${newFilename}`;

    // Mapeo de tipos de certificado a campos de la base de datos
    const camposCertificados = {
      'dotacion-minima-seguridad': 'urlCertificadosDotacionMinimaSeguridad',
      'matricula': 'urlCertificadoMatricula',
      'permiso-pesca': 'urlPermisoPesca',
      'arqueo': 'urlCertificadoArqueo',
      'franco-bordo': 'urlCertificadoFrancoBordo',
      'compas': 'urlCertificadoCompas',
      'radio-baliza': 'urlCertificadoRadioBaliza',
      'seguridad': 'urlCertificadoSeguridad',
      'hidrocarburos': 'urlCertificadoHidroCarburos',
      'aguas-sucias': 'urlCertificadoAguasSucias',
      'balsas-salvavidas': 'urlCertificadoBalsasSalvavidas',
      'paquete-emergencia': 'urlCertificadoPaqueteEmergencia',
      'extinguidores': 'urlCertificadoExtinguidores',
      'fumigacion': 'urlCertificadoFumigacion',
      'no-adeudo-foncopes': 'urlConstanciaNoAdeudoFoncopes',
      'simtrac': 'urlCertificadoSimtrac',
      'geolocalizador': 'urlCertificadogeolocalizador',
      'sanitario-sanipes': 'urlCertificadoSanitarioSanipes'
    };

    const campoActualizar = camposCertificados[tipoCertificado];
    
    if (!campoActualizar) {
      return res.status(400).json({ error: 'Tipo de certificado no válido' });
    }

    // Actualizar el campo correspondiente en la embarcación
    const embarcacion = await prisma.embarcacion.update({
      where: { id: Number(embarcacionId) },
      data: { [campoActualizar]: urlCertificado }
    });

    res.json({
      message: 'Certificado de embarcación subido correctamente.',
      urlCertificado: urlCertificado,
      nombreArchivo: newFilename,
      tipoCertificado: tipoCertificado
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir certificado de embarcación.', details: err.message });
  }
});

/**
 * GET /api/pesca/certificados-embarcacion/archivo/:filename
 * Sirve archivos de certificados con autenticación JWT
 */
router.get('/archivo/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(CERTIFICADOS_DIR, filename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Verificar que el archivo es un PDF
    if (path.extname(filename).toLowerCase() !== '.pdf') {
      return res.status(400).json({ error: 'Tipo de archivo no válido' });
    }

    // Configurar headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Enviar el archivo
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Error al servir archivo de certificado.', details: err.message });
  }
});

export default router;
