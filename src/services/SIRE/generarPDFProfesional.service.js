import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';

/**
 * Genera un PDF profesional de comprobante electrónico con código QR
 * Cumple con normativa SUNAT para representación impresa
 */
async function generarPDFComprobanteConQR(datosXML, periodo) {
  const uploadDir = path.join(process.cwd(), 'uploads', 'sire', 'pdfs', periodo);
  await fs.mkdir(uploadDir, { recursive: true });
  
  const filename = `${datosXML.emisorRuc}-${datosXML.serieNumero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
  const filepath = path.join(uploadDir, filename);
  
  // Crear documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  
  // Fuentes
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Dimensiones
  const { width, height } = page.getSize();
  const margin = 40;
  let yPos = height - margin;
  
  // Colores
  const colorPrimary = rgb(0.2, 0.3, 0.5);
  const colorSecondary = rgb(0.4, 0.4, 0.4);
  const colorText = rgb(0.1, 0.1, 0.1);
  const colorBorder = rgb(0.7, 0.7, 0.7);
  
  // ============================================
  // SECCIÓN 1: ENCABEZADO CON DATOS DEL EMISOR
  // ============================================
  
  // Logo o nombre de empresa (izquierda)
  page.drawText(datosXML.emisorNombre.substring(0, 45), {
    x: margin,
    y: yPos,
    size: 14,
    font: fontBold,
    color: colorPrimary
  });
  yPos -= 18;
  
  page.drawText(`RUC: ${datosXML.emisorRuc}`, {
    x: margin,
    y: yPos,
    size: 10,
    font: fontNormal,
    color: colorText
  });
  yPos -= 14;
  
  if (datosXML.emisorDireccion) {
    page.drawText(datosXML.emisorDireccion.substring(0, 70), {
      x: margin,
      y: yPos,
      size: 9,
      font: fontNormal,
      color: colorSecondary
    });
  }
  
  // ============================================
  // RECUADRO TIPO DE COMPROBANTE (derecha superior)
  // ============================================
  
  const boxX = width - 180;
  const boxY = height - margin;
  const boxWidth = 140;
  const boxHeight = 80;
  
  // Borde del recuadro
  page.drawRectangle({
    x: boxX,
    y: boxY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderColor: colorPrimary,
    borderWidth: 2
  });
  
  // Tipo de documento
  const tipoDocWidth = fontBold.widthOfTextAtSize(datosXML.tipoDocumento, 9);
  page.drawText(datosXML.tipoDocumento, {
    x: boxX + (boxWidth - tipoDocWidth) / 2,
    y: boxY - 25,
    size: 9,
    font: fontBold,
    color: colorPrimary
  });
  
  // RUC del emisor
  const rucText = `RUC: ${datosXML.emisorRuc}`;
  const rucWidth = fontNormal.widthOfTextAtSize(rucText, 9);
  page.drawText(rucText, {
    x: boxX + (boxWidth - rucWidth) / 2,
    y: boxY - 40,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  
  // Serie y número
  const serieWidth = fontBold.widthOfTextAtSize(datosXML.serieNumero, 13);
  page.drawText(datosXML.serieNumero, {
    x: boxX + (boxWidth - serieWidth) / 2,
    y: boxY - 60,
    size: 13,
    font: fontBold,
    color: colorPrimary
  });
  
  yPos -= 40;
  
  // ============================================
  // SECCIÓN 2: DATOS DEL CLIENTE
  // ============================================
  
  yPos -= 20;
  
  // Título
  page.drawRectangle({
    x: margin,
    y: yPos - 18,
    width: width - 2 * margin,
    height: 20,
    color: rgb(0.95, 0.95, 0.95)
  });
  
  page.drawText('DATOS DEL CLIENTE', {
    x: margin + 5,
    y: yPos - 13,
    size: 10,
    font: fontBold,
    color: colorPrimary
  });
  
  yPos -= 30;
  
  // Cliente
  page.drawText(`Cliente: ${datosXML.clienteNombre}`, {
    x: margin + 5,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  yPos -= 14;
  
  page.drawText(`RUC/DNI: ${datosXML.clienteRuc}`, {
    x: margin + 5,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  
  // Fecha de emisión (derecha)
  page.drawText(`Fecha de Emisión: ${datosXML.fechaEmision}`, {
    x: width - margin - 150,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  
  yPos -= 30;
  
  // ============================================
  // SECCIÓN 3: DETALLE DE ÍTEMS
  // ============================================
  
  // Encabezado de tabla
  page.drawRectangle({
    x: margin,
    y: yPos - 18,
    width: width - 2 * margin,
    height: 20,
    color: rgb(0.95, 0.95, 0.95)
  });
  
  const colCantidad = margin + 5;
  const colUnidad = margin + 50;
  const colCodigo = margin + 100;
  const colDescripcion = margin + 160;
  const colPrecioUnit = width - margin - 150;
  const colICBPER = width - margin - 80;
  
  page.drawText('Cantidad', { x: colCantidad, y: yPos - 13, size: 9, font: fontBold, color: colorPrimary });
  page.drawText('Unidad Medida', { x: colUnidad, y: yPos - 13, size: 8, font: fontBold, color: colorPrimary });
  page.drawText('Código', { x: colCodigo, y: yPos - 13, size: 8, font: fontBold, color: colorPrimary });
  page.drawText('Descripción', { x: colDescripcion, y: yPos - 13, size: 9, font: fontBold, color: colorPrimary });
  page.drawText('Valor Unitario', { x: colPrecioUnit, y: yPos - 13, size: 8, font: fontBold, color: colorPrimary });
  page.drawText('ICBPER', { x: colICBPER, y: yPos - 13, size: 8, font: fontBold, color: colorPrimary });
  
  yPos -= 25;
  
  // Ítems
  const items = datosXML.items || [];
  for (const item of items.slice(0, 15)) { // Máximo 15 ítems en primera página
    // Cantidad
    page.drawText(item.cantidad.toFixed(0), {
      x: colCantidad,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorText
    });
    
    // Unidad
    page.drawText(item.unidad || 'UNIDAD', {
      x: colUnidad,
      y: yPos,
      size: 7,
      font: fontNormal,
      color: colorText
    });
    
    // Código (si existe)
    page.drawText(item.codigo || '', {
      x: colCodigo,
      y: yPos,
      size: 7,
      font: fontNormal,
      color: colorText
    });
    
    // Descripción
    const descripcion = (item.descripcion || '').substring(0, 45);
    page.drawText(descripcion, {
      x: colDescripcion,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorText
    });
    
    // Precio Unitario
    page.drawText(item.precioUnitario.toFixed(2), {
      x: colPrecioUnit,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorText
    });
    
    // ICBPER
    page.drawText('0.00', {
      x: colICBPER,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorText
    });
    
    yPos -= 14;
    
    if (yPos < 250) break; // Espacio para totales y QR
  }
  
  // ============================================
  // SECCIÓN 4: TOTALES
  // ============================================
  
  yPos = 220; // Posición fija para totales
  
  const totalesX = width - margin - 150;
  
  // Subtotal
  page.drawText('Sub Total:', {
    x: totalesX,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  page.drawText(`${datosXML.moneda} ${datosXML.subtotal.toFixed(2)}`, {
    x: totalesX + 80,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  yPos -= 16;
  
  // IGV
  page.drawText('IGV (18%):', {
    x: totalesX,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  page.drawText(`${datosXML.moneda} ${datosXML.igv.toFixed(2)}`, {
    x: totalesX + 80,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorText
  });
  yPos -= 20;
  
  // Total
  page.drawRectangle({
    x: totalesX - 5,
    y: yPos - 5,
    width: 145,
    height: 22,
    color: rgb(0.95, 0.95, 0.95)
  });
  
  page.drawText('TOTAL:', {
    x: totalesX,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorPrimary
  });
  page.drawText(`${datosXML.moneda} ${datosXML.total.toFixed(2)}`, {
    x: totalesX + 80,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorPrimary
  });
  
  // ============================================
  // SECCIÓN 5: CÓDIGO QR (según normativa SUNAT)
  // ============================================
  
  if (datosXML.qrData) {
    // Formato QR según normativa SUNAT:
    // RUC|TIPO_DOC|SERIE|NUMERO|IGV|TOTAL|FECHA|TIPO_DOC_RECEPTOR|NUM_DOC_RECEPTOR
    const qrText = [
      datosXML.qrData.rucEmisor,
      datosXML.qrData.tipoDoc,
      datosXML.qrData.serie,
      datosXML.qrData.numero,
      datosXML.qrData.igv,
      datosXML.qrData.total,
      datosXML.qrData.fecha,
      datosXML.qrData.tipoDocReceptor,
      datosXML.qrData.numDocReceptor
    ].join('|');
    
    // Generar QR
    const qrBuffer = await QRCode.toBuffer(qrText, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 120,
      margin: 1
    });
    
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const qrSize = 100;
    
    page.drawImage(qrImage, {
      x: margin + 20,
      y: 100,
      width: qrSize,
      height: qrSize
    });
    
    // Texto bajo el QR
    page.drawText('Código QR', {
      x: margin + 35,
      y: 85,
      size: 8,
      font: fontBold,
      color: colorSecondary
    });
    
    page.drawText('Representación impresa del', {
      x: margin + 10,
      y: 72,
      size: 7,
      font: fontNormal,
      color: colorSecondary
    });
    
    page.drawText('Comprobante Electrónico', {
      x: margin + 15,
      y: 62,
      size: 7,
      font: fontNormal,
      color: colorSecondary
    });
  }
  
  // ============================================
  // PIE DE PÁGINA
  // ============================================
  
  page.drawText('Este documento es una representación impresa del Comprobante Electrónico generado en el Sistema SUNAT', {
    x: margin,
    y: 40,
    size: 7,
    font: fontNormal,
    color: colorSecondary
  });
  
  // Guardar PDF
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(filepath, pdfBytes);
  
  return filepath;
}

export default {
  generarPDFComprobanteConQR
};
