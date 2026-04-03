import detGastosPlanificadosService from '../../services/Pesca/detGastosPlanificados.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetGastosPlanificados
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const filtros = {};
    
    // Extraer filtros de query params
    if (req.query.detMovEntregaRendirTemporadaPescaId) {
      filtros.detMovEntregaRendirTemporadaPescaId = Number(req.query.detMovEntregaRendirTemporadaPescaId);
    }
    if (req.query.detMovEntRendirPescaConsumoId) {
      filtros.detMovEntRendirPescaConsumoId = Number(req.query.detMovEntRendirPescaConsumoId);
    }
    if (req.query.detMovEntregaRendirPComprasId) {
      filtros.detMovEntregaRendirPComprasId = Number(req.query.detMovEntregaRendirPComprasId);
    }
    if (req.query.detMovEntregaRendirPVentasId) {
      filtros.detMovEntregaRendirPVentasId = Number(req.query.detMovEntregaRendirPVentasId);
    }
    if (req.query.detMovEntregaRendirMovAlmacenId) {
      filtros.detMovEntregaRendirMovAlmacenId = Number(req.query.detMovEntregaRendirMovAlmacenId);
    }
    if (req.query.detMovEntregaRendirContratoId) {
      filtros.detMovEntregaRendirContratoId = Number(req.query.detMovEntregaRendirContratoId);
    }
    if (req.query.detMovEntregaRendirOTId) {
      filtros.detMovEntregaRendirOTId = Number(req.query.detMovEntregaRendirOTId);
    }
    
    const gastos = await detGastosPlanificadosService.listar(filtros);
    res.json(toJSONBigInt(gastos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const gasto = await detGastosPlanificadosService.obtenerPorId(id);
    res.json(toJSONBigInt(gasto));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await detGastosPlanificadosService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id ? BigInt(req.user.id) : null;
    const actualizado = await detGastosPlanificadosService.actualizar(id, req.body, usuarioId);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detGastosPlanificadosService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
