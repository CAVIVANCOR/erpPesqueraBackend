import reporteMovimientoFondosService from "../../services/FlujoCaja/reporteMovimientoFondos.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

const obtenerDatos = async (req, res, next) => {
  try {
    const datos = await reporteMovimientoFondosService.obtenerDatosReporteFondos(req.body?.ids);
    res.json(toJSONBigInt(datos));
  } catch (err) {
    next(err);
  }
};

const obtenerCuentasSaldos = async (req, res, next) => {
  try {
    const cuentas = await reporteMovimientoFondosService.obtenerCuentasParaSaldos({
      desde: req.body?.desde,
      hasta: req.body?.hasta,
    });
    res.json(toJSONBigInt(cuentas));
  } catch (err) {
    next(err);
  }
};

export default { obtenerDatos, obtenerCuentasSaldos };
