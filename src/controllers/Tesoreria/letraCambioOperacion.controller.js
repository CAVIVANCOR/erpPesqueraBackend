import letraCambioCanjeService from '../../services/Tesoreria/letraCambioCanje.service.js';
import letraCambioRefinanciacionService from '../../services/Tesoreria/letraCambioRefinanciacion.service.js';
import letraCambioConsultaService from '../../services/Tesoreria/letraCambioConsulta.service.js';
import letraCambioProcesoService from '../../services/Tesoreria/letraCambioProceso.service.js';
import pagoLetraCambioEspecializadoService from '../../services/Tesoreria/pagoLetraCambioEspecializado.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador de operaciones de Letras de Cambio (compras = PAGAR, ventas = COBRAR):
 * consulta, canje de facturas, pago/cobro desde Tesorería, refinanciación y proceso de vencimientos.
 */

export async function listar(req, res, next) {
  try {
    res.json(toJSONBigInt(await letraCambioConsultaService.listar(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function obtenerDetalle(req, res, next) {
  try {
    res.json(toJSONBigInt(await letraCambioConsultaService.obtenerDetalle(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}

/** Facturas que se pueden canjear. Query: tipoLetra, empresaId, entidadId */
export async function documentosCanjeables(req, res, next) {
  try {
    const data = await letraCambioCanjeService.listarDocumentosCanjeables(req.query);
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

/** Letras con capital pendiente para pagar/cobrar desde Tesorería. Query: empresaId, tipoLetra */
export async function pendientesPago(req, res, next) {
  try {
    const data = await pagoLetraCambioEspecializadoService.listarPendientes(req.query);
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function canjear(req, res, next) {
  try {
    const data = await letraCambioCanjeService.canjear({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function anularCanje(req, res, next) {
  try {
    const data = await letraCambioCanjeService.anularCanje({ letraId: Number(req.params.id), usuarioId: req.user?.id || null });
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function refinanciar(req, res, next) {
  try {
    const data = await letraCambioRefinanciacionService.refinanciar({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

export async function revertirRefinanciacion(req, res, next) {
  try {
    const data = await letraCambioRefinanciacionService.revertirRefinanciacion({ letraId: Number(req.params.id), usuarioId: req.user?.id || null });
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}

/** Pago (letra por pagar) o cobranza (letra por cobrar) desde Tesorería */
export async function pagar(req, res, next) {
  try {
    const resultado = await pagoLetraCambioEspecializadoService.procesarPago({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}

/** Ejecuta a demanda el proceso diario de vencimientos y protestos */
export async function procesarVencimientos(req, res, next) {
  try {
    const data = await letraCambioProcesoService.actualizarVencimientosYProtestos();
    res.json(toJSONBigInt({ success: true, data }));
  } catch (err) {
    next(err);
  }
}
