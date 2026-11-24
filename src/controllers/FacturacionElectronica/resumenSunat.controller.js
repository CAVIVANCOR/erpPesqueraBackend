import resumenSunatService from '../../services/FacturacionElectronica/resumenSunat.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador de consulta de ResumenSunat (resúmenes diarios de boletas y comunicaciones de baja).
 * Solo lectura: los genera el proceso de facturación electrónica.
 */

/** GET /api/facturacion-electronica/resumen-sunat?empresaId=&tipo=RC|RA */
export async function listar(req, res, next) {
  try {
    const { empresaId, tipo } = req.query;
    res.json(toJSONBigInt(await resumenSunatService.listar({ empresaId, tipo })));
  } catch (err) {
    next(err);
  }
}

/** GET /api/facturacion-electronica/resumen-sunat/:id */
export async function obtenerPorId(req, res, next) {
  try {
    res.json(toJSONBigInt(await resumenSunatService.obtenerPorId(Number(req.params.id))));
  } catch (err) {
    next(err);
  }
}
