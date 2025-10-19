import saldosDetProductoClienteService from '../../services/Almacen/saldosDetProductoCliente.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para SaldosDetProductoCliente
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    // Extraer filtros de query params
    const filtros = {
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : undefined,
      almacenId: req.query.almacenId ? Number(req.query.almacenId) : undefined,
      clienteId: req.query.clienteId ? Number(req.query.clienteId) : undefined,
      esCustodia: req.query.esCustodia !== undefined ? req.query.esCustodia === 'true' : undefined,
      soloConSaldo: req.query.soloConSaldo !== undefined ? req.query.soloConSaldo === 'true' : undefined,
      productoId: req.query.productoId ? Number(req.query.productoId) : undefined,
      familiaId: req.query.familiaId ? Number(req.query.familiaId) : undefined,
      subfamiliaId: req.query.subfamiliaId ? Number(req.query.subfamiliaId) : undefined,
      marcaId: req.query.marcaId ? Number(req.query.marcaId) : undefined,
      procedenciaId: req.query.procedenciaId ? Number(req.query.procedenciaId) : undefined,
      tipoAlmacenamientoId: req.query.tipoAlmacenamientoId ? Number(req.query.tipoAlmacenamientoId) : undefined,
      tipoMaterialId: req.query.tipoMaterialId ? Number(req.query.tipoMaterialId) : undefined,
      unidadMedidaId: req.query.unidadMedidaId ? Number(req.query.unidadMedidaId) : undefined,
      especieId: req.query.especieId ? Number(req.query.especieId) : undefined,
    };
    
    const saldos = await saldosDetProductoClienteService.listar(filtros);
    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const saldo = await saldosDetProductoClienteService.obtenerPorId(id);
    res.json(toJSONBigInt(saldo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await saldosDetProductoClienteService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await saldosDetProductoClienteService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await saldosDetProductoClienteService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
