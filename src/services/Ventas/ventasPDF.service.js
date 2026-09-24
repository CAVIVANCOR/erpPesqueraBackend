import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../config/prismaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Descarga el PDF de un comprobante de venta desde json.pe
 * @param {number} empresaId - ID de la empresa emisora
 * @param {number} preFacturaId - ID de la pre-factura
 * @param {string} tipoDoc - Código SUNAT del tipo de documento (01, 03, etc.)
 * @param {string} serie - Serie del comprobante
 * @param {string} correlativo - Número correlativo del comprobante
 * @returns {Promise<{success: boolean, pdfUrl?: string, message?: string}>}
 */
export async function descargarPDFDesdeJsonPe(empresaId, preFacturaId, tipoDoc, serie, correlativo) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 SERVICIO - Descargando PDF de venta desde json.pe');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Empresa ID:', empresaId);
    console.log('PreFactura ID:', preFacturaId);
    console.log('Tipo Doc:', tipoDoc);
    console.log('Serie:', serie);
    console.log('Correlativo:', correlativo);

    // 1. Obtener credenciales de la empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        ruc: true,
        sunatUsuarioSol: true,
        sunatClaveSol: true
      }
    });

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    if (!empresa.sunatUsuarioSol || !empresa.sunatClaveSol) {
      throw new Error('Credenciales SOL no configuradas para la empresa');
    }

    console.log('✅ Credenciales de empresa obtenidas');

    // 2. Obtener token de json.pe
    const jsonpeToken = process.env.JSONPE_TOKEN;
    if (!jsonpeToken) {
      throw new Error('Token de json.pe no configurado en variables de entorno');
    }

    // 3. Llamar a json.pe para descargar el PDF
    console.log('📡 Llamando a json.pe...');
    const response = await fetch('https://api.json.pe/api/sunat/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jsonpeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ruc: empresa.ruc,
        usuario: empresa.sunatUsuarioSol,
        password: empresa.sunatClaveSol,
        proveedor: empresa.ruc, // Para ventas, el proveedor es la misma empresa (emisor)
        tipo_doc: tipoDoc,
        serie: serie,
        correlativo: correlativo
      })
    });

    const result = await response.json();

    if (!result.success || !result.data?.pdf_base64) {
      console.error('❌ Error en respuesta de json.pe:', result);
      throw new Error(result.message || 'Error descargando PDF desde SUNAT');
    }

    console.log('✅ PDF descargado desde json.pe');

    // 4. Convertir base64 a buffer
    const pdfBuffer = Buffer.from(result.data.pdf_base64, 'base64');

    // 5. Guardar el PDF físicamente
    const uploadsDir = path.join(__dirname, '../../../uploads/pdf-system/pre-facturas');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `PRE-FACTURA-${preFacturaId}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.writeFile(filePath, pdfBuffer);
    console.log('✅ PDF guardado en:', filePath);

    // 6. Actualizar la base de datos
    const pdfUrl = `/uploads/pdf-system/pre-facturas/${fileName}`;
    
    await prisma.preFactura.update({
      where: { id: preFacturaId },
      data: { urlPreFacturaPdf: pdfUrl }
    });

    console.log('✅ Base de datos actualizada');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      pdfUrl: pdfUrl
    };

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR en descargarPDFDesdeJsonPe:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw error;
  }
}
