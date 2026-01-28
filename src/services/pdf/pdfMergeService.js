/**
 * pdfMergeService.js - Servicio para merge de PDFs e imágenes
 * Estándar de nomenclatura: {DESCRIPCION}-{ID}.pdf
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { getModuleConfig } from '../../config/pdf/pdfModules.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESCRIPTIVE_NAMES = {
  'temporada-pesca': 'RESOLUCION-MINISTERIAL',
  'novedad-pesca-consumo': 'RESOLUCION-NOVEDAD',
  'tesoreria-prestamos': 'DOCUMENTO-PRESTAMO',
  'requerimiento-compra': 'REQUERIMIENTO-COMPRA',
  'orden-compra': 'ORDEN-COMPRA',
  'cotizacion-ventas': 'COTIZACION-VENTAS',
  'pre-factura': 'PRE-FACTURA',
  'movimiento-almacen': 'MOVIMIENTO-ALMACEN',
  'documentacion-personal': 'DOCUMENTO-PERSONAL',
  'documentacion-embarcacion': 'DOCUMENTO-EMBARCACION',
  'certificados-embarcacion': 'CERTIFICADO-EMBARCACION',
  'fichas-tecnicas': 'FICHA-TECNICA',
  'producto': 'FICHA-PRODUCTO',
  'fichas-tecnicas-boliches': 'FICHA-BOLICHE',
  'boliche-red': 'DOCUMENTO-BOLICHE',
  'ot-mantenimiento': 'OT-MANTENIMIENTO',
  'datos-adicionales-oc': 'DATOS-ADICIONALES-OC',
  'acceso-instalacion': 'DOCUMENTO-VISITANTE',
  'documento-requerido': 'DOCUMENTO-REQUERIDO',
  'confirmaciones-acciones-previas': 'CONFIRMACION-ACCION',
  'confirmaciones-acciones-previas-consumo': 'CONFIRMACION-ACCION-CONSUMO',
  'det-tareas-ot-cotizacion-uno': 'COTIZACION-TAREA-1',
  'det-tareas-ot-cotizacion-dos': 'COTIZACION-TAREA-2',
  'det-tareas-ot-fotos': 'FOTOS-TAREA',
  'det-movs-entrega-rendir-comprobante': 'ENTREGA-RENDIR-COMPROBANTE-MOVIMIENTO',
  'det-movs-entrega-rendir-operacion': 'ENTREGA-RENDIR-COMPROBANTE-OPERACION'
};

class PDFMergeService {
  async mergeDocuments(files, moduleName, metadata = {}) {
    try {
      console.log('📄 [pdfMergeService] Iniciando mergeDocuments');
      console.log('📄 moduleName:', moduleName);
      console.log('📄 files.length:', files.length);
      console.log('📄 metadata:', metadata);

      const config = getModuleConfig(moduleName);
      console.log('📄 Config obtenida:', config);

      if (files.length > config.maxFiles) {
        throw new Error(`Máximo ${config.maxFiles} archivos permitidos`);
      }

      if (!metadata.entityId) {
        throw new Error('Se requiere entityId para generar el nombre del archivo');
      }

      console.log('📄 Creando PDF principal...');
      const mergedPdf = await PDFDocument.create();

      console.log('📄 Procesando archivos...');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📄 Procesando archivo ${i + 1}/${files.length}: ${file.originalname} (${file.mimetype})`);
        
        if (file.mimetype === 'application/pdf') {
          console.log('📄 Es PDF, agregando...');
          await this.addPdfToMerge(mergedPdf, file.buffer);
          console.log('✅ PDF agregado');
        } else if (file.mimetype.startsWith('image/')) {
          console.log('📄 Es imagen, convirtiendo...');
          await this.addImageToMerge(mergedPdf, file.buffer, file.mimetype);
          console.log('✅ Imagen agregada');
        } else {
          console.log('⚠️ Tipo no soportado, saltando');
        }
      }

      console.log('📄 Guardando PDF consolidado...');
      const pdfBytes = await mergedPdf.save();
      console.log('✅ PDF guardado en memoria, tamaño:', pdfBytes.length, 'bytes');
      
      const uploadDir = path.join(__dirname, '../../../', config.uploadPath);
      console.log('📄 Directorio destino:', uploadDir);
      
      if (!fs.existsSync(uploadDir)) {
        console.log('📁 Creando directorio...');
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Directorio creado');
      } else {
        console.log('✅ Directorio ya existe');
      }

      const descriptiveName = DESCRIPTIVE_NAMES[moduleName] || moduleName.toUpperCase();
      const fileName = `${descriptiveName}-${metadata.entityId}.pdf`;
      console.log('📄 Nombre archivo generado:', fileName);
      
      const filePath = path.join(uploadDir, fileName);
      console.log('📄 Ruta completa:', filePath);
      console.log('📄 Escribiendo archivo...');
      fs.writeFileSync(filePath, pdfBytes);
      console.log('✅ Archivo escrito en disco');

      const urlRelativa = `/${config.uploadPath}/${fileName}`;
      console.log('📄 URL relativa:', urlRelativa);

      const result = {
        success: true,
        url: urlRelativa,
        fileName: fileName,
        size: pdfBytes.length,
        filesProcessed: files.length
      };

      console.log('✅ [pdfMergeService] Merge completado exitosamente:', result);
      return result;

    } catch (error) {
      console.error('❌ [pdfMergeService] Error en mergeDocuments:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async addPdfToMerge(mergedPdf, pdfBuffer) {
    try {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (error) {
      console.error('Error al agregar PDF:', error);
      throw new Error('Error al procesar archivo PDF');
    }
  }

  async addImageToMerge(mergedPdf, imageBuffer, mimetype) {
    try {
      const processedImage = await sharp(imageBuffer)
        .resize(1200, null, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const image = await mergedPdf.embedJpg(processedImage);
      
      const { width, height } = image.scale(1);
      const page = mergedPdf.addPage([width, height]);
      
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });

    } catch (error) {
      console.error('Error al agregar imagen:', error);
      throw new Error('Error al procesar imagen');
    }
  }

  async convertImageToPdf(imageBuffer, mimetype) {
    try {
      const pdfDoc = await PDFDocument.create();
      
      const processedImage = await sharp(imageBuffer)
        .resize(1200, null, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const image = await pdfDoc.embedJpg(processedImage);
      const { width, height } = image.scale(1);
      const page = pdfDoc.addPage([width, height]);
      
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });

      return await pdfDoc.save();

    } catch (error) {
      console.error('Error al convertir imagen a PDF:', error);
      throw error;
    }
  }
}

export default new PDFMergeService();