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

// NOTA: No hay funciones crear, actualizar o eliminar
// Los pagos se gestionan desde los tabs de CuentaPorCobrar y CuentaPorPagar