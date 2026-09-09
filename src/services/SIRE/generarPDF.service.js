import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';

/**
 * Genera un PDF profesional desde los datos parseados del XML UBL 2.1
 * Incluye código QR con el hash de la firma digital
 */
async function generarPDFDesdeXML(datosXML, periodo) {
  const uploadDir = path.join(process.cwd(), 'uploads', 'sire', 'pdfs', periodo);
  await fs.mkdir(uploadDir, { recursive: true });
  
  const filename = `${datosXML.emisorRuc}-${datosXML.serieNumero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
  const filepath = path.join(uploadDir, filename);
  
  // Crear PDF
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const pageWidth = 595.28;  // A4
  const pageHeight = 841.89;
  const margin = 40;
  
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - margin;
  
  // Colores
  const colorPrimary = rgb(0.1, 0.2, 0.4); // Azul corporativo
  const colorDark = rgb(0.2, 0.2, 0.2);
  const colorGray = rgb(0.92, 0.92, 0.92);
  const colorWhite = rgb(1, 1, 1);
  
  // Función centrar texto
  const drawCentered = (text, y, size, font, color = colorDark) => {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - width) / 2,
      y: y,
      size: size,
      font: font,
      color: color
    });
  };
  
  // --- ENCABEZADO EMISOR ---
  const razonSocialTruncada = (datosXML.emisorNombre || '').substring(0, 50);
  page.drawText(razonSocialTruncada, {
    x: margin,
    y: yPos,
    size: 13,
    font: fontBold,
    color: colorPrimary
  });
  yPos -= 16;
  
  page.drawText(`RUC: ${datosXML.emisorRuc || ''}`, {
    x: margin,
    y: yPos,
    size: 10,
    font: fontNormal,
    color: colorDark
  });
  yPos -= 12;
  
  if (datosXML.emisorDireccion) {
    const direccionTruncada = datosXML.emisorDireccion.substring(0, 60);
    page.drawText(direccionTruncada, {
      x: margin,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorDark
    });
    yPos -= 12;
  }
  
  // --- RECUADRO TIPO COMPROBANTE (derecha superior) ---
  const boxX = pageWidth - 200;
  const boxY = pageHeight - margin;
  const boxWidth = 160;
  const boxHeight = 70;
  
  page.drawRectangle({
    x: boxX,
    y: boxY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderColor: colorPrimary,
    borderWidth: 1.5
  });
  
  const tipoDocTexto = datosXML.tipoDocumento === '01' ? 'FACTURA ELECTRÓNICA' :
                       datosXML.tipoDocumento === '03' ? 'BOLETA ELECTRÓNICA' :
                       datosXML.tipoDocumento === '07' ? 'NOTA DE CRÉDITO' :
                       datosXML.tipoDocumento === '08' ? 'NOTA DE DÉBITO' : 'COMPROBANTE';
  
  const tipoWidth = fontBold.widthOfTextAtSize(tipoDocTexto, 9);
  page.drawText(tipoDocTexto, {
    x: boxX + (boxWidth - tipoWidth) / 2,
    y: boxY - 20,
    size: 9,
    font: fontBold,
    color: colorPrimary
  });
  
  const serieWidth = fontBold.widthOfTextAtSize(datosXML.serieNumero, 12);
  page.drawText(datosXML.serieNumero, {
    x: boxX + (boxWidth - serieWidth) / 2,
    y: boxY - 40,
    size: 12,
    font: fontBold,
    color: colorDark
  });
  
  // --- LÍNEA SEPARADORA ---
  yPos -= 10;
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 1,
    color: colorGray
  });
  
  // --- DATOS DEL CLIENTE ---
  yPos -= 20;
  page.drawText('CLIENTE:', {
    x: margin,
    y: yPos,
    size: 9,
    font: fontBold,
    color: colorDark
  });
  yPos -= 14;
  
  const receptorTruncado = datosXML.receptorRazonSocial.substring(0, 55);
  page.drawText(receptorTruncado, {
    x: margin,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  
  page.drawText(`RUC: ${datosXML.receptorRuc}`, {
    x: pageWidth - 200,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  yPos -= 18;
  
  // --- FECHAS Y MONEDA ---
  page.drawText(`Fecha Emisión: ${datosXML.fechaEmision}`, {
    x: margin,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  
  page.drawText(`Moneda: ${datosXML.moneda}`, {
    x: pageWidth - 200,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  yPos -= 25;
  
  // --- TABLA DE DETALLES ---
  // Cabecera
  page.drawRectangle({
    x: margin,
    y: yPos - 5,
    width: pageWidth - 2 * margin,
    height: 18,
    color: colorPrimary
  });
  
  page.drawText('Cant.', {
    x: margin + 5,
    y: yPos,
    size: 8,
    font: fontBold,
    color: colorWhite
  });
  
  page.drawText('U.M.', {
    x: margin + 50,
    y: yPos,
    size: 8,
    font: fontBold,
    color: colorWhite
  });
  
  page.drawText('Descripción', {
    x: margin + 90,
    y: yPos,
    size: 8,
    font: fontBold,
    color: colorWhite
  });
  
  page.drawText('P. Unit.', {
    x: pageWidth - 150,
    y: yPos,
    size: 8,
    font: fontBold,
    color: colorWhite
  });
  
  page.drawText('Importe', {
    x: pageWidth - 80,
    y: yPos,
    size: 8,
    font: fontBold,
    color: colorWhite
  });
  
  // Filas de Items
  yPos -= 20;
  for (const item of datosXML.items) {
    if (yPos < 150) break; // Evitar overflow (implementar paginación si es necesario)
    
    page.drawText(item.cantidad.toFixed(2), {
      x: margin + 5,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorDark
    });
    
    page.drawText(item.unidadMedida.substring(0, 6), {
      x: margin + 50,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorDark
    });
    
    const descripcionTruncada = item.descripcion.substring(0, 60);
    page.drawText(descripcionTruncada, {
      x: margin + 90,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorDark
    });
    
    page.drawText(item.precioUnitario.toFixed(2), {
      x: pageWidth - 150,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorDark
    });
    
    page.drawText(item.montoTotal.toFixed(2), {
      x: pageWidth - 80,
      y: yPos,
      size: 8,
      font: fontNormal,
      color: colorDark
    });
    
    yPos -= 14;
  }
  
  // --- RESUMEN DE TOTALES ---
  yPos -= 15;
  page.drawLine({
    start: { x: pageWidth - 220, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 1,
    color: colorGray
  });
  
  yPos -= 16;
  page.drawText('Op. Gravada:', {
    x: pageWidth - 200,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  page.drawText(`${datosXML.moneda} ${datosXML.totalGravado.toFixed(2)}`, {
    x: pageWidth - 100,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  
  yPos -= 14;
  page.drawText('IGV (18%):', {
    x: pageWidth - 200,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  page.drawText(`${datosXML.moneda} ${datosXML.totalIgv.toFixed(2)}`, {
    x: pageWidth - 100,
    y: yPos,
    size: 9,
    font: fontNormal,
    color: colorDark
  });
  
  if (datosXML.totalDescuentos > 0) {
    yPos -= 14;
    page.drawText('Descuentos:', {
      x: pageWidth - 200,
      y: yPos,
      size: 9,
      font: fontNormal,
      color: colorDark
    });
    page.drawText(`-${datosXML.moneda} ${datosXML.totalDescuentos.toFixed(2)}`, {
      x: pageWidth - 100,
      y: yPos,
      size: 9,
      font: fontNormal,
      color: colorDark
    });
  }
  
  yPos -= 16;
  page.drawRectangle({
    x: pageWidth - 205,
    y: yPos - 5,
    width: 165,
    height: 18,
    color: colorGray
  });
  
  page.drawText('Importe Total:', {
    x: pageWidth - 200,
    y: yPos,
    size: 10,
    font: fontBold,
    color: colorPrimary
  });
  page.drawText(`${datosXML.moneda} ${datosXML.totalPagar.toFixed(2)}`, {
    x: pageWidth - 100,
    y: yPos,
    size: 10,
    font: fontBold,
    color: colorPrimary
  });
  
  // --- CÓDIGO QR (esquina inferior izquierda) ---
  if (datosXML.digestValue) {
    // Generar texto para QR: RUC|TipoDoc|Serie|Numero|Total|FechaEmision|Hash
    const qrText = `${datosXML.emisorRuc}|${datosXML.tipoDocumento}|${datosXML.serieNumero}|${datosXML.totalPagar.toFixed(2)}|${datosXML.fechaEmision}|${datosXML.digestValue.substring(0, 20)}`;
    
    try {
      // Generar QR como PNG buffer
      const qrBuffer = await QRCode.toBuffer(qrText, {
        width: 100,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
      
      // Embed imagen QR en PDF
      const qrImage = await pdfDoc.embedPng(qrBuffer);
      const qrDims = qrImage.scale(0.8);
      
      page.drawImage(qrImage, {
        x: margin,
        y: 50,
        width: qrDims.width,
        height: qrDims.height
      });
      
      page.drawText('Código QR de verificación', {
        x: margin,
        y: 35,
        size: 7,
        font: fontNormal,
        color: rgb(0.5, 0.5, 0.5)
      });
    } catch (error) {
      // Error generando QR
    }
  }
  
  // --- PIE DE PÁGINA ---
  drawCentered('Representación Impresa de Comprobante Electrónico', 60, 8, fontNormal, rgb(0.5, 0.5, 0.5));
  drawCentered('Generado desde ERP Pesquera MEGUI - Datos obtenidos de SUNAT SIRE', 50, 7, fontNormal, rgb(0.5, 0.5, 0.5));
  drawCentered(`Fecha de generación: ${new Date().toLocaleDateString('es-PE')}`, 40, 7, fontNormal, rgb(0.5, 0.5, 0.5));
  
  // Guardar archivo en servidor
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(filepath, pdfBytes);
  
  return `/uploads/sire/${periodo}/pdfs/${filename}`;
}

export default {
  generarPDFDesdeXML
};
