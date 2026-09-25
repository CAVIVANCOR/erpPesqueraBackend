import pendientesService from '../../services/Tesoreria/pendientes.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Listar documentos pendientes de cobro y pago
 * Query params opcionales:
 * - empresaId: ID de empresa
 * - tipo: 'COBRAR' | 'PAGAR' | 'TODOS' | 'ASIGNACIONES' | 'GASTOS_DIRECTOS'
 * - vencimiento: 'VENCIDOS' | 'HOY' | 'SEMANA' | 'TODOS'
 * - monedaId: ID de moneda
 * - tipoDeuda: tipo de deuda
 * 
 * Filtros avanzados:
 * - fechaDesde: fecha desde (ISO string)
 * - fechaHasta: fecha hasta (ISO string)
 * - clienteIds: IDs de clientes separados por coma
 * - proveedorIds: IDs de proveedores separados por coma
 * - entidadComercialIds: IDs de entidades comerciales separados por coma
 * - tipoDocumentoIds: IDs de tipos de documento separados por coma
 * - numeroDocumento: búsqueda parcial de número de documento
 * - monedaIds: IDs de monedas separados por coma
 * - estadoIds: IDs de estados separados por coma
 * - personalIds: IDs de personal separados por coma
 * - montoDesde: monto mínimo
 * - montoHasta: monto máximo
 */
export async function listarPendientes(req, res, next) {
  try {
    // Parsear arrays de IDs desde query params
    const parseIds = (param) => {
      if (!param) return null;
      if (Array.isArray(param)) return param.map(id => Number(id));
      return param.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
    };

    const filtros = {
      // Filtros básicos
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : null,
      tipo: req.query.tipo || null,
      tipoDeuda: req.query.tipoDeuda || null,
      vencimiento: req.query.vencimiento || null,
      monedaId: req.query.monedaId ? Number(req.query.monedaId) : null,
      
      // Filtros avanzados
      fechaDesde: req.query.fechaDesde || null,
      fechaHasta: req.query.fechaHasta || null,
      clienteIds: parseIds(req.query.clienteIds),
      proveedorIds: parseIds(req.query.proveedorIds),
      entidadComercialIds: parseIds(req.query.entidadComercialIds),
      tipoDocumentoIds: parseIds(req.query.tipoDocumentoIds),
      numeroDocumento: req.query.numeroDocumento || null,
      monedaIds: parseIds(req.query.monedaIds),
      estadoIds: parseIds(req.query.estadoIds),
      personalIds: parseIds(req.query.personalIds),
      montoDesde: req.query.montoDesde ? Number(req.query.montoDesde) : null,
      montoHasta: req.query.montoHasta ? Number(req.query.montoHasta) : null,
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
