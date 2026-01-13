import tarifaCostoExportacionRutaService from '../../services/Ventas/tarifaCostoExportacionRuta.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para TarifaCostoExportacionRuta
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const tarifas = await tarifaCostoExportacionRutaService.listar();
    res.json(toJSONBigInt(tarifas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const tarifa = await tarifaCostoExportacionRutaService.obtenerPorId(id);
    res.json(toJSONBigInt(tarifa));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorCostoIncoterm(req, res, next) {
  try {
    const costoIncotermId = BigInt(req.params.costoIncotermId);
    const tarifas = await tarifaCostoExportacionRutaService.obtenerPorCostoIncoterm(costoIncotermId);
    res.json(toJSONBigInt(tarifas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorRuta(req, res, next) {
  try {
    const costoIncotermId = BigInt(req.params.costoIncotermId);
    const puertoOrigenId = BigInt(req.params.puertoOrigenId);
    const puertoDestinoId = BigInt(req.params.puertoDestinoId);
    const tarifas = await tarifaCostoExportacionRutaService.obtenerPorRuta(
      costoIncotermId,
      puertoOrigenId,
      puertoDestinoId
    );
    res.json(toJSONBigInt(tarifas));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const usuarioId = BigInt(req.user?.id || 1);
    
    // Normalizar datos de entrada
    const datosNormalizados = {
      ...req.body,
      costoIncotermId: req.body.costoIncotermId ? BigInt(req.body.costoIncotermId) : undefined,
      paisOrigenId: req.body.paisOrigenId ? BigInt(req.body.paisOrigenId) : null,
      puertoOrigenId: req.body.puertoOrigenId ? BigInt(req.body.puertoOrigenId) : null,
      paisDestinoId: req.body.paisDestinoId ? BigInt(req.body.paisDestinoId) : null,
      puertoDestinoId: req.body.puertoDestinoId ? BigInt(req.body.puertoDestinoId) : null,
      proveedorId: req.body.proveedorId ? BigInt(req.body.proveedorId) : null,
      monedaId: req.body.monedaId ? BigInt(req.body.monedaId) : undefined,
    };
    
    const nueva = await tarifaCostoExportacionRutaService.crear(datosNormalizados, usuarioId);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const usuarioId = BigInt(req.user?.id || 1);
    
    // Normalizar datos de entrada
    const datosNormalizados = {
      ...req.body,
      costoIncotermId: req.body.costoIncotermId ? BigInt(req.body.costoIncotermId) : undefined,
      paisOrigenId: req.body.paisOrigenId ? BigInt(req.body.paisOrigenId) : null,
      puertoOrigenId: req.body.puertoOrigenId ? BigInt(req.body.puertoOrigenId) : null,
      paisDestinoId: req.body.paisDestinoId ? BigInt(req.body.paisDestinoId) : null,
      puertoDestinoId: req.body.puertoDestinoId ? BigInt(req.body.puertoDestinoId) : null,
      proveedorId: req.body.proveedorId ? BigInt(req.body.proveedorId) : null,
      monedaId: req.body.monedaId ? BigInt(req.body.monedaId) : undefined,
    };
    
    const actualizada = await tarifaCostoExportacionRutaService.actualizar(id, datosNormalizados, usuarioId);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await tarifaCostoExportacionRutaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}