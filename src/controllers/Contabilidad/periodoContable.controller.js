import periodoContableService from '../../services/Contabilidad/periodoContable.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para PeriodoContable
 * Documentado en español.
 */

export async function listar(req, res, next) {
  try {
    const periodos = await periodoContableService.listar();
    res.json(toJSONBigInt(periodos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const periodo = await periodoContableService.obtenerPorId(id);
    res.json(toJSONBigInt(periodo));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await periodoContableService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await periodoContableService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await periodoContableService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function listarPorEmpresa(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const periodos = await periodoContableService.listarPorEmpresa(empresaId);
    res.json(toJSONBigInt(periodos));
  } catch (err) {
    next(err);
  }
}

export async function cerrarPeriodo(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { cerradoPor, motivoCierre } = req.body;
    const periodo = await periodoContableService.cerrarPeriodo(id, cerradoPor, motivoCierre);
    res.json(toJSONBigInt(periodo));
  } catch (err) {
    next(err);
  }
}

export async function reabrirPeriodo(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { reabiertoPor, motivoReapertura } = req.body;
    const periodo = await periodoContableService.reabrirPeriodo(id, reabiertoPor, motivoReapertura);
    res.json(toJSONBigInt(periodo));
  } catch (err) {
    next(err);
  }
}

export async function bloquearPeriodo(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { bloqueadoPor, motivoBloqueo } = req.body;
    const periodo = await periodoContableService.bloquearPeriodo(id, bloqueadoPor, motivoBloqueo);
    res.json(toJSONBigInt(periodo));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPeriodoActivo(req, res, next) {
  try {
    const empresaId = Number(req.params.empresaId);
    const periodo = await periodoContableService.obtenerPeriodoActivo(empresaId);
    res.json(toJSONBigInt(periodo));
  } catch (err) {
    next(err);
  }
}


export async function obtenerPeriodoPorFecha(req, res, next) {
  try {
    const empresaId = Number(req.query.empresaId);
    const anio = Number(req.query.anio);
    const mes = Number(req.query.mes);

    // Construir fecha del primer día del mes
    const fecha = new Date(anio, mes - 1, 1);

    const periodo = await periodoContableService.obtenerPeriodoPorFecha(empresaId, fecha);
    res.json(toJSONBigInt(periodo));
  } catch (err) {
    next(err);
  }
}