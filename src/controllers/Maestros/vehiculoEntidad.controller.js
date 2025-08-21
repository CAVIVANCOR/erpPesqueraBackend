import vehiculoEntidadService from '../../services/Maestros/vehiculoEntidad.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para VehiculoEntidad
 * Documentado en español.
 */

/**
 * Filtra solo los campos válidos según el schema de Prisma VehiculoEntidad
 */
function filtrarCamposValidos(data) {
  const camposValidos = [
    'entidadComercialId',
    'placa',
    'marca',
    'modelo', 
    'color',
    'anio',
    'tipoVehiculoId',
    'capacidadTon',
    'numeroSerie',
    'numeroMotor',
    'cesado',
    'activoId',
    'observaciones'
  ];
  
  const datosFiltrados = {};
  camposValidos.forEach(campo => {
    if (data.hasOwnProperty(campo)) {
      datosFiltrados[campo] = data[campo];
    }
  });
  
  return datosFiltrados;
}

export async function listar(req, res, next) {
  try {
    const vehiculos = await vehiculoEntidadService.listar();
    res.json(toJSONBigInt(vehiculos));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const vehiculo = await vehiculoEntidadService.obtenerPorId(id);
    res.json(toJSONBigInt(vehiculo));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorEntidad(req, res, next) {
  try {
    const entidadComercialId = Number(req.params.entidadComercialId);
    const vehiculos = await vehiculoEntidadService.obtenerPorEntidad(entidadComercialId);
    res.json(toJSONBigInt(vehiculos));
  } catch (err) {
    console.error('❌ [CONTROLADOR] Error en obtenerPorEntidad:', err);
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const datosFiltrados = filtrarCamposValidos(req.body);
    const nuevo = await vehiculoEntidadService.crear(datosFiltrados);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const datosFiltrados = filtrarCamposValidos(req.body);
    const actualizado = await vehiculoEntidadService.actualizar(id, datosFiltrados);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await vehiculoEntidadService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}
