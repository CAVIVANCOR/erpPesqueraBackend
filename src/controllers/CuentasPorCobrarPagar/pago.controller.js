import pagoService from '../../services/CuentasPorCobrarPagar/pago.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const pagos = await pagoService.listar();
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipoPago = req.query.tipoPago; // COBRAR o PAGAR
    const pago = await pagoService.obtenerPorId(id, tipoPago);
    res.json(toJSONBigInt(pago));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const pagos = await pagoService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCuentaCobrar(req, res, next) {
  try {
    const cuentaPorCobrarId = Number(req.params.cuentaPorCobrarId);
    const pagos = await pagoService.listarPorCuentaCobrar(cuentaPorCobrarId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function listarPorCuentaPagar(req, res, next) {
  try {
    const cuentaPorPagarId = Number(req.params.cuentaPorPagarId);
    const pagos = await pagoService.listarPorCuentaPagar(cuentaPorPagarId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista los pagos (CxC y CxP) generados por un movimiento de caja
 */
export async function listarPorMovimiento(req, res, next) {
  try {
    const movimientoCajaId = Number(req.params.movimientoCajaId);
    
    if (!movimientoCajaId || isNaN(movimientoCajaId)) {
      return res.status(400).json({
        error: 'El parámetro movimientoCajaId es requerido y debe ser un número válido'
      });
    }

    const pagos = await pagoService.listarPorMovimiento(movimientoCajaId);
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function crearPagoCobrar(req, res, next) {
  try {
    const nuevo = await pagoService.crearPagoCobrar(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizarPagoCobrar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await pagoService.actualizarPagoCobrar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminarPagoCobrar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await pagoService.eliminarPagoCobrar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function crearPagoPagar(req, res, next) {
  try {
    const nuevo = await pagoService.crearPagoPagar(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizarPagoPagar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await pagoService.actualizarPagoPagar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminarPagoPagar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await pagoService.eliminarPagoPagar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}