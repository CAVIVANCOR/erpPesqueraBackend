import saldoCuentaCorrienteService from '../../services/FlujoCaja/saldoCuentaCorriente.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Lista todos los saldos de cuentas corrientes
 */
const listar = async (req, res, next) => {
  try {
    const saldos = await saldoCuentaCorrienteService.listar();
    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
};

/**
 * Obtiene un saldo por su ID
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const saldo = await saldoCuentaCorrienteService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(saldo));
  } catch (err) {
    next(err);
  }
};

/**
 * Obtiene el historial de saldos de una cuenta corriente
 * Query params: cuentaCorrienteId (requerido), fechaInicio (opcional), fechaFin (opcional)
 */
const obtenerHistorial = async (req, res, next) => {
  try {
    const { cuentaCorrienteId, fechaInicio, fechaFin } = req.query;
    
    if (!cuentaCorrienteId) {
      return res.status(400).json({
        error: 'El parámetro cuentaCorrienteId es requerido'
      });
    }

    const historial = await saldoCuentaCorrienteService.obtenerHistorial(
      Number(cuentaCorrienteId),
      fechaInicio ? new Date(fechaInicio) : null,
      fechaFin ? new Date(fechaFin) : null
    );
    res.json(toJSONBigInt(historial));
  } catch (err) {
    next(err);
  }
};

/**
 * Calcula el saldo actual de una cuenta corriente
 * Query param: cuentaCorrienteId (requerido)
 */
const calcularSaldoActual = async (req, res, next) => {
  try {
    const { cuentaCorrienteId } = req.query;
    
    if (!cuentaCorrienteId) {
      return res.status(400).json({
        error: 'El parámetro cuentaCorrienteId es requerido'
      });
    }

    const resultado = await saldoCuentaCorrienteService.calcularSaldoActual(
      Number(cuentaCorrienteId)
    );
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
};

/**
 * Crea un nuevo saldo
 */
const crear = async (req, res, next) => {
  try {
    const nuevo = await saldoCuentaCorrienteService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
};

/**
 * Actualiza un saldo existente
 */
const actualizar = async (req, res, next) => {
  try {
    const actualizado = await saldoCuentaCorrienteService.actualizar(
      Number(req.params.id),
      req.body
    );
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
};

/**
 * Elimina un saldo
 */
const eliminar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await saldoCuentaCorrienteService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
};


/**
 * Lista los saldos generados por un movimiento de caja
 */
const listarPorMovimiento = async (req, res, next) => {
  try {
    const movimientoCajaId = Number(req.params.movimientoCajaId);
    
    if (!movimientoCajaId || isNaN(movimientoCajaId)) {
      return res.status(400).json({
        error: 'El parámetro movimientoCajaId es requerido y debe ser un número válido'
      });
    }

    const saldos = await saldoCuentaCorrienteService.listarPorMovimiento(movimientoCajaId);
    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerHistorial,
  calcularSaldoActual,
  crear,
  actualizar,
  eliminar,
  listarPorMovimiento
};
