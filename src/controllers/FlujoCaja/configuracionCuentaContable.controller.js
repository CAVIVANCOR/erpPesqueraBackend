import configuracionCuentaContableService from '../../services/FlujoCaja/configuracionCuentaContable.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Lista todas las configuraciones de cuentas contables
 */
const listar = async (req, res, next) => {
  try {
    const configuraciones = await configuracionCuentaContableService.listar();
    res.json(toJSONBigInt(configuraciones));
  } catch (err) {
    next(err);
  }
};

/**
 * Obtiene una configuración por su ID
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const config = await configuracionCuentaContableService.obtenerPorId(Number(req.params.id));
    res.json(toJSONBigInt(config));
  } catch (err) {
    next(err);
  }
};

/**
 * Obtiene la configuración para una combinación específica
 * Query params: empresaId (requerido), tipoMovimientoId (requerido), tipoReferenciaId (opcional)
 */
const obtenerConfiguracion = async (req, res, next) => {
  try {
    const { empresaId, tipoMovimientoId, tipoReferenciaId } = req.query;
    
    if (!empresaId || !tipoMovimientoId) {
      return res.status(400).json({
        error: 'Los parámetros empresaId y tipoMovimientoId son requeridos'
      });
    }

    const config = await configuracionCuentaContableService.obtenerConfiguracion(
      Number(empresaId),
      Number(tipoMovimientoId),
      tipoReferenciaId ? Number(tipoReferenciaId) : null
    );
    
    if (!config) {
      return res.status(404).json({
        error: 'No se encontró configuración para esa combinación'
      });
    }
    
    res.json(toJSONBigInt(config));
  } catch (err) {
    next(err);
  }
};

/**
 * Crea una nueva configuración
 */
const crear = async (req, res, next) => {
  try {
    const nueva = await configuracionCuentaContableService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
};

/**
 * Actualiza una configuración existente
 */
const actualizar = async (req, res, next) => {
  try {
    const actualizada = await configuracionCuentaContableService.actualizar(
      Number(req.params.id),
      req.body
    );
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
};

/**
 * Elimina una configuración
 */
const eliminar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await configuracionCuentaContableService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerConfiguracion,
  crear,
  actualizar,
  eliminar
};
