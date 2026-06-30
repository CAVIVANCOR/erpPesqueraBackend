import pagoEspecializadoService from '../../services/CuentasPorCobrarPagar/pagoEspecializadoCuentaPorCobrar.service.js';
import { ValidationError } from '../../utils/errors.js';

/**
 * ════════════════════════════════════════════════════════════
 * CONTROLADOR: PAGO ESPECIALIZADO CUENTA POR COBRAR
 * ════════════════════════════════════════════════════════════
 * 
 * Controlador para gestión de pagos especializados
 * Valida datos de entrada y delega al servicio
 * Documentado en español.
 */

/**
 * Procesar pago especializado de cuenta por cobrar
 */
export const procesarPagoEspecializado = async (req, res, next) => {
  try {
    // Validar datos obligatorios
    const {
      cuentaPorCobrarId,
      empresaId,
      fechaPago,
      montoPagado,
      monedaPagoId,
      tipoCambio,
      montoAplicadoDeuda,
      monedaDeudaId,
      medioPagoId,
      tipoMovimientoIngresoId
    } = req.body;

    if (!cuentaPorCobrarId) {
      throw new ValidationError('El campo cuentaPorCobrarId es obligatorio.');
    }

    if (!empresaId) {
      throw new ValidationError('El campo empresaId es obligatorio.');
    }

    if (!fechaPago) {
      throw new ValidationError('El campo fechaPago es obligatorio.');
    }

    if (!montoPagado || Number(montoPagado) <= 0) {
      throw new ValidationError('El monto pagado debe ser mayor a cero.');
    }

    if (!monedaPagoId) {
      throw new ValidationError('El campo monedaPagoId es obligatorio.');
    }

    if (!tipoCambio || Number(tipoCambio) <= 0) {
      throw new ValidationError('El tipo de cambio debe ser mayor a cero.');
    }

    if (!montoAplicadoDeuda || Number(montoAplicadoDeuda) <= 0) {
      throw new ValidationError('El monto aplicado a la deuda debe ser mayor a cero.');
    }

    if (!monedaDeudaId) {
      throw new ValidationError('El campo monedaDeudaId es obligatorio.');
    }

    if (!medioPagoId) {
      throw new ValidationError('El campo medioPagoId es obligatorio.');
    }

    if (!tipoMovimientoIngresoId) {
      throw new ValidationError('El campo tipoMovimientoIngresoId es obligatorio.');
    }

    // Agregar usuario que crea el registro
    const data = {
      ...req.body,
      creadoPor: req.user?.id || null
    };

    // Procesar pago
    const resultado = await pagoEspecializadoService.procesarPagoEspecializado(data);

    res.status(201).json({
      success: true,
      message: `Pago especializado registrado exitosamente. Operación #${resultado.correlativo}`,
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener detalle completo de un pago especializado
 */
export const obtenerDetallePago = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError('El ID del pago es obligatorio.');
    }

    const detalle = await pagoEspecializadoService.obtenerDetallePago(id);

    res.status(200).json({
      success: true,
      data: detalle
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los pagos de una operación por correlativo
 */
export const obtenerPagosPorCorrelativo = async (req, res, next) => {
  try {
    const { empresaId, correlativo } = req.params;

    if (!empresaId) {
      throw new ValidationError('El ID de la empresa es obligatorio.');
    }

    if (!correlativo) {
      throw new ValidationError('El correlativo es obligatorio.');
    }

    const operacion = await pagoEspecializadoService.obtenerPagosPorCorrelativo(
      empresaId,
      correlativo
    );

    res.status(200).json({
      success: true,
      data: operacion
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Listar pagos especializados por empresa con filtros opcionales
 */
export const listarPagosEspecializados = async (req, res, next) => {
  try {
    const { empresaId } = req.params;

    if (!empresaId) {
      throw new ValidationError('El ID de la empresa es obligatorio.');
    }

    const filtros = {
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      clienteId: req.query.clienteId,
      monedaId: req.query.monedaId
    };

    const pagos = await pagoEspecializadoService.listarPagosEspecializados(
      empresaId,
      filtros
    );

    res.status(200).json({
      success: true,
      data: pagos,
      total: pagos.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener resumen completo de una operación por correlativo
 */
export const obtenerResumenOperacion = async (req, res, next) => {
  try {
    const { empresaId, correlativo } = req.params;

    if (!empresaId) {
      throw new ValidationError('El ID de la empresa es obligatorio.');
    }

    if (!correlativo) {
      throw new ValidationError('El correlativo es obligatorio.');
    }

    const resumen = await pagoEspecializadoService.obtenerResumenOperacion(
      empresaId,
      correlativo
    );

    res.status(200).json({
      success: true,
      data: resumen
    });
  } catch (error) {
    next(error);
  }
};