import pendientesService from '../../services/Tesoreria/pendientes.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Listar documentos pendientes de cobro y pago
 * Query params opcionales:
 * - empresaId: ID de empresa
 * - tipo: 'COBRAR' | 'PAGAR'
 * - vencimiento: 'VENCIDOS' | 'HOY' | 'SEMANA'
 * - monedaId: ID de moneda
 */
export async function listarPendientes(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      tipo: req.query.tipo || null,
      vencimiento: req.query.vencimiento || null,
      monedaId: req.query.monedaId ? Number(req.query.monedaId) : null,
    };

    const pendientes = await pendientesService.listarPendientes(filtros);
    res.json(toJSONBigInt(pendientes));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener resumen de pendientes (totales por moneda y tipo)
 * Query params opcionales:
 * - empresaId: ID de empresa
 */
export async function obtenerResumen(req, res, next) {
  try {
    const empresaId = req.query.empresaId ? Number(req.query.empresaId) : null;
    const resumen = await pendientesService.obtenerResumen(empresaId);
    res.json(toJSONBigInt(resumen));
  } catch (err) {
    next(err);
  }
}
