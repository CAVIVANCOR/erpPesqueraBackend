import pagoCuotaPrestamoService from "../../services/Tesoreria/pagoCuotaPrestamo.service.js";
import toJSONBigInt from "../../utils/toJSONBigInt.js";

export async function listar(req, res, next) {
  try {
    const cuotaPrestamoId = req.query.cuotaPrestamoId ? Number(req.query.cuotaPrestamoId) : undefined;
    const pagos = await pagoCuotaPrestamoService.listar({ cuotaPrestamoId });
    res.json(toJSONBigInt(pagos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pago = await pagoCuotaPrestamoService.obtenerPorId(id);
    res.json(toJSONBigInt(pago));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = {
      ...req.body,
      actualizadoPor: req.user?.id || null,
    };
    const actualizado = await pagoCuotaPrestamoService.actualizar(id, data);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await pagoCuotaPrestamoService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
