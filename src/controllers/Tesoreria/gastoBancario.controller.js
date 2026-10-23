import gastoBancarioService from "../../services/Tesoreria/gastoBancario.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

/** Conceptos disponibles para el registro de gastos bancarios */
export async function conceptos(req, res, next) {
  try {
    res.json(toJSONBigInt({ data: gastoBancarioService.listarConceptos() }));
  } catch (err) {
    next(err);
  }
}

/** Operación de Tesorería: registra uno o varios gastos bancarios (egresos de caja con su asiento) */
export async function registrar(req, res, next) {
  try {
    const resultado = await gastoBancarioService.registrar({ ...req.body, usuarioId: req.user?.id || null });
    res.status(201).json(toJSONBigInt(resultado));
  } catch (err) {
    next(err);
  }
}
