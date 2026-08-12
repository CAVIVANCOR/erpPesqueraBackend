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
      tipoLibroId: req.query.tipoLibroId ? Number(req.query.tipoLibroId) : null,
      monedaId: req.query.monedaId ? Number(req.query.monedaId) : null,
      nivelDetalle: req.query.nivelDetalle ? Number(req.query.nivelDetalle) : 1,
      codigoCuentaInicia: req.query.codigoCuentaInicia || null,
      soloConMovimiento: req.query.soloConMovimiento === 'true',
      soloSaldosIniciales: req.query.soloSaldosIniciales === 'true',
      esGerencial: req.query.esGerencial === 'true',
    };
    const resultado = await balanceComprobacionService.listarBalance(filtros);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function exportarSUNAT317(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      tipoLibro: req.query.tipoLibro || 'FISCAL',
    };

    const { contenido, nombreArchivo } = await balanceComprobacionService.generarFormatoSUNAT317(filtros);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(contenido);
  } catch (err) {
    next(err);
  }
}

export async function exportarSUNAT316(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      tipoLibro: req.query.tipoLibro || 'FISCAL',
    };

    const { contenido, nombreArchivo } = await balanceComprobacionService.generarFormatoSUNAT316(filtros);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(contenido);
  } catch (err) {
    next(err);
  }
}

export async function exportarSUNAT320(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      tipoLibro: req.query.tipoLibro || 'FISCAL',
    };

    const { contenido, nombreArchivo } = await balanceComprobacionService.generarFormatoSUNAT320(filtros);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(contenido);
  } catch (err) {
    next(err);
  }
}

