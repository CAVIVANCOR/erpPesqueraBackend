import pagoEspecializadoService from '../../services/CuentasPorCobrarPagar/pagoEspecializadoCuentaPorPagar.service.js';
import pagoMultipleService from '../../services/CuentasPorCobrarPagar/pagoCuentaPorPagarMultiple.service.js';
import { ValidationError } from '../../utils/errors.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * ════════════════════════════════════════════════════════════
 * CONTROLADOR: PAGO ESPECIALIZADO CUENTA POR PAGAR
 * ════════════════════════════════════════════════════════════
 * 
 * Controlador para gestión de pagos especializados a proveedores
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
      cuentaPorPagarId,
      empresaId,
      fechaPago,
      montoPagado,
      monedaPagoId,
      tipoCambio,
      montoAplicadoDeuda,
      monedaDeudaId,
      medioPagoId,
      tipoMovimientoEgresoId
    } = req.body;

    if (!cuentaPorPagarId) {
      throw new ValidationError('El campo cuentaPorPagarId es obligatorio.');
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

    if (!tipoMovimientoEgresoId) {
      throw new ValidationError('El campo tipoMovimientoEgresoId es obligatorio.');
    }

    // Agregar usuario que crea el registro
    const data = {
      ...req.body,
      creadoPor: req.user?.id || null
    };

    // Procesar pago
    const resultado = await pagoEspecializadoService.procesarPagoEspecializado(data);

    res.status(201).json(toJSONBigInt({
      success: true,
      message: `Pago especializado registrado exitosamente. Operación #${resultado.correlativo}`,
      data: resultado
    }));
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

    res.status(200).json(toJSONBigInt({
      success: true,
      data: detalle
    }));
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

    res.status(200).json(toJSONBigInt({
      success: true,
      data: operacion
    }));
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
      proveedorId: req.query.proveedorId,
      monedaId: req.query.monedaId
    };

    const pagos = await pagoEspecializadoService.listarPagosEspecializados(
      empresaId,
      filtros
    );

    res.status(200).json(toJSONBigInt({
      success: true,
      data: pagos,
      total: pagos.length
    }));
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

    res.status(200).json(toJSONBigInt({
      success: true,
      data: resumen
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar URL del voucher consolidado
 */
export const actualizarUrlVoucherConsolidado = async (req, res, next) => {
  try {
    const { movimientoEgresoId } = req.params;
    const { urlPdf } = req.body;
    
    const resultado = await pagoEspecializadoService.actualizarUrlVoucherConsolidado(
      movimientoEgresoId,
      urlPdf
    );
    
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar URL del voucher individual
 */
export const actualizarUrlVoucherIndividual = async (req, res, next) => {
  try {
    const { movimientoId } = req.params;
    const { urlPdf } = req.body;
    
    const resultado = await pagoEspecializadoService.actualizarUrlVoucherIndividual(
      movimientoId,
      urlPdf
    );
    
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar URL del voucher consolidado en PagoCuentaPorPagar
 */
export const actualizarUrlVoucherConsolidadoPago = async (req, res, next) => {
  try {
    const { pagoId } = req.params;
    const { urlPdf } = req.body;
    
    const resultado = await pagoEspecializadoService.actualizarUrlVoucherConsolidadoPago(
      pagoId,
      urlPdf
    );
    
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar URL del comprobante de impuesto en PagoCuentaPorPagar
 */
export const actualizarUrlComprobanteImpuesto = async (req, res, next) => {
  try {
    const { pagoId } = req.params;
    const { urlPdf } = req.body;
    
    const resultado = await pagoEspecializadoService.actualizarUrlComprobanteImpuesto(
      pagoId,
      urlPdf
    );
    
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar URL del voucher contable en MovimientoCaja
 */
export const actualizarUrlVoucherContable = async (req, res, next) => {
  try {
    const { movimientoId } = req.params;
    const { urlPdf } = req.body;
    
    const resultado = await pagoEspecializadoService.actualizarUrlVoucherContable(
      movimientoId,
      urlPdf
    );
    
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Pago múltiple especializado: varias cuentas por pagar de un proveedor con un solo
 * egreso consolidado. Las validaciones y el detalle contable viven en el servicio.
 */
export const procesarPagoMultiple = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      usuarioId: req.user?.id || null
    };
    const resultado = await pagoMultipleService.procesarPagoMultiple(data);
    res.status(201).json(toJSONBigInt(resultado));
  } catch (error) {
    next(error);
  }
};

/**
 * Copia el voucher consolidado del pago indicado a los demás pagos de la misma operación
 * (pago múltiple). El comprobante de impuesto de cada documento no se comparte.
 */
export const sincronizarVoucherOperacion = async (req, res, next) => {
  try {
    const pagoId = Number(req.params.pagoId);
    const resultado = await pagoMultipleService.sincronizarVoucherOperacion(pagoId);
    res.json(toJSONBigInt(resultado));
  } catch (error) {
    next(error);
  }
};