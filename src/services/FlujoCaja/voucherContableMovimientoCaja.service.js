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
            cuentaContable: true,
            moneda: true  // ✅ INCLUIR MONEDA DE LA CUENTA
          }
        },
        cuentaCorrienteDestino: {
          include: {
            banco: true,
            tipoCuentaCorriente: true,
            cuentaContable: true,
            moneda: true  // ✅ INCLUIR MONEDA DE LA CUENTA
          }
        },
        // Relaciones de origen
        pagosCuentaPorCobrar: true,
        pagosCuentaPorPagar: true
      }
    });

    if (!movimiento) {
      throw new Error(`MovimientoCaja ${movimientoId} no encontrado`);
    }

    // ✅ CONSULTA MANUAL: Obtener asientos contables por procesoOrigenId
    // La relación polimórfica no funciona automáticamente con Prisma
    // ⚠️ IMPORTANTE: Solo traer el asiento MÁS RECIENTE (último creado)
    
    // Buscar el submódulo MovimientoCaja para filtrar correctamente
    const submoduloMovCaja = await prisma.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: 'MovimientoCaja',
        activo: true
      }
    });
    
    const asientosContables = await prisma.asientoContable.findMany({
      where: {
        procesoOrigenId: Number(movimientoId),
        submoduloOrigenId: submoduloMovCaja?.id,  // ✅ Filtrar por submódulo correcto
        origenAsiento: 'AUTOMATICO'
      },
      include: {
        detalles: {
          include: {
            planCuenta: true,
            entidadComercial: true
          }
        }
      },
      orderBy: { id: 'desc' },  // Ordenar por ID descendente
      take: 1  // ✅ TOMAR SOLO EL MÁS RECIENTE
    });

    // Asignar asientos al movimiento
    movimiento.asientosContables = asientosContables;

    // Debug: Verificar datos cargados
    console.log('📊 Datos del movimiento cargados:');
    console.log('  - Movimiento ID:', movimientoId);
    console.log('  - Moneda:', movimiento.moneda ? `${movimiento.moneda.nombre} (${movimiento.moneda.simbolo})` : 'NO CARGADA');
    console.log('  - Tipo Movimiento:', movimiento.tipoMovimiento ? movimiento.tipoMovimiento.nombre : 'NO CARGADO');
    console.log('  - Asientos:', asientosContables.length, 'asientos encontrados');
    if (asientosContables.length > 0) {
      console.log('  - IDs de asientos:', asientosContables.map(a => a.id).join(', '));
      console.log('  - procesoOrigenId de asientos:', asientosContables.map(a => a.procesoOrigenId).join(', '));
      console.log('  - Primer asiento tiene detalles:', asientosContables[0].detalles ? `${asientosContables[0].detalles.length} detalles` : 'NO CARGADOS');
      if (asientosContables[0].detalles && asientosContables[0].detalles.length > 0) {
        console.log('  - Primer detalle tiene planCuenta:', asientosContables[0].detalles[0].planCuenta ? 'SÍ' : 'NO');
        console.log('  - Código cuenta:', asientosContables[0].detalles[0].planCuenta?.codigoCuenta);
        console.log('  - Nombre cuenta:', asientosContables[0].detalles[0].planCuenta?.nombreCuenta);
      }
    }
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

    // 5. CARGAR LOGO DE LA EMPRESA
    // ✅ PATRÓN DEL VOUCHER INDIVIDUAL: Cargar logo mediante petición HTTP a la API
    let logoImage = null;
    if (movimiento.empresa?.logo && movimiento.empresa?.id) {
      try {
        // Construir URL del endpoint de logo
        const logoUrl = `http://localhost:3000/api/empresas-logo/${movimiento.empresa.id}/logo`;
        
        // Hacer petición HTTP al endpoint
        const response = await fetch(logoUrl);
        
        if (response.ok) {
          const logoBytes = await response.arrayBuffer();
          
          if (movimiento.empresa.logo.toLowerCase().includes('.png')) {
            logoImage = await pdfDoc.embedPng(logoBytes);
          } else {
            logoImage = await pdfDoc.embedJpg(logoBytes);
          }
          
          console.log('  ✅ Logo cargado correctamente');
        } else {
          console.warn('  ⚠️ Logo no disponible (HTTP', response.status, ')');
        }
      } catch (error) {
        console.warn('  ⚠️ No se pudo cargar el logo:', error.message);
      }
    }

    // 6. HEADER - Logo y datos de la empresa
    if (logoImage) {
      const logoHeight = 50;
      const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
      page.drawImage(logoImage, {
        x: 50,
        y: yPosition - logoHeight,
        width: logoWidth,
        height: logoHeight
      });
    }

    // Información de la empresa (derecha, alineada a la derecha)
    let direccion = movimiento.empresa.direccion || '';
    // ✅ Truncar dirección si es muy larga (máximo 60 caracteres)
    if (direccion.length > 60) {
      direccion = direccion.substring(0, 57) + '...';
    }
    
    const empresaInfo = [
      movimiento.empresa.razonSocial || 'MEGUI INVESTMENT S.A.C.',
      movimiento.empresa.ruc ? `RUC: ${movimiento.empresa.ruc}` : 'RUC: 20603686498',
      direccion
    ].filter(Boolean);

    let empresaY = yPosition - 10;
    empresaInfo.forEach((line, index) => {
      // Usar tamaño de fuente más pequeño para la dirección
      const fontSize = index === 2 ? 7 : 9;
      const textWidth = fontNormal.widthOfTextAtSize(line, fontSize);
      page.drawText(line, {
        x: width - 50 - textWidth,  // Alineado a la derecha
        y: empresaY,
        size: fontSize,
        font: fontNormal,
        color: colorSecundario
      });
      empresaY -= 12;
    });

    // ID y Fecha DEBAJO de los datos de empresa (no superpuestos)
    const idText = `ID: ${String(movimiento.id).padStart(10, '0')}`;
    const idWidth = fontNormal.widthOfTextAtSize(idText, 9);
    page.drawText(idText, {
      x: width - 50 - idWidth,  // Alineado a la derecha
      y: empresaY - 5,
      size: 9,
      font: fontNormal,
      color: colorSecundario
    });

    const fechaFormateada = new Date(movimiento.fechaOperacionMovCaja || movimiento.fecha).toLocaleDateString('es-PE');
    const fechaWidth = fontNormal.widthOfTextAtSize(fechaFormateada, 9);
    page.drawText(fechaFormateada, {
      x: width - 50 - fechaWidth,  // Alineado a la derecha
      y: empresaY - 17,
      size: 9,
      font: fontNormal,
      color: colorSecundario
    });

    yPosition -= 80;

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
      { label: 'Tipo:', value: `${movimiento.tipoMovimiento.nombre} (${movimiento.moneda?.simbolo || 'PEN'})` },
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

      // ✅ CORRECCIÓN: Usar la moneda de la cuenta corriente ya incluida
      const monedaCuenta = cuentaBancaria.moneda;

      const infoCuenta = [
        { label: 'Banco:', value: cuentaBancaria.banco?.nombre || 'N/A' },
        { label: 'Cuenta Contable:', value: `${cuentaBancaria.cuentaContable?.codigoCuenta || ''} - ${cuentaBancaria.cuentaContable?.nombre || ''}` },
        { label: 'N° Cuenta:', value: cuentaBancaria.numeroCuenta || 'N/A' },
        { label: 'Moneda:', value: monedaCuenta?.codigoSunat || 'N/A' },
        { label: 'N° Operación:', value: movimiento.numeroOperacionPagoBanco || 'S/N' },
        { label: 'Tipo de Cambio:', value: movimiento.tipoCambio ? Number(movimiento.tipoCambio).toFixed(3) : '1.000' }
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

    // ✅ CORRECCIÓN: Determinar el nombre de la moneda correctamente
    let nombreMoneda = 'SOLES';
    if (movimiento.moneda) {
      // Mapeo de códigos SUNAT a nombres para numeroALetras
      const mapeMonedas = {
        'PEN': 'SOLES',
        'USD': 'DÓLARES',
        'EUR': 'EUROS'
      };
      nombreMoneda = mapeMonedas[movimiento.moneda.codigoSunat] || movimiento.moneda.nombre?.toUpperCase() || 'SOLES';
    }
    
    const montoEnLetras = numeroALetras(Number(movimiento.monto), nombreMoneda);
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
      
      // ✅ VALIDACIÓN: Calcular espacio solo si hay detalles
      const numDetalles = movimiento.asientosContables[0]?.detalles?.length || 0;
      yPosition -= (numDetalles * 15 + 60);
    }

    // 11. ORIGEN DEL MOVIMIENTO
    const tienePagoCxC = movimiento.pagosCuentaPorCobrar && movimiento.pagosCuentaPorCobrar.length > 0;
    const tienePagoCxP = movimiento.pagosCuentaPorPagar && movimiento.pagosCuentaPorPagar.length > 0;
    
    if (tienePagoCxC || tienePagoCxP) {
      yPosition -= 10;
      dibujarSeccion(page, 'ORIGEN DEL MOVIMIENTO', 50, yPosition, width - 100, fontBold, colorPrimario, colorBorde);
      yPosition -= 25;

      const pago = tienePagoCxC ? movimiento.pagosCuentaPorCobrar[0] : movimiento.pagosCuentaPorPagar[0];
      const tipoPago = tienePagoCxC ? 'Pago Cuenta Por Cobrar' : 'Pago Cuenta Por Pagar';

      const infoOrigen = [
        { label: 'ID Pago Origen:', value: String(pago.id) },
        { label: 'Tipo:', value: tipoPago }
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

    // 12. FIRMAS EN FOOTER (posición fija)
    const footerY = 120;
    const margin = 20;
    dibujarFirmas(page, margin, footerY + 40, width - 2 * margin, fontBold, fontNormal, colorSecundario);

    // 13. Footer (debajo de la tabla de firmas)
    const fechaGeneracion = new Date().toLocaleString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const piePagina = `Documento generado automáticamente - ${fechaGeneracion}`;
    page.drawText(piePagina, {
      x: (width - fontNormal.widthOfTextAtSize(piePagina, 7)) / 2,
      y: footerY - 15,
      size: 7,
      font: fontNormal,
      color: rgb(0.5, 0.5, 0.5)
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
      y: y - 18,
      width: colWidths[i],
      height: 20,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: colorBorde,
      borderWidth: 1
    });

    page.drawText(header, {
      x: xPos + 3,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: colorPrimario
    });

    xPos += colWidths[i];
  });

  y -= 25;

  // Detalles del primer asiento (asumimos que todos los asientos del movimiento tienen la misma estructura)
  const asiento = asientos[0];
  
  // ✅ VALIDACIÓN: Verificar que el asiento tiene detalles
  if (!asiento.detalles || asiento.detalles.length === 0) {
    console.warn('⚠️ El asiento no tiene detalles cargados');
    page.drawText('Sin detalles disponibles', {
      x: x + 3,
      y: y - 10,
      size: 8,
      font: fontNormal,
      color: rgb(0.5, 0.5, 0.5)
    });
    return;
  }
  
  let totalDebe = 0;
  let totalHaber = 0;

  asiento.detalles.forEach((detalle, index) => {
    xPos = x;
    
    // ✅ Añadir espacio adicional después del header
    const yData = y - (index * 15);

    // Cuenta
    const codigoCuenta = detalle.planCuenta?.codigoCuenta || '-';
    page.drawText(codigoCuenta, {
      x: xPos + 3,
      y: yData,
      size: 8,
      font: fontNormal,
      color: rgb(0, 0, 0)
    });
    xPos += colWidths[0];

    // Descripción (truncar si es muy largo)
    const nombreCuenta = detalle.planCuenta?.nombreCuenta || 'Sin nombre';
    const desc = nombreCuenta.length > 20 
      ? nombreCuenta.substring(0, 20) + '...'
      : nombreCuenta;
    page.drawText(desc, {
      x: xPos + 3,
      y: yData,
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
      y: yData,
      size: 8,
      font: fontNormal,
      color: rgb(0, 0, 0)
    });
    xPos += colWidths[2];

    // Documento
    page.drawText(detalle.numeroDocumento || '', {
      x: xPos + 3,
      y: yData,
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
        y: yData,
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
        y: yData,
        size: 8,
        font: fontNormal,
        color: rgb(0, 0, 0)
      });
    }
  });
  
  // ✅ Actualizar Y después del bucle
  y -= (asiento.detalles.length * 15);

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
 * Dibujar sección de firmas en formato tabla
 * ┌──────────────────┬──────────────┬──────────────┬──────────────────┐
 * │  Elaborado por   │ V°B° Admin   │ V°B° Contador│ Recibí conforme  │
 * │  ___________     │ ___________  │ ___________  │ DNI: _________   │
 * └──────────────────┴──────────────┴──────────────┴──────────────────┘
 */
function dibujarFirmas(page, x, y, width, fontBold, fontNormal, colorSecundario) {
  const tableHeight = 40;
  const colWidths = [
    width * 0.25, // Elaborado por (25%)
    width * 0.25, // V°B° Admin (25%)
    width * 0.25, // V°B° Contador (25%)
    width * 0.25, // Recibí conforme (25%)
  ];

  const firmaLabels = [
    { label: "Elaborado por", linea: "___________" },
    { label: "V°B° Admin", linea: "___________" },
    { label: "V°B° Contador", linea: "___________" },
    { label: "Recibí conforme", linea: "DNI: _________" },
  ];

  // Dibujar borde superior de la tabla
  page.drawLine({
    start: { x: x, y: y },
    end: { x: x + width, y: y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Dibujar borde inferior de la tabla
  page.drawLine({
    start: { x: x, y: y - tableHeight },
    end: { x: x + width, y: y - tableHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Dibujar bordes verticales y contenido
  let xPos = x;
  firmaLabels.forEach((firma, index) => {
    // Borde izquierdo de la celda
    page.drawLine({
      start: { x: xPos, y: y },
      end: { x: xPos, y: y - tableHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Etiqueta (centrada, parte superior)
    const labelWidth = fontBold.widthOfTextAtSize(firma.label, 8);
    page.drawText(firma.label, {
      x: xPos + (colWidths[index] - labelWidth) / 2,
      y: y - 15,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Línea de firma (centrada, parte inferior)
    const lineaWidth = fontNormal.widthOfTextAtSize(firma.linea, 7);
    page.drawText(firma.linea, {
      x: xPos + (colWidths[index] - lineaWidth) / 2,
      y: y - 32,
      size: 7,
      font: fontNormal,
      color: colorSecundario,
    });

    xPos += colWidths[index];
  });

  // Borde derecho final
  page.drawLine({
    start: { x: xPos, y: y },
    end: { x: xPos, y: y - tableHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
}

export default {
  generarVoucherContableMovimientoCaja
};
