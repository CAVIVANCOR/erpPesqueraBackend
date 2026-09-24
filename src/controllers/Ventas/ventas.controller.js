import { descargarPDFDesdeJsonPe } from '../../services/Ventas/ventasPDF.service.js';

/**
 * Descarga el PDF de una pre-factura desde SUNAT vía json.pe
 * @route POST /api/ventas/descargar-pdf-pre-factura
 */
export async function descargarPDFParaPreFactura(req, res) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 CONTROLLER - Descargar PDF Pre-Factura');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { empresaId, preFacturaId, tipoDoc, serie, correlativo } = req.body;

    // Validar datos requeridos
    if (!empresaId || !preFacturaId || !tipoDoc || !serie || !correlativo) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: empresaId, preFacturaId, tipoDoc, serie, correlativo'
      });
    }

    // Llamar al servicio
    const resultado = await descargarPDFDesdeJsonPe(
      empresaId,
      preFacturaId,
      tipoDoc,
      serie,
      correlativo
    );

    console.log('✅ PDF descargado exitosamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return res.status(200).json(resultado);

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR en descargarPDFParaPreFactura:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return res.status(400).json({
      success: false,
      message: error.message || 'Error descargando PDF de pre-factura'
    });
  }
}
