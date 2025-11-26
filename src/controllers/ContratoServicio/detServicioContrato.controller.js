import detServicioContratoService from '../../services/ContratoServicio/detServicioContrato.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para DetServicioContrato
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const detalles = await detServicioContratoService.listar();
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const detalle = await detServicioContratoService.obtenerPorId(id);
    res.json(toJSONBigInt(detalle));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorContrato(req, res, next) {
  try {
    const contratoServicioId = BigInt(req.params.contratoServicioId);
    const detalles = await detServicioContratoService.obtenerPorContrato(contratoServicioId);
    res.json(toJSONBigInt(detalles));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const { body } = req;
    const camposFaltantes = [];

    // Validar campos obligatorios
    if (!body.contratoServicioId) camposFaltantes.push('contratoServicioId');
    if (!body.productoServicioId) camposFaltantes.push('productoServicioId');
    if (!body.cantidad) camposFaltantes.push('cantidad');
    if (!body.precioUnitario) camposFaltantes.push('precioUnitario');

    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        error: 'Campos obligatorios faltantes',
        mensaje: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        camposFaltantes
      });
    }

    const nuevo = await detServicioContratoService.crear(body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await detServicioContratoService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await detServicioContratoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Calcula el total del contrato
 */
export async function calcularTotalContrato(req, res, next) {
  try {
    const contratoServicioId = BigInt(req.params.contratoServicioId);
    const totales = await detServicioContratoService.calcularTotalContrato(contratoServicioId);
    res.json(toJSONBigInt(totales));
  } catch (err) {
    next(err);
  }
}
