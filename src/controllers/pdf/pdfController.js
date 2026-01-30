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

    
    const { moduleName } = req.body;

    if (!moduleName) {
      return res.status(400).json({
        success: false,
        message: 'moduleName es requerido'
      });
    }


    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron archivos'
      });
    }


    const result = await pdfMergeService.mergeDocuments(
      req.files,
      moduleName,
      req.body
    );

    return res.status(200).json(result);

  } catch (error) {
    next(error);
  }
}

export async function getFile(req, res, next) {
  try {
    const { moduleName } = req.params;
    const fileName = req.params[0];
    

    const filePath = await pdfService.getFilePath(moduleName, fileName);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath);

  } catch (error) {
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