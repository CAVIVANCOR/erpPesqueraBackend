import balanceComprobacionService from '../../services/Contabilidad/balanceComprobacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listarBalance(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      fechaDesde: req.query.fechaDesde || null,
      fechaHasta: req.query.fechaHasta || null,
      tipoLibro: req.query.tipoLibro || null,
      nivelDetalle: req.query.nivelDetalle ? Number(req.query.nivelDetalle) : 1,
      codigoCuentaInicia: req.query.codigoCuentaInicia || null,
      soloConMovimiento: req.query.soloConMovimiento === 'true',
      soloSaldosIniciales: req.query.soloSaldosIniciales === 'true',
    };
    const resultado = await balanceComprobacionService.listarBalance(filtros);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}