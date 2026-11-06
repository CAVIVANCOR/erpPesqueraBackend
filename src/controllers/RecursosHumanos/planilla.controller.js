import planillaService from '../../services/RecursosHumanos/planilla.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

// El personal que ejecuta la acción llega en el cuerpo (usuarioId = Personal.id del usuario)
const usuarioDe = (req) => (req.body?.usuarioId ? Number(req.body.usuarioId) : null);

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.listar(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

export async function generar(req, res, next) {
  try {
    res.status(201).json(toJSONBigInt(await planillaService.generar({ ...req.body, creadoPor: usuarioDe(req) })));
  } catch (err) {
    next(err);
  }
}

export async function regenerar(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.regenerar(Number(req.params.id), usuarioDe(req))));
  } catch (err) {
    next(err);
  }
}

export async function corregirConcepto(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.corregirConcepto(Number(req.params.conceptoId), { ...req.body, corregidoPor: usuarioDe(req) })));
  } catch (err) {
    next(err);
  }
}

export async function aprobarJefePersonal(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.aprobarJefePersonal(Number(req.params.id), usuarioDe(req))));
  } catch (err) {
    next(err);
  }
}

export async function aprobarGerencia(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.aprobarGerencia(Number(req.params.id), usuarioDe(req))));
  } catch (err) {
    next(err);
  }
}

export async function revertirAprobacionGerencia(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.revertirAprobacionGerencia(Number(req.params.id), usuarioDe(req))));
  } catch (err) {
    next(err);
  }
}

export async function obtenerDatosAfpnet(req, res, next) {
  try {
    const { empresaId, anio, mes } = req.query;
    res.json(toJSONBigInt(await planillaService.obtenerDatosAfpnet(empresaId, anio, mes)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerDatosPlame(req, res, next) {
  try {
    const { empresaId, anio, mes } = req.query;
    res.json(toJSONBigInt(await planillaService.obtenerDatosPlame(empresaId, anio, mes)));
  } catch (err) {
    next(err);
  }
}

export async function reabrir(req, res, next) {
  try {
    res.json(toJSONBigInt(await planillaService.reabrir(Number(req.params.id), usuarioDe(req))));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await planillaService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
