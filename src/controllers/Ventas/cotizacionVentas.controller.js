import cotizacionVentasService from '../../services/Ventas/cotizacionVentas.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para CotizacionVentas
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const cotizaciones = await cotizacionVentasService.listar();
    res.json(toJSONBigInt(cotizaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cotizacion = await cotizacionVentasService.obtenerPorId(id);
    res.json(toJSONBigInt(cotizacion));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const { body } = req;
    const camposFaltantes = [];

    // Validar campos obligatorios
    if (!body.empresaId) camposFaltantes.push('empresaId');
    if (!body.tipoDocumentoId) camposFaltantes.push('tipoDocumentoId');
    if (!body.serieDocId) camposFaltantes.push('serieDocId');
    if (!body.fechaDocumento) camposFaltantes.push('fechaDocumento');
    if (!body.clienteId) camposFaltantes.push('clienteId');
    if (!body.tipoProductoId) camposFaltantes.push('tipoProductoId');
    if (!body.formaPagoId) camposFaltantes.push('formaPagoId');
    if (!body.monedaId) camposFaltantes.push('monedaId');
    if (!body.estadoId) camposFaltantes.push('estadoId');

    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        error: 'Campos obligatorios faltantes',
        mensaje: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        camposFaltantes
      });
    }

    const nuevo = await cotizacionVentasService.crear(body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await cotizacionVentasService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await cotizacionVentasService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene series de documentos filtradas
 * Query params: empresaId, tipoDocumentoId
 */
export async function obtenerSeriesDoc(req, res, next) {
  try {
    const { empresaId, tipoDocumentoId } = req.query;
    
    const series = await cotizacionVentasService.obtenerSeriesDoc(
      empresaId,
      tipoDocumentoId
    );
    
    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}
