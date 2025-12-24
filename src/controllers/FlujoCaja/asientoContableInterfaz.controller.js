// Controlador para AsientoContableInterfaz
import servicio from '../../services/FlujoCaja/asientoContableInterfaz.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Obtiene todos los asientos contables interfaz
 */
export async function listar(req, res, next) {
  try {
    const lista = await servicio.listar();
    res.json(toJSONBigInt(lista));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene un asiento contable interfaz por ID
 */
export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const asiento = await servicio.obtenerPorId(id);
    res.json(toJSONBigInt(asiento));
  } catch (err) {
    next(err);
  }
}

/**
 * Crea un nuevo asiento contable interfaz
 */
export async function crear(req, res, next) {
  try {
    const nuevo = await servicio.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

/**
 * Actualiza un asiento contable interfaz existente
 */
export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await servicio.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina un asiento contable interfaz por ID
 */
export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await servicio.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Envía un asiento contable a contabilidad
 */
export async function enviar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { enviadoPorId } = req.body;
    
    if (!enviadoPorId) {
      return res.status(400).json({ error: 'El ID del personal que envía es requerido' });
    }
    
    const asientoEnviado = await servicio.enviar(id, Number(enviadoPorId));
    res.json(toJSONBigInt(asientoEnviado));
  } catch (err) {
    next(err);
  }
}

/**
 * Registra un error en el envío de un asiento contable
 */
export async function registrarError(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { mensajeError } = req.body;
    
    if (!mensajeError) {
      return res.status(400).json({ error: 'El mensaje de error es requerido' });
    }
    
    const asientoConError = await servicio.registrarError(id, mensajeError);
    res.json(toJSONBigInt(asientoConError));
  } catch (err) {
    next(err);
  }
}
