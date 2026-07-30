import deudaConPersonalService from '../../services/Tesoreria/deudaConPersonal.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const deudas = await deudaConPersonalService.listar();
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const deuda = await deudaConPersonalService.obtenerPorId(id);
    res.json(toJSONBigInt(deuda));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await deudaConPersonalService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await deudaConPersonalService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await deudaConPersonalService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const deudas = await deudaConPersonalService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorPersonal(req, res, next) {
  try {
    const personalId = Number(req.params.personalId);
    const deudas = await deudaConPersonalService.listarPorPersonal(personalId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarPendientes(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const deudas = await deudaConPersonalService.listarPendientes(empresaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarVencidas(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const deudas = await deudaConPersonalService.listarVencidas(empresaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorTipo(req, res, next) {
  try {
    const tipoDeudaId = Number(req.params.tipoDeudaId);
    const deudas = await deudaConPersonalService.listarPorTipo(tipoDeudaId);
    res.json(toJSONBigInt(deudas));
  } catch (err) {
    next(err);
  }
}


/**
 * Genera borrador de asiento contable para una deuda CTS
 * GET /api/deudas-personal/:id/borrador-asiento
 */
export async function generarBorradorAsiento(req, res, next) {
  try {
    const deudaId = Number(req.params.id);
    const borrador = await deudaConPersonalService.generarBorradorAsientoCTS(deudaId);
    res.json(toJSONBigInt(borrador));
  } catch (err) {
    next(err);
  }
}

/**
 * Guarda asiento(s) contable(s) para una deuda CTS
 * POST /api/deudas-personal/:id/guardar-asiento
 * Body: { asientos: [...] }
 */
export async function guardarAsiento(req, res, next) {
  try {
    const deudaId = Number(req.params.id);
    const { asientos, usuarioId: usuarioIdBody } = req.body;
    const usuarioId = usuarioIdBody || (req.usuario?.personalId ? Number(req.usuario.personalId) : null);

    const resultado = await deudaConPersonalService.guardarAsientosCTS(
      deudaId,
      asientos,
      usuarioId
    );

    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    console.error('❌ BACKEND Controller - Error:', err);
    next(err);
  }
}

/**
 * Elimina un asiento contable de una deuda
 * DELETE /api/deudas-personal/:id/asiento/:asientoId
 */
export async function eliminarAsiento(req, res, next) {
  try {
    const deudaId = Number(req.params.id);
    const asientoId = Number(req.params.asientoId);

    const resultado = await deudaConPersonalService.eliminarAsientoCTS(deudaId, asientoId);
    res.json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
