import estadoCuentaService from "../../services/Mantenimiento/estadoCuentaProveedoresMantenimiento.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

const obtenerEstadoCuenta = async (req, res, next) => {
  try {
    const { empresaId, proveedorId } = req.body || {};
    const datos = await estadoCuentaService.obtenerEstadoCuenta({ empresaId, proveedorId });
    res.json(toJSONBigInt(datos));
  } catch (err) {
    next(err);
  }
};

export default { obtenerEstadoCuenta };
