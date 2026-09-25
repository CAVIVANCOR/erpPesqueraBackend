import transferenciaInternaService from '../../services/Tesoreria/transferenciaInterna.service.js';
import { ValidationError } from '../../utils/errors.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CONTROLADOR: MOVIMIENTOS DE CAJA ESPECIALIZADOS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Controlador REST para movimientos de caja especializados:
 * - Transferencia interna (cuenta origen + destino)
 * - Egreso directo (solo cuenta origen)
 * - Ingreso directo (solo cuenta destino)
 * 
 * @responsibility
 * - Recibir y validar datos de entrada HTTP
 * - Delegar lógica de negocio al servicio
 * - Formatear respuesta HTTP (manejo de BigInt)
 * - Manejo de errores HTTP
 * 
 * @pattern MVC - Controller Layer
 * @author Sistema ERP Pesquera
 */

/**
 * ════════════════════════════════════════════════════════════════════════════
 * POST /api/tesoreria/transferencias
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Procesa un movimiento de caja especializado (transferencia, egreso o ingreso).
 * 
 * @route POST /api/tesoreria/transferencias
 * @access Requiere autenticación JWT
 * 
 * @body {Object} req.body - Datos del movimiento
 * @body {number} empresaId - ID de la empresa (OBLIGATORIO)
 * @body {string} fechaTransferencia - Fecha ISO (OBLIGATORIO)
 * @body {number} monto - Monto principal (OBLIGATORIO)
 * @body {number} [cuentaOrigenId] - ID cuenta origen (opcional)
 * @body {number} [cuentaDestinoId] - ID cuenta destino (opcional)
 * @body {number} [medioPagoOrigenId] - Medio de pago origen
 * @body {number} [medioPagoDestinoId] - Medio de pago destino
 * @body {number} [tipoMovimientoEgresoId] - Tipo movimiento egreso
 * @body {number} [tipoMovimientoIngresoId] - Tipo movimiento ingreso
 * @body {number} [itfOrigen] - ITF cuenta origen
 * @body {number} [comisionOrigen] - Comisión cuenta origen
 * @body {number} [itfDestino] - ITF cuenta destino
 * @body {number} [comisionDestino] - Comisión cuenta destino
 * @body {number} [tipoCambio] - Tipo de cambio (si monedas difieren)
 * @body {number} [montoDestino] - Monto destino (si monedas difieren)
 * @body {string} [descripcion] - Descripción personalizada
 * @body {string} [numeroOperacion] - Número de operación bancaria
 * 
 * @returns {Object} 201 - Operación exitosa
 * @returns {boolean} success - true
 * @returns {string} message - Mensaje de éxito con correlativo
 * @returns {Object} data - Datos del resultado
 * @returns {string} data.correlativo - Correlativo único generado
 * @returns {number|null} data.movimientoEgresoId - ID movimiento egreso
 * @returns {number|null} data.movimientoIngresoId - ID movimiento ingreso
 * @returns {number|null} data.movimientoITFOrigenId - ID ITF origen
 * @returns {number|null} data.movimientoComisionOrigenId - ID comisión origen
 * @returns {number|null} data.movimientoITFDestinoId - ID ITF destino
 * @returns {number|null} data.movimientoComisionDestinoId - ID comisión destino
 * 
 * @throws {400} ValidationError - Datos inválidos
 * @throws {404} NotFoundError - Cuenta no encontrada
 * @throws {500} DatabaseError - Error en base de datos
 * 
 * @example
 * POST /api/tesoreria/transferencias
 * {
 *   "empresaId": 1,
 *   "fechaTransferencia": "2025-01-15T10:00:00Z",
 *   "monto": 1000,
 *   "cuentaOrigenId": 1,
 *   "cuentaDestinoId": 2,
 *   "medioPagoOrigenId": 5,
 *   "medioPagoDestinoId": 5,
 *   "tipoMovimientoEgresoId": 10,
 *   "tipoMovimientoIngresoId": 11,
 *   "usuarioId": 1
 * }
 */
export const procesarTransferenciaInterna = async (req, res, next) => {
  try {
    // Log para debug
    console.log('📥 Datos recibidos en backend:', JSON.stringify(req.body, null, 2));
    
    // Validar datos obligatorios
    const {
      empresaId,
      fechaTransferencia,
      monto,
      monedaOrigenId,
      cuentaOrigenId,
      medioPagoOrigenId,
      cuentaDestinoId,
      medioPagoDestinoId,
      tipoMovimientoEgresoId,
      tipoMovimientoIngresoId
    } = req.body;

    if (!empresaId) {
      throw new ValidationError('El campo empresaId es obligatorio.');
    }

    if (!fechaTransferencia) {
      throw new ValidationError('El campo fechaTransferencia es obligatorio.');
    }

    if (!monto || Number(monto) <= 0) {
      throw new ValidationError('El monto de la transferencia debe ser mayor a cero.');
    }

    if (!cuentaOrigenId) {
      throw new ValidationError('El campo cuentaOrigenId es obligatorio.');
    }

    if (!medioPagoOrigenId) {
      throw new ValidationError('El campo medioPagoOrigenId es obligatorio.');
    }

    if (!cuentaDestinoId) {
      throw new ValidationError('El campo cuentaDestinoId es obligatorio.');
    }

    if (!medioPagoDestinoId) {
      throw new ValidationError('El campo medioPagoDestinoId es obligatorio.');
    }

    if (!tipoMovimientoEgresoId) {
      throw new ValidationError('El campo tipoMovimientoEgresoId es obligatorio.');
    }

    if (!tipoMovimientoIngresoId) {
      throw new ValidationError('El campo tipoMovimientoIngresoId es obligatorio.');
    }

    // Agregar usuario que crea el registro
    const data = {
      ...req.body,
      usuarioId: req.user?.id || null
    };

    // Procesar transferencia
    const resultado = await transferenciaInternaService.procesarTransferenciaInterna(data);

    console.log('✅ Transferencia procesada exitosamente. Correlativo:', resultado.correlativo);
    console.log('   Movimiento Egreso ID:', resultado.movimientoEgresoId?.toString());
    console.log('   Movimiento Ingreso ID:', resultado.movimientoIngresoId?.toString());

    res.status(201).json(toJSONBigInt({
      success: true,
      message: `Transferencia interna registrada exitosamente. Operación #${resultado.correlativo}`,
      data: resultado
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
    const { id } = req.params;
    const { urlVoucherConsolidado } = req.body;

    if (!id) {
      throw new ValidationError('El ID del movimiento es obligatorio.');
    }

    if (!urlVoucherConsolidado) {
      throw new ValidationError('La URL del voucher consolidado es obligatoria.');
    }

    await transferenciaInternaService.actualizarUrlVoucherConsolidado(
      Number(id),
      urlVoucherConsolidado
    );

    res.status(200).json({
      success: true,
      message: 'URL del voucher consolidado actualizada exitosamente'
    });
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
    const { urlVoucherIndividual } = req.body;

    if (!movimientoId) {
      throw new ValidationError('El ID del movimiento es obligatorio.');
    }

    if (!urlVoucherIndividual) {
      throw new ValidationError('La URL del voucher individual es obligatoria.');
    }

    await transferenciaInternaService.actualizarUrlVoucherIndividual(
      Number(movimientoId),
      urlVoucherIndividual
    );

    res.status(200).json({
      success: true,
      message: 'URL del voucher individual actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar URL del voucher contable
 */
export const actualizarUrlVoucherContable = async (req, res, next) => {
  try {
    const { movimientoId } = req.params;
    const { urlPdf } = req.body;

    if (!movimientoId) {
      throw new ValidationError('El ID del movimiento es obligatorio.');
    }

    if (!urlPdf) {
      throw new ValidationError('La URL del voucher contable es obligatoria.');
    }

    await transferenciaInternaService.actualizarUrlVoucherContable(
      Number(movimientoId),
      urlPdf
    );

    res.status(200).json({
      success: true,
      message: 'URL del voucher contable actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar URL del voucher bancario
 */
export const actualizarUrlVoucherBancario = async (req, res, next) => {
  try {
    const { movimientoId } = req.params;
    const { urlVoucherBancario } = req.body;

    if (!movimientoId) {
      throw new ValidationError('El ID del movimiento es obligatorio.');
    }

    if (!urlVoucherBancario) {
      throw new ValidationError('La URL del voucher bancario es obligatoria.');
    }

    await transferenciaInternaService.actualizarUrlVoucherBancario(
      Number(movimientoId),
      urlVoucherBancario
    );

    res.status(200).json({
      success: true,
      message: 'URL del voucher bancario actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Subir archivo de voucher bancario
 */
export const subirVoucherBancario = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('Debe proporcionar un archivo PDF.');
    }

    const { movimientoId } = req.body;

    if (!movimientoId) {
      throw new ValidationError('El ID del movimiento es obligatorio.');
    }

    // La URL del archivo ya fue procesada por multer
    const url = `/uploads/vouchers/transferencias/${req.file.filename}`;

    // Actualizar la URL en la base de datos
    await transferenciaInternaService.actualizarUrlVoucherBancario(
      Number(movimientoId),
      url
    );

    res.status(200).json({
      success: true,
      message: 'Voucher bancario subido exitosamente',
      url
    });
  } catch (error) {
    next(error);
  }
};

export default {
  procesarTransferenciaInterna,
  actualizarUrlVoucherConsolidado,
  actualizarUrlVoucherIndividual,
  actualizarUrlVoucherBancario,
  subirVoucherBancario
};
