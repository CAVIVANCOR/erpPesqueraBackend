import saldosProductoClienteService from '../../services/Almacen/saldosProductoCliente.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para SaldosProductoCliente
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    // Extraer filtros de query params
    const filtros = {
      empresaId: req.query.empresaId ? BigInt(req.query.empresaId) : undefined,
      almacenId: req.query.almacenId ? BigInt(req.query.almacenId) : undefined,
      clienteId: req.query.clienteId ? BigInt(req.query.clienteId) : undefined,
      custodia: req.query.custodia !== undefined ? req.query.custodia === 'true' : undefined,
    };
    
    const saldos = await saldosProductoClienteService.listar(filtros);
    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const saldo = await saldosProductoClienteService.obtenerPorId(id);
    res.json(toJSONBigInt(saldo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await saldosProductoClienteService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await saldosProductoClienteService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await saldosProductoClienteService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Listar saldos con filtros profesionales
 * Incluye opción de filtrar solo registros con saldo > 0
 */
export async function listarConFiltros(req, res, next) {
  try {
    const filtros = {
      empresaId: req.query.empresaId ? BigInt(req.query.empresaId) : undefined,
      almacenId: req.query.almacenId ? BigInt(req.query.almacenId) : undefined,
      productoId: req.query.productoId ? BigInt(req.query.productoId) : undefined,
      clienteId: req.query.clienteId ? BigInt(req.query.clienteId) : undefined,
      custodia: req.query.custodia !== undefined ? req.query.custodia === 'true' : undefined,
      soloConSaldo: req.query.soloConSaldo === 'true',
    };
    
    const saldos = await saldosProductoClienteService.listarConFiltros(filtros);
    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
}