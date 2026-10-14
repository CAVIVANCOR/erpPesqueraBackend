import reversionOperacionCajaService from '../../services/Tesoreria/reversionOperacionCaja.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CONTROLADOR: REVERSIÓN DE OPERACIONES ESPECIALIZADAS DE CAJA
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Lista las operaciones realizadas (agrupadas por número de operación)
 * Query: empresaId, desde, hasta, busqueda, limite
 */
export const listarOperaciones = async (req, res, next) => {
  try {
    const { empresaId, desde, hasta, busqueda, limite } = req.query;
    const data = await reversionOperacionCajaService.listarOperaciones({ empresaId, desde, hasta, busqueda, limite });
    res.json(toJSONBigInt({ success: true, data }));
  } catch (error) {
    next(error);
  }
};

/**
 * Simulación de solo lectura: qué se elimina, qué se restaura, avisos y bloqueos
 * Query: (empresaId + correlativo) o movimientoId
 */
export const obtenerPlan = async (req, res, next) => {
  try {
    const { empresaId, correlativo, movimientoId } = req.query;
    const data = await reversionOperacionCajaService.obtenerPlan({ empresaId, correlativo, movimientoId });
    res.json(toJSONBigInt({ success: true, data }));
  } catch (error) {
    next(error);
  }
};

/**
 * Ejecuta la reversión (una sola transacción)
 * Body: (empresaId + correlativo) o movimientoId, confirmacion ("REVERTIR"), motivo (opcional)
 */
export const revertirOperacion = async (req, res, next) => {
  try {
    const { empresaId, correlativo, movimientoId, motivo } = req.body;
    const data = await reversionOperacionCajaService.revertirOperacion({
      empresaId,
      correlativo,
      movimientoId,
      motivo,
      usuarioId: req.user?.id || null,
    });
    res.json(
      toJSONBigInt({
        success: true,
        message: `Operación #${data.correlativo} revertida correctamente`,
        data,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export default { listarOperaciones, obtenerPlan, revertirOperacion };
