import express from 'express';
import movimientoCajaRoutes from './FlujoCaja/movimientoCaja.routes.js';
import cuentaCorrienteRoutes from './FlujoCaja/cuentaCorriente.routes.js';
import asientoContableInterfazRoutes from './FlujoCaja/asientoContableInterfaz.routes.js';
import tipoReferenciaMovimientoCajaRoutes from './FlujoCaja/tipoReferenciaMovimientoCaja.routes.js';
import bancoRoutes from './FlujoCaja/banco.routes.js';
import tipoCuentaCorrienteRoutes from './FlujoCaja/tipoCuentaCorriente.routes.js';
import usuarioRoutes from './Usuarios/usuario.routes.js';
import personalRoutes from './Usuarios/personal.routes.js';
import cargosPersonalRoutes from './Usuarios/cargosPersonal.routes.js';
import accesosUsuarioRoutes from './Usuarios/accesosUsuario.routes.js';
import moduloSistemaRoutes from './Usuarios/moduloSistema.routes.js';
import submoduloSistemaRoutes from './Usuarios/submoduloSistema.routes.js';
import documentacionPersonalRoutes from './Usuarios/documentacionPersonal.routes.js';
import ubigeoRoutes from './Usuarios/ubigeo.routes.js';
import paisRoutes from './Usuarios/pais.routes.js';
import departamentoRoutes from './Usuarios/departamento.routes.js';
import provinciaRoutes from './Usuarios/provincia.routes.js';
import distritoRoutes from './Usuarios/distrito.routes.js';
import entidadComercialRoutes from './Maestros/entidadComercial.routes.js';
import contactoEntidadRoutes from './Maestros/contactoEntidad.routes.js';
import tipoEntidadRoutes from './Maestros/tipoEntidad.routes.js';
import formaPagoRoutes from './Maestros/formaPago.routes.js';
import agrupacionEntidadRoutes from './Maestros/agrupacionEntidad.routes.js';
import direccionEntidadRoutes from './Maestros/direccionEntidad.routes.js';
import precioEntidadRoutes from './Maestros/precioEntidad.routes.js';
import vehiculoEntidadRoutes from './Maestros/vehiculoEntidad.routes.js';
import tipoVehiculoRoutes from './Maestros/tipoVehiculo.routes.js';
import lineaCreditoEntidadRoutes from './Maestros/lineaCreditoEntidad.routes.js';
import monedaRoutes from './Maestros/moneda.routes.js';


const router = express.Router();

// Rutas para Usuarios
router.use('/usuarios', usuarioRoutes);
// Rutas para Personal
router.use('/personal', personalRoutes);
// Rutas para CargosPersonal
router.use('/cargos-personal', cargosPersonalRoutes);
// Rutas para AccesosUsuario
router.use('/accesos-usuario', accesosUsuarioRoutes);
// Rutas para ModuloSistema
router.use('/modulos-sistema', moduloSistemaRoutes);
// Rutas para SubmoduloSistema
router.use('/submodulos-sistema', submoduloSistemaRoutes);
// Rutas para DocumentacionPersonal
router.use('/documentacion-personal', documentacionPersonalRoutes);
// Rutas para Ubigeo
router.use('/ubigeo', ubigeoRoutes);
// Rutas para Pais
router.use('/paises', paisRoutes);
// Rutas para Departamento
router.use('/departamentos', departamentoRoutes);
// Rutas para Provincia
router.use('/provincias', provinciaRoutes);
// Rutas para Distrito
router.use('/distritos', distritoRoutes);
// Rutas para EntidadComercial
router.use('/entidades-comerciales', entidadComercialRoutes);
// Rutas para ContactoEntidad
router.use('/contactos-entidad', contactoEntidadRoutes);
// Rutas para TipoEntidad
router.use('/tipos-entidad', tipoEntidadRoutes);
// Rutas para FormaPago
router.use('/formas-pago', formaPagoRoutes);
// Rutas para AgrupacionEntidad
router.use('/agrupaciones-entidad', agrupacionEntidadRoutes);
// Rutas para DireccionEntidad
router.use('/direcciones-entidad', direccionEntidadRoutes);
// Rutas para PrecioEntidad
router.use('/precios-entidad', precioEntidadRoutes);
// Rutas para VehiculoEntidad
router.use('/vehiculos-entidad', vehiculoEntidadRoutes);
// Rutas para TipoVehiculo
router.use('/tipos-vehiculo', tipoVehiculoRoutes);
// Rutas para LineaCreditoEntidad
router.use('/lineas-credito-entidad', lineaCreditoEntidadRoutes);
// Rutas para Moneda
router.use('/monedas', monedaRoutes);

router.use('/movimientos-caja', movimientoCajaRoutes);
router.use('/cuentas-corrientes', cuentaCorrienteRoutes);
router.use('/asientos-contables-interfaz', asientoContableInterfazRoutes);
router.use('/tipos-referencia-movimiento-caja', tipoReferenciaMovimientoCajaRoutes);
router.use('/bancos', bancoRoutes);
router.use('/tipos-cuenta-corriente', tipoCuentaCorrienteRoutes);

export default router;
