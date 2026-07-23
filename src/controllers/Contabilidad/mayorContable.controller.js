import mayorContableService from '../../services/Contabilidad/mayorContable.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Mayor Contable
 * Documentado en español.
 */

export async function listarLineas(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      fechaDesde: req.query.fechaDesde || null,
      fechaHasta: req.query.fechaHasta || null,
      estadoAsientoId: req.query.estadoAsientoId ? Number(req.query.estadoAsientoId) : null,
      tipoLibro: req.query.tipoLibro || null,
      planCuentaId: req.query.planCuentaId ? Number(req.query.planCuentaId) : null,
      codigoCuentaInicia: req.query.codigoCuentaInicia || null,
      entidadComercialId: req.query.entidadComercialId ? Number(req.query.entidadComercialId) : null,
      soloConEntidad: req.query.soloConEntidad === 'true',
      soloSaldosIniciales: req.query.soloSaldosIniciales === 'true',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };

    const resultado = await mayorContableService.listarLineas(filtros);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

