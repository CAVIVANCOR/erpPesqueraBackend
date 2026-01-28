/**
 * pdfController.js - Controller unificado para sistema PDF V2
 */

import pdfService from '../../services/pdf/pdfService.js';
import pdfMergeService from '../../services/pdf/pdfMergeService.js';
import { getModuleConfig } from '../../config/pdf/pdfModules.config.js';

export async function uploadSingle(req, res, next) {
  try {
    const { moduleName } = req.body;

    if (!moduleName) {
      return res.status(400).json({
        success: false,
        message: 'moduleName es requerido'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo'
      });
    }

    const result = await pdfService.uploadSingle(
      req.file,
      moduleName,
      req.body
    );

    return res.status(200).json(result);

  } catch (error) {
    next(error);
  }
}

export async function mergeMultiple(req, res, next) {
  try {
    console.log('=== MERGE MULTIPLE INICIADO ===');
    console.log('req.body:', req.body);
    console.log('req.files:', req.files ? `${req.files.length} archivos` : 'NO FILES');
    
    const { moduleName } = req.body;

    if (!moduleName) {
      console.log('❌ ERROR: moduleName no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'moduleName es requerido'
      });
    }

    console.log('✅ moduleName:', moduleName);

    if (!req.files || req.files.length === 0) {
      console.log('❌ ERROR: No se recibieron archivos');
      return res.status(400).json({
        success: false,
        message: 'No se recibieron archivos'
      });
    }

    console.log('✅ Archivos recibidos:', req.files.length);
    req.files.forEach((f, i) => {
      console.log(`  Archivo ${i + 1}: ${f.originalname} (${f.mimetype}, ${f.size} bytes)`);
    });

    console.log('🔄 Llamando a pdfMergeService.mergeDocuments...');
    const result = await pdfMergeService.mergeDocuments(
      req.files,
      moduleName,
      req.body
    );

    console.log('✅ Merge exitoso:', result);
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ ERROR EN MERGE MULTIPLE:', error);
    console.error('Stack:', error.stack);
    next(error);
  }
}

export async function getFile(req, res, next) {
  try {
    const { moduleName } = req.params;
    const fileName = req.params[0];
    
    console.log('📄 [getFile] moduleName:', moduleName);
    console.log('📄 [getFile] fileName:', fileName);

    const filePath = await pdfService.getFilePath(moduleName, fileName);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath);

  } catch (error) {
    console.error('❌ [getFile] Error:', error);
    next(error);
  }
}

export async function deleteFile(req, res, next) {
  try {
    const { moduleName } = req.params;
    const fileName = req.params[0];

    const result = await pdfService.deleteFile(moduleName, fileName);
    
    return res.status(200).json(result);

  } catch (error) {
    next(error);
  }
}