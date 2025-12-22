import videoconferenciaService from '../../services/Videoconferencia/videoconferencia.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Videoconferencia
 * Gestiona reuniones virtuales con Jitsi Meet
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const videoconferencias = await videoconferenciaService.listar();
    res.json(toJSONBigInt(videoconferencias));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const videoconferencia = await videoconferenciaService.obtenerPorId(id);
    res.json(toJSONBigInt(videoconferencia));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await videoconferenciaService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await videoconferenciaService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await videoconferenciaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Inicia una videoconferencia (cambia estado a EN_CURSO)
 */
export async function iniciar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const iniciada = await videoconferenciaService.iniciar(id);
    res.json(toJSONBigInt(iniciada));
  } catch (err) {
    next(err);
  }
}

/**
 * Finaliza una videoconferencia (cambia estado a FINALIZADA)
 */
export async function finalizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const finalizada = await videoconferenciaService.finalizar(id);
    res.json(toJSONBigInt(finalizada));
  } catch (err) {
    next(err);
  }
}

/**
 * Cancela una videoconferencia (cambia estado a CANCELADA)
 */
export async function cancelar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cancelada = await videoconferenciaService.cancelar(id);
    res.json(toJSONBigInt(cancelada));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene videoconferencias por organizador
 */
export async function obtenerPorOrganizador(req, res, next) {
  try {
    const organizadorId = Number(req.params.organizadorId);
    const videoconferencias = await videoconferenciaService.obtenerPorOrganizador(organizadorId);
    res.json(toJSONBigInt(videoconferencias));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene videoconferencias por estado
 */
export async function obtenerPorEstado(req, res, next) {
  try {
    const { estado } = req.params;
    const videoconferencias = await videoconferenciaService.obtenerPorEstado(estado);
    res.json(toJSONBigInt(videoconferencias));
  } catch (err) {
    next(err);
  }
}
