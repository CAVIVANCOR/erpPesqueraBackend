import vacacionesService from '../../services/RecursosHumanos/vacaciones.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

// Envuelve cada acción: responde el resultado (con los BigInt convertidos) y deriva los errores al manejador central
const accion = (fn, estado = 200) => async (req, res, next) => {
  try {
    res.status(estado).json(toJSONBigInt(await fn(req)));
  } catch (err) {
    next(err);
  }
};

const id = (req) => Number(req.params.id);

export const listarTipos = accion((req) => vacacionesService.listarTipos(req.query));
export const crearTipo = accion((req) => vacacionesService.crearTipo(req.body), 201);
export const actualizarTipo = accion((req) => vacacionesService.actualizarTipo(id(req), req.body));
export const eliminarTipo = accion(async (req) => {
  await vacacionesService.eliminarTipo(id(req));
  return { eliminado: true, id: id(req) };
});

export const generarPeriodos = accion((req) =>
  req.body.personalId
    ? vacacionesService.generarPeriodos(Number(req.body.personalId), req.body.creadoPor, req.body.desde)
    : vacacionesService.generarPeriodosEmpresa(Number(req.body.empresaId), req.body.creadoPor, req.body.desde),
);
export const actualizarPeriodo = accion((req) => vacacionesService.actualizarPeriodo(id(req), req.body));

export const listarSuspensiones = accion((req) => vacacionesService.listarSuspensiones(req.query));
export const obtenerSuspension = accion((req) => vacacionesService.obtenerSuspension(id(req)));
export const crearSuspension = accion((req) => vacacionesService.crearSuspension(req.body), 201);
export const actualizarSuspension = accion((req) => vacacionesService.actualizarSuspension(id(req), req.body));
export const ejecutarSuspension = accion((req) => vacacionesService.cambiarEstadoSuspension(id(req), 'EJECUTADA', req.body));
export const anularSuspension = accion((req) => vacacionesService.cambiarEstadoSuspension(id(req), 'ANULADA', req.body));
export const eliminarSuspension = accion(async (req) => {
  await vacacionesService.eliminarSuspension(id(req));
  return { eliminado: true, id: id(req) };
});

export const saldos = accion((req) => vacacionesService.calcularSaldos(req.query));
export const resumen = accion((req) => vacacionesService.resumenEstadistico(req.query));
export const calendario = accion((req) => vacacionesService.calendarioAnual(req.query));
export const proyeccion = accion((req) => vacacionesService.proyeccion(req.query));
export const porMes = accion((req) => vacacionesService.vacacionesPorMes(req.query));
