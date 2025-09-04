import express from 'express';
import movimientoCajaRoutes from './FlujoCaja/movimientoCaja.routes.js';
import cuentaCorrienteRoutes from './FlujoCaja/cuentaCorriente.routes.js';
import asientoContableInterfazRoutes from './FlujoCaja/asientoContableInterfaz.routes.js';
import tipoReferenciaMovimientoCajaRoutes from './FlujoCaja/tipoReferenciaMovimientoCaja.routes.js';
import bancoRoutes from './FlujoCaja/banco.routes.js';
import tipoCuentaCorrienteRoutes from './FlujoCaja/tipoCuentaCorriente.routes.js';
import usuarioRoutes from './Usuarios/usuario.routes.js';
import authRoutes from './Usuarios/auth.routes.js'; // Rutas de autenticación de usuarios
import personalRoutes from './Usuarios/personal.routes.js';
import cargosPersonalRoutes from './Usuarios/cargosPersonal.routes.js';
import tipoContratoRoutes from './Usuarios/tipoContrato.routes.js'; // CRUD profesional de TipoContrato
import accesosUsuarioRoutes from './Usuarios/accesosUsuario.routes.js';
import moduloSistemaRoutes from './Usuarios/moduloSistema.routes.js';
import submoduloSistemaRoutes from './Usuarios/submoduloSistema.routes.js';
import documentacionPersonalRoutes from './AccesoInstalaciones/documentacion.personal.routes.js';
import ubigeoRoutes from './Usuarios/ubigeo.routes.js';
import paisRoutes from './Usuarios/pais.routes.js';
import departamentoRoutes from './Usuarios/departamento.routes.js';
import provinciaRoutes from './Usuarios/provincia.routes.js';
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
import familiaProductoRoutes from './Maestros/familiaProducto.routes.js';
import subfamiliaProductoRoutes from './Maestros/subfamiliaProducto.routes.js';
import unidadMedidaRoutes from './Maestros/unidadMedida.routes.js';
import tipoMaterialRoutes from './Maestros/tipoMaterial.routes.js';
import colorRoutes from './Maestros/color.routes.js';
import marcaRoutes from './Maestros/marca.routes.js';
import tipoAlmacenamientoRoutes from './Maestros/tipoAlmacenamiento.routes.js';
import empresaRoutes from './Maestros/empresa.routes.js';
import empresaLogoRoutes from './Maestros/empresa.logo.routes.js';
import personalFotoRoutes from './Usuarios/personal.foto.routes.js'; // Rutas de manejo de foto de personal
import productoFotoRoutes from './Maestros/producto.foto.routes.js'; // Rutas de manejo de foto de producto
import productoFichaTecnicaRoutes from './Maestros/producto.ficha-tecnica.routes.js';
import fichaTecnicaBolicheRoutes from './Maestros/ficha-tecnica-boliches.routes.js';
import certificadosEmbarcacionRoutes from './Maestros/certificados-embarcacion.routes.js';
import embarcacionFotoRoutes from './Maestros/embarcacion.foto.routes.js';
import empresaAdjuntosRoutes from './Maestros/empresa.adjunto.routes.js';
import sedesEmpresaRoutes from './Maestros/sedesEmpresa.routes.js';
import areaFisicaSedeRoutes from './Maestros/areaFisicaSede.routes.js';
import especieRoutes from './Maestros/especie.routes.js';
import activoRoutes from './Maestros/activo.routes.js';
import tipoActivoRoutes from './Maestros/tipoActivo.routes.js';
import detallePermisoActivoRoutes from './Maestros/detallePermisoActivo.routes.js';
import permisoAutorizacionRoutes from './Maestros/permisoAutorizacion.routes.js';
import estadoMultiFuncionRoutes from './Maestros/estadoMultiFuncion.routes.js';
import tipoProvieneDeRoutes from './Maestros/tipoProvieneDe.routes.js';
import tiposDocIdentidadRoutes from './Maestros/tiposDocIdentidad.routes.js';
import centroCostoRoutes from './Maestros/centroCosto.routes.js';
import categoriaCCostoRoutes from './Maestros/categoriaCCosto.routes.js';
import empresaCentroCostoRoutes from './Maestros/empresaCentroCosto.routes.js';
import parametroAprobadorRoutes from './Maestros/parametroAprobador.routes.js';
import consultaExternaRoutes from './Maestros/consultaExterna.routes.js';
import accesoInstalacionRoutes from '../routes/AccesoInstalaciones/accesoInstalacion.routes.js';
import tipoEquipoRoutes from '../routes/AccesoInstalaciones/tipoEquipo.routes.js';
import accesoInstalacionDetalleRoutes from '../routes/AccesoInstalaciones/accesoInstalacionDetalle.routes.js';
import tipoMovimientoAccesoRoutes from '../routes/AccesoInstalaciones/tipoMovimientoAcceso.routes.js';
import tipoAccesoInstalacionRoutes from '../routes/AccesoInstalaciones/tipoAccesoInstalacion.routes.js';
import tipoPersonaRoutes from '../routes/AccesoInstalaciones/tipoPersona.routes.js';
import motivoAccesoRoutes from '../routes/AccesoInstalaciones/motivoAcceso.routes.js';
import documentosVisitanteRoutes from '../routes/AccesoInstalaciones/documentos.visitante.routes.js';
import confirmacionesAccionesPreviasRoutes from '../routes/AccesoInstalaciones/confirmaciones.acciones.previas.routes.js';
import movimientoAlmacenRoutes from '../routes/Almacen/movimientoAlmacen.routes.js';
import detalleMovimientoAlmacenRoutes from '../routes/Almacen/detalleMovimientoAlmacen.routes.js';
import tipoDocumentoRoutes from '../routes/Almacen/tipoDocumento.routes.js';
import conceptoMovAlmacenRoutes from '../routes/Almacen/conceptoMovAlmacen.routes.js';
import tipoConceptoRoutes from '../routes/Almacen/tipoConcepto.routes.js';
import tipoMovimientoAlmacenRoutes from '../routes/Almacen/tipoMovimientoAlmacen.routes.js';
import tipoAlmacenRoutes from '../routes/Almacen/tipoAlmacen.routes.js';
import serieDocRoutes from '../routes/Almacen/serieDoc.routes.js';
import kardexAlmacenRoutes from '../routes/Almacen/kardexAlmacen.routes.js';
import saldosProductoClienteRoutes from '../routes/Almacen/saldosProductoCliente.routes.js';
import saldosDetProductoClienteRoutes from '../routes/Almacen/saldosDetProductoCliente.routes.js';
import tipoMantenimientoRoutes from '../routes/Mantenimiento/tipoMantenimiento.routes.js';
import otMantenimientoRoutes from '../routes/Mantenimiento/otMantenimiento.routes.js';
import motivoOriginoOTRoutes from '../routes/Mantenimiento/motivoOriginoOT.routes.js';
import detPermisoGestionadoOTRoutes from '../routes/Mantenimiento/detPermisoGestionadoOT.routes.js';
import detTareasOTRoutes from '../routes/Mantenimiento/detTareasOT.routes.js';
import detInsumosTareaOTRoutes from '../routes/Mantenimiento/detInsumosTareaOT.routes.js';
import requerimientoCompraRoutes from '../routes/Compras/requerimientoCompra.routes.js';
import detalleReqCompraRoutes from '../routes/Compras/detalleReqCompra.routes.js';
import ordenCompraRoutes from '../routes/Compras/ordenCompra.routes.js';
import detalleOrdenCompraRoutes from '../routes/Compras/detalleOrdenCompra.routes.js';
import cotizacionComprasRoutes from '../routes/Compras/cotizacionCompras.routes.js';
import detGastosComprasProdRoutes from '../routes/Compras/detGastosComprasProd.routes.js';
import detCotizacionComprasRoutes from '../routes/Compras/detCotizacionCompras.routes.js';
import detProductoFinalCotizacionComprasRoutes from '../routes/Compras/detProductoFinalCotizacionCompras.routes.js';
import detDocsReqCotizaComprasRoutes from '../routes/Compras/detDocsReqCotizaCompras.routes.js';
import entregaARendirPComprasRoutes from '../routes/Compras/entregaARendirPCompras.routes.js';
import detMovsEntregaRendirPComprasRoutes from '../routes/Compras/detMovsEntregaRendirPCompras.routes.js';
import liquidacionProcesoComprasProdRoutes from '../routes/Compras/liquidacionProcesoComprasProd.routes.js';
import movLiquidacionProcesoComprasProdRoutes from '../routes/Compras/movLiquidacionProcesoComprasProd.routes.js';
import cotizacionVentasRoutes from '../routes/Ventas/cotizacionVentas.routes.js';
import detCotizacionVentasRoutes from '../routes/Ventas/detCotizacionVentas.routes.js';
import tipoProductoRoutes from '../routes/Ventas/tipoProducto.routes.js';
import tipoEstadoProductoRoutes from '../routes/Ventas/tipoEstadoProducto.routes.js';
import destinoProductoRoutes from '../routes/Ventas/destinoProducto.routes.js';
import formaTransaccionRoutes from '../routes/Ventas/formaTransaccion.routes.js';
import modoDespachoRecepcionRoutes from '../routes/Ventas/modoDespachoRecepcion.routes.js';
import docRequeridaComprasVentasRoutes from '../routes/Ventas/docRequeridaComprasVentas.routes.js';
import detDocsReqCotizaVentasRoutes from '../routes/Ventas/detDocsReqCotizaVentas.routes.js';
import entregaARendirPVentasRoutes from '../routes/Ventas/entregaARendirPVentas.routes.js';
import detMovsEntregaRendirPVentasRoutes from '../routes/Ventas/detMovsEntregaRendirPVentas.routes.js';
import preFacturaRoutes from '../routes/Ventas/preFactura.routes.js';
import incotermRoutes from '../routes/Ventas/incoterm.routes.js';
import detallePreFacturaRoutes from '../routes/Ventas/detallePreFactura.routes.js';
import temporadaPescaRoutes from '../routes/Pesca/temporadaPesca.routes.js';
import temporadaPescaResolucionRoutes from '../routes/Pesca/temporadaPesca.resolucion.routes.js';
import embarcacionRoutes from '../routes/Pesca/embarcacion.routes.js';
import tipoEmbarcacionRoutes from '../routes/Pesca/tipoEmbarcacion.routes.js';
import documentoPescaRoutes from '../routes/Pesca/documentoPesca.routes.js';
import documentacionEmbarcacionRoutes from '../routes/Pesca/documentacionEmbarcacion.routes.js';
import detalleDocEmbarcacionRoutes from '../routes/Pesca/detalleDocEmbarcacion.routes.js';
import bolicheRedRoutes from '../routes/Pesca/bolicheRed.routes.js';
import faenaPescaRoutes from '../routes/Pesca/faenaPesca.routes.js';
import calaRoutes from '../routes/Pesca/cala.routes.js';
import detalleCalaEspecieRoutes from '../routes/Pesca/detalleCalaEspecie.routes.js';
import calaProduceRoutes from '../routes/Pesca/calaProduce.routes.js';
import detalleCalaEspecieProduceRoutes from '../routes/Pesca/detalleCalaEspecieProduce.routes.js';
import detalleDocTripulantesRoutes from '../routes/Pesca/detalleDocTripulantes.routes.js';
import tripulanteFaenaRoutes from '../routes/Pesca/tripulanteFaena.routes.js';
import descargaFaenaPescaRoutes from '../routes/Pesca/descargaFaenaPesca.routes.js';
import detalleDescargaFaenaRoutes from '../routes/Pesca/detalleDescargaFaena.routes.js';
import accionesPreviasFaenaRoutes from '../routes/Pesca/accionesPreviasFaena.routes.js';
import detAccionesPreviasFaenaRoutes from '../routes/Pesca/detAccionesPreviasFaena.routes.js';
import liquidacionFaenaPescaRoutes from '../routes/Pesca/liquidacionFaenaPesca.routes.js';
import movLiquidacionFaenaPescaRoutes from '../routes/Pesca/movLiquidacionFaenaPesca.routes.js';
import puertoPescaRoutes from '../routes/Pesca/puertoPesca.routes.js';
import liquidacionTemporadaPescaRoutes from '../routes/Pesca/liquidacionTemporadaPesca.routes.js';
import movLiquidacionTemporadaPescaRoutes from '../routes/Pesca/movLiquidacionTemporadaPesca.routes.js';
import novedadPescaConsumoRoutes from '../routes/Pesca/novedadPescaConsumo.routes.js';
import faenaPescaConsumoRoutes from '../routes/Pesca/faenaPescaConsumo.routes.js';
import detAccionesPreviasFaenaConsumoRoutes from '../routes/Pesca/detAccionesPreviasFaenaConsumo.routes.js';
import detDocTripulantesFaenaConsumoRoutes from '../routes/Pesca/detDocTripulantesFaenaConsumo.routes.js';
import tripulanteFaenaConsumoRoutes from '../routes/Pesca/tripulanteFaenaConsumo.routes.js';
import detDocEmbarcacionPescaConsumoRoutes from '../routes/Pesca/detDocEmbarcacionPescaConsumo.routes.js';
import entregaARendirPescaConsumoRoutes from '../routes/Pesca/entregaARendirPescaConsumo.routes.js';
import detMovsEntRendirPescaConsumoRoutes from '../routes/Pesca/detMovsEntRendirPescaConsumo.routes.js';
import calaFaenaConsumoRoutes from '../routes/Pesca/calaFaenaConsumo.routes.js';
import detCalaPescaConsumoRoutes from '../routes/Pesca/detCalaPescaConsumo.routes.js';
import calaFaenaConsumoProduceRoutes from '../routes/Pesca/calaFaenaConsumoProduce.routes.js';
import detCalaFaenaConsumoProduceRoutes from '../routes/Pesca/detCalaFaenaConsumoProduce.routes.js';
import descargaFaenaConsumoRoutes from '../routes/Pesca/descargaFaenaConsumo.routes.js';
import detDescargaFaenaConsumoRoutes from '../routes/Pesca/detDescargaFaenaConsumo.routes.js';
import liquidacionFaenaConsumoRoutes from '../routes/Pesca/liquidacionFaenaConsumo.routes.js';
import movLiquidacionFaenaConsumoRoutes from '../routes/Pesca/movLiquidacionFaenaConsumo.routes.js';
import liqNovedadPescaConsumoRoutes from '../routes/Pesca/liqNovedadPescaConsumo.routes.js';
import movLiqNovedadPescaConsumoRoutes from '../routes/Pesca/movLiqNovedadPescaConsumo.routes.js';
import entregaARendirRoutes from '../routes/Pesca/entregaARendir.routes.js';
import detMovsEntregaRendirRoutes from '../routes/Pesca/detMovsEntregaRendir.routes.js';
import tipoMovEntregaRendirRoutes from '../routes/Pesca/tipoMovEntregaRendir.routes.js';
import recalcularToneladasRoutes from '../routes/Pesca/recalcularToneladas.routes.js';
import testRecalculoRoutes from '../routes/Pesca/testRecalculo.routes.js';
import empresaReporteRoutes from '../routes/Maestros/empresa.reporte.routes.js';
import productoRoutes from '../routes/Maestros/producto.routes.js';

import { autenticarJWT } from '../middlewares/authMiddleware.js';
import * as usuarioController from '../controllers/Usuarios/usuario.controller.js'

const router = express.Router();

// Rutas públicas de autenticación
router.use('/auth', authRoutes);

// Ruta para manejo de logos de empresa (upload y serving)
router.use('/empresas-logo', empresaLogoRoutes);
// Ruta para manejo de fotos de personal (upload y serving)
router.use('/personal-foto', personalFotoRoutes); // Permite subir y servir fotos de personal
// Ruta para manejo de fotos de producto (upload y serving)
router.use('/producto-foto', productoFotoRoutes); // Permite subir y servir fotos de producto
// Ruta para manejo de fotos de embarcación (upload y serving)
router.use('/embarcacion-foto', embarcacionFotoRoutes); // Permite subir y servir fotos de embarcación
router.use('/producto-ficha-tecnica', productoFichaTecnicaRoutes);
router.use('/ficha-tecnica-boliches', fichaTecnicaBolicheRoutes);
router.use('/certificados-embarcacion', certificadosEmbarcacionRoutes);
// Ruta para manejo de adjuntos PDF de empresa (upload y serving)
router.use('/empresas-adjuntos', empresaAdjuntosRoutes);
// Ruta para manejo de resoluciones PDF de temporada de pesca (upload y serving)
router.use('/temporada-pesca-resolucion', temporadaPescaResolucionRoutes);

// Ruta para manejo de reportes generados por empresa (upload y serving)
router.use('/empresas-reportes', empresaReporteRoutes);

// Rutas públicas para usuarios (antes del middleware global)
router.get('/usuarios/count', usuarioController.contarUsuarios);
router.post('/usuarios/superusuario', usuarioController.crearSuperusuario);

// Middleware global de autenticación (protege todas las rutas siguientes)
router.use(autenticarJWT);

// Rutas CRUD para Usuario
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
// Rutas para Producto
router.use('/productos', productoRoutes);
// Rutas para FamiliaProducto
router.use('/familias-producto', familiaProductoRoutes);
// Rutas para SubfamiliaProducto
router.use('/subfamilias-producto', subfamiliaProductoRoutes);
// Rutas para UnidadMedida
router.use('/unidades-medida', unidadMedidaRoutes);
// Rutas para TipoMaterial
router.use('/tipos-material', tipoMaterialRoutes);
// Rutas para Color
router.use('/colores', colorRoutes);
// Rutas para Marca
router.use('/marcas', marcaRoutes);
// Rutas para TipoAlmacenamiento
router.use('/tipos-almacenamiento', tipoAlmacenamientoRoutes);
// Rutas para Empresa
router.use('/empresas', empresaRoutes);
// Rutas para SedesEmpresa
router.use('/sedes-empresa', sedesEmpresaRoutes);
// Rutas para AreaFisicaSede
router.use('/areas-fisicas-sede', areaFisicaSedeRoutes);
// Rutas para Especie
router.use('/especies', especieRoutes);
// Rutas para Activo
router.use('/activos', activoRoutes);
// Rutas para TipoActivo
router.use('/tipos-activo', tipoActivoRoutes);
// Rutas para DetallePermisoActivo
router.use('/detalles-permiso-activo', detallePermisoActivoRoutes);
// Rutas para PermisoAutorizacion
router.use('/permisos-autorizacion', permisoAutorizacionRoutes);
// Rutas para EstadoMultiFuncion
router.use('/estados-multi-funcion', estadoMultiFuncionRoutes);
// Rutas para TipoProvieneDe
router.use('/tipos-proviene-de', tipoProvieneDeRoutes);
// Rutas para TiposDocIdentidad
router.use('/tipos-doc-identidad', tiposDocIdentidadRoutes);
// Rutas para CentroCosto
router.use('/centros-costo', centroCostoRoutes);
// Rutas para CategoriaCCosto
router.use('/categorias-ccosto', categoriaCCostoRoutes);
// Rutas para EmpresaCentroCosto
router.use('/empresas-centro-costo', empresaCentroCostoRoutes);
// Rutas para ParametroAprobador
router.use('/parametros-aprobador', parametroAprobadorRoutes);
// Rutas para Consultas Externas (RENIEC y SUNAT)
router.use('/consultas-externas', consultaExternaRoutes);
// Rutas para AccesoInstalacion
router.use('/accesos-instalacion', accesoInstalacionRoutes);
// Rutas para TipoEquipo
router.use('/tipos-equipo', tipoEquipoRoutes);
// Rutas para AccesoInstalacionDetalle
router.use('/accesos-instalacion-detalle', accesoInstalacionDetalleRoutes);
// Rutas para TipoMovimientoAcceso
router.use('/tipos-movimiento-acceso', tipoMovimientoAccesoRoutes);
// Rutas para TipoAccesoInstalacion
router.use('/tipos-acceso-instalacion', tipoAccesoInstalacionRoutes);
// Rutas para TipoPersona
router.use('/tipos-persona', tipoPersonaRoutes);
// Rutas para MotivoAcceso
router.use('/motivos-acceso', motivoAccesoRoutes);
// Rutas para DocumentosVisitante (upload y serving de PDFs de documentos)
router.use('/documentos-visitantes', documentosVisitanteRoutes);
// Rutas para ConfirmacionesAccionesPrevias (upload y serving de PDFs de confirmaciones)
router.use('/confirmaciones-acciones-previas', confirmacionesAccionesPreviasRoutes);
// Rutas para MovimientoAlmacen
router.use('/movimientos-almacen', movimientoAlmacenRoutes);
// Rutas para DetalleMovimientoAlmacen
router.use('/detalles-movimiento-almacen', detalleMovimientoAlmacenRoutes);
// Rutas para TipoDocumento
router.use('/tipos-documento', tipoDocumentoRoutes);
// Rutas para ConceptoMovAlmacen
router.use('/conceptos-mov-almacen', conceptoMovAlmacenRoutes);
// Rutas para TipoConcepto
router.use('/tipos-concepto', tipoConceptoRoutes);
// Rutas para TipoMovimientoAlmacen
router.use('/tipos-movimiento-almacen', tipoMovimientoAlmacenRoutes);
// Rutas para TipoAlmacen
router.use('/tipos-almacen', tipoAlmacenRoutes);
// Rutas para SerieDoc
router.use('/series-doc', serieDocRoutes);
// Rutas para KardexAlmacen
router.use('/kardex-almacen', kardexAlmacenRoutes);
// Rutas para SaldosProductoCliente
router.use('/saldos-producto-cliente', saldosProductoClienteRoutes);
// Rutas para SaldosDetProductoCliente
router.use('/saldos-det-producto-cliente', saldosDetProductoClienteRoutes);
// Rutas para OTMantenimiento
router.use('/ot-mantenimiento', otMantenimientoRoutes);
// Rutas para TipoMantenimiento
router.use('/tipos-mantenimiento', tipoMantenimientoRoutes);
// Rutas para MotivoOriginoOT
router.use('/motivos-origen-ot', motivoOriginoOTRoutes);
// Rutas para DetPermisoGestionadoOT
router.use('/permisos-gestionados-ot', detPermisoGestionadoOTRoutes);
// Rutas para DetTareasOT
router.use('/tareas-ot', detTareasOTRoutes);
// Rutas para DetInsumosTareaOT
router.use('/insumos-tarea-ot', detInsumosTareaOTRoutes);
// Rutas para RequerimientoCompra
router.use('/requerimientos-compra', requerimientoCompraRoutes);
// Rutas para DetalleReqCompra
router.use('/detalles-req-compra', detalleReqCompraRoutes);
// Rutas para OrdenCompra
router.use('/ordenes-compra', ordenCompraRoutes);
// Rutas para DetalleOrdenCompra
router.use('/detalles-orden-compra', detalleOrdenCompraRoutes);
// Rutas para CotizacionCompras
router.use('/cotizaciones-compras', cotizacionComprasRoutes);
// Rutas para CotizacionCompras (principal)
router.use('/cotizacion-compras', cotizacionComprasRoutes);
// Rutas para DetGastosComprasProd
router.use('/gastos-compras-prod', detGastosComprasProdRoutes);
// Rutas para DetCotizacionCompras
router.use('/detalles-cotizacion-compras', detCotizacionComprasRoutes);
// Rutas para DetProductoFinalCotizacionCompras
router.use('/detalles-producto-final-cotizacion-compras', detProductoFinalCotizacionComprasRoutes);
// Rutas para DetDocsReqCotizaCompras
router.use('/docs-req-cotiza-compras', detDocsReqCotizaComprasRoutes);
// Rutas para EntregaARendirPCompras
router.use('/entregas-a-rendir-compras', entregaARendirPComprasRoutes);
// Rutas para DetMovsEntregaRendirPCompras
router.use('/movs-entrega-rendir-compras', detMovsEntregaRendirPComprasRoutes);
// Rutas para LiquidacionProcesoComprasProd
router.use('/liquidaciones-proceso-compras', liquidacionProcesoComprasProdRoutes);
// Rutas para MovLiquidacionProcesoComprasProd
router.use('/movs-liquidacion-proceso-compras', movLiquidacionProcesoComprasProdRoutes);
// Rutas para CotizacionVentas
router.use('/cotizaciones-ventas', cotizacionVentasRoutes);
// Rutas para DetCotizacionVentas
router.use('/detalles-cotizacion-ventas', detCotizacionVentasRoutes);
// Rutas para TipoProducto
router.use('/tipos-producto', tipoProductoRoutes);
// Rutas para TipoEstadoProducto
router.use('/tipos-estado-producto', tipoEstadoProductoRoutes);
// Rutas para DestinoProducto
router.use('/destinos-producto', destinoProductoRoutes);
// Rutas para FormaTransaccion
router.use('/formas-transaccion', formaTransaccionRoutes);
// Rutas para ModoDespachoRecepcion
router.use('/modos-despacho-recepcion', modoDespachoRecepcionRoutes);
// Rutas para DocRequeridaComprasVentas
router.use('/docs-requeridas-compras-ventas', docRequeridaComprasVentasRoutes);
// Rutas para detDocsReqCotizaVentas
router.use('/det-docs-req-cotiza-ventas', detDocsReqCotizaVentasRoutes);
// Rutas para EntregaARendirPVentas
router.use('/entregas-a-rendir-ventas', entregaARendirPVentasRoutes);
// Rutas para DetMovsEntregaRendirPVentas
router.use('/movs-entrega-rendir-ventas', detMovsEntregaRendirPVentasRoutes);
// Rutas para PreFactura
router.use('/pre-facturas', preFacturaRoutes);
// Rutas para Incoterm
router.use('/incoterms', incotermRoutes);
// Rutas para DetallePreFactura
router.use('/detalles-pre-factura', detallePreFacturaRoutes);
// Rutas para TemporadaPesca
router.use('/pesca/temporadas-pesca', temporadaPescaRoutes);
// Rutas para TemporadaPescaResolucion
router.use('/pesca/temporada-pesca-resolucion', temporadaPescaResolucionRoutes);
// Rutas para Embarcacion
router.use('/pesca/embarcaciones', embarcacionRoutes);
// Rutas para TipoEmbarcacion
router.use('/pesca/tipos-embarcacion', tipoEmbarcacionRoutes);
// Rutas para DocumentoPesca
router.use('/pesca/documentos-pesca', documentoPescaRoutes);
// Rutas para DocumentacionEmbarcacion
router.use('/pesca/documentaciones-embarcacion', documentacionEmbarcacionRoutes);
// Rutas para DetalleDocEmbarcacion
router.use('/pesca/detalles-doc-embarcacion', detalleDocEmbarcacionRoutes);
// Rutas para BolicheRed
router.use('/pesca/boliches-red', bolicheRedRoutes);
router.use('/pesca/ficha-tecnica-boliches', fichaTecnicaBolicheRoutes);
// Rutas para FaenaPesca
router.use('/pesca/faenas-pesca', faenaPescaRoutes);
// Rutas para Cala
router.use('/pesca/calas', calaRoutes);
// Rutas para DetalleCalaEspecie
router.use('/pesca/detalles-cala-especie', detalleCalaEspecieRoutes);
// Rutas para CalaProduce
router.use('/pesca/calas-produce', calaProduceRoutes);
// Rutas para DetalleCalaEspecieProduce
router.use('/pesca/detalles-cala-especie-produce', detalleCalaEspecieProduceRoutes);
// Rutas para DetalleDocTripulantes
router.use('/pesca/detalles-doc-tripulantes', detalleDocTripulantesRoutes);
// Rutas para TripulanteFaena
router.use('/pesca/tripulantes-faena', tripulanteFaenaRoutes);
// Rutas para DescargaFaenaPesca
router.use('/pesca/descargas-faena', descargaFaenaPescaRoutes);
// Rutas para DetalleDescargaFaena
router.use('/pesca/detalles-descarga-faena', detalleDescargaFaenaRoutes);
// Rutas para AccionesPreviasFaena
router.use('/pesca/acciones-previas-faena', accionesPreviasFaenaRoutes);
// Rutas para DetAccionesPreviasFaena
router.use('/pesca/detalles-acciones-previas-faena', detAccionesPreviasFaenaRoutes);
// Rutas para LiquidacionFaenaPesca
router.use('/pesca/liquidaciones-faena', liquidacionFaenaPescaRoutes);
// Rutas para MovLiquidacionFaenaPesca
router.use('/pesca/movs-liquidacion-faena', movLiquidacionFaenaPescaRoutes);
// Rutas para PuertoPesca
router.use('/pesca/puertos-pesca', puertoPescaRoutes);
// Rutas para LiquidacionTemporadaPesca
router.use('/pesca/liquidaciones-temporada', liquidacionTemporadaPescaRoutes);
// Rutas para MovLiquidacionTemporadaPesca
router.use('/pesca/movs-liquidacion-temporada', movLiquidacionTemporadaPescaRoutes);
// Rutas para NovedadPescaConsumo
router.use('/pesca/novedades-pesca-consumo', novedadPescaConsumoRoutes);
// Rutas para FaenaPescaConsumo
router.use('/pesca/faenas-pesca-consumo', faenaPescaConsumoRoutes);
// Rutas para DetAccionesPreviasFaenaConsumo
router.use('/pesca/det-acciones-previas-faena-consumo', detAccionesPreviasFaenaConsumoRoutes);
// Rutas para DetDocTripulantesFaenaConsumo
router.use('/pesca/det-doc-tripulantes-faena-consumo', detDocTripulantesFaenaConsumoRoutes);
// Rutas para TripulanteFaenaConsumo
router.use('/pesca/tripulantes-faena-consumo', tripulanteFaenaConsumoRoutes);
// Rutas para DetDocEmbarcacionPescaConsumo
router.use('/pesca/det-doc-embarcacion-pesca-consumo', detDocEmbarcacionPescaConsumoRoutes);
// Rutas para EntregaARendirPescaConsumo
router.use('/pesca/entregas-a-rendir-pesca-consumo', entregaARendirPescaConsumoRoutes);
// Rutas para DetMovsEntRendirPescaConsumo
router.use('/pesca/movs-entregarendir-pesca-consumo', detMovsEntRendirPescaConsumoRoutes);
// Rutas para CalaFaenaConsumo
router.use('/pesca/calas-faena-consumo', calaFaenaConsumoRoutes);
// Rutas para DetCalaPescaConsumo
router.use('/pesca/det-cala-pesca-consumo', detCalaPescaConsumoRoutes);
// Rutas para CalaFaenaConsumoProduce
router.use('/pesca/calas-faena-consumo-produce', calaFaenaConsumoProduceRoutes);
// Rutas para DetCalaFaenaConsumoProduce
router.use('/pesca/det-cala-faena-consumo-produce', detCalaFaenaConsumoProduceRoutes);
// Rutas para DescargaFaenaConsumo
router.use('/pesca/descargas-faena-consumo', descargaFaenaConsumoRoutes);
// Rutas para DetDescargaFaenaConsumo
router.use('/pesca/det-descarga-faena-consumo', detDescargaFaenaConsumoRoutes);
// Rutas para LiquidacionFaenaConsumo
router.use('/pesca/liquidaciones-faena-consumo', liquidacionFaenaConsumoRoutes);
// Rutas para MovLiquidacionFaenaConsumo
router.use('/pesca/movs-liquidacion-faena-consumo', movLiquidacionFaenaConsumoRoutes);
// Rutas para LiqNovedadPescaConsumo
router.use('/pesca/liq-novedad-pesca-consumo', liqNovedadPescaConsumoRoutes);
// Rutas para MovLiqNovedadPescaConsumo
router.use('/pesca/movs-liq-novedad-pesca-consumo', movLiqNovedadPescaConsumoRoutes);
// Rutas para EntregaARendir
router.use('/entregas-a-rendir', entregaARendirRoutes);
// Rutas para DetMovsEntregaRendir
router.use('/det-movs-entrega-rendir', detMovsEntregaRendirRoutes);
// Rutas para TipoMovEntregaRendir
router.use('/tipos-mov-entrega-rendir', tipoMovEntregaRendirRoutes);
router.use('/recalcular-toneladas', recalcularToneladasRoutes);
router.use('/test-recalculo', testRecalculoRoutes);
router.use('/movimientos-caja', movimientoCajaRoutes);
router.use('/cuentas-corrientes', cuentaCorrienteRoutes);
router.use('/asientos-contables-interfaz', asientoContableInterfazRoutes);
// Rutas para TipoContrato (contratos laborales)
router.use('/tipos-contrato', tipoContratoRoutes);
router.use('/tipos-referencia-movimiento-caja', tipoReferenciaMovimientoCajaRoutes);
router.use('/bancos', bancoRoutes);
router.use('/tipos-cuenta-corriente', tipoCuentaCorrienteRoutes);

export default router;
