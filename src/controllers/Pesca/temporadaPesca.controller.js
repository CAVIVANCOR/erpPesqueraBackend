import temporadaPescaService from '../../services/Pesca/temporadaPesca.service.js';
import wmsService from '../../services/Almacen/wms.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TemporadaPesca
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const temps = await temporadaPescaService.listar();
    res.json(toJSONBigInt(temps));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const temp = await temporadaPescaService.obtenerPorId(id);
    res.json(toJSONBigInt(temp));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await temporadaPescaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await temporadaPescaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await temporadaPescaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function iniciar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await temporadaPescaService.iniciar(id);
    res.status(200).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

export async function finalizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const temporada = await temporadaPescaService.finalizar(id);
    res.json(toJSONBigInt(temporada));
  } catch (err) {
    next(err);
  }
}

export async function cancelar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const temporada = await temporadaPescaService.cancelar(id);
    res.json(toJSONBigInt(temporada));
  } catch (err) {
    next(err);
  }
}

/**
 * Finaliza una temporada de pesca y genera automáticamente el movimiento de almacén
 * @param {Object} req.body.faenaPescaId - ID de la faena de pesca
 * @param {Object} req.user.id - ID del usuario logueado (desde middleware de autenticación)
 */
export async function finalizarConMovimientoAlmacen(req, res, next) {
  try {
    const temporadaPescaId = BigInt(req.params.id);
    const { faenaPescaId } = req.body;
    const usuarioId = BigInt(req.user?.id || 1); // ID del usuario logueado

    if (!faenaPescaId) {
      return res.status(400).json({
        error: 'El ID de la faena de pesca es requerido',
      });
    }

    // 1. Finalizar la temporada
    const temporada = await temporadaPescaService.finalizar(Number(temporadaPescaId));

    // 2. Generar el movimiento de almacén
    const movimientoAlmacen = await wmsService.generarMovimientoDesdeTemporadaPesca(
      temporadaPescaId,
      BigInt(faenaPescaId),
      usuarioId
    );

    res.json(
      toJSONBigInt({
        temporada,
        movimientoAlmacen: {
          id: movimientoAlmacen.movimientoAlmacen.id,
          numeroDocumento: movimientoAlmacen.movimientoAlmacen.numeroDocumento,
          cantidadDetalles: movimientoAlmacen.detalles.length,
          cantidadKardex: movimientoAlmacen.kardex.length,
        },
        mensaje: 'Temporada finalizada y movimiento de almacén generado exitosamente',
      })
    );
  } catch (err) {
    next(err);
  }
}