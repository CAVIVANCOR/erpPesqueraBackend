import detMovsEntregaRendirService from "../../services/Pesca/detMovsEntregaRendir.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

/**
 * Controlador para DetMovsEntregaRendir
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await detMovsEntregaRendirService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mov = await detMovsEntregaRendirService.obtenerPorId(id);
    res.json(toJSONBigInt(mov));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const usuarioId = req.user?.id ? BigInt(req.user.id) : null;
    const nuevo = await detMovsEntregaRendirService.crear(req.body, usuarioId);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id ? BigInt(req.user.id) : null;
    const actualizado = await detMovsEntregaRendirService.actualizar(
      id,
      req.body,
      usuarioId
    );
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await detMovsEntregaRendirService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function obtenerConGastosAsociados(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movimiento =
      await detMovsEntregaRendirService.obtenerConGastosAsociados(id);
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

export async function obtenerTodasAsignacionesNoLiquidadas(req, res, next) {
  try {
    const asignaciones =
      await detMovsEntregaRendirService.obtenerTodasAsignacionesNoLiquidadas();
    res.json(toJSONBigInt(asignaciones));
  } catch (err) {
    next(err);
  }
}

export async function obtenerValoresIniciales(req, res, next) {
  try {
    const { moduloOrigen, entregaARendirId } = req.query;
    
    if (!moduloOrigen || !entregaARendirId) {
      return res.status(400).json({
        error: 'Se requieren moduloOrigen y entregaARendirId',
      });
    }

    const valores = await detMovsEntregaRendirService.obtenerValoresIniciales(
      moduloOrigen,
      Number(entregaARendirId)
    );
    res.json(toJSONBigInt(valores));
  } catch (err) {
    next(err);
  }
}

export async function obtenerLabelEnlacePorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const label = await detMovsEntregaRendirService.obtenerLabelEnlace(id);
    res.json(label);
  } catch (err) {
    next(err);
  }
}

export async function liquidarAsignacion(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id ? BigInt(req.user.id) : null;
    const { permitirRegeneracion, urlLiquidacionPdf } = req.body;
    
    const asignacionLiquidada = await detMovsEntregaRendirService.liquidarAsignacion(
      id,
      usuarioId,
      permitirRegeneracion,
      urlLiquidacionPdf
    );

    // Obtener datos completos para el response con detalles del cálculo
    const asignacionConDetalles = await detMovsEntregaRendirService.obtenerConGastosAsociados(id);

    // Calcular totales para el response
    let totalGastos = 0;
    let totalDevoluciones = 0;

    if (asignacionConDetalles.gastosAsociados) {
      asignacionConDetalles.gastosAsociados.forEach((movimiento) => {
        const monto = Number(movimiento.monto);
        if (Number(movimiento.tipoMovimientoId) === 28) {
          totalDevoluciones += monto;
        } else {
          totalGastos += monto;
        }
      });
    }

    // Response con información detallada para el Toast
    const response = {
      ...toJSONBigInt(asignacionLiquidada),
      detallesCalculo: {
        saldoInicial: Number(asignacionLiquidada.saldoInicialAsignacion || 0),
        montoAsignado: Number(asignacionLiquidada.monto || 0),
        totalGastos,
        totalDevoluciones,
        saldoFinal: Number(asignacionLiquidada.saldoFinalAsignacion || 0),
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function obtenerSaldoInicial(req, res, next) {
  try {
    const { empresaId, moduloOrigenId, documentoOrigenId, responsableId, fechaMovimiento } = req.query;
    
    if (!empresaId || !moduloOrigenId || !documentoOrigenId || !responsableId || !fechaMovimiento) {
      return res.status(400).json({
        error: 'Se requieren empresaId, moduloOrigenId, documentoOrigenId, responsableId y fechaMovimiento',
      });
    }

    const saldoInicial = await detMovsEntregaRendirService.obtenerSaldoInicialAsignacion(
      Number(empresaId),
      Number(moduloOrigenId),
      Number(documentoOrigenId),
      Number(responsableId),
      fechaMovimiento
    );
    res.json({ saldoInicial });
  } catch (err) {
    next(err);
  }
}

export async function calcularSaldoFinal(req, res, next) {
  try {
    const id = Number(req.params.id);
    const saldoFinal = await detMovsEntregaRendirService.calcularSaldoFinalAsignacion(id);
    res.json({ saldoFinal });
  } catch (err) {
    next(err);
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerConGastosAsociados,
  obtenerTodasAsignacionesNoLiquidadas,
  obtenerValoresIniciales,
  obtenerLabelEnlacePorId,
  liquidarAsignacion,
  obtenerSaldoInicial,
  calcularSaldoFinal
};