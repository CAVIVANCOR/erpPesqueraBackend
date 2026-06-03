import saldosCuentasService from '../../services/Tesoreria/saldosCuentas.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Listar saldos de cuentas corrientes
 * Query params opcionales:
 * - empresaId: ID de empresa
 * - monedaId: ID de moneda
 * - soloActivas: true/false (default: true)
 */
export async function listarSaldosCuentas(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      monedaId: req.query.monedaId ? Number(req.query.monedaId) : null,
      soloActivas: req.query.soloActivas !== 'false', // Default true
    };

    const saldos = await saldosCuentasService.listarSaldosCuentas(filtros);
    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener saldo consolidado en USD
 * Query params opcionales:
 * - empresaId: ID de empresa
 */
export async function obtenerSaldoConsolidado(req, res, next) {
  try {
    const empresaId = req.query.empresaId ? Number(req.query.empresaId) : null;
    const consolidado = await saldosCuentasService.obtenerSaldoConsolidado(empresaId);
    res.json(toJSONBigInt(consolidado));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener detalle de movimientos de una cuenta específica
 * Params:
 * - id: ID de cuenta corriente
 * Query params opcionales:
 * - limite: Cantidad de movimientos (default: 10)
 */
export async function obtenerDetalleCuenta(req, res, next) {
  try {
    const cuentaCorrienteId = Number(req.params.id);
    const limite = req.query.limite ? Number(req.query.limite) : 10;

    const detalle = await saldosCuentasService.obtenerDetalleCuenta(cuentaCorrienteId, limite);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}