import accesoInstalacionService from '../../services/AccesoInstalaciones/accesoInstalacion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para AccesoInstalacion
 * Documentado en español.
 */
export async function listar(req, res, next) {
  try {
    const accesos = await accesoInstalacionService.listar();
    res.json(toJSONBigInt(accesos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const acceso = await accesoInstalacionService.obtenerPorId(id);
    res.json(toJSONBigInt(acceso));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await accesoInstalacionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await accesoInstalacionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await accesoInstalacionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

/**
 * Busca una persona por número de documento en registros de AccesoInstalacion.
 * Endpoint: GET /api/acceso-instalacion/buscar-persona/:numeroDocumento
 */
export async function buscarPersonaPorDocumento(req, res, next) {
  try {
    const { numeroDocumento } = req.params;
    const persona = await accesoInstalacionService.buscarPersonaPorDocumento(numeroDocumento);
    
    if (!persona) {
      return res.status(404).json({ 
        encontrada: false, 
        mensaje: 'No se encontró ninguna persona con ese número de documento' 
      });
    }
    
    res.json(toJSONBigInt(persona));
  } catch (err) {
    next(err);
  }
}

/**
 * Busca datos de vehículo por número de placa en registros de AccesoInstalacion.
 * Endpoint: GET /api/acceso-instalacion/buscar-vehiculo/:numeroPlaca
 */
export async function buscarVehiculoPorPlaca(req, res, next) {
  try {
    const { numeroPlaca } = req.params;
    const vehiculo = await accesoInstalacionService.buscarVehiculoPorPlaca(numeroPlaca);
    
    if (!vehiculo) {
      return res.status(404).json({ 
        encontrado: false, 
        mensaje: 'No se encontró ningún vehículo con esa placa o no tiene datos completos' 
      });
    }
    
    res.json(toJSONBigInt(vehiculo));
  } catch (err) {
    next(err);
  }
}
