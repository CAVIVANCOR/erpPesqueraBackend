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

export default { obtenerDatos };
