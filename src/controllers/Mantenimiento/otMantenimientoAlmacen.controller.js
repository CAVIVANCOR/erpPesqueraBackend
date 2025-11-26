import otMantenimientoAlmacenService from '../../services/Mantenimiento/otMantenimientoAlmacen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Integración OT Mantenimiento con Almacén
 * Documentado en español.
 */

/**
 * Valida stock disponible para los insumos de una tarea
 */
export async function validarStockTarea(req, res, next) {
  try {
    const { tareaId } = req.params;
    const { empresaId, almacenId } = req.query;

    if (!empresaId || !almacenId) {
      return res.status(400).json({
        error: 'Se requieren empresaId y almacenId como parámetros de consulta'
      });
    }

    const resultado = await otMantenimientoAlmacenService.validarStockInsumosTarea(
      Number(tareaId),
      Number(empresaId),
      Number(almacenId)
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Valida stock disponible para todas las tareas de una OT
 */
export async function validarStockOT(req, res, next) {
  try {
    const { otMantenimientoId } = req.params;
    const { empresaId, almacenId } = req.query;

    if (!empresaId || !almacenId) {
      return res.status(400).json({
        error: 'Se requieren empresaId y almacenId como parámetros de consulta'
      });
    }

    const resultado = await otMantenimientoAlmacenService.validarStockOT(
      Number(otMantenimientoId),
      Number(empresaId),
      Number(almacenId)
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene stock disponible de un producto
 */
export async function obtenerStockProducto(req, res, next) {
  try {
    const { productoId } = req.params;
    const { empresaId, almacenId } = req.query;

    if (!empresaId || !almacenId) {
      return res.status(400).json({
        error: 'Se requieren empresaId y almacenId como parámetros de consulta'
      });
    }

    const stock = await otMantenimientoAlmacenService.obtenerStockProducto(
      Number(empresaId),
      Number(almacenId),
      Number(productoId)
    );

    res.json({ productoId: Number(productoId), stockDisponible: stock });
  } catch (err) {
    next(err);
  }
}

/**
 * Genera movimiento de salida de almacén para insumos de una tarea
 */
export async function generarSalidaInsumos(req, res, next) {
  try {
    const { tareaId } = req.params;
    const { empresaId, almacenId, conceptoMovAlmacenId } = req.body;
    const usuarioId = req.usuario?.id || 1; // Obtener del token JWT

    if (!empresaId || !almacenId || !conceptoMovAlmacenId) {
      return res.status(400).json({
        error: 'Se requieren empresaId, almacenId y conceptoMovAlmacenId'
      });
    }

    const resultado = await otMantenimientoAlmacenService.generarSalidaInsumosTarea(
      Number(tareaId),
      Number(empresaId),
      Number(almacenId),
      Number(conceptoMovAlmacenId),
      Number(usuarioId)
    );

    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
