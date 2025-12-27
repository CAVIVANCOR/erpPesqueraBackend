import letraCambioService from '../../services/LetrasCambio/letraCambio.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const letras = await letraCambioService.listar();
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const letra = await letraCambioService.obtenerPorId(id);
    res.json(toJSONBigInt(letra));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nueva = await letraCambioService.crear(req.body);
    res.status(201).json(toJSONBigInt(nueva));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizada = await letraCambioService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizada));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await letraCambioService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const letras = await letraCambioService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
}

export async function listarPorTipo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const tipoLetra = req.params.tipoLetra;
    const letras = await letraCambioService.listarPorTipo(empresaId, tipoLetra);
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
}

export async function listarVencidas(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const letras = await letraCambioService.listarVencidas(empresaId);
    res.json(toJSONBigInt(letras));
  } catch (err) {
    next(err);
  }
}

export async function marcarProtestada(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { fechaProtesto, motivoProtesto } = req.body;
    const letra = await letraCambioService.marcarProtestada(id, fechaProtesto, motivoProtesto);
    res.json(toJSONBigInt(letra));
  } catch (err) {
    next(err);
  }
}

export async function marcarRenovada(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nuevaLetraId } = req.body;
    const letra = await letraCambioService.marcarRenovada(id, nuevaLetraId);
    res.json(toJSONBigInt(letra));
  } catch (err) {
    next(err);
  }
}
