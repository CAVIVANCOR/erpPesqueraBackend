import sublineaCreditoService from '../../services/Tesoreria/sublineaCredito.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

export async function listar(req, res, next) {
  try {
    const sublineas = await sublineaCreditoService.listar();
    res.json(toJSONBigInt(sublineas));
  } catch (err) {
    next(err);
  }
}

export async function listarPorLinea(req, res, next) {
  try {
    const { lineaCreditoId } = req.params;
    const sublineas = await sublineaCreditoService.listarPorLinea(BigInt(lineaCreditoId));
    res.json(toJSONBigInt(sublineas));
  } catch (err) {
    next(err);
  }
}

export async function listarActivas(req, res, next) {
  try {
    const sublineas = await sublineaCreditoService.listarActivas();
    res.json(toJSONBigInt(sublineas));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;
    const sublinea = await sublineaCreditoService.obtenerPorId(BigInt(id));
    res.json(toJSONBigInt(sublinea));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const sublinea = await sublineaCreditoService.crear(req.body);
    res.status(201).json(toJSONBigInt(sublinea));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const sublinea = await sublineaCreditoService.actualizar(BigInt(id), req.body);
    res.json(toJSONBigInt(sublinea));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const resultado = await sublineaCreditoService.eliminar(BigInt(id));
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function actualizarMontoUtilizado(req, res, next) {
  try {
    const { id } = req.params;
    const sublinea = await sublineaCreditoService.actualizarMontoUtilizado(BigInt(id));
    res.json(toJSONBigInt(sublinea));
  } catch (err) {
    next(err);
  }
}


// ============================================
// GESTIÓN DE SOBREGIROS
// ============================================

export async function crearSobregiro(req, res, next) {
  try {
    const { sublineaId } = req.params;
    const sobregiro = await sublineaCreditoService.crearSobregiro(BigInt(sublineaId), req.body);
    res.status(201).json(toJSONBigInt(sobregiro));
  } catch (err) {
    next(err);
  }
}

export async function actualizarSobregiro(req, res, next) {
  try {
    const { sobregiroid } = req.params;
    const sobregiro = await sublineaCreditoService.actualizarSobregiro(BigInt(sobregiroid), req.body);
    res.json(toJSONBigInt(sobregiro));
  } catch (err) {
    next(err);
  }
}

export async function cancelarSobregiro(req, res, next) {
  try {
    const { sobregiroid } = req.params;
    const sobregiro = await sublineaCreditoService.cancelarSobregiro(BigInt(sobregiroid));
    res.json(toJSONBigInt(sobregiro));
  } catch (err) {
    next(err);
  }
}

export async function obtenerSobregiros(req, res, next) {
  try {
    const { sublineaId } = req.params;
    const sobregiros = await sublineaCreditoService.obtenerSobregiros(BigInt(sublineaId));
    res.json(toJSONBigInt(sobregiros));
  } catch (err) {
    next(err);
  }
}

export async function obtenerSobregiosVigentes(req, res, next) {
  try {
    const { sublineaId } = req.params;
    const sobregiros = await sublineaCreditoService.obtenerSobregiosVigentes(BigInt(sublineaId));
    res.json(toJSONBigInt(sobregiros));
  } catch (err) {
    next(err);
  }
}