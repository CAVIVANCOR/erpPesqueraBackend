import novedadPescaConsumoService from '../../services/Pesca/novedadPescaConsumo.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para NovedadPescaConsumo
 * Documentado en español.
 */
/**
 * Lista novedades de pesca consumo con filtros opcionales
 * @route GET /api/pesca/novedades-pesca-consumo
 * @queryparam {number} [empresaId] - Filtrar por empresa
 * @queryparam {number} [estadoNovedadPescaConsumoId] - Filtrar por estado
 * @queryparam {number} [bahiaId] - Filtrar por bahía
 * @queryparam {string} [fechaDesde] - Filtrar por fecha de inicio desde (YYYY-MM-DD)
 * @queryparam {string} [fechaHasta] - Filtrar por fecha de inicio hasta (YYYY-MM-DD)
 * @returns {Array} Lista de novedades de pesca consumo
 */
export async function listar(req, res, next) {
  try {
    // Extraer y sanitizar filtros de query params
    const filtros = {};
    
    if (req.query.empresaId) {
      filtros.empresaId = req.query.empresaId;
    }
    
    if (req.query.estadoNovedadPescaConsumoId) {
      filtros.estadoNovedadPescaConsumoId = req.query.estadoNovedadPescaConsumoId;
    }
    
    if (req.query.bahiaId) {
      filtros.bahiaId = req.query.bahiaId;
    }
    
    if (req.query.fechaDesde) {
      filtros.fechaDesde = req.query.fechaDesde;
    }
    
    if (req.query.fechaHasta) {
      filtros.fechaHasta = req.query.fechaHasta;
    }
    
    const novedades = await novedadPescaConsumoService.listar(filtros);
    res.json(toJSONBigInt(novedades));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const novedad = await novedadPescaConsumoService.obtenerPorId(id);
    res.json(toJSONBigInt(novedad));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await novedadPescaConsumoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await novedadPescaConsumoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await novedadPescaConsumoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function iniciar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await novedadPescaConsumoService.iniciar(id);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function finalizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.personalId ? BigInt(req.user.personalId) : null;
    const novedad = await novedadPescaConsumoService.finalizar(id, usuarioId);
    res.json(toJSONBigInt(novedad));
  } catch (err) {
    next(err);
  }
}

export async function cancelar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const novedad = await novedadPescaConsumoService.cancelar(id);
    res.json(toJSONBigInt(novedad));
  } catch (err) {
    next(err);
  }
}