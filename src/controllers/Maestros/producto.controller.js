import productoService from '../../services/Maestros/producto.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para Producto
 * Documentado en español.
 */
/**
 * Lista productos con filtros opcionales
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Función next de Express
 */
export async function listar(req, res, next) {
  try {
    const { empresaId, clienteId } = req.query;
    const filtros = {};
    
    if (empresaId) filtros.empresaId = empresaId;
    if (clienteId) filtros.clienteId = clienteId;
    
    const productos = await productoService.listar(filtros);
    res.json(toJSONBigInt(productos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const producto = await productoService.obtenerPorId(id);
    res.json(toJSONBigInt(producto));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidadYEmpresa(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const empresaId = Number(req.params.empresaId);
    const productos = await productoService.obtenerPorEntidadYEmpresa(entidadComercialId, empresaId);
    res.json(toJSONBigInt(productos));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await productoService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await productoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await productoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
