import temporadaPescaService from '../../services/Pesca/temporadaPesca.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TemporadaPesca
 * Documentado en español.
 */
/**
 * Lista temporadas de pesca con filtros opcionales
 * @route GET /api/pesca/temporadas-pesca
 * @queryparam {number} [empresaId] - Filtrar por empresa
 * @queryparam {number} [estadoTemporadaId] - Filtrar por estado
 * @queryparam {number} [bahiaId] - Filtrar por bahía
 * @queryparam {string} [fechaDesde] - Filtrar por fecha de inicio desde (YYYY-MM-DD)
 * @queryparam {string} [fechaHasta] - Filtrar por fecha de inicio hasta (YYYY-MM-DD)
 * @returns {Array} Lista de temporadas de pesca
 */
export async function listar(req, res, next) {
  try {
    // Extraer y sanitizar filtros de query params
    const filtros = {};
    
    if (req.query.empresaId) {
      filtros.empresaId = req.query.empresaId;
    }
    
    if (req.query.estadoTemporadaId) {
      filtros.estadoTemporadaId = req.query.estadoTemporadaId;
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
    
    const temps = await temporadaPescaService.listar(filtros);
    res.json(toJSONBigInt(temps));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const temp = await temporadaPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(temp));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await temporadaPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id ? BigInt(req.user.id) : null;
    const actualizado = await temporadaPescaService.actualizar(id, req.body, usuarioId);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await temporadaPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function iniciar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await temporadaPescaService.iniciar(id);
    res.status(200).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function finalizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const temporada = await temporadaPescaService.finalizar(id);
    res.json(toJSONBigInt(temporada));
  } catch (err) {
    next(err);
  }
}

export async function cancelar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const temporada = await temporadaPescaService.cancelar(id);
    res.json(toJSONBigInt(temporada));
  } catch (err) {
    next(err);
  }
}

export async function calcularLiquidaciones(req, res, next) {
  try {
    const id = Number(req.params.id);
    const temporada = await temporadaPescaService.calcularLiquidaciones(id);
    res.json(toJSONBigInt(temporada));
  } catch (err) {
    next(err);
  }
}