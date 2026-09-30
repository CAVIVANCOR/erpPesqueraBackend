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
 * Procesa un movimiento de caja especializado con 3 flujos posibles:
 * 
 * FLUJO 1: TRANSFERENCIA ENTRE CUENTAS (origen + destino)
 *   - Requiere: cuentaOrigenId, cuentaDestinoId, ambos medios de pago y tipos de movimiento
 *   - Genera: 6 movimientos (egreso, ITF origen, comisión origen, ingreso, ITF destino, comisión destino)
 * 
 * FLUJO 2: INGRESO DIRECTO (solo destino, sin origen)
 *   - Requiere: cuentaDestinoId, medioPagoDestinoId, tipoMovimientoIngresoId
 *   - Genera: 3 movimientos (ingreso, ITF destino, comisión destino)
 *   - Ejemplo: Préstamo de cambista → Caja dólares
 * 
 * FLUJO 3: EGRESO DIRECTO (solo origen, sin destino)
 *   - Requiere: cuentaOrigenId, medioPagoOrigenId, tipoMovimientoEgresoId
 *   - Genera: 3 movimientos (egreso, ITF origen, comisión origen)
 *   - Ejemplo: Devolución a cambista, pago coimas (si esGerencial=true)
 * 
 * @route POST /api/tesoreria/transferencias
 * @access Requiere autenticación JWT
 * 
 * @body {Object} req.body - Datos del movimiento
 * @body {number} empresaId - ID de la empresa (OBLIGATORIO)
 * @body {string} fechaTransferencia - Fecha ISO (OBLIGATORIO)
 * @body {number} monto - Monto principal (OBLIGATORIO)
 * @body {number} [cuentaOrigenId] - ID cuenta origen (obligatorio para FLUJO 1 y 3)
 * @body {number} [cuentaDestinoId] - ID cuenta destino (obligatorio para FLUJO 1 y 2)
 * @body {number} [medioPagoOrigenId] - Medio de pago origen (si hay cuenta origen)
 * @body {number} [medioPagoDestinoId] - Medio de pago destino (si hay cuenta destino)
 * @body {number} [tipoMovimientoEgresoId] - Tipo movimiento egreso (si hay cuenta origen)
 * @body {number} [tipoMovimientoIngresoId] - Tipo movimiento ingreso (si hay cuenta destino)
 * @body {number} [itfOrigen] - ITF cuenta origen (default: 0)
 * @body {number} [comisionOrigen] - Comisión cuenta origen (default: 0)
 * @body {number} [itfDestino] - ITF cuenta destino (default: 0)
 * @body {number} [comisionDestino] - Comisión cuenta destino (default: 0)
 * @body {number} [tipoCambio] - Tipo de cambio (si monedas difieren)
 * @body {number} [montoDestino] - Monto destino (si monedas difieren)
 * @body {boolean} [esGerencial] - Flag operación gerencial/negra (default: false)
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
 * @returns {Array} data.asientosContables - Asientos contables generados
 * 
 * @throws {400} ValidationError - Datos inválidos
 * @throws {404} NotFoundError - Cuenta no encontrada
 * @throws {500} DatabaseError - Error en base de datos
 * 
 * @example FLUJO 1: Transferencia
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
 *   "esGerencial": false
 * }
 * 
 * @example FLUJO 3: Egreso directo
 * POST /api/tesoreria/transferencias
 * {
 *   "empresaId": 1,
 *   "fechaTransferencia": "2025-01-15T10:00:00Z",
 *   "monto": 100,
 *   "cuentaOrigenId": 45,
 *   "cuentaDestinoId": null,
 *   "medioPagoOrigenId": 4,
 *   "tipoMovimientoEgresoId": 178,
 *   "esGerencial": true
 * }
 */
export const procesarTransferenciaInterna = async (req, res, next) => {
  try {
    
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

    // ════════════════════════════════════════════════════════════
    // NOTA: empresaId ya NO es obligatorio en el request
    // La empresa se obtiene automáticamente de las cuentas seleccionadas
    // ════════════════════════════════════════════════════════════

    if (!fechaTransferencia) {
      throw new ValidationError('El campo fechaTransferencia es obligatorio.');
    }

    if (!monto || Number(monto) <= 0) {
      throw new ValidationError('El monto debe ser mayor a cero.');
    }

    // ========================================
    // VALIDAR SEGÚN FLUJO (3 CASOS POSIBLES)
    // ========================================
    
    // Validar que exista al menos una cuenta
    if (!cuentaOrigenId && !cuentaDestinoId) {
      throw new ValidationError('Debe especificar al menos una cuenta (origen o destino).');
    }

    // FLUJO 1: TRANSFERENCIA ENTRE CUENTAS (origen + destino)
    if (cuentaOrigenId && cuentaDestinoId) {
      if (!medioPagoOrigenId) {
        throw new ValidationError('El campo medioPagoOrigenId es obligatorio para transferencias.');
      }
      if (!medioPagoDestinoId) {
        throw new ValidationError('El campo medioPagoDestinoId es obligatorio para transferencias.');
      }
      if (!tipoMovimientoEgresoId) {
        throw new ValidationError('El campo tipoMovimientoEgresoId es obligatorio para transferencias.');
      }
      if (!tipoMovimientoIngresoId) {
        throw new ValidationError('El campo tipoMovimientoIngresoId es obligatorio para transferencias.');
      }
    }
    // FLUJO 2: INGRESO DIRECTO (solo destino)
    else if (!cuentaOrigenId && cuentaDestinoId) {
      if (!medioPagoDestinoId) {
        throw new ValidationError('El campo medioPagoDestinoId es obligatorio para ingresos.');
      }
      if (!tipoMovimientoIngresoId) {
        throw new ValidationError('El campo tipoMovimientoIngresoId es obligatorio para ingresos.');
      }
    }
    // FLUJO 3: EGRESO DIRECTO (solo origen)
    else if (cuentaOrigenId && !cuentaDestinoId) {
      if (!medioPagoOrigenId) {
        throw new ValidationError('El campo medioPagoOrigenId es obligatorio para egresos.');
      }
      if (!tipoMovimientoEgresoId) {
        throw new ValidationError('El campo tipoMovimientoEgresoId es obligatorio para egresos.');
      }
    }

    // Agregar usuario que crea el registro
    const data = {
      ...req.body,
      usuarioId: req.user?.id || null
    };

    // Procesar transferencia
    const resultado = await transferenciaInternaService.procesarTransferenciaInterna(data);

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
