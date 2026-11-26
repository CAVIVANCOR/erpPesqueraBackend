import reemplazoProductoService from "../../services/Maestros/reemplazoProducto.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

/** Vista previa del reemplazo de un producto por otro (no modifica nada) */
export const previsualizar = async (req, res, next) => {
  try {
    const resultado = await reemplazoProductoService.previsualizarReemplazo(req.body);
    res.json(toJSONBigInt(resultado));
  } catch (error) {
    next(error);
  }
};

/** Ejecuta el reemplazo (solo superusuario) */
export const ejecutar = async (req, res, next) => {
  try {
    const resultado = await reemplazoProductoService.ejecutarReemplazo(req.body, req.user?.id || null);
    res.json(toJSONBigInt(resultado));
  } catch (error) {
    next(error);
  }
};

export default { previsualizar, ejecutar };
