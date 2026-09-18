/**
 * voucherContableMovimientoCaja.service.js
 * 
 * Servicio para generar el voucher contable (comprobante de diario) de un MovimientoCaja
 * 
 * FORMATO PROFESIONAL:
 * - Header con logo y datos de empresa
 * - Información del movimiento
 * - Cuenta bancaria
 * - Monto total (numérico + letras)
 * - Tabla de asientos contables
 * - Origen del movimiento
 * - Firmas y validaciones
 * 
 * USO:
 * 1. Proceso de pago CxC (automático)
 * 2. Visualización/edición de MovimientoCaja (bajo demanda)
 * 
 * @author ERP Megui
 * @version 1.0.0
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../config/prismaClient.js';
import { numeroALetras } from '../../utils/numeroALetras.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generar voucher contable de un MovimientoCaja
 * @param {number} movimientoId - ID del MovimientoCaja
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
export async function generarVoucherContableMovimientoCaja(movimientoId) {
  try {
    // 1. Obtener datos del movimiento con todas las relaciones
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id: Number(movimientoId) },
      include: {
        empresa: true,
        tipoMovimiento: true,
        moneda: true,
        cuentaCorrienteOrigen: {
          include: {
            banco: true,
            tipoCuentaCorriente: true,
            cuentaContable: true
          }
        },
        cuentaCorrienteDestino: {
          include: {
            banco: true,
            tipoCuentaCorriente: true,
            cuentaContable: true
          }
        },
        asientosContables: {
          include: {
            detalles: {
              include: {
                planCuenta: true,
                entidadComercial: true
              }
            }
          }
        },
        // Relaciones de origen
        pagosCuentaPorCobrar: true
      }
    });

    if (!movimiento) {
      throw new Error(`MovimientoCaja ${movimientoId} no encontrado`);
    }

    // Debug: Verificar datos cargados
    console.log('📊 Datos del movimiento cargados:');
    console.log('  - Moneda:', movimiento.moneda ? `${movimiento.moneda.nombre} (${movimiento.moneda.simbolo})` : 'NO CARGADA');
    console.log('  - Tipo Movimiento:', movimiento.tipoMovimiento ? movimiento.tipoMovimiento.nombre : 'NO CARGADO');
    console.log('  - Asientos:', movimiento.asientosContables ? `${movimiento.asientosContables.length} asientos` : 'NO CARGADOS');
    console.log('  - Cuenta Origen:', movimiento.cuentaCorrienteOrigen ? 'Cargada' : 'No cargada');
    console.log('  - Empresa:', movimiento.empresa ? movimiento.empresa.razonSocial : 'NO CARGADA');

    // 2. Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // 3. Cargar fuentes
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 4. Colores
    const colorPrimario = rgb(0.1, 0.3, 0.5); // Azul oscuro
    const colorSecundario = rgb(0.4, 0.4, 0.4); // Gris
    const colorBorde = rgb(0.8, 0.8, 0.8); // Gris claro

    let yPosition = height - 50;

    // 5. HEADER - Datos de la empresa
    page.drawText(movimiento.empresa.razonSocial || 'MEGUI INVESTMENT S.A.C.', {
      x: 50,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: colorPrimario
    });

    yPosition -= 15;
    page.drawText(`RUC: ${movimiento.empresa.ruc || '20603686498'}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: fontNormal,
      color: colorSecundario
    });

    // ID y Fecha en la esquina superior derecha
    page.drawText(`ID: ${String(movimiento.id).padStart(10, '0')}`, {
      x: width - 150,
      y: height - 50,
      size: 10,
      font: fontNormal,
      color: colorSecundario
    });

    const fechaFormateada = new Date(movimiento.fechaOperacionMovCaja || movimiento.fecha).toLocaleDateString('es-PE');
    page.drawText(fechaFormateada, {
      x: width - 150,
      y: height - 65,
      size: 10,
      font: fontNormal,
      color: colorSecundario
    });

    yPosition -= 30;

    // 6. TÍTULO
    const titulo = 'COMPROBANTE DE DIARIO - MOVIMIENTO DE CAJA';
    const tituloWidth = fontBold.widthOfTextAtSize(titulo, 12);
    page.drawText(titulo, {
      x: (width - tituloWidth) / 2,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: colorPrimario
    });

    // Línea decorativa
    page.drawLine({
      start: { x: (width - tituloWidth) / 2, y: yPosition - 5 },
      end: { x: (width + tituloWidth) / 2, y: yPosition - 5 },
      thickness: 2,
      color: colorPrimario
    });

    yPosition -= 40;

    // 7. INFORMACIÓN DEL MOVIMIENTO
    dibujarSeccion(page, 'INFORMACIÓN DEL MOVIMIENTO', 50, yPosition, width - 100, fontBold, colorPrimario, colorBorde);
    yPosition -= 25;

    const infoMovimiento = [
      { label: 'ID Movimiento:', value: String(movimiento.id) },
      { label: 'Tipo:', value: `${movimiento.tipoMovimiento.nombre} (${movimiento.tipoMovimiento.tipoOperacion})` },
      { label: 'Fecha:', value: fechaFormateada },
      { label: 'Glosa:', value: movimiento.descripcion || 'N/A' },
      { label: 'Estado:', value: 'APROBADO' }
    ];

    infoMovimiento.forEach(item => {
      page.drawText(item.label, {
        x: 60,
        y: yPosition,
        size: 9,
        font: fontBold,
        color: colorSecundario
      });

      const valorTexto = item.value.length > 80 ? item.value.substring(0, 80) + '...' : item.value;
      page.drawText(valorTexto, {
        x: 180,
        y: yPosition,
        size: 9,
        font: fontNormal,
        color: rgb(0, 0, 0)
      });

      yPosition -= 15;
    });

    yPosition -= 10;

    // 8. CUENTA BANCARIA
    const cuentaBancaria = movimiento.cuentaCorrienteOrigen || movimiento.cuentaCorrienteDestino;
    if (cuentaBancaria) {
      dibujarSeccion(page, 'CUENTA BANCARIA', 50, yPosition, width - 100, fontBold, colorPrimario, colorBorde);
      yPosition -= 25;

      const infoCuenta = [
        { label: 'Banco:', value: cuentaBancaria.banco?.nombre || 'N/A' },
        { label: 'Cuenta Contable:', value: `${cuentaBancaria.cuentaContable?.codigoCuenta || ''} - ${cuentaBancaria.cuentaContable?.nombre || ''}` },
        { label: 'N° Cuenta:', value: cuentaBancaria.numeroCuenta || 'N/A' },
        { label: 'Moneda:', value: movimiento.moneda ? `${movimiento.moneda.codigoSunat} (${movimiento.moneda.nombre})` : 'N/A' },
        { label: 'N° Operación:', value: movimiento.numeroOperacion || 'S/N' }
      ];

      infoCuenta.forEach(item => {
        page.drawText(item.label, {
          x: 60,
          y: yPosition,
          size: 9,
          font: fontBold,
          color: colorSecundario
        });

        page.drawText(item.value, {
          x: 180,
          y: yPosition,
          size: 9,
          font: fontNormal,
          color: rgb(0, 0, 0)
        });

        yPosition -= 15;
      });

      yPosition -= 10;
    }

    // 9. MONTO TOTAL
    dibujarSeccion(page, 'MONTO TOTAL', 50, yPosition, width - 100, fontBold, colorPrimario, colorBorde);
    yPosition -= 25;

    const montoTexto = `${movimiento.moneda?.simbolo || 'S/'} ${Number(movimiento.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    page.drawText('Monto:', {
      x: 60,
      y: yPosition,
      size: 9,
      font: fontBold,
      color: colorSecundario
    });

    page.drawText(montoTexto, {
      x: 180,
      y: yPosition,
      size: 11,
      font: fontBold,
      color: colorPrimario
    });

    yPosition -= 20;

    const montoEnLetras = numeroALetras(Number(movimiento.monto), movimiento.moneda?.nombre?.toUpperCase() || 'SOLES');
    page.drawText('Son:', {
      x: 60,
      y: yPosition,
      size: 9,
      font: fontBold,
      color: colorSecundario
    });

    // Dividir monto en letras si es muy largo
    const palabras = montoEnLetras.split(' ');
    let linea = '';
    let yTemp = yPosition;
    
    palabras.forEach((palabra, index) => {
      const testLinea = linea + palabra + ' ';
      if (fontNormal.widthOfTextAtSize(testLinea, 9) > (width - 200)) {
        page.drawText(linea, {
          x: 180,
          y: yTemp,
          size: 9,
          font: fontNormal,
          color: rgb(0, 0, 0)
        });
        linea = palabra + ' ';
        yTemp -= 12;
      } else {
        linea = testLinea;
      }
    });

    if (linea.trim()) {
      page.drawText(linea, {
        x: 180,
        y: yTemp,
        size: 9,
        font: fontNormal,
        color: rgb(0, 0, 0)
      });
    }

    yPosition = yTemp - 20;

    // 10. ASIENTOS CONTABLES
    if (movimiento.asientosContables && movimiento.asientosContables.length > 0) {
      dibujarSeccion(page, 'ASIENTOS CONTABLES GENERADOS', 50, yPosition, width - 100, fontBold, colorPrimario, colorBorde);
      yPosition -= 25;

      // Tabla de asientos
      dibujarTablaAsientos(page, movimiento.asientosContables, 50, yPosition, width - 100, fontBold, fontNormal, colorPrimario, colorSecundario, colorBorde);
      yPosition -= (movimiento.asientosContables[0].detalles.length * 15 + 60);
    }

    // 11. ORIGEN DEL MOVIMIENTO
    if (movimiento.pagosCuentaPorCobrar && movimiento.pagosCuentaPorCobrar.length > 0) {
      yPosition -= 10;
      dibujarSeccion(page, 'ORIGEN DEL MOVIMIENTO', 50, yPosition, width - 100, fontBold, colorPrimario, colorBorde);
      yPosition -= 25;

      const pago = movimiento.pagosCuentaPorCobrar[0];
      // Nota: pagosCuentaPorCobrar es un array, pero no incluye las relaciones anidadas
      // Por ahora mostramos solo el ID del pago

      const infoOrigen = [
        { label: 'ID Pago Origen:', value: String(pago.id) },
        { label: 'Tipo:', value: 'Pago Cuenta Por Cobrar' }
      ];

      infoOrigen.forEach(item => {
        page.drawText(item.label, {
          x: 60,
          y: yPosition,
          size: 9,
          font: fontBold,
          color: colorSecundario
        });

        page.drawText(item.value, {
          x: 180,
          y: yPosition,
          size: 9,
          font: fontNormal,
          color: rgb(0, 0, 0)
        });

        yPosition -= 15;
      });
    }

    // 12. FIRMAS (al final de la página)
    yPosition = 100;
    dibujarFirmas(page, 50, yPosition, width - 100, fontBold, fontNormal, colorSecundario);

    // 13. Footer
    page.drawText('Documento generado automáticamente - Sistema ERP Megui', {
      x: (width - fontNormal.widthOfTextAtSize('Documento generado automáticamente - Sistema ERP Megui', 8)) / 2,
      y: 30,
      size: 8,
      font: fontNormal,
      color: colorSecundario
    });

    // 14. Generar PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('Error al generar voucher contable:', error);
    throw error;
  }
}

/**
 * Dibujar sección con título
 */
function dibujarSeccion(page, titulo, x, y, width, font, colorTitulo, colorBorde) {
  // Rectángulo de fondo
  page.drawRectangle({
    x: x,
    y: y - 15,
    width: width,
    height: 20,
    borderColor: colorBorde,
    borderWidth: 1
  });

  // Título
  page.drawText(titulo, {
    x: x + 5,
    y: y - 10,
    size: 10,
    font: font,
    color: colorTitulo
  });
}

/**
 * Dibujar tabla de asientos contables
 */
function dibujarTablaAsientos(page, asientos, x, y, width, fontBold, fontNormal, colorPrimario, colorSecundario, colorBorde) {
  const colWidths = [60, 150, 80, 70, 60, 60];
  const headers = ['Cuenta', 'Descripción', 'Cliente', 'Doc.', 'Debe', 'Haber'];

  // Header de la tabla
  let xPos = x;
  headers.forEach((header, i) => {
    page.drawRectangle({
      x: xPos,
      y: y - 15,
      width: colWidths[i],
      height: 20,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: colorBorde,
      borderWidth: 1
    });

    page.drawText(header, {
      x: xPos + 3,
      y: y - 10,
      size: 8,
      font: fontBold,
      color: colorPrimario
    });

    xPos += colWidths[i];
  });

  y -= 20;

  // Detalles del primer asiento (asumimos que todos los asientos del movimiento tienen la misma estructura)
  const asiento = asientos[0];
  let totalDebe = 0;
  let totalHaber = 0;

  asiento.detalles.forEach(detalle => {
    xPos = x;

    // Cuenta
    page.drawText(detalle.planCuenta.codigoCuenta, {
      x: xPos + 3,
      y: y,
      size: 8,
      font: fontNormal,
      color: rgb(0, 0, 0)
    });
    xPos += colWidths[0];

    // Descripción (truncar si es muy largo)
    const desc = detalle.planCuenta.nombre.length > 20 
      ? detalle.planCuenta.nombre.substring(0, 20) + '...'
      : detalle.planCuenta.nombre;
    page.drawText(desc, {
      x: xPos + 3,
      y: y,
      size: 8,
      font: fontNormal,
      color: rgb(0, 0, 0)
    });
    xPos += colWidths[1];

    // Cliente
    const cliente = detalle.entidadComercial?.razonSocial || '';
    const clienteCorto = cliente.length > 12 ? cliente.substring(0, 12) + '...' : cliente;
    page.drawText(clienteCorto, {
      x: xPos + 3,
      y: y,
      size: 8,
      font: fontNormal,
      color: rgb(0, 0, 0)
    });
    xPos += colWidths[2];

    // Documento
    page.drawText(detalle.numeroDocumento || '', {
      x: xPos + 3,
      y: y,
      size: 8,
      font: fontNormal,
      color: rgb(0, 0, 0)
    });
    xPos += colWidths[3];

    // Debe
    const debe = Number(detalle.debe);
    totalDebe += debe;
    if (debe > 0) {
      page.drawText(debe.toLocaleString('es-PE', { minimumFractionDigits: 2 }), {
        x: xPos + 3,
        y: y,
        size: 8,
        font: fontNormal,
        color: rgb(0, 0, 0)
      });
    }
    xPos += colWidths[4];

    // Haber
    const haber = Number(detalle.haber);
    totalHaber += haber;
    if (haber > 0) {
      page.drawText(haber.toLocaleString('es-PE', { minimumFractionDigits: 2 }), {
        x: xPos + 3,
        y: y,
        size: 8,
        font: fontNormal,
        color: rgb(0, 0, 0)
      });
    }

    y -= 15;
  });

  // Totales
  y -= 5;
  page.drawLine({
    start: { x: x, y: y },
    end: { x: x + width, y: y },
    thickness: 1,
    color: colorBorde
  });

  y -= 15;
  xPos = x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];

  page.drawText('TOTALES:', {
    x: x + 3,
    y: y,
    size: 9,
    font: fontBold,
    color: colorPrimario
  });

  page.drawText(totalDebe.toLocaleString('es-PE', { minimumFractionDigits: 2 }), {
    x: xPos + 3,
    y: y,
    size: 9,
    font: fontBold,
    color: colorPrimario
  });

  page.drawText(totalHaber.toLocaleString('es-PE', { minimumFractionDigits: 2 }), {
    x: xPos + colWidths[4] + 3,
    y: y,
    size: 9,
    font: fontBold,
    color: colorPrimario
  });
}

/**
 * Dibujar sección de firmas
 */
function dibujarFirmas(page, x, y, width, fontBold, fontNormal, colorSecundario) {
  const colWidth = width / 4;
  const firmas = ['Elaborado por', 'V°B° Admin', 'V°B° Contador', 'Recibí conforme'];

  firmas.forEach((firma, i) => {
    const xPos = x + (i * colWidth);

    // Rectángulo
    page.drawRectangle({
      x: xPos,
      y: y - 40,
      width: colWidth - 5,
      height: 50,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    });

    // Título
    page.drawText(firma, {
      x: xPos + 5,
      y: y - 10,
      size: 8,
      font: fontBold,
      color: colorSecundario
    });

    // Línea para firma
    page.drawLine({
      start: { x: xPos + 5, y: y - 30 },
      end: { x: xPos + colWidth - 10, y: y - 30 },
      thickness: 0.5,
      color: colorSecundario
    });

    if (i === 3) {
      page.drawText('DNI: _________', {
        x: xPos + 5,
        y: y - 38,
        size: 7,
        font: fontNormal,
        color: colorSecundario
      });
    }
  });
}

export default {
  generarVoucherContableMovimientoCaja
};
