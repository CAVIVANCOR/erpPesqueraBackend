import movimientoAlmacenService from '../../services/Almacen/movimientoAlmacen.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para MovimientoAlmacen
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const movimientos = await movimientoAlmacenService.listar();
    res.json(toJSONBigInt(movimientos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movimiento = await movimientoAlmacenService.obtenerPorId(id);
    res.json(toJSONBigInt(movimiento));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await movimientoAlmacenService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await movimientoAlmacenService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await movimientoAlmacenService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Cierra un movimiento de almacén
 */
export async function cerrarMovimiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const cerrado = await movimientoAlmacenService.cerrarMovimiento(id);
    res.json(toJSONBigInt(cerrado));
  } catch (err) {
    next(err);
  }
}

/**
 * Anula un movimiento de almacén
 */
export async function anularMovimiento(req, res, next) {
  try {
    const id = Number(req.params.id);
    const anulado = await movimientoAlmacenService.anularMovimiento(id);
    res.json(toJSONBigInt(anulado));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene series de documentos filtradas
 * Query params: empresaId, tipoDocumentoId, tipoAlmacenId
 */
export async function obtenerSeriesDoc(req, res, next) {
  try {
    const { empresaId, tipoDocumentoId, tipoAlmacenId } = req.query;
    
    const series = await movimientoAlmacenService.obtenerSeriesDoc(
      empresaId,
      tipoDocumentoId,
      tipoAlmacenId
    );
    
    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}

/**
 * Consulta stock disponible de un producto
 * Query params: empresaId, almacenId, productoId, clienteId?, esCustodia?
 */
export async function consultarStock(req, res, next) {
  try {
    const { empresaId, almacenId, productoId, clienteId, esCustodia } = req.query;
    
    const stock = await movimientoAlmacenService.consultarStock(
      empresaId,
      almacenId,
      productoId,
      clienteId,
      esCustodia === 'true'
    );
    
    res.json(toJSONBigInt(stock));
  } catch (err) {
    next(err);
  }
}
