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
      numeroAsiento: req.query.numeroAsiento || null,
      estadoAsientoId: req.query.estadoAsientoId ? Number(req.query.estadoAsientoId) : null,
      soloCuadrados: req.query.soloCuadrados === 'true',
      soloDescuadrados: req.query.soloDescuadrados === 'true',
      soloSaldosIniciales: req.query.soloSaldosIniciales === 'true',
      esGerencial: req.query.esGerencial === 'true',
      tipoLibroId: req.query.tipoLibroId ? Number(req.query.tipoLibroId) : null,
      monedaId: req.query.monedaId ? Number(req.query.monedaId) : null,
      codigoCuentaInicia: req.query.codigoCuentaInicia || null,
      planCuentaId: req.query.planCuentaId ? Number(req.query.planCuentaId) : null,
      entidadComercialId: req.query.entidadComercialId ? Number(req.query.entidadComercialId) : null,
      soloConEntidad: req.query.soloConEntidad === 'true',
      centroCostoId: req.query.centroCostoId ? Number(req.query.centroCostoId) : null,
      activoId: req.query.activoId ? Number(req.query.activoId) : null,
      tipoDocumentoOrigenId: req.query.tipoDocumentoOrigenId ? Number(req.query.tipoDocumentoOrigenId) : null,
      numeroDocumentoOrigen: req.query.numeroDocumentoOrigen || null,
      submoduloOrigenLineaId: req.query.submoduloOrigenLineaId ? Number(req.query.submoduloOrigenLineaId) : null,
      fechaDocumentoDesde: req.query.fechaDocumentoDesde || null,
      fechaDocumentoHasta: req.query.fechaDocumentoHasta || null,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };

    const resultado = await mayorContableService.listarLineas(filtros);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function exportarSUNAT61(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      tipoLibro: req.query.tipoLibro || 'FISCAL',
    };

    // Obtener empresa y periodo para construir nombre
    const empresa = await prisma.empresa.findUnique({
      where: { id: filtros.empresaId }
    });

    const periodo = await prisma.periodoContable.findUnique({
      where: { id: filtros.periodoContableId }
    });

    const ruc = empresa.ruc.padStart(11, '0');
    const anio = periodo.anio;
    const mes = String(periodo.mes).padStart(2, '0');
    const periodoSunat = `${anio}${mes}00`;
    
    // Nombre oficial SUNAT
    const nombreArchivo = `LE${ruc}${periodoSunat}0601001111.txt`;

    const contenido = await mayorContableService.generarFormatoSUNAT61(filtros);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(contenido);
  } catch (err) {
    next(err);
  }
}

export async function exportarExcel(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      tipoLibro: req.query.tipoLibro || null,
    };

    const buffer = await mayorContableService.generarExcel(filtros);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MayorContable_${filtros.empresaId}_${filtros.periodoContableId}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function exportarPDF(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      periodoContableId: req.query.periodoContableId ? Number(req.query.periodoContableId) : null,
      tipoLibro: req.query.tipoLibro || null,
    };

    const buffer = await mayorContableService.generarPDF(filtros);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MayorContable_${filtros.empresaId}_${filtros.periodoContableId}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}