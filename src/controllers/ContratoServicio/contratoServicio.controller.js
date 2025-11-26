import contratoServicioService from '../../services/ContratoServicio/contratoServicio.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ContratoServicio
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const contratos = await contratoServicioService.listar();
    res.json(toJSONBigInt(contratos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const contrato = await contratoServicioService.obtenerPorId(id);
    res.json(toJSONBigInt(contrato));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorCliente(req, res, next) {
  try {
    const clienteId = BigInt(req.params.clienteId);
    const contratos = await contratoServicioService.obtenerPorCliente(clienteId);
    res.json(toJSONBigInt(contratos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEmpresa(req, res, next) {
  try {
    const empresaId = BigInt(req.params.empresaId);
    const contratos = await contratoServicioService.obtenerPorEmpresa(empresaId);
    res.json(toJSONBigInt(contratos));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const { body } = req;
    const camposFaltantes = [];

    // Validar campos obligatorios
    if (!body.empresaId) camposFaltantes.push('empresaId');
    if (!body.sedeId) camposFaltantes.push('sedeId');
    if (!body.almacenId) camposFaltantes.push('almacenId');
    if (!body.clienteId) camposFaltantes.push('clienteId');
    if (!body.responsableId) camposFaltantes.push('responsableId');
    if (!body.tipoDocumentoId) camposFaltantes.push('tipoDocumentoId');
    if (!body.serieDocId) camposFaltantes.push('serieDocId');
    if (!body.monedaId) camposFaltantes.push('monedaId');
    if (!body.estadoContratoId) camposFaltantes.push('estadoContratoId');
    if (!body.fechaCelebracion) camposFaltantes.push('fechaCelebracion');

    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        error: 'Campos obligatorios faltantes',
        mensaje: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        camposFaltantes
      });
    }

    const nuevo = await contratoServicioService.crear(body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    const actualizado = await contratoServicioService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = BigInt(req.params.id);
    await contratoServicioService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene series de documentos filtradas
 * Query params: empresaId, tipoDocumentoId
 */
export async function obtenerSeriesDoc(req, res, next) {
  try {
    const { empresaId, tipoDocumentoId } = req.query;
    
    const series = await contratoServicioService.obtenerSeriesDoc(
      empresaId,
      tipoDocumentoId
    );
    
    res.json(toJSONBigInt(series));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene contratos vigentes por cliente
 */
export async function obtenerContratosVigentes(req, res, next) {
  try {
    const clienteId = BigInt(req.params.clienteId);
    const contratos = await contratoServicioService.obtenerContratosVigentes(clienteId);
    res.json(toJSONBigInt(contratos));
  } catch (err) {
    next(err);
  }
}
