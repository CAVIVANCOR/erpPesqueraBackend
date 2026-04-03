import descargaFaenaPescaService from '../../services/Pesca/descargaFaenaPesca.service.js';
import finalizarDescargaService from '../../services/Pesca/finalizarDescargaConMovimientos.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DescargaFaenaPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const descargas = await descargaFaenaPescaService.listar();
    res.json(toJSONBigInt(descargas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const descarga = await descargaFaenaPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(descarga));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorFaena(req, res, next) {
  try {
    const faenaPescaId = req.params.faenaPescaId;
    
    // Validar que el parámetro existe y es un número válido
    if (!faenaPescaId || isNaN(faenaPescaId)) {
      return res.status(400).json({ 
        error: 'faenaPescaId es requerido y debe ser un número válido' 
      });
    }
    
    const faenaPescaIdBigInt = BigInt(faenaPescaId);
    const descargas = await descargaFaenaPescaService.obtenerPorFaena(faenaPescaIdBigInt);
    res.json(toJSONBigInt(descargas));
  } catch (err) {
    console.error('Error en obtenerPorFaena controller:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await descargaFaenaPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user?.id ? BigInt(req.user.id) : null;
    const actualizado = await descargaFaenaPescaService.actualizar(id, req.body, usuarioId);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await descargaFaenaPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Finaliza una descarga y genera movimientos de almacén (ingreso y salida)
 * @param {Object} req.params.id - ID de la descarga de faena pesca
 * @param {Object} req.body.temporadaPescaId - ID de la temporada de pesca
 * @param {Object} req.user.id - ID del usuario logueado (desde middleware de autenticación)
 */
export async function finalizarDescargaConMovimientos(req, res, next) {
  try {
    const descargaId = BigInt(req.params.id);
    const { temporadaPescaId } = req.body;
    const usuarioId = req.user?.personalId ? BigInt(req.user.personalId) : null;

    if (!temporadaPescaId) {
      return res.status(400).json({
        error: 'El ID de la temporada de pesca es requerido',
      });
    }

    // Ejecutar el proceso completo de finalización con movimientos de almacén
    const resultado = await finalizarDescargaService.finalizarDescargaConMovimientos(
      descargaId,
      BigInt(temporadaPescaId),
      usuarioId
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina los movimientos de almacén de una descarga
 * @param {Object} req.params.id - ID de la descarga de faena pesca
 * @param {Object} req.user.id - ID del usuario logueado (desde middleware de autenticación)
 */
export async function eliminarMovimientosDescarga(req, res, next) {
  try {
    const descargaId = BigInt(req.params.id);
    const usuarioId = req.user?.personalId ? BigInt(req.user.personalId) : null;

    // Importar servicio de eliminación
    const eliminarMovimientosService = await import('../../services/Pesca/eliminarMovimientosDescarga.service.js');
    
    const resultado = await eliminarMovimientosService.default.eliminarMovimientosDescarga(
      descargaId,
      usuarioId
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/**
 * Regenera los movimientos de almacén de una descarga
 * Elimina los movimientos existentes y genera nuevos con datos actualizados
 * @param {Object} req.params.id - ID de la descarga de faena pesca
 * @param {Object} req.body.temporadaPescaId - ID de la temporada de pesca
 * @param {Object} req.user.id - ID del usuario logueado (desde middleware de autenticación)
 */
export async function regenerarMovimientosDescarga(req, res, next) {
  try {
    const descargaId = BigInt(req.params.id);
    const { temporadaPescaId } = req.body;
    const usuarioId = req.user?.personalId ? BigInt(req.user.personalId) : null;

    if (!temporadaPescaId) {
      return res.status(400).json({
        error: 'El ID de la temporada de pesca es requerido',
      });
    }

    // Importar servicio de regeneración
    const eliminarMovimientosService = await import('../../services/Pesca/eliminarMovimientosDescarga.service.js');
    
    const resultado = await eliminarMovimientosService.default.regenerarMovimientosDescarga(
      descargaId,
      BigInt(temporadaPescaId),
      usuarioId
    );

    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}


/**
 * Obtener todas las descargas de una temporada específica
 * Incluye información del cliente y precio de comisión fidelización
 */
export async function obtenerPorTemporada(req, res, next) {
  try {
    const temporadaId = Number(req.params.temporadaId);
    
    // Validar que el parámetro existe y es un número válido
    if (!temporadaId || isNaN(temporadaId)) {
      return res.status(400).json({ 
        error: 'temporadaId es requerido y debe ser un número válido' 
      });
    }
    
    const descargas = await descargaFaenaPescaService.obtenerPorTemporada(temporadaId);
    res.json(toJSONBigInt(descargas));
  } catch (err) {
    console.error('Error en obtenerPorTemporada controller:', err);
    next(err);
  }
}
