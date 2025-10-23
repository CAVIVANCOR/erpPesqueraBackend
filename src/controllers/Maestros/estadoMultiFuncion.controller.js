import estadoMultiFuncionService from '../../services/Maestros/estadoMultiFuncion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para EstadoMultiFuncion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const estados = await estadoMultiFuncionService.listar();
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista estados multifunción específicamente para productos
 * Filtra por TipoProvieneDe con descripción "PRODUCTOS"
 */
export async function listarParaProductos(req, res, next) {
  try {
    const estados = await estadoMultiFuncionService.listarParaProductos();
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista estados multifunción específicamente para embarcaciones
 * Filtra por TipoProvieneDe con descripción "EMBARCACIONES"
 */
export async function listarParaEmbarcaciones(req, res, next) {
  try {
    const estados = await estadoMultiFuncionService.listarParaEmbarcaciones();
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista estados multifunción específicamente para temporadas de pesca
 * Filtra por TipoProvieneDe con descripción "TEMPORADA PESCA"
 */
export async function listarParaTemporadaPesca(req, res, next) {
  try {
    const estados = await estadoMultiFuncionService.listarParaTemporadaPesca();
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista estados multifunción específicamente para faenas de pesca
 * Filtra por TipoProvieneDe con descripción "FAENA PESCA"
 */
export async function listarParaFaenaPesca(req, res, next) {
  try {
    const estados = await estadoMultiFuncionService.listarParaFaenaPesca();
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista estados multifunción específicamente para faenas de pesca consumo
 * Filtra por TipoProvieneDe con descripción "FAENA PESCA CONSUMO"
 */
export async function listarParaFaenaPescaConsumo(req, res, next) {
  try {
    const estados = await estadoMultiFuncionService.listarParaFaenaPescaConsumo();
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

/**
 * Lista estados multifunción filtrados por tipoProvieneDeId
 * Solo retorna los que no están cesados
 */
export async function listarPorTipoProviene(req, res, next) {
  try {
    const { tipoProvieneDeId } = req.query;
    if (!tipoProvieneDeId) {
      return res.status(400).json({ error: 'tipoProvieneDeId es requerido' });
    }
    const estados = await estadoMultiFuncionService.listarPorTipoProviene(tipoProvieneDeId);
    res.json(toJSONBigInt(estados));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const estado = await estadoMultiFuncionService.obtenerPorId(id);
    res.json(toJSONBigInt(estado));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...req.body,
      updatedAt: new Date()
    };
    const nuevo = await estadoMultiFuncionService.crear(dataConFecha);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await estadoMultiFuncionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await estadoMultiFuncionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
