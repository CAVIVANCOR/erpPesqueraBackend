/**
 * pdfService.js - Servicio principal para manejo de PDFs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getModuleConfig } from '../../config/pdf/pdfModules.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PDFService {
  async uploadSingle(file, moduleName, metadata = {}) {
    try {
      const config = getModuleConfig(moduleName);
      
      // Validar tamaño
      if (file.size > config.maxFileSize) {
        throw new Error(`Archivo excede el tamaño máximo permitido (${config.maxFileSize / 1024 / 1024}MB)`);
      }

      // Validar tipo
      if (!config.allowedTypes.includes(file.mimetype)) {
        throw new Error(`Tipo de archivo no permitido. Tipos aceptados: ${config.allowedTypes.join(', ')}`);
      }

      // Validar que se proporcione entityId
      if (!metadata.entityId) {
        throw new Error('Se requiere entityId para generar el nombre del archivo');
      }

      // Crear directorio si no existe
      const uploadDir = path.join(__dirname, '../../../', config.uploadPath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generar nombre estándar: moduleName-entityId.pdf
      const fileName = `${moduleName.toUpperCase()}-${metadata.entityId}.pdf`;
      
      // Guardar archivo (sobreescribe si existe)
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      // Construir URL relativa
      const urlRelativa = `/${config.uploadPath}/${fileName}`;

      return {
        success: true,
        url: urlRelativa,
        fileName: fileName,
        size: file.size,
        mimetype: file.mimetype
      };

    } catch (error) {
      console.error('Error en uploadSingle:', error);
      throw error;
    }
  }

  async getFile(moduleName, fileName) {
    try {
      const config = getModuleConfig(moduleName);
      const filePath = path.join(__dirname, '../../../', config.uploadPath, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error('Archivo no encontrado');
      }

      return fs.readFileSync(filePath);

    } catch (error) {
      console.error('Error en getFile:', error);
      throw error;
    }
  }

  async getFilePath(moduleName, fileName) {
    try {
      const config = getModuleConfig(moduleName);
      const filePath = path.join(__dirname, '../../../', config.uploadPath, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error('Archivo no encontrado');
      }

      return filePath;

    } catch (error) {
      console.error('Error en getFilePath:', error);
      throw error;
    }
  }

  async deleteFile(moduleName, fileName) {
    try {
      const config = getModuleConfig(moduleName);
      const filePath = path.join(__dirname, '../../../', config.uploadPath, fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: 'Archivo eliminado correctamente' };
      }

      throw new Error('Archivo no encontrado');

    } catch (error) {
      console.error('Error en deleteFile:', error);
      throw error;
    }
  }

  async fileExists(moduleName, fileName) {
    try {
      const config = getModuleConfig(moduleName);
      const filePath = path.join(__dirname, '../../../', config.uploadPath, fileName);
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }
}

export default new PDFService();