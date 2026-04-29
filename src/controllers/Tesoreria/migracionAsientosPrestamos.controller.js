import migracionAsientosPrestamosService from '../../services/Tesoreria/migracionAsientosPrestamos.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Obtiene lista de préstamos sin asientos contables
 */
const obtenerPrestamosSinAsientos = async (req, res, next) => {
  try {
    const { empresaId } = req.query;
    
    const prestamos = await migracionAsientosPrestamosService.obtenerPrestamosSinAsientos(
      empresaId ? BigInt(empresaId) : null
    );
    
    res.json(toJSONBigInt(prestamos));
  } catch (err) {
    next(err);
  }
};

/**
 * Ejecuta la migración de asientos contables para préstamos
 */
const ejecutarMigracion = async (req, res, next) => {
  try {
    const { empresaId, creadoPor } = req.body;
    
    const resultado = await migracionAsientosPrestamosService.migrarAsientosPrestamos(
      empresaId ? BigInt(empresaId) : null,
      creadoPor ? BigInt(creadoPor) : null
    );
    
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
};

export default {
  obtenerPrestamosSinAsientos,
  ejecutarMigracion
};
