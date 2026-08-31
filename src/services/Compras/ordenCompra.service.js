import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import crearMovimientoAlmacenService from "../Almacen/crearMovimientoAlmacen.service.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";
import { ESTADO_ORDEN_COMPRA, ESTADO_PERIODO_CONTABLE, ESTADO_ASIENTO_CONTABLE } from "../../utils/estados.constants.js";
import {
  capturarCombinacionesAfectadas,
  eliminarKardexDeMovimiento,
  recalcularSaldosAfectados,
} from "../Almacen/kardexGenerico.service.js";
import { aplicarSignoMonto } from '../../utils/tiposDocumento.constants.js';
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";

async function validarForaneas(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa)
      throw new ValidationError("La empresa referenciada no existe.");
  }

  if (data.tipoDocumentoId) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({
      where: { id: data.tipoDocumentoId },
    });
    if (!tipoDoc)
      throw new ValidationError("El tipo de documento referenciado no existe.");
  }

  if (data.serieDocId) {
    const serieDoc = await prisma.serieDoc.findUnique({
      where: { id: data.serieDocId },
    });
    if (!serieDoc)
      throw new ValidationError(
        "La serie de documento referenciada no existe.",
      );
  }

  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({
      where: { id: data.proveedorId },
    });
    if (!proveedor)
      throw new ValidationError("El proveedor referenciado no existe.");
  }

  if (data.requerimientoCompraId) {
    const req = await prisma.requerimientoCompra.findUnique({
      where: { id: data.requerimientoCompraId },
    });
    if (!req)
      throw new ValidationError(
        "El requerimiento de compra referenciado no existe.",
      );
  }
}

const listar = async () => {
  try {
    const ordenes = await prisma.ordenCompra.findMany({
      include: {
        empresa: true,
        centroCosto: {
          include: {
            categoria: true
          }
        },
        tipoDocumento: true,
        serieDoc: true,
        requerimientoCompra: true,
        proveedor: {
          include: {
            tipoDocumento: true
          }
        },
        formaPago: true,
        moneda: true,
        estado: true,
        periodoContable: true,
        tipoDocumentoFinal: true,
        ordenCompraOrigen: true,
        unidadNegocio: true,
        submoduloOrigen: true,
        motivoNotaCreditoDebito: true,
        tipoOperacionSunat: true,
        tipoDetraccion: true,
        dcmtoAfectoNCND: {
          include: {
            tipoDocumentoFinal: true
          }
        },
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true
              }
            },
            tipoAfectacionIGV: true,
            tipoDetraccion: true
          },
        },
      },
      orderBy: {
        fechaDocumento: "desc",
      },
    });

    // Agregar montos en PEN para reportes SUNAT
    return ordenes.map(oc => {
      const esMonedaExtranjera = oc.moneda?.codigoSunat !== "PEN";
      const tc = esMonedaExtranjera ? Number(oc.tipoCambio || 1) : 1;
      return {
        ...oc,
        subtotalPEN: Number(oc.subtotal || 0) * tc,
        totalIGVPEN: Number(oc.totalIGV || 0) * tc,
        totalPEN: Number(oc.total || 0) * tc,
        totalDescuentosPEN: Number(oc.totalDescuentos || 0) * tc,
        montoDetraccionPEN: Number(oc.montoDetraccion || 0) * tc,
        montoImpuestoRentaPEN: Number(oc.montoImpuestoRenta || 0) * tc
      };
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtener todas las órdenes de compra con filtros personalizados
 * @param {Object} where - Condiciones de filtrado Prisma
 * @returns {Promise<Array>} Lista de órdenes de compra
 */
const obtenerTodos = async (where = {}) => {
  try {
    const ordenes = await prisma.ordenCompra.findMany({
      where,
      include: {
        empresa: { select: { razonSocial: true } },
        proveedor: { select: { razonSocial: true } },
        tipoDocumento: { select: { descripcion: true, codigo: true } },
        estado: { select: { descripcion: true } },
        moneda: { select: { codigoSunat: true, simbolo: true } },
      },
      orderBy: [
        { fechaDocumento: 'desc' },
        { id: 'desc' }
      ],
    });

    // Agregar montos en PEN para reportes SUNAT
    return ordenes.map(oc => {
      const esMonedaExtranjera = oc.moneda?.codigoSunat !== "PEN";
      const tc = esMonedaExtranjera ? Number(oc.tipoCambio || 1) : 1;
      return {
        ...oc,
        subtotalPEN: Number(oc.subtotal || 0) * tc,
        totalIGVPEN: Number(oc.totalIGV || 0) * tc,
        totalPEN: Number(oc.total || 0) * tc,
        totalDescuentosPEN: Number(oc.totalDescuentos || 0) * tc,
        montoDetraccionPEN: Number(oc.montoDetraccion || 0) * tc,
        montoImpuestoRentaPEN: Number(oc.montoImpuestoRenta || 0) * tc
      };
    });
  } catch (error) {
    console.error("Error al obtener órdenes de compra:", error);
    throw new DatabaseError("Error al obtener órdenes de compra: " + error.message);
  }
};

const obtenerPorId = async (id) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        empresa: true,
        centroCosto: {
          include: {
            categoria: true
          }
        },
        tipoDocumento: true,
        serieDoc: true,
        requerimientoCompra: {
          include: {
            detalles: {
              include: {
                producto: {
                  include: {
                    unidadMedida: true,
                  },
                },
              },
            },
          },
        },
        proveedor: {
          include: {
            tipoDocumento: true,
          },
        },
        formaPago: true,
        moneda: true,
        unidadNegocio: true,
        periodoContable: true, // ✅ AGREGADO
        asientosContables: {
          include: {
            estado: true,
            moneda: true,
            detalles: {
              include: {
                planCuenta: true,
                centroCosto: true,
                entidadComercial: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
        estado: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true,
                marca: true,
                familia: true,
                subfamilia: true,
              },
            },
            tipoAfectacionIGV: true,
          },
        },
        datosAdicionales: {
          where: {
            imprimirEnOC: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });
    if (!orden) throw new NotFoundError("OrdenCompra no encontrada");

    if (orden.solicitanteId) {
      const solicitante = await prisma.personal.findUnique({
        where: { id: orden.solicitanteId },
        include: {
          cargo: true,
        },
      });
      if (solicitante) {
        solicitante.nombreCompleto =
          `${solicitante.nombres} ${solicitante.apellidos}`.trim();
        orden.solicitante = solicitante;
      }
    }

    if (orden.aprobadoPorId) {
      const aprobadoPor = await prisma.personal.findUnique({
        where: { id: orden.aprobadoPorId },
        include: {
          cargo: true,
        },
      });
      if (aprobadoPor) {
        aprobadoPor.nombreCompleto =
          `${aprobadoPor.nombres} ${aprobadoPor.apellidos}`.trim();
        orden.aprobadoPor = aprobadoPor;
      }
    }

    if (orden.centroCostoId) {
      const centroCosto = await prisma.centroCosto.findUnique({
        where: { id: orden.centroCostoId },
      });
      if (centroCosto) {
        centroCosto.nombre = centroCosto.Nombre;
        centroCosto.codigo = centroCosto.Codigo;
        centroCosto.descripcion = centroCosto.Descripcion;
        orden.centroCosto = centroCosto;
      }
    }

    // ⭐ CONSTRUCCIÓN MANUAL: Dirección de Recepción en Almacén
    if (orden.direccionRecepcionAlmacenId) {
      const direccion = await prisma.direccionEntidad.findUnique({
        where: { id: orden.direccionRecepcionAlmacenId },
        include: {
          ubigeo: true,
        },
      });
      if (direccion) {
        orden.direccionRecepcionAlmacen = direccion;
      }
    }

    // ⭐ CONSTRUCCIÓN MANUAL: Contacto del Proveedor
    if (orden.contactoProveedorId) {
      const contacto = await prisma.contactoEntidad.findUnique({
        where: { id: orden.contactoProveedorId },
      });
      if (contacto) {
        orden.contactoProveedor = contacto;
      }
    }

    return orden;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError("Error al obtener OrdenCompra", err.message);
  }
};

const crear = async (data) => {
  try {
    // ✅ Validaciones iniciales
    if (!data.empresaId || !data.tipoDocumentoId || !data.proveedorId) {
      throw new ValidationError(
        "Los campos empresaId, tipoDocumentoId y proveedorId son obligatorios.",
      );
    }
    if (!data.serieDocId) {
      throw new ValidationError("El campo serieDocId es obligatorio.");
    }

    await validarForaneas(data);

    // ✅ Validar y obtener tipo de cambio si es necesario
    const tipoCambioFinal = await validarTipoCambio(
      data.tipoCambio,
      data.fechaDocumento || new Date(),
    );

    return await prisma.$transaction(async (tx) => {
      // ✅ Obtener empresa y serie en paralelo
      const [empresa, serie] = await Promise.all([
        tx.empresa.findUnique({
          where: { id: Number(data.empresaId) },
        }),
        tx.serieDoc.findUnique({
          where: { id: Number(data.serieDocId) },
        }),
      ]);

      if (!empresa) {
        throw new ValidationError("Empresa no encontrada.");
      }

      if (!serie) {
        throw new ValidationError("Serie de documento no encontrada.");
      }

      // ✅ Generar correlativo y número de documento
      const nuevoCorrelativo = Number(serie.correlativo) + 1;
      const numSerie = String(serie.serie).padStart(serie.numCerosIzqSerie, "0");
      const numCorre = String(nuevoCorrelativo).padStart(serie.numCerosIzqCorre, "0");
      const numeroDocumento = `${numSerie}-${numCorre}`;

      // ✅ Actualizar correlativo de serie
      await tx.serieDoc.update({
        where: { id: Number(data.serieDocId) },
        data: { correlativo: nuevoCorrelativo },
      });

      // ✅ Obtener estado inicial
      const estadoInicial = await tx.estadoMultiFuncion.findFirst({
        where: { id: ESTADO_ORDEN_COMPRA.PENDIENTE },
      });

      if (!estadoInicial) {
        throw new ValidationError(
          `No se encontró el estado inicial PENDIENTE (id=${ESTADO_ORDEN_COMPRA.PENDIENTE})`,
        );
      }

      // ✅ Crear orden de compra
      const ordenCreada = await tx.ordenCompra.create({
        data: {
          empresaId: data.empresaId,
          tipoDocumentoId: data.tipoDocumentoId,
          serieDocId: data.serieDocId,
          numSerieDoc: numSerie,
          numCorreDoc: numCorre,
          numeroDocumento,
          fechaDocumento: data.fechaDocumento || new Date(),
          fechaContable: data.fechaContable,
          periodoContableId: data.periodoContableId,
          requerimientoCompraId: data.requerimientoCompraId,
          proveedorId: data.proveedorId,
          formaPagoId: data.formaPagoId,
          monedaId: data.monedaId,
          tipoCambio: tipoCambioFinal,
          fechaEntrega: data.fechaEntrega,
          fechaRecepcion: data.fechaRecepcion,
          fechaVencimiento: data.fechaVencimiento,
          solicitanteId: data.solicitanteId,
          aprobadoPorId: data.aprobadoPorId,
          estadoId: estadoInicial.id,
          centroCostoId: data.centroCostoId,
          movIngresoAlmacenId: data.movIngresoAlmacenId,
          observaciones: data.observaciones,
          urlOrdenCompraPdf: data.urlOrdenCompraPdf,
          urlDocumentoRef: data.urlDocumentoRef,
          unidadNegocioId: data.unidadNegocioId,
          creadoEn: data.creadoEn || new Date(),
          actualizadoEn: data.actualizadoEn || new Date(),
          creadoPor: data.creadoPor,
          actualizadoPor: data.actualizadoPor,
          porcentajeIGV: data.porcentajeIGV !== undefined ? data.porcentajeIGV : empresa.porcentajeIgv,
          aplicaImpuestoRenta: data.aplicaImpuestoRenta || false,
          porcentajeImpuestoRenta: data.porcentajeImpuestoRenta || null,
          esExoneradoAlIGV: data.esExoneradoAlIGV !== undefined ? data.esExoneradoAlIGV : false,
          pagosPreviosSI: data.pagosPreviosSI !== undefined ? data.pagosPreviosSI : null,
          tipoDocumentoFinalId: data.tipoDocumentoFinalId,
          numeroDocumentoFinal: data.numeroDocumentoFinal,
          numSerieDocFinal: data.numSerieDocFinal,
          numCorreDocFinal: data.numCorreDocFinal,
          comprobanteRecibido: data.comprobanteRecibido,
          fechaRecepcionComprobante: data.fechaRecepcionComprobante,
          direccionRecepcionAlmacenId: data.direccionRecepcionAlmacenId,
          contactoProveedorId: data.contactoProveedorId,
          facturado: data.facturado !== undefined ? data.facturado : false,
          fechaFacturacion: data.fechaFacturacion,
          esGerencial: data.esGerencial !== undefined ? data.esGerencial : false,
          ordenCompraOrigenId: data.ordenCompraOrigenId,
          esParticionada: data.esParticionada !== undefined ? data.esParticionada : false,
          motivoNotaCreditoDebitoId: data.motivoNotaCreditoDebitoId,
          fechaDcmtoAfectoNCND: data.fechaDcmtoAfectoNCND,
          dcmtoAfectoNCNDId: data.dcmtoAfectoNCNDId,
          numeroDcmtoAfectoNCND: data.numeroDcmtoAfectoNCND,
        },
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          moneda: true,
          unidadNegocio: true,
        },
      });

      // ✅ Calcular totales e impuestos en backend
      const totales = await calcularTotalesEImpuestos(ordenCreada.id, tx);

      // ✅ Actualizar orden con totales calculados
      const ordenConTotales = await tx.ordenCompra.update({
        where: { id: ordenCreada.id },
        data: totales,
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          moneda: true,
          unidadNegocio: true,
        },
      });

      return ordenConTotales;
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError("OrdenCompra no encontrada");

    if (Number(existe.estadoId) === ESTADO_ORDEN_COMPRA.ANULADO) {
      throw new ValidationError("No se puede modificar una orden anulada");
    }

    await validarForaneas(data);

    // ✅ Validar y obtener tipo de cambio si es necesario
    if (data.hasOwnProperty("tipoCambio")) {
      data.tipoCambio = await validarTipoCambio(
        data.tipoCambio,
        data.fechaDocumento || existe.fechaDocumento,
      );
    }
    const actualizado = await prisma.$transaction(async (tx) => {
      // ✅ Actualizar orden de compra
      const ordenActualizada = await tx.ordenCompra.update({
        where: { id },
        data: {
          empresaId: data.empresaId,
          tipoDocumentoId: data.tipoDocumentoId,
          serieDocId: data.serieDocId,
          numSerieDoc: data.numSerieDoc,
          numCorreDoc: data.numCorreDoc,
          numeroDocumento: data.numeroDocumento,
          fechaDocumento: data.fechaDocumento,
          fechaContable: data.fechaContable,
          periodoContableId: data.periodoContableId,
          fechaVencimiento: data.fechaVencimiento,
          requerimientoCompraId: data.requerimientoCompraId,
          proveedorId: data.proveedorId,
          formaPagoId: data.formaPagoId,
          monedaId: data.monedaId,
          tipoCambio: data.tipoCambio,
          fechaEntrega: data.fechaEntrega,
          fechaRecepcion: data.fechaRecepcion,
          solicitanteId: data.solicitanteId,
          aprobadoPorId: data.aprobadoPorId,
          estadoId: data.estadoId,
          centroCostoId: data.centroCostoId,
          unidadNegocioId: data.unidadNegocioId,
          movIngresoAlmacenId: data.movIngresoAlmacenId,
          observaciones: data.observaciones,
          urlOrdenCompraPdf: data.urlOrdenCompraPdf,
          urlDocumentoRef: data.urlDocumentoRef,
          porcentajeIGV: data.porcentajeIGV,
          esExoneradoAlIGV: data.esExoneradoAlIGV,
          pagosPreviosSI: data.pagosPreviosSI !== undefined ? data.pagosPreviosSI : null,
          aplicaImpuestoRenta: data.aplicaImpuestoRenta,
          porcentajeImpuestoRenta: data.porcentajeImpuestoRenta,
          tipoDocumentoFinalId: data.tipoDocumentoFinalId,
          numeroDocumentoFinal: data.numeroDocumentoFinal,
          numSerieDocFinal: data.numSerieDocFinal,
          numCorreDocFinal: data.numCorreDocFinal,
          comprobanteRecibido: data.comprobanteRecibido,
          fechaRecepcionComprobante: data.fechaRecepcionComprobante,
          direccionRecepcionAlmacenId: data.direccionRecepcionAlmacenId,
          contactoProveedorId: data.contactoProveedorId,
          facturado: data.facturado,
          fechaFacturacion: data.fechaFacturacion,
          esGerencial: data.esGerencial,
          ordenCompraOrigenId: data.ordenCompraOrigenId,
          esParticionada: data.esParticionada,
          motivoNotaCreditoDebitoId: data.motivoNotaCreditoDebitoId,
          fechaDcmtoAfectoNCND: data.fechaDcmtoAfectoNCND,
          dcmtoAfectoNCNDId: data.dcmtoAfectoNCNDId,
          numeroDcmtoAfectoNCND: data.numeroDcmtoAfectoNCND,
          actualizadoEn: new Date(),
          actualizadoPor: data.actualizadoPor,
        },
      });

      // ✅ Recalcular subtotales de detalles
      const detalles = await tx.detalleOrdenCompra.findMany({
        where: { ordenCompraId: id },
      });

      if (detalles.length > 0) {
        await Promise.all(
          detalles.map((detalle) =>
            tx.detalleOrdenCompra.update({
              where: { id: detalle.id },
              data: {
                subtotal: Number(detalle.cantidad) * Number(detalle.precioUnitario),
              },
            })
          )
        );
      }

      // ✅ Calcular totales e impuestos en backend
      const totales = await calcularTotalesEImpuestos(id, tx);

      // ✅ Actualizar orden con totales calculados
      await tx.ordenCompra.update({
        where: { id },
        data: totales,
      });

      // ✅ Retornar orden actualizada con relaciones
      return await tx.ordenCompra.findUnique({
        where: { id },
        include: {
          empresa: true,
          centroCosto: {
            include: {
              categoria: true
            }
          },
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          moneda: true,
          unidadNegocio: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });
    });

    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Calcula TODOS los totales e impuestos de una OrdenCompra
 * Subtotal, IGV, Total, Detracción, Retención, Percepción
 * @param {BigInt} ordenCompraId - ID de la OrdenCompra
 * @param {Object} tx - Transacción de Prisma (opcional)
 * @returns {Object} - Campos calculados para actualizar
 */
const calcularTotalesEImpuestos = async (ordenCompraId, tx = prisma) => {
  try {
    const orden = await tx.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: {
        empresa: true,
        proveedor: true,
        moneda: true,
        tipoDocumento: true,
        tipoDocumentoFinal: true,
        detalles: {
          include: {
            producto: {
              include: {
                tipoDetraccion: true,
              },
            },
            tipoAfectacionIGV: true, // AGREGADO
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundError("OrdenCompra no encontrada");
    }
    // ========================================
    // PASO 1: CALCULAR SUBTOTAL (suma de detalles)
    // ========================================
    const subtotal = orden.detalles.reduce((sum, detalle) => {
      return sum + Number(detalle.subtotal || 0);
    }, 0);

    // ========================================
    // PASO 2: CALCULAR IGV (según tipo de afectación por item)
    // ========================================
    const porcentajeIGV = Number(orden.porcentajeIGV || orden.empresa.porcentajeIgv || 18);
    const subtotalGravado = orden.detalles.reduce((sum, detalle) => {
      // Verificar si el tipo de afectación calcula IGV
      const aplicaIGV = detalle.tipoAfectacionIGV?.calculaIGV || (!detalle.tipoAfectacionIGVId && !orden.esExoneradoAlIGV);
      return aplicaIGV ? sum + Number(detalle.subtotal || 0) : sum;
    }, 0);
    const totalIGV = subtotalGravado * (porcentajeIGV / 100);

    // ========================================
    // PASO 3: CALCULAR IMPUESTO A LA RENTA (si aplica)
    // ========================================
    const aplicaImpuestoRenta = orden.aplicaImpuestoRenta || false;
    const porcentajeImpuestoRenta = Number(orden.porcentajeImpuestoRenta || 0);
    const montoImpuestoRenta = aplicaImpuestoRenta
      ? subtotal * (porcentajeImpuestoRenta / 100)
      : 0;

    // ========================================
    // PASO 4: CALCULAR TOTAL
    // ========================================
    const total = subtotal + totalIGV - montoImpuestoRenta;

    // VALIDAR: Solo calcular impuestos para Facturas (01) y Boletas (03)
    const codigoSunat = orden.tipoDocumentoFinal?.codigoSunat || orden.tipoDocumento?.codigoSunat || '';
    const aplicaImpuestos = codigoSunat === '01' || codigoSunat === '03';
    // ========================================
    // PASO 5: EVALUAR DETRACCIÓN (solo Facturas y Boletas)
    // ========================================
    let aplicaDetraccion = false;
    let tipoDetraccionId = null;
    let porcentajeDetraccion = null;
    let montoDetraccion = null;
    let mensajeDetraccion = null;

    const detallesConDetraccion = orden.detalles.filter(
      (d) => d.producto?.tipoDetraccionId
    );

    if (aplicaImpuestos && detallesConDetraccion.length > 0) {
      let porcentajeMax = 0;
      let tipoDetraccionMax = null;

      for (const detalle of detallesConDetraccion) {
        const porcentaje = Number(detalle.producto.porcentajeDetraccion || 0);
        if (porcentaje > porcentajeMax) {
          porcentajeMax = porcentaje;
          tipoDetraccionMax = detalle.producto.tipoDetraccion;
        }
      }

      if (porcentajeMax > 0 && tipoDetraccionMax) {
        // Convertir total a soles si es necesario
        const esSoles = orden.moneda.codigoSunat === 'PEN';
        const totalEnSoles = esSoles ? total : total * Number(orden.tipoCambio);

        const umbralMinimo = Number(
          tipoDetraccionMax.montoMinimo || orden.empresa.montoMinimoDetraccion || 700
        );

        if (totalEnSoles > umbralMinimo) {
          aplicaDetraccion = true;
          tipoDetraccionId = tipoDetraccionMax.id;
          porcentajeDetraccion = porcentajeMax;
          montoDetraccion = Math.round(totalEnSoles * (porcentajeMax / 100));
          mensajeDetraccion = `✅ Detracción aplicada: ${porcentajeMax}% (S/ ${montoDetraccion}) - Total: S/ ${totalEnSoles.toFixed(2)} > Umbral: S/ ${umbralMinimo}`;
        } else {
          mensajeDetraccion = `⚠️ No aplica detracción: Total S/ ${totalEnSoles.toFixed(2)} ≤ Umbral S/ ${umbralMinimo}`;
        }
      } else {
        mensajeDetraccion = '⚠️ No aplica detracción: Producto sin porcentaje o tipo de detracción configurado';
      }
    } else {
      if (!aplicaImpuestos) {
        mensajeDetraccion = '⚠️ No aplica detracción: Documento no es Factura/Boleta';
      } else if (detallesConDetraccion.length === 0) {
        mensajeDetraccion = '⚠️ No aplica detracción: Ningún producto tiene detracción configurada';
      }
    }

    // ========================================
    // PASO 6: EVALUAR RETENCIÓN (Solo si NO hay detracción y es Factura/Boleta)
    // ========================================
    let aplicaRetencion = false;
    let porcentajeRetencion = null;
    let montoRetencion = null;

    if (aplicaImpuestos && !aplicaDetraccion) {
      const empresaEsAgente = orden.empresa.soyAgenteRetencion || false;
      const proveedorSujeto = orden.proveedor.sujetoRetencion || false;
      const umbralRetencion = Number(orden.empresa.montoMinimoRetencion || 700);

      // Verificar si algún producto está exonerado de retención
      const hayProductoExonerado = orden.detalles.some(
        (d) => d.producto?.exoneradoRetencion === true
      );

      if (empresaEsAgente && proveedorSujeto && total > umbralRetencion && !hayProductoExonerado) {
        aplicaRetencion = true;
        porcentajeRetencion = Number(orden.empresa.porcentajeRetencion || 3);
        const esSoles = orden.moneda.codigoSunat === 'PEN';
        const totalEnSoles = esSoles ? total : total * Number(orden.tipoCambio);
        montoRetencion = totalEnSoles * (porcentajeRetencion / 100);
      }
    }

    // ========================================
    // PASO 7: EVALUAR PERCEPCIÓN (solo Facturas y Boletas)
    // ========================================
    let aplicaPercepcion = false;
    let porcentajePercepcion = null;
    let montoPercepcion = null;

    const proveedorEsAgente = orden.proveedor.sujetoPercepcion || false;

    if (aplicaImpuestos && proveedorEsAgente) {
      aplicaPercepcion = true;
      porcentajePercepcion = Number(orden.empresa.porcentajePercepcion || 1);
      const esSoles = orden.moneda.codigoSunat === 'PEN';
      const totalEnSoles = esSoles ? total : total * Number(orden.tipoCambio);
      montoPercepcion = totalEnSoles * (porcentajePercepcion / 100);
    }

    // ========================================
    // APLICAR SIGNO NEGATIVO SI ES NOTA DE CRÉDITO
    // ========================================
    const tipoDocFinalId = orden.tipoDocumentoFinalId || orden.tipoDocumentoId;
    const subtotalFinal = aplicarSignoMonto(subtotal, tipoDocFinalId);
    const totalIGVFinal = aplicarSignoMonto(totalIGV, tipoDocFinalId);
    const totalFinal = aplicarSignoMonto(total, tipoDocFinalId);

    // ========================================
    // RETORNAR TODOS LOS CAMPOS CALCULADOS
    // ========================================
    return {
      subtotal: subtotalFinal,
      totalIGV: totalIGVFinal,
      total: totalFinal,
      montoImpuestoRenta,
      aplicaDetraccion,
      porcentajeDetraccion,
      montoDetraccion,
      aplicaRetencion,
      porcentajeRetencion,
      montoRetencion,
      aplicaPercepcion,
      porcentajePercepcion,
      montoPercepcion,
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError("Error al calcular totales e impuestos", err.message);
  }
};


const eliminar = async (id, usuarioId, transaccion = null) => {
  try {
    const ejecutarEnTransaccion = async (tx) => {
      // PASO 1: VALIDACIONES PREVIAS
      if (!id) {
        throw new ValidationError("El ID de la OrdenCompra es obligatorio");
      }

      if (!usuarioId) {
        throw new ValidationError("El ID del usuario es obligatorio");
      }

      const usuario = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { esSuperUsuario: true },
      });

      if (!usuario?.esSuperUsuario) {
        throw new ValidationError(
          "Solo SuperUsuarios pueden eliminar Órdenes de Compra completas"
        );
      }
      const ordenCompra = await tx.ordenCompra.findUnique({
        where: { id },
        include: {
          detalles: true,
        },
      });

      if (!ordenCompra) {
        throw new NotFoundError("OrdenCompra no encontrada");
      }

      if (Number(ordenCompra.estadoId) === ESTADO_ORDEN_COMPRA.ANULADO) {
        throw new ValidationError("No se puede eliminar una orden anulada");
      }

      const resultados = {
        ordenesCompra: 0,
        detallesOrdenCompra: 0,
        cuentasPorPagar: 0,
        pagos: 0,
        movimientosAlmacen: 0,
        detallesMovAlmacen: 0,
        kardexEliminados: 0,
        saldosDetRegenerados: 0,
        saldosGenRegenerados: 0,
        asientosContables: 0,
        percepciones: 0,
        datosAdicionales: 0,
        repuestosContratistas: 0,
        ordenesCompraHijas: 0,
      };

      // PASO 2: ELIMINAR ORDENES COMPRA HIJAS (PARTICIONADAS)
      const ordenesHijas = await tx.ordenCompra.findMany({
        where: { ordenCompraOrigenId: id },
        select: { id: true },
      });

      if (ordenesHijas.length > 0) {
        for (const hija of ordenesHijas) {
          const resultadoHija = await eliminar(hija.id, usuarioId, tx);
          resultados.ordenesCompraHijas += resultadoHija.resultados.ordenesCompra;
        }
      }

      // PASO 3: ELIMINAR ASIENTOS CONTABLES
      const asientosContables = await tx.asientoContable.findMany({
        where: {
          ordenesCompra: {
            some: {
              id: id
            }
          },
        },
      });

      if (asientosContables && asientosContables.length > 0) {
        // Eliminar detalles de asientos
        for (const asiento of asientosContables) {
          await tx.detalleAsientoContable.deleteMany({
            where: { asientoContableId: asiento.id },
          });
        }

        // Eliminar asientos
        await tx.asientoContable.deleteMany({
          where: {
            id: { in: asientosContables.map(a => a.id) },
          },
        });

        resultados.asientosContables = asientosContables.length;
      }

      // PASO 4: ELIMINAR PERCEPCIONES
      const percepcionesResult = await tx.percepcion.deleteMany({
        where: { ordenCompraId: id },
      });
      resultados.percepciones = Number(percepcionesResult.count);

      // PASO 5: DESVINCULAR REPUESTOS CONTRATISTAS OT
      const repuestosResult = await tx.detRepuestosContratistaOT.updateMany({
        where: { ordenCompraId: id },
        data: { ordenCompraId: null },
      });
      resultados.repuestosContratistas = Number(repuestosResult.count);

      // PASO 6: ELIMINAR DATOS ADICIONALES
      const datosResult = await tx.detDatosAdicionalesOrdenCompra.deleteMany({
        where: { ordenCompraId: id },
      });
      resultados.datosAdicionales = Number(datosResult.count);

      // PASO 7: ELIMINAR CUENTA POR PAGAR Y PAGOS
      const cuentaPorPagar = await tx.cuentaPorPagar.findFirst({
        where: { ordenCompraId: id },
        include: { pagos: true },
      });

      if (cuentaPorPagar) {
        if (cuentaPorPagar.pagos?.length > 0) {
          const pagosResult = await tx.pagoCuentaPorPagar.deleteMany({
            where: { cuentaPorPagarId: cuentaPorPagar.id },
          });
          resultados.pagos = Number(pagosResult.count);
        }

        await tx.cuentaPorPagar.delete({
          where: { id: cuentaPorPagar.id },
        });
        resultados.cuentasPorPagar = 1;
      }

      // PASO 8: ELIMINAR MOVIMIENTO DE ALMACÉN
      if (ordenCompra.movIngresoAlmacenId) {
        const { default: eliminarMovimientoAlmacenService } =
          await import("../Almacen/eliminarMovimientoAlmacen.service.js");
        const resultadoMov = await eliminarMovimientoAlmacenService
          .eliminarMovimientoAlmacenCompleto(
            ordenCompra.movIngresoAlmacenId,
            tx
          );

        resultados.movimientosAlmacen = 1;
        resultados.detallesMovAlmacen = resultadoMov.resultados.detallesEliminados;
        resultados.kardexEliminados = resultadoMov.resultados.kardexEliminados;
        resultados.saldosDetRegenerados = resultadoMov.resultados.saldosDetRegenerados;
        resultados.saldosGenRegenerados = resultadoMov.resultados.saldosGenRegenerados;
      }
      // PASO 9: ELIMINAR DETALLES DE ORDEN COMPRA
      const detallesResult = await tx.detalleOrdenCompra.deleteMany({
        where: { ordenCompraId: id },
      });
      resultados.detallesOrdenCompra = Number(detallesResult.count);

      // PASO 10: ELIMINAR ORDEN COMPRA
      await tx.ordenCompra.delete({
        where: { id },
      });
      resultados.ordenesCompra = 1;
      return {
        success: true,
        mensaje: "OrdenCompra eliminada exitosamente con todos sus registros relacionados",
        resultados: resultados,
      };
    };

    let resultado;
    if (transaccion) {
      resultado = await ejecutarEnTransaccion(transaccion);
    } else {
      resultado = await prisma.$transaction(ejecutarEnTransaccion);
    }

    return resultado;

  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof NotFoundError
    ) {
      throw error;
    }
    console.error("Error al eliminar OrdenCompra completa:", error);
    throw new DatabaseError(
      "Error al eliminar OrdenCompra: " + error.message
    );
  }
};

const obtenerSeriesDoc = async (empresaId, tipoDocumentoId) => {
  try {
    const where = {
      activo: true,
    };

    if (empresaId) where.empresaId = Number(empresaId);
    if (tipoDocumentoId) where.tipoDocumentoId = Number(tipoDocumentoId);

    const series = await prisma.serieDoc.findMany({
      where,
      orderBy: {
        serie: "asc",
      },
    });

    return series;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const aprobar = async (id) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) throw new NotFoundError("OrdenCompra no encontrada");

    if (Number(orden.estadoId) !== ESTADO_ORDEN_COMPRA.PENDIENTE) {
      throw new ValidationError(
        "Solo se pueden aprobar órdenes en estado PENDIENTE",
      );
    }

    const parametroAprobador = await prisma.parametroAprobador.findFirst({
      where: {
        empresaId: orden.empresaId,
        moduloSistemaId: Number(4),
        cesado: false,
      },
    });

    if (!parametroAprobador) {
      throw new ValidationError(
        "No se encontró un aprobador configurado para el módulo de Compras en esta empresa",
      );
    }

    const aprobado = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estadoId: ESTADO_ORDEN_COMPRA.APROBADO,
        aprobadoPorId: parametroAprobador.personalRespId,
        actualizadoEn: new Date(),
      },
      include: {
        empresa: true,
        tipoDocumento: true,
        tipoDocumentoFinal: true,
        proveedor: true,
        moneda: true,
        estado: true,
        unidadNegocio: true,
        periodoContable: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    return aprobado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};
const anular = async (id) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.findUnique({
        where: { id },
        include: { movIngresoAlmacen: true },
      });

      if (!orden) throw new NotFoundError("OrdenCompra no encontrada");
      if (Number(orden.estadoId) === ESTADO_ORDEN_COMPRA.ANULADO) {
        throw new ValidationError("La orden ya está anulada");
      }

      // ✅ SI TIENE KARDEX, USAR FUNCIÓN GENÉRICA
      if (orden.movIngresoAlmacenId) {
        const { default: eliminarMovimientoAlmacenService } =
          await import("../Almacen/eliminarMovimientoAlmacen.service.js");

        await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
          orden.movIngresoAlmacenId,
          tx,
        );
      }

      const anulado = await tx.ordenCompra.update({
        where: { id },
        data: {
          estadoId: ESTADO_ORDEN_COMPRA.ANULADO,
          movIngresoAlmacenId: null,
          actualizadoEn: new Date(),
        },
        include: {
          empresa: true,
          tipoDocumento: true,
          tipoDocumentoFinal: true,
          proveedor: true,
          moneda: true,
          estado: true,
          unidadNegocio: true,
          periodoContable: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      return anulado;
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};



/**
 * Reactivar Orden de Compra
 * Devuelve una OrdenCompra APROBADA/FACTURADA al estado PENDIENTE
 * Elimina kardex, CuentaPorPagar (sin pagos) y AsientosContables
 * 
 * @param {BigInt} id - ID de la OrdenCompra
 * @param {BigInt} usuarioId - ID del usuario que reactiva
 * @returns {Object} - OrdenCompra reactivada con estadísticas
 */
const reactivarDocumentoOrdenCompra = async (id, usuarioId) => {
  try {
    // Obtener la OrdenCompra con todas las relaciones necesarias
    const ordenCompra = await prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        detalles: true,
        cuentaPorPagar: {
          include: {
            pagos: true,
          },
        },
        asientosContables: true,
      },
    });

    if (!ordenCompra) {
      throw new NotFoundError('OrdenCompra no encontrada');
    }

    // ========================================
    // VALIDACIONES CRÍTICAS
    // ========================================

    // 1. Validar que el estado sea APROBADO o superior
    const estadoActual = Number(ordenCompra.estadoId);

    if (estadoActual <= ESTADO_ORDEN_COMPRA.PENDIENTE) {
      throw new ValidationError(
        'Solo se pueden reactivar Órdenes de Compra APROBADAS'
      );
    }

    // 2. Validar que NO esté anulada
    if (estadoActual === ESTADO_ORDEN_COMPRA.ANULADO) {
      throw new ValidationError(
        'No se puede reactivar una Orden de Compra ANULADA'
      );
    }

    // 3. Validar que NO esté particionada
    if (ordenCompra.esParticionada) {
      throw new ValidationError(
        'No se puede reactivar una Orden de Compra que fue particionada. ' +
        'La Orden de Compra original ya no es válida.'
      );
    }

    // 4. Validar que NO tenga CuentaPorPagar con pagos
    if (ordenCompra.cuentaPorPagar) {
      const cxp = ordenCompra.cuentaPorPagar;

      if (cxp.pagos && cxp.pagos.length > 0) {
        throw new ValidationError(
          'No se puede reactivar una Orden de Compra que tiene Cuenta por Pagar con pagos registrados. ' +
          `La CxP tiene ${cxp.pagos.length} pago(s) por un total de ${cxp.montoPagado}.`
        );
      }
    }

    // ========================================
    // EJECUTAR EN TRANSACCIÓN ATÓMICA
    // ========================================
    return await prisma.$transaction(async (tx) => {
      let kardexEliminados = 0;
      let saldosDetActualizados = 0;
      let saldosGenActualizados = 0;
      let productosAfectados = 0;
      let asientosEliminados = 0;

      // ========================================
      // PASO 1: SI TIENE MOVIMIENTO DE ALMACÉN - ELIMINARLO COMPLETAMENTE
      // ========================================
      let movimientosEliminados = [];
      let detallesMovimientoEliminados = 0;

      // 1.1 Buscar TODOS los movimientos relacionados con esta OrdenCompra
      const movimientos = await tx.movimientoAlmacen.findMany({
        where: { ordenCompraId: ordenCompra.id },
        include: {
          detalles: true,
        },
      });

      if (movimientos && movimientos.length > 0) {
        // 1.2 Procesar cada movimiento
        for (const movimiento of movimientos) {
          movimientosEliminados.push({
            id: movimiento.id,
            numeroDocumento: movimiento.numeroDocumento,
            fechaDocumento: movimiento.fechaDocumento,
          });
          detallesMovimientoEliminados += movimiento.detalles?.length || 0;

          // 1.3 Capturar combinaciones afectadas
          const combinaciones = await capturarCombinacionesAfectadas(
            movimiento.id,
            tx
          );

          // 1.4 Eliminar kardex del movimiento
          const kardexDelMovimiento = await eliminarKardexDeMovimiento(
            movimiento.id,
            tx
          );
          kardexEliminados += kardexDelMovimiento;

          // 1.5 Eliminar detalles del movimiento
          await tx.detalleMovimientoAlmacen.deleteMany({
            where: { movimientoAlmacenId: movimiento.id },
          });

          // 1.6 Eliminar movimiento de almacén
          await tx.movimientoAlmacen.delete({
            where: { id: movimiento.id },
          });

          // 1.7 Recalcular saldos afectados
          const resultadoSaldos = await recalcularSaldosAfectados(combinaciones, tx);
          saldosDetActualizados += resultadoSaldos.saldosDetActualizados;
          saldosGenActualizados += resultadoSaldos.saldosGenActualizados;
          productosAfectados += combinaciones.generales.length;
        }
      }
      // ========================================
      // PASO 2: ELIMINAR CUENTA POR PAGAR (si existe y sin pagos)
      // ========================================
      if (ordenCompra.cuentaPorPagar) {
        await tx.cuentaPorPagar.delete({
          where: { id: ordenCompra.cuentaPorPagar.id },
        });
      }

      // ========================================
      // PASO 3: ELIMINAR ASIENTOS CONTABLES
      // ========================================
      if (ordenCompra.asientosContables && ordenCompra.asientosContables.length > 0) {
        asientosEliminados = ordenCompra.asientosContables.length;

        // Eliminar detalles de asientos (cascade debería hacerlo, pero por seguridad)
        for (const asiento of ordenCompra.asientosContables) {
          await tx.detalleAsientoContable.deleteMany({
            where: { asientoContableId: asiento.id },
          });
        }

        // Eliminar asientos
        await tx.asientoContable.deleteMany({
          where: {
            id: { in: ordenCompra.asientosContables.map(a => a.id) }
          },
        });
      }

      // ========================================
      // PASO 4: BUSCAR ESTADO PENDIENTE (38)
      // ========================================
      const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
        where: {
          id: ESTADO_ORDEN_COMPRA.PENDIENTE,
        },
      });

      if (!estadoPendiente) {
        throw new ValidationError(
          'No se encontró el estado PENDIENTE para Orden de Compra'
        );
      }

      // ========================================
      // PASO 5: CAMBIAR ESTADO A PENDIENTE
      // ========================================
      const ordenCompraReactivada = await tx.ordenCompra.update({
        where: { id },
        data: {
          estadoId: estadoPendiente.id,
          movIngresoAlmacenId: null, // Limpiar referencia al movimiento
          facturado: false, // Marcar como no facturado
          fechaFacturacion: null, // Limpiar fecha de facturación
          actualizadoEn: new Date(),
          actualizadoPor: usuarioId,
        },
        include: {
          empresa: true,
          proveedor: true,
          tipoDocumento: true,
          tipoDocumentoFinal: true,
          moneda: true,
          estado: true,
          unidadNegocio: true,
          periodoContable: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      // ========================================
      // RETORNAR RESULTADO CON ESTADÍSTICAS COMPLETAS
      // ========================================
      return {
        ordenCompra: ordenCompraReactivada,
        movimientosAlmacen: movimientosEliminados.length > 0 ? {
          eliminados: movimientosEliminados.length,
          movimientos: movimientosEliminados.map(m => ({
            id: Number(m.id),
            numeroDocumento: m.numeroDocumento,
            fechaDocumento: m.fechaDocumento,
          })),
          kardexEliminados: Number(kardexEliminados),
          detallesEliminados: Number(detallesMovimientoEliminados),
        } : {
          eliminados: 0,
        },
        saldos: {
          saldosDetActualizados: Number(saldosDetActualizados),
          saldosGenActualizados: Number(saldosGenActualizados),
          productosAfectados: Number(productosAfectados),
        },
        cuentaPorPagar: ordenCompra.cuentaPorPagar ? {
          eliminada: true,
          cxpId: Number(ordenCompra.cuentaPorPagar.id),
          montoTotal: Number(ordenCompra.cuentaPorPagar.montoTotal),
        } : {
          eliminada: false,
        },
        asientosContables: {
          eliminados: Number(asientosEliminados),
          asientosIds: ordenCompra.asientosContables?.map(a => Number(a.id)) || [],
        },
        mensaje: 'Orden de Compra reactivada exitosamente',
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith('P'))
      throw new DatabaseError('Error de base de datos al reactivar Orden de Compra', err.message);
    throw err;
  }
};



/**
 * Calcula el peso basado en cantidad y factor de conversión de la unidad de medida
 * @param {Object} detalle - Detalle de orden de compra con producto incluido
 * @returns {number} - Peso calculado
 */
const calcularPesoDetalle = (detalle) => {
  if (!detalle.producto || !detalle.producto.unidadMedidaId) {
    return Number(detalle.peso) || 0;
  }

  // Si el producto tiene unidad de medida con factor de conversión
  if (
    detalle.producto.unidadMedida &&
    detalle.producto.unidadMedida.factorConversion
  ) {
    const factorConversion = Number(
      detalle.producto.unidadMedida.factorConversion,
    );
    const cantidad = Number(detalle.cantidad);
    return cantidad * factorConversion;
  }

  // Si no tiene factor de conversión, usar el peso del detalle o 0
  return Number(detalle.peso) || 0;
};

/**
 * Obtiene la dirección del proveedor según prioridad:
 * 1. Si solo tiene una dirección → asignar esa
 * 2. Si tiene más de una → buscar almacenPrincipal=true
 * 3. Si hay varias principales → asignar la primera
 * 4. Si no hay principal → asignar la primera activa
 *
 * @param {BigInt} proveedorId - ID del proveedor
 * @param {Object} tx - Transacción de Prisma
 * @returns {BigInt|null} - ID de la dirección o null
 */
const obtenerDireccionProveedor = async (proveedorId, tx) => {
  // Obtener todas las direcciones activas del proveedor
  const direcciones = await tx.direccionEntidad.findMany({
    where: {
      entidadComercialId: proveedorId,
      activo: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  // Si no hay direcciones, retornar null
  if (!direcciones || direcciones.length === 0) {
    return null;
  }

  // Si solo tiene una dirección, retornar esa
  if (direcciones.length === 1) {
    return direcciones[0].id;
  }

  // Si tiene más de una, buscar la principal (almacenPrincipal=true)
  const direccionPrincipal = direcciones.find(
    (d) => d.almacenPrincipal === true,
  );

  // Si encontró una principal, retornarla
  if (direccionPrincipal) {
    return direccionPrincipal.id;
  }

  // Si no hay principal, retornar la primera activa
  return direcciones[0].id;
};

const generarKardex = async (id, datosKardex, usuarioId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // ========================================
      // PASO 1: OBTENER Y VALIDAR ORDEN DE COMPRA
      // ========================================
      const orden = await tx.ordenCompra.findUnique({
        where: { id },
        include: {
          empresa: true,
          serieDoc: true,
          detalles: {
            include: {
              producto: {
                include: {
                  unidadMedida: true,
                },
              },
            },
          },
        },
      });

      if (!orden) throw new NotFoundError("OrdenCompra no encontrada");

      // Validar que la orden esté en estado válido para generar kardex
      const estadoId = Number(orden.estadoId);
      const estadosValidos = [
        ESTADO_ORDEN_COMPRA.APROBADO,
        ESTADO_ORDEN_COMPRA.PARTICIONADA,
        ESTADO_ORDEN_COMPRA.FACTURADA,
      ];
      if (!estadosValidos.includes(estadoId)) {
        throw new ValidationError(
          "Solo se puede generar movimiento para órdenes APROBADAS, PARTICIONADAS o FACTURADAS",
        );
      }

      if (orden.movIngresoAlmacenId) {
        throw new ValidationError(
          "Esta orden ya tiene un movimiento de almacén generado",
        );
      }

      if (!orden.detalles || orden.detalles.length === 0) {
        throw new ValidationError(
          "La orden no tiene detalles para generar el movimiento",
        );
      }

      // ========================================
      // PASO 2: VALIDAR DATOS DEL DIÁLOGO
      // ========================================
      if (!datosKardex.almacenId) {
        throw new ValidationError("Debe seleccionar un almacén");
      }

      if (!datosKardex.conceptoMovAlmacenId) {
        throw new ValidationError("Debe seleccionar un concepto de movimiento");
      }

      if (!datosKardex.dirOrigenId) {
        throw new ValidationError("Debe seleccionar una dirección de origen");
      }

      if (!datosKardex.dirDestinoId) {
        throw new ValidationError("Debe seleccionar una dirección de destino");
      }

      if (!datosKardex.fechaIngreso) {
        throw new ValidationError("Debe especificar la fecha de ingreso");
      }

      if (!datosKardex.estadoId) {
        throw new ValidationError("Debe seleccionar un estado de mercadería");
      }

      if (!datosKardex.estadoCalidadId) {
        throw new ValidationError("Debe seleccionar un estado de calidad");
      }

      // ========================================
      // PASO 3: OBTENER CONCEPTO Y TIPO DE DOCUMENTO
      // ========================================
      const concepto = await tx.conceptoMovAlmacen.findUnique({
        where: { id: datosKardex.conceptoMovAlmacenId },
      });

      if (!concepto) {
        throw new ValidationError("El concepto de movimiento no existe");
      }

      // ========================================
      // PASO 4: OBTENER RESPONSABLE DE ALMACÉN
      // ========================================
      const parametroAprobador = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: orden.empresaId,
          moduloSistemaId: Number(6), // ALMACÉN
          cesado: false,
        },
      });

      if (!parametroAprobador || !parametroAprobador.personalRespId) {
        throw new ValidationError(
          "No se encontró responsable de almacén configurado",
        );
      }

      // ========================================
      // PASO 5: OBTENER SERIE DE DOCUMENTO (MISMA SERIE QUE LA ORDEN)
      // ========================================
      if (!orden.serieDoc || !orden.serieDoc.serie) {
        throw new ValidationError(
          "La orden de compra no tiene serie configurada",
        );
      }

      // Usar tipoDocumentoId de la orden o del concepto (priorizar orden)
      const tipoDocumentoIdMovimiento = orden.tipoDocumentoId || concepto.tipoDocumentoId;

      if (!tipoDocumentoIdMovimiento) {
        throw new ValidationError(
          "No se puede generar movimiento: la orden y el concepto no tienen tipo de documento configurado"
        );
      }

      const serieMovAlmacen = await tx.serieDoc.findFirst({
        where: {
          empresaId: orden.empresaId,
          tipoDocumentoId: tipoDocumentoIdMovimiento,
          serie: orden.serieDoc.serie, // ⭐ MISMA SERIE QUE LA ORDEN
          activo: true,
        },
      });

      if (!serieMovAlmacen) {
        throw new ValidationError(
          `No se encontró una serie activa para el tipo de documento ${tipoDocumentoIdMovimiento} con la serie "${orden.serieDoc.serie}"`,
        );
      }

      // ========================================
      // PASO 6: PREPARAR CABECERA DEL MOVIMIENTO
      // ========================================
      const cabecera = {
        empresaId: orden.empresaId,
        almacenId: datosKardex.almacenId,
        tipoDocumentoId: tipoDocumentoIdMovimiento,
        conceptoMovAlmacenId: datosKardex.conceptoMovAlmacenId,
        serieDocId: serieMovAlmacen.id,
        fechaDocumento: datosKardex.fechaDocumento || new Date(),
        entidadComercialId: orden.proveedorId,
        estadoDocAlmacenId: Number(30), // PENDIENTE
        esCustodia: false,
        personalRespAlmacen: parametroAprobador.personalRespId,
        ordenCompraId: orden.id,
        unidadNegocioId: orden.unidadNegocioId, // ⭐ HEREDADO de OrdenCompra
        dirOrigenId: datosKardex.dirOrigenId,
        dirDestinoId: datosKardex.dirDestinoId,
        observaciones: datosKardex.observaciones || `Ingreso por Orden de Compra ${orden.numeroDocumento}`,
      };

      // ========================================
      // PASO 7: PREPARAR DETALLES DEL MOVIMIENTO
      // ========================================
      const detalles = orden.detalles.map((det) => ({
        productoId: det.productoId,
        cantidad: det.cantidad,
        peso: calcularPesoDetalle(det),
        lote: datosKardex.lote || "",
        fechaProduccion: null, // ⭐ NULL para compras
        fechaVencimiento: datosKardex.fechaVencimiento || null,
        fechaIngreso: datosKardex.fechaIngreso,
        nroSerie: "",
        nroContenedor: "",
        estadoMercaderiaId: Number(datosKardex.estadoId),
        estadoCalidadId: Number(datosKardex.estadoCalidadId),
        entidadComercialId: orden.proveedorId,
        esCustodia: false,
        empresaId: orden.empresaId,
        costoUnitario: det.precioUnitario || 0,
        observaciones: null,
        detalleReqCompraId: det.detalleReqCompraId || null,
        ubicacionFisicaDestinoId: datosKardex.ubicacionFisicaId ? Number(datosKardex.ubicacionFisicaId) : null, // ⭐ AGREGAR ESTA LÍNEA
      }));

      // ========================================
      // PASO 8: CREAR MOVIMIENTO DE ALMACÉN (SIN KARDEX - PENDIENTE)
      // ========================================
      const resultado =
        await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
          cabecera,
          detalles,
          usuarioId,
          tx, // Pasar la transacción actual
        );

      // ========================================
      // PASO 9: ACTUALIZAR ORDEN DE COMPRA
      // ========================================
      const ordenActualizada = await tx.ordenCompra.update({
        where: { id },
        data: {
          movIngresoAlmacenId: resultado.movimiento.id,
          actualizadoEn: new Date(),
        },
        include: {
          empresa: true,
          tipoDocumento: true,
          proveedor: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      return {
        orden: ordenActualizada,
        movimientoId: resultado.movimiento.id, // ⭐ RETORNAR ID PARA REDIRECCIÓN
        movimiento: resultado.movimiento,
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Regenera el kardex de una orden de compra
 * Elimina el movimiento existente y crea uno nuevo
 */
const regenerarKardex = async (id, usuarioId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // ========================================
      // PASO 1: VALIDAR ORDEN Y MOVIMIENTO EXISTENTE
      // ========================================
      const orden = await tx.ordenCompra.findUnique({
        where: { id },
        include: {
          empresa: true,
          serieDoc: true,
          detalles: {
            include: {
              producto: {
                include: {
                  unidadMedida: true,
                },
              },
            },
          },
        },
      });

      if (!orden) throw new NotFoundError("OrdenCompra no encontrada");

      // ✅ Validar que la orden esté APROBADA y tenga kardex generado
      if (Number(orden.estadoId) !== ESTADO_ORDEN_COMPRA.APROBADO) {
        throw new ValidationError(
          "Solo se puede regenerar kardex de órdenes aprobadas",
        );
      }

      if (!orden.movIngresoAlmacenId) {
        throw new ValidationError(
          "La orden no tiene movimiento de almacén asociado para regenerar",
        );
      }

      // ========================================
      // PASO 2: RESETEAR ORDEN A ESTADO APROBADO
      // ========================================
      await tx.ordenCompra.update({
        where: { id },
        data: {
          estadoId: ESTADO_ORDEN_COMPRA.APROBADO, // APROBADO
          movIngresoAlmacenId: null,
          actualizadoEn: new Date(),
        },
      });

      // ========================================
      // PASO 3: ELIMINAR MOVIMIENTO EXISTENTE
      // ========================================
      const { default: eliminarMovimientoAlmacenService } =
        await import("../Almacen/eliminarMovimientoAlmacen.service.js");

      await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
        orden.movIngresoAlmacenId,
        tx,
      );

      // ========================================
      // PASO 4: VALIDAR DIRECCIÓN Y CONCEPTO
      // ========================================
      if (!orden.direccionRecepcionAlmacenId) {
        throw new ValidationError(
          "La orden no tiene dirección de recepción configurada",
        );
      }

      const direccion = await tx.direccionEntidad.findUnique({
        where: { id: orden.direccionRecepcionAlmacenId },
      });

      if (!direccion) {
        throw new ValidationError("La dirección de recepción no existe");
      }

      if (!direccion.conceptoAlmacenCompraId) {
        throw new ValidationError(
          "La dirección de recepción no tiene concepto de almacén de compra configurado",
        );
      }

      // ========================================
      // PASO 5: OBTENER RESPONSABLE DE ALMACÉN
      // ========================================
      const parametroAprobador = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: orden.empresaId,
          cesado: false,
        },
      });

      if (!parametroAprobador || !parametroAprobador.personalRespId) {
        throw new ValidationError(
          "No se encontró responsable de almacén configurado",
        );
      }

      // ========================================
      // PASO 6: OBTENER SERIE DE DOCUMENTO
      // ========================================
      if (!orden.serieDoc || !orden.serieDoc.serie) {
        throw new ValidationError(
          "La orden de compra no tiene serie configurada",
        );
      }

      const serieMovAlmacen = await tx.serieDoc.findFirst({
        where: {
          empresaId: orden.empresaId,
          tipoDocumentoId: Number(13), // Nota de Ingreso
          serie: orden.serieDoc.serie,
          activo: true,
        },
      });

      if (!serieMovAlmacen) {
        throw new ValidationError(
          `No se encontró una serie de Nota de Ingreso activa para la empresa ${orden.empresaId} con la serie "${orden.serieDoc.serie}"`,
        );
      }

      // ========================================
      // PASO 6.5: OBTENER DIRECCIÓN ORIGEN (PROVEEDOR)
      // ========================================
      const direccionOrigenId = await obtenerDireccionProveedor(
        orden.proveedorId,
        tx,
      );

      // ========================================
      // PASO 7: PREPARAR CABECERA DEL MOVIMIENTO
      // ========================================
      const cabecera = {
        empresaId: orden.empresaId,
        tipoDocumentoId: Number(13), // Nota de Ingreso
        conceptoMovAlmacenId: direccion.conceptoAlmacenCompraId,
        serieDocId: serieMovAlmacen.id,
        fechaDocumento: new Date(),
        entidadComercialId: orden.proveedorId,
        estadoDocAlmacenId: Number(30), // PENDIENTE
        esCustodia: false,
        personalRespAlmacen: parametroAprobador.personalRespId,
        dirOrigenId: direccionOrigenId,
        dirDestinoId: orden.direccionRecepcionAlmacenId,
        ordenCompraId: orden.id,
        unidadNegocioId: orden.unidadNegocioId, // ⭐ AGREGAR ESTA LÍNEA
        observaciones: `Ingreso por Orden de Compra ${orden.numeroDocumento} (REGENERADO)`,
      };

      // ========================================
      // PASO 8: PREPARAR DETALLES DEL MOVIMIENTO
      // ========================================
      const fechaActual = new Date();
      const fechaVencimiento = new Date(fechaActual);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      const detalles = orden.detalles.map((det) => ({
        productoId: det.productoId,
        cantidad: det.cantidad,
        peso: calcularPesoDetalle(det),
        lote: "",
        fechaProduccion: fechaActual,
        fechaVencimiento: fechaVencimiento,
        fechaIngreso: fechaActual,
        nroSerie: "",
        nroContenedor: "",
        estadoMercaderiaId: Number(6),
        estadoCalidadId: Number(10),
        entidadComercialId: orden.proveedorId,
        esCustodia: false,
        empresaId: orden.empresaId,
        costoUnitario: det.precioUnitario || 0,
        observaciones: null,
        detalleReqCompraId: det.detalleReqCompraId || null,
      }));

      // ========================================
      // PASO 9: CREAR NUEVO MOVIMIENTO CON KARDEX
      // ========================================
      const resultado =
        await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
          cabecera,
          detalles,
          usuarioId,
          tx,
        );

      // ========================================
      // PASO 10: ACTUALIZAR ORDEN CON NUEVO MOVIMIENTO
      // ========================================
      const ordenActualizada = await tx.ordenCompra.update({
        where: { id },
        data: {
          // ✅ NO cambiar estadoId - mantener en APROBADA (39)
          // El estado 50 (PARTICIONADA) solo se usa cuando se divide la OC en negra/blanca
          movIngresoAlmacenId: resultado.movimiento.id,
          actualizadoEn: new Date(),
        },
        include: {
          empresa: true,
          tipoDocumento: true,
          proveedor: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      return {
        orden: ordenActualizada,
        movimiento: resultado.movimiento,
        kardex: resultado.kardex,
        regenerado: true,
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};


/**
 * Particionar OrdenCompra: Clona una OC APROBADA en DOS copias idénticas
 * Ambas copias tendrán estado PENDIENTE (38) para poder ser editadas
 * Conserva todos los IDs de referencia y clona cabecera + detalles
 * 
 * PATRÓN IDÉNTICO A partirPreFactura
 * 
 * @param {BigInt} id - ID de la OrdenCompra a particionar
 * @returns {Object} { original, copia1, copia2, mensaje }
 */
const partirOrdenCompra = async (id) => {
  return await prisma.$transaction(async (prisma) => {
    try {
      // ========================================
      // 1. OBTENER ORDEN DE COMPRA ORIGINAL
      // ========================================
      const ordenCompraOriginal = await prisma.ordenCompra.findUnique({
        where: { id },
        include: {
          detalles: true,
        },
      });

      if (!ordenCompraOriginal) {
        throw new NotFoundError("OrdenCompra no encontrada.");
      }

      // ========================================
      // 2. VALIDAR QUE NO HAYA SIDO PARTICIONADA
      // ========================================
      if (ordenCompraOriginal.esParticionada) {
        throw new ValidationError(
          "Esta OrdenCompra ya fue particionada anteriormente. No se puede particionar nuevamente."
        );
      }

      // ========================================
      // 3. VALIDAR QUE ESTÉ APROBADA (estado 39)
      // ========================================
      if (
        !ordenCompraOriginal.estadoId ||
        Number(ordenCompraOriginal.estadoId) !== ESTADO_ORDEN_COMPRA.APROBADO
      ) {
        throw new ValidationError(
          `Solo se pueden particionar OrdenCompra APROBADAS (estado 39). Estado actual: ${ordenCompraOriginal.estadoId}`
        );
      }

      // ========================================
      // 4. MARCAR LA ORIGINAL COMO PARTICIONADA (estado 112)
      // ========================================
      await prisma.ordenCompra.update({
        where: { id },
        data: {
          estadoId: Number(112), // PARTICIONADA
          esParticionada: true,
        },
      });

      // ========================================
      // 5. PREPARAR DATOS BASE PARA CLONACIÓN
      // ========================================
      // Excluir campos UNIQUE y autogenerados
      const {
        id: _,
        detalles,
        codigo,
        numeroDocumento,
        numSerieDoc,
        numCorreDoc,
        fechaCreacion,
        fechaActualizacion,
        creadoEn,
        actualizadoEn,
        ...datosBase
      } = ordenCompraOriginal;

      // ========================================
      // 6. GENERAR CÓDIGOS ÚNICOS PARA AMBAS COPIAS
      // ========================================
      const año = new Date().getFullYear();
      const ultimaOrdenCompra = await prisma.ordenCompra.findFirst({
        where: {
          empresaId: ordenCompraOriginal.empresaId,
          codigo: {
            startsWith: `OC-${año}-`,
          },
        },
        orderBy: { id: "desc" },
      });

      let correlativoBase = 1;
      if (ultimaOrdenCompra) {
        const partes = ultimaOrdenCompra.numeroDocumento.split("-");
        correlativoBase = parseInt(partes[2]) + 1;
      }

      const codigoCopia1 = `OC-${año}-${String(correlativoBase).padStart(6, "0")}`;
      const codigoCopia2 = `OC-${año}-${String(correlativoBase + 1).padStart(6, "0")}`;

      // ========================================
      // 7. CREAR COPIA 1 - Idéntica a la original
      // ========================================

      // Obtener serie y generar nuevo correlativo para COPIA 1
      const serieCopia1 = await prisma.serieDoc.findUnique({
        where: { id: ordenCompraOriginal.serieDocId },
      });

      const nuevoCorrelativoCopia1 = Number(serieCopia1.correlativo) + 1;
      const numSerieCopia1 = String(serieCopia1.serie).padStart(
        serieCopia1.numCerosIzqSerie,
        "0"
      );
      const numCorreCopia1 = String(nuevoCorrelativoCopia1).padStart(
        serieCopia1.numCerosIzqCorre,
        "0"
      );
      const numeroDocumentoCopia1 = `${numSerieCopia1}-${numCorreCopia1}`;

      // Actualizar correlativo en SerieDoc
      await prisma.serieDoc.update({
        where: { id: ordenCompraOriginal.serieDocId },
        data: { correlativo: Number(nuevoCorrelativoCopia1) },
      });

      const dataCopia1 = {
        ...datosBase,
        codigo: codigoCopia1,
        numeroDocumento: numeroDocumentoCopia1,
        numSerieDoc: numSerieCopia1,
        numCorreDoc: numCorreCopia1,
        estadoId: ESTADO_ORDEN_COMPRA.PENDIENTE, // PENDIENTE (para que usuario pueda editar)
        esParticionada: false,
        ordenCompraOrigenId: ordenCompraOriginal.id,
      };

      const copia1 = await prisma.ordenCompra.create({
        data: dataCopia1,
      });

      // ========================================
      // 8. CREAR COPIA 2 - Idéntica a la original
      // ========================================

      // Obtener serie actualizada y generar nuevo correlativo para COPIA 2
      const serieCopia2 = await prisma.serieDoc.findUnique({
        where: { id: ordenCompraOriginal.serieDocId },
      });

      const nuevoCorrelativoCopia2 = Number(serieCopia2.correlativo) + 1;
      const numSerieCopia2 = String(serieCopia2.serie).padStart(
        serieCopia2.numCerosIzqSerie,
        "0"
      );
      const numCorreCopia2 = String(nuevoCorrelativoCopia2).padStart(
        serieCopia2.numCerosIzqCorre,
        "0"
      );
      const numeroDocumentoCopia2 = `${numSerieCopia2}-${numCorreCopia2}`;

      // Actualizar correlativo en SerieDoc
      await prisma.serieDoc.update({
        where: { id: ordenCompraOriginal.serieDocId },
        data: { correlativo: Number(nuevoCorrelativoCopia2) },
      });

      const copia2 = await prisma.ordenCompra.create({
        data: {
          ...datosBase,
          codigo: codigoCopia2,
          numeroDocumento: numeroDocumentoCopia2,
          numSerieDoc: numSerieCopia2,
          numCorreDoc: numCorreCopia2,
          estadoId: ESTADO_ORDEN_COMPRA.PENDIENTE, // PENDIENTE (para que usuario pueda editar)
          esParticionada: false,
          ordenCompraOrigenId: ordenCompraOriginal.id,
        },
      });

      // ========================================
      // 9. CLONAR DETALLES PARA COPIA 1
      // ========================================
      for (const detalle of detalles) {
        const { id: _, ordenCompraId, ...datosDetalle } = detalle;
        await prisma.detalleOrdenCompra.create({
          data: {
            ...datosDetalle,
            ordenCompraId: copia1.id,
          },
        });
      }

      // ========================================
      // 10. CLONAR DETALLES PARA COPIA 2
      // ========================================
      for (const detalle of detalles) {
        const { id: _, ordenCompraId, ...datosDetalle } = detalle;
        await prisma.detalleOrdenCompra.create({
          data: {
            ...datosDetalle,
            ordenCompraId: copia2.id,
          },
        });
      }

      // ========================================
      // 11. RETORNAR RESULTADO
      // ========================================
      return {
        original: ordenCompraOriginal,
        copia1,
        copia2,
        mensaje: `OrdenCompra ${ordenCompraOriginal.codigo} particionada exitosamente. Copias creadas: ${codigoCopia1} y ${codigoCopia2} (Estado: PENDIENTE)`,
      };
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ValidationError)
        throw err;
      if (err.code && err.code.startsWith("P"))
        throw new DatabaseError("Error de base de datos", err.message);
      throw err;
    }
  });
};

const generarDesdeRequerimiento = async (requerimientoCompraId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const requerimiento = await tx.requerimientoCompra.findUnique({
        where: { id: Number(requerimientoCompraId) },
        include: {
          serieDoc: true,
          detalles: {
            include: {
              producto: true,
              proveedor: true,
            },
          },
        },
      });

      if (!requerimiento) {
        throw new NotFoundError("Requerimiento de Compra no encontrado");
      }

      if (requerimiento.estadoId !== Number(35)) {
        throw new ValidationError(
          "Solo se pueden generar órdenes desde requerimientos aprobados",
        );
      }

      const esCompraDirecta = !requerimiento.esConCotizacion;

      let ordenesGeneradas = [];

      if (esCompraDirecta) {
        const detallesPorProveedor = new Map();

        for (const detalle of requerimiento.detalles) {
          if (!detalle.proveedorId) {
            throw new ValidationError(
              `El detalle del producto ${detalle.producto?.nombre || detalle.productoId
              } no tiene proveedor asignado`,
            );
          }

          const proveedorId = String(detalle.proveedorId);
          if (!detallesPorProveedor.has(proveedorId)) {
            detallesPorProveedor.set(proveedorId, []);
          }
          detallesPorProveedor.get(proveedorId).push(detalle);
        }

        for (const [proveedorId, detalles] of detallesPorProveedor) {
          const orden = await crearOrdenCompraDirecta(
            tx,
            requerimiento,
            Number(proveedorId),
            detalles,
          );
          ordenesGeneradas.push(orden);
        }
      } else {
        const cotizaciones = await tx.cotizacionProveedor.findMany({
          where: {
            requerimientoCompraId: Number(requerimientoCompraId),
          },
          include: {
            detalles: {
              where: {
                esSeleccionadoParaOrdenCompra: true,
              },
              include: {
                producto: true,
                detalleReqCompra: true,
              },
            },
            proveedor: true,
          },
        });

        const itemsPorProveedorMoneda = new Map();

        for (const cotizacion of cotizaciones) {
          if (cotizacion.detalles.length > 0) {
            const key = `${cotizacion.proveedorId}-${cotizacion.monedaId || "null"
              }`;

            if (!itemsPorProveedorMoneda.has(key)) {
              itemsPorProveedorMoneda.set(key, {
                proveedorId: cotizacion.proveedorId,
                monedaId: cotizacion.monedaId,
                detalles: [],
              });
            }

            itemsPorProveedorMoneda
              .get(key)
              .detalles.push(...cotizacion.detalles);
          }
        }

        if (itemsPorProveedorMoneda.size === 0) {
          throw new ValidationError(
            "No hay items seleccionados para generar órdenes de compra",
          );
        }

        for (const [key, data] of itemsPorProveedorMoneda) {
          const orden = await crearOrdenCompraConCotizacion(
            tx,
            requerimiento,
            data.proveedorId,
            data.monedaId,
            data.detalles,
          );
          ordenesGeneradas.push(orden);
        }
      }

      await tx.requerimientoCompra.update({
        where: { id: Number(requerimientoCompraId) },
        data: {
          estadoId: Number(37),
          actualizadoEn: new Date(),
        },
      });

      return ordenesGeneradas;
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

async function crearOrdenCompraDirecta(
  tx,
  requerimiento,
  proveedorId,
  detalles,
) {
  const serieOrden = await tx.serieDoc.findFirst({
    where: {
      tipoDocumentoId: Number(17),
      empresaId: requerimiento.empresaId,
      tipoAlmacenId: requerimiento.serieDoc.tipoAlmacenId,
      serie: requerimiento.serieDoc.serie,
      activo: true,
    },
  });

  if (!serieOrden) {
    throw new ValidationError(
      `No se encontró una serie activa para Orden de Compra con los criterios: ` +
      `empresaId=${requerimiento.empresaId}, tipoAlmacenId=${requerimiento.serieDoc.tipoAlmacenId}, serie=${requerimiento.serieDoc.serie}`,
    );
  }

  const nuevoCorrelativo = Number(serieOrden.correlativo) + 1;
  const numSerie = String(serieOrden.serie).padStart(
    serieOrden.numCerosIzqSerie,
    "0",
  );
  const numCorre = String(nuevoCorrelativo).padStart(
    serieOrden.numCerosIzqCorre,
    "0",
  );
  const numeroDocumento = `${numSerie}-${numCorre}`;

  await tx.serieDoc.update({
    where: { id: serieOrden.id },
    data: { correlativo: Number(nuevoCorrelativo) },
  });

  const ordenCompra = await tx.ordenCompra.create({
    data: {
      empresaId: requerimiento.empresaId,
      tipoDocumentoId: Number(17),
      serieDocId: serieOrden.id,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento,
      fechaDocumento: new Date(),
      requerimientoCompraId: requerimiento.id,
      proveedorId: proveedorId,
      formaPagoId: requerimiento.formaPagoId,
      monedaId: requerimiento.monedaId,
      tipoCambio: requerimiento.tipoCambio,
      fechaEntrega: requerimiento.fechaRequerida,
      solicitanteId: requerimiento.solicitanteId,
      estadoId: ESTADO_ORDEN_COMPRA.PENDIENTE,
      centroCostoId: requerimiento.centroCostoId,
      unidadNegocioId: requerimiento.unidadNegocioId,
      observaciones: requerimiento.observaciones,
      porcentajeIGV: requerimiento.porcentajeIGV,
      esExoneradoAlIGV: requerimiento.esExoneradoAlIGV,
      detalles: {
        create: detalles.map((detalle) => ({
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.costoUnitario,
          observaciones: detalle.observaciones,
        })),
      },
    },
    include: {
      proveedor: true,
      detalles: {
        include: {
          producto: true,
        },
      },
    },
  });

  return ordenCompra;
}

async function crearOrdenCompraConCotizacion(
  tx,
  requerimiento,
  proveedorId,
  monedaId,
  detallesCotizacion,
) {
  const serieOrden = await tx.serieDoc.findFirst({
    where: {
      tipoDocumentoId: Number(17),
      empresaId: requerimiento.empresaId,
      tipoAlmacenId: requerimiento.serieDoc.tipoAlmacenId,
      serie: requerimiento.serieDoc.serie,
      activo: true,
    },
  });

  if (!serieOrden) {
    throw new ValidationError(
      `No se encontró una serie activa para Orden de Compra con los criterios: ` +
      `empresaId=${requerimiento.empresaId}, tipoAlmacenId=${requerimiento.serieDoc.tipoAlmacenId}, serie=${requerimiento.serieDoc.serie}`,
    );
  }

  const nuevoCorrelativo = Number(serieOrden.correlativo) + 1;
  const numSerie = String(serieOrden.serie).padStart(
    serieOrden.numCerosIzqSerie,
    "0",
  );
  const numCorre = String(nuevoCorrelativo).padStart(
    serieOrden.numCerosIzqCorre,
    "0",
  );
  const numeroDocumento = `${numSerie}-${numCorre}`;

  await tx.serieDoc.update({
    where: { id: serieOrden.id },
    data: { correlativo: Number(nuevoCorrelativo) },
  });

  const ordenCompra = await tx.ordenCompra.create({
    data: {
      empresaId: requerimiento.empresaId,
      tipoDocumentoId: Number(17),
      serieDocId: serieOrden.id,
      numSerieDoc: numSerie,
      numCorreDoc: numCorre,
      numeroDocumento,
      fechaDocumento: new Date(),
      requerimientoCompraId: requerimiento.id,
      proveedorId: proveedorId,
      formaPagoId: requerimiento.formaPagoId,
      monedaId: monedaId,
      tipoCambio: requerimiento.tipoCambio,
      fechaEntrega: requerimiento.fechaRequerida,
      solicitanteId: requerimiento.solicitanteId,
      estadoId: ESTADO_ORDEN_COMPRA.PENDIENTE,
      centroCostoId: requerimiento.centroCostoId,
      unidadNegocioId: requerimiento.unidadNegocioId,
      observaciones: requerimiento.observaciones,
      porcentajeIGV: requerimiento.porcentajeIGV,
      esExoneradoAlIGV: requerimiento.esExoneradoAlIGV,
      detalles: {
        create: detallesCotizacion.map((detalle) => ({
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
          observaciones: detalle.observaciones,
        })),
      },
    },
    include: {
      proveedor: true,
      detalles: {
        include: {
          producto: true,
        },
      },
    },
  });

  return ordenCompra;
}

/**
 * Generar CuentaPorPagar desde OrdenCompra
 * Crea una CxP y actualiza el estado de la OC a FACTURADA (113)
 * 
 * PATRÓN BASADO EN facturarPreFacturaBlanca y facturarPreFacturaNegra
 * 
 * @param {BigInt} ordenCompraId - ID de la OrdenCompra
 * @returns {Object} { ordenCompra, cuentaPorPagar }
 */
const generarCuentaPorPagar = async (ordenCompraId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // ========================================
      // 1. OBTENER ORDEN DE COMPRA CON RELACIONES
      // ========================================
      const ordenCompra = await tx.ordenCompra.findUnique({
        where: { id: ordenCompraId },
        include: {
          proveedor: true,
          moneda: true,
          empresa: true,
          periodoContable: true,
          tipoDocumento: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (!ordenCompra) {
        throw new NotFoundError("OrdenCompra no encontrada");
      }

      // ========================================
      // 2. VALIDACIONES DE ESTADO Y CONDICIONES
      // ========================================

      // Validar estado: debe ser APROBADA (39) o superior
      const estadoActual = Number(ordenCompra.estadoId);
      if (estadoActual < ESTADO_ORDEN_COMPRA.APROBADO) {
        throw new ValidationError(
          `Solo se pueden generar CxP desde OrdenCompra en estado APROBADA (39) o superior. Estado actual: ${estadoActual}`
        );
      }

      // Buscar CxP existente directamente
      const cxpExistente = await tx.cuentaPorPagar.findUnique({
        where: { ordenCompraId: ordenCompraId }
      });

      if (cxpExistente) {
        // Validar que NO tenga pagos
        const montoPagado = Number(cxpExistente.montoPagado) || 0;
        if (montoPagado > 0) {
          throw new ValidationError(
            `No se puede regenerar la CxP porque ya tiene pagos registrados (${montoPagado.toFixed(2)})`
          );
        }

        // Eliminar CxP existente para regenerar
        await tx.cuentaPorPagar.delete({
          where: { id: cxpExistente.id }
        });
      }



      // ========================================
      // 3. BUSCAR ESTADO PENDIENTE PARA CXP (ID 106)
      // ========================================
      const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
        where: {
          id: Number(106), // PENDIENTE - CUENTAS POR PAGAR
        },
      });

      if (!estadoPendiente) {
        throw new ValidationError(
          "No se encontró el estado PENDIENTE (ID 106) para CuentaPorPagar"
        );
      }

      // ========================================
      // 4. DETECTAR SI ES SALDO INICIAL
      // ========================================
      const esSaldoInicial = ordenCompra.tipoDocumento?.codigo === "SI-CXP";

      // ========================================
      // 5. OBTENER O CALCULAR MONTOS
      // ========================================
      let montoFinal;

      // Si la OC tiene total calculado, usarlo directamente
      if (ordenCompra.total && Number(ordenCompra.total) > 0) {
        montoFinal = Number(ordenCompra.total);

        // Para Saldos Iniciales, restar pagos previos
        if (esSaldoInicial) {
          const pagosPreviosSI = Number(ordenCompra.pagosPreviosSI) || 0;
          montoFinal = montoFinal - pagosPreviosSI;
        }
      } else {
        // Fallback: Si no tiene total (OC antiguas), calcular desde detalles
        if (!ordenCompra.detalles || ordenCompra.detalles.length === 0) {
          montoFinal = 0;
        } else {

          // Calcular desde detalles
          const subtotal = ordenCompra.detalles.reduce((sum, detalle) => {
            const cantidad = Number(detalle.cantidad || 0);
            const precioUnitario = Number(detalle.precioUnitario || 0);
            return sum + (cantidad * precioUnitario);
          }, 0);

          const pagosPreviosSI = Number(ordenCompra.pagosPreviosSI) || 0;
          const subtotalNeto = subtotal - pagosPreviosSI;
          const porcentajeIGV = Number(ordenCompra.porcentajeIGV) || 0;
          const igvNeto = ordenCompra.esExoneradoAlIGV
            ? 0
            : subtotalNeto * (porcentajeIGV / 100);
          montoFinal = subtotalNeto + igvNeto;
        }
      }

      // ========================================
      // 6. DETRACCIÓN, RETENCIÓN Y PERCEPCIÓN
      // ========================================
      // TODO: Implementar lógica de detracción/retención/percepción según proveedor
      // Por ahora se dejan en false
      const tieneDetraccion = false;
      const montoDetraccion = 0;
      const porcentajeDetraccion = null;

      const tieneRetencion = false;
      const montoRetencion = 0;
      const porcentajeRetencion = null;

      const tienePercepcion = false;
      const montoPercepcion = 0;
      const porcentajePercepcion = null;

      // ========================================
      // 7. CREAR CUENTA POR PAGAR
      // ========================================
      const cuentaPorPagar = await tx.cuentaPorPagar.create({
        data: {
          // ORIGEN DEL DOCUMENTO
          ordenCompraId: ordenCompra.id,
          empresaId: ordenCompra.empresaId,
          proveedorId: ordenCompra.proveedorId,

          // DOCUMENTO
          numeroOrdenCompra: ordenCompra.numeroDocumento,
          fechaEmision: ordenCompra.fechaDocumento || new Date(),
          fechaVencimiento: ordenCompra.fechaVencimiento || new Date(),

          // MONTOS ALMACENADOS
          montoTotal: montoFinal,
          montoPagado: 0,
          saldoPendiente: montoFinal,

          // DETRACCIÓN SPOT (SUNAT PERÚ) - TOTALES
          tieneDetraccion,
          montoDetraccionTotal: montoDetraccion,
          porcentajeDetraccion,

          // RETENCIÓN (SUNAT PERÚ) - TOTALES
          tieneRetencion,
          montoRetencionTotal: montoRetencion,
          porcentajeRetencion,

          // PERCEPCIÓN (SUNAT PERÚ) - TOTALES
          tienePercepcion,
          montoPercepcionTotal: montoPercepcion,
          porcentajePercepcion,

          // FLAGS ESPECIALES
          esSaldoInicial,
          esGerencial: ordenCompra.esGerencial || false,

          // MONEDA Y TIPO DE COMPRA
          monedaId: ordenCompra.monedaId || 1,
          esContado: ordenCompra.formaPagoId ? false : true, // Si no tiene forma de pago, es contado
          estadoId: estadoPendiente.id,
          observaciones: esSaldoInicial
            ? `Saldo Inicial CxP - ${ordenCompra.proveedor.razonSocial}`
            : `CxP ${ordenCompra.esGerencial ? 'Negra' : 'Blanca'} generada desde OrdenCompra ${ordenCompra.numeroDocumento || 'SIN-NUMERO'}`,

          // INTEGRACIÓN CONTABLE - HEREDADO DE ORDENCOMPRA
          fechaContable: ordenCompra.fechaContable,
          periodoContableId: ordenCompra.periodoContableId,
        },
      });

      // ========================================
      // 8. ACTUALIZAR ORDEN DE COMPRA A FACTURADA (113)
      // ========================================
      const ordenCompraActualizada = await tx.ordenCompra.update({
        where: { id: ordenCompraId },
        data: {
          estadoId: ESTADO_ORDEN_COMPRA.FACTURADA, // FACTURADA
          facturado: true,
        },
        include: {
          proveedor: true,
          moneda: true,
          empresa: true,
          cuentaPorPagar: true,
        },
      });

      // ========================================
      // 9. RETORNAR RESULTADO
      // ========================================
      return {
        ordenCompra: ordenCompraActualizada,
        cuentaPorPagar,
        mensaje: `CuentaPorPagar ${ordenCompra.esGerencial ? 'NEGRA' : 'BLANCA'} generada exitosamente para OrdenCompra ${ordenCompra.numeroDocumento}. Monto: ${montoFinal.toFixed(2)}`,
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      console.error("Error Prisma completo:", err);
      throw new DatabaseError(`Error BD: ${err.code} - ${err.message}`, err.message);
    }
    throw err;
  }
};

/**
 * Convierte un monto a soles si la orden está en moneda extranjera
 * Redondea a 2 decimales para evitar descuadres
 * 
 * @param {number} monto - Monto a convertir
 * @param {Object} ordenCompra - Orden de compra con monedaId y tipoCambio
 * @returns {number} - Monto en soles redondeado a 2 decimales
 */
const convertirMontoASoles = (monto, ordenCompra) => {
  const MONEDA_USD_ID = 2;
  if (Number(ordenCompra.monedaId) === MONEDA_USD_ID) {
    const montoConvertido = Number(monto) * Number(ordenCompra.tipoCambio);
    return Math.round(montoConvertido * 100) / 100;
  }
  return Math.round(Number(monto) * 100) / 100;
};


/**
 * Calcula totales del asiento en la moneda original del documento
 * ⭐ SOPORTA NOTAS DE CRÉDITO: Invierte debe/haber si esNotaCredito=true
 * 
 * @param {Object} ordenCompra - Orden de compra con subtotal, totalIGV, total
 * @param {boolean} esNotaCredito - Si es Nota de Crédito (invierte debe/haber)
 * @returns {Object} - { totalDebe, totalHaber } en moneda original
 */
const calcularTotalesEnMonedaOriginal = (ordenCompra, esNotaCredito = false) => {
  const subtotal = Number(ordenCompra.subtotal) || 0;
  const totalIGV = Number(ordenCompra.totalIGV) || 0;
  const total = Number(ordenCompra.total) || 0;

  let totalDebe = Math.round((subtotal + totalIGV) * 100) / 100;
  let totalHaber = Math.round(total * 100) / 100;

  // ⭐ INVERTIR TOTALES SI ES NOTA DE CRÉDITO
  if (esNotaCredito) {
    const temp = totalDebe;
    totalDebe = totalHaber;
    totalHaber = temp;
  }

  return { totalDebe, totalHaber };
};
/**
 * Invierte debe/haber para Notas de Crédito
 * Las NC revierten el asiento original intercambiando debe y haber
 * 
 * @param {number} debe - Valor del debe
 * @param {number} haber - Valor del haber
 * @param {boolean} esNotaCredito - Si es NC
 * @returns {Object} - { debe, haber } invertidos si es NC
 */
const invertirSiEsNC = (debe, haber, esNotaCredito) => {
  if (esNotaCredito) {
    return {
      debe: Math.abs(haber),
      haber: Math.abs(debe),
    };
  }
  return {
    debe: Math.abs(debe),
    haber: Math.abs(haber),
  };
};


/**
 * Genera un borrador de asiento contable para una OrdenCompra
 * NO lo guarda en BD, solo retorna la estructura para edición
 * Patrón: Igual a PreFactura.generarBorradorAsiento
 * 
 * @param {BigInt} ordenCompraId - ID de la OrdenCompra
 * @returns {Promise<Object>} - Borrador del asiento contable
 */
const generarBorradorAsiento = async (ordenCompraId) => {
  try {
    const ordenCompra = await prisma.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: {
        empresa: true,
        tipoDocumento: true,
        tipoDocumentoFinal: true,
        proveedor: true,
        moneda: true,
        periodoContable: true,
        detalles: {
          include: {
            producto: {
              include: {
                cuentaCompras: true,
                cuentaInventario: true,
                cuentaVariacion: true,
              },
            },
          },
        },
      },
    });

    if (!ordenCompra) {
      throw new NotFoundError("OrdenCompra no encontrada");
    }

    if (!ordenCompra.periodoContable) {
      throw new ValidationError(
        "La OrdenCompra no tiene un período contable asignado."
      );
    }
    // ========================================
    // FUNCIÓN HELPER: Buscar cuenta contable de compras
    // ========================================
    const buscarCuentaCompras = async (producto) => {
      // 1. Si el producto tiene cuenta asignada, usarla
      if (producto.cuentaComprasId && producto.cuentaCompras) {
        return {
          cuenta: producto.cuentaCompras,
          usaFallback: false,
        };
      }

      // 2. Si no tiene cuenta, buscar cuenta genérica según código del producto
      let cuentaFallback = null;

      if (producto.codigo) {
        const primerDigito = producto.codigo.charAt(0);
        const codigoCuenta = `60${primerDigito}`;

        cuentaFallback = await prisma.planCuentasContable.findFirst({
          where: {
            codigoCuenta: { startsWith: codigoCuenta },
            activo: true,
          },
        });
      }

      // 3. Si no encuentra con código específico, buscar cuenta genérica 60
      if (!cuentaFallback) {
        cuentaFallback = await prisma.planCuentasContable.findFirst({
          where: {
            codigoCuenta: { startsWith: "60" },
            activo: true,
          },
        });
      }

      // 4. Si no hay ninguna cuenta, lanzar error
      if (!cuentaFallback) {
        throw new ValidationError(
          `No se encontró ninguna cuenta contable de compras (60*) activa. ` +
          `Verifique el plan de cuentas o asigne una cuenta específica al producto "${producto.descripcionBase}".`
        );
      }

      return {
        cuenta: cuentaFallback,
        usaFallback: true,
        mensaje: `⚠️ Producto "${producto.descripcionBase}" (ID: ${producto.id}) no tiene cuenta contable asignada. Se usó cuenta genérica ${cuentaFallback.codigoCuenta} - ${cuentaFallback.nombreCuenta}.`,
      };
    };
    // ========================================
    // BUSCAR CUENTAS CONTABLES NECESARIAS
    // ========================================

    // ⭐ Determinar cuenta CxP según moneda del documento
    const codigoCuentaCxP = Number(ordenCompra.monedaId) === 1 ? "421201" : "421202";

    const cuentaCxP = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: codigoCuentaCxP,
        activo: true,
      },
    });

    if (!cuentaCxP) {
      throw new ValidationError(
        `No se encontró la cuenta ${codigoCuentaCxP} (Cuentas por Pagar ${Number(ordenCompra.monedaId) === 1 ? 'PEN' : 'USD'}). ` +
        "Configure el plan de cuentas antes de generar el asiento."
      );
    }

    // ⭐ DETECTAR SI ES SALDO INICIAL (código empieza con "SI")
    const esSaldoInicial = ordenCompra.tipoDocumento?.codigo?.startsWith("SI");

    // ⭐ DETECTAR SI ES NOTA DE CRÉDITO (tipoDocumentoFinalId = 8)
    const esNotaCredito = Number(ordenCompra.tipoDocumentoFinalId) === 8;
    // ⭐ Función helper para formatear referencia del documento
    const obtenerReferenciaDocumento = () => {
      const proveedor = ordenCompra.proveedor?.razonSocial || 'Proveedor';
      const moneda = ordenCompra.moneda?.simbolo || '';
      const monto = Math.abs(Number(ordenCompra.total)).toFixed(2);

      if (ordenCompra.tipoDocumentoFinal && ordenCompra.numeroDocumentoFinal && ordenCompra.fechaFacturacion) {
        const fecha = new Date(ordenCompra.fechaFacturacion);
        const fechaFormateada = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
        return `${proveedor} - ${ordenCompra.tipoDocumentoFinal.codigo} ${ordenCompra.numeroDocumentoFinal} ${fechaFormateada} - ${moneda} ${monto}`;
      }
      // Fallback a número de OC si no hay documento final
      return `OC ${ordenCompra.numeroDocumento} - ${proveedor} - ${moneda} ${monto}`;
    };
    const referenciaDoc = obtenerReferenciaDocumento();

    // ⭐ Declarar variables FUERA del if
    let cuentaDebe = null;
    let cuentaHaber = cuentaCxP;

    if (esSaldoInicial) {
      // Determinar cuenta de Saldos Iniciales según moneda
      const codigoCuentaSI = Number(ordenCompra.monedaId) === 1 ? "421201" : "421202";

      const cuentaSaldoInicial = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: codigoCuentaSI,
          activo: true,
        },
      });

      if (!cuentaSaldoInicial) {
        throw new ValidationError(
          `No se encontró la cuenta ${codigoCuentaSI} (Saldos Iniciales CxP ${Number(ordenCompra.monedaId) === 1 ? 'PEN' : 'USD'}). ` +
          "Configure el plan de cuentas antes de generar el asiento para Saldos Iniciales.",
        );
      }

      cuentaHaber = cuentaSaldoInicial;

      // Para SI: HABER debe ser 591101 (Utilidades Acumuladas)
      const cuentaUtilidades = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: "591101",
          activo: true,
        },
      });

      if (!cuentaUtilidades) {
        throw new ValidationError(
          "No se encontró la cuenta 591101 (Utilidades Acumuladas). " +
          "Configure el plan de cuentas antes de generar el asiento para Saldos Iniciales.",
        );
      }

      cuentaDebe = cuentaUtilidades;
    }

    const subtotal = Number(ordenCompra.subtotal);
    const totalIGV = Number(ordenCompra.totalIGV);
    const total = Number(ordenCompra.total);

    // ⭐ NO convertir aquí, la conversión se hace en cada detalle con convertirMontoASoles()
    // Determinar tipo de libro según esGerencial
    const tipoLibro = ordenCompra.esGerencial ? "GERENCIAL" : "FISCAL";

    const { totalDebe: totalDebeOriginal, totalHaber: totalHaberOriginal } = calcularTotalesEnMonedaOriginal(ordenCompra, esNotaCredito);

    const borrador = {
      empresaId: ordenCompra.empresaId,
      periodoContableId: ordenCompra.periodoContableId,
      fechaAsiento: ordenCompra.fechaContable,
      glosa: esSaldoInicial
        ? `Saldo Inicial CxP según ${referenciaDoc}`
        : `Compra según ${referenciaDoc}`,
      tipoLibro: tipoLibro,
      origenAsiento: "AUTOMATICO",
      monedaId: Number(ordenCompra.monedaId),
      tipoCambio: Number(ordenCompra.tipoCambio),
      totalDebe: Number(totalDebeOriginal),
      totalHaber: Number(totalHaberOriginal),
      esSaldoInicial: esSaldoInicial,
      detalles: [],
    };

    // ========================================
    // GENERAR DETALLES DEL ASIENTO
    // ========================================
    const warnings = [];
    let numeroLinea = 1;

    // ========================================
    // CASO 1: GERENCIAL (sin IGV)
    // ========================================
    if (ordenCompra.esGerencial) {
      if (esSaldoInicial && cuentaDebe) {
        // SALDO INICIAL: DEBE 591101, HABER 421201/421202
        const montoConvertido = convertirMontoASoles(total, ordenCompra);
        const { debe: debe1, haber: haber1 } = invertirSiEsNC(montoConvertido, 0, esNotaCredito);
        const { debe: debe2, haber: haber2 } = invertirSiEsNC(0, montoConvertido, esNotaCredito);

        // DEBE: 591101 (Utilidades Acumuladas)
        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaHaber.id,
          glosa: `Saldo Inicial CxP según ${referenciaDoc}`,
          debe: debe2,
          haber: haber2,
          monedaId: 1,
          tipoCambio: ordenCompra.tipoCambio,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });

        // HABER: 421201/421202 (Facturas por Pagar)
        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaDebe.id,
          glosa: `Saldo Inicial CxP según ${referenciaDoc}`,
          debe: debe1,
          haber: haber1,
          monedaId: 1,
          tipoCambio: ordenCompra.tipoCambio,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });
      } else {
        // COMPRA NORMAL: Orden: 60→42→20→61
        let totalInventario = 0;

        for (const detalle of ordenCompra.detalles) {
          const { cuenta, usaFallback, mensaje } = await buscarCuentaCompras(detalle.producto);

          if (usaFallback && mensaje) {
            warnings.push(mensaje);
          }

          const subtotalDetalle = Number(detalle.subtotal);
          const montoDetalle = convertirMontoASoles(subtotalDetalle, ordenCompra);

          const { debe, haber } = invertirSiEsNC(montoDetalle, 0, esNotaCredito);
          const { debe: debeOriginal, haber: haberOriginal } = invertirSiEsNC(subtotalDetalle, 0, esNotaCredito);

          borrador.detalles.push({
            numeroLinea: numeroLinea++,
            planCuentaId: cuenta.id,
            glosa: `Compra ${detalle.producto.descripcionBase} - ${referenciaDoc}`,
            debe: debe,
            haber: haber,
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: debeOriginal,
            haberMonedaExtranjera: haberOriginal,
            centroCostoId: detalle.centroCostoId || ordenCompra.centroCostoId,
            entidadComercialId: ordenCompra.proveedorId,
            tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
            numeroDocumentoOrigen: ordenCompra.numeroDocumento,
            fechaDocumentoOrigen: ordenCompra.fechaDocumento,
          });

          if (detalle.producto.cuentaInventarioId) {
            totalInventario += subtotalDetalle;
          }
        }

        // ⭐ CALCULAR CxP AJUSTADO PARA CUADRAR
        const totalDebeGenerado = borrador.detalles.reduce((sum, d) => sum + Number(d.debe || 0), 0);
        const totalHaberGenerado = borrador.detalles.reduce((sum, d) => sum + Number(d.haber || 0), 0);

        const montoCxPAjustado = esNotaCredito ? totalHaberGenerado : totalDebeGenerado;

        const { debe, haber } = invertirSiEsNC(0, montoCxPAjustado, esNotaCredito);
        const { debe: debeOriginal, haber: haberOriginal } = invertirSiEsNC(0, total, esNotaCredito);

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaHaber.id,
          glosa: `Compra según ${referenciaDoc}`,
          debe: debe,
          haber: haber,
          monedaId: 1,
          tipoCambio: ordenCompra.tipoCambio,
          debeMonedaExtranjera: debeOriginal,
          haberMonedaExtranjera: haberOriginal,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });

        if (totalInventario > 0) {
          const productoConInventario = ordenCompra.detalles.find(d => d.producto.cuentaInventarioId);

          if (productoConInventario) {
            const montoInventario = convertirMontoASoles(totalInventario, ordenCompra);
            const { debe: debeInv, haber: haberInv } = invertirSiEsNC(montoInventario, 0, esNotaCredito);
            const { debe: debeVar, haber: haberVar } = invertirSiEsNC(0, montoInventario, esNotaCredito);

            borrador.detalles.push({
              numeroLinea: numeroLinea++,
              planCuentaId: productoConInventario.producto.cuentaInventarioId,
              glosa: `Inventario - ${referenciaDoc}`,
              debe: debeInv,
              haber: haberInv,
              monedaId: 1, // ⭐ SIEMPRE SOLES
              tipoCambio: ordenCompra.tipoCambio,
              centroCostoId: ordenCompra.centroCostoId,
              entidadComercialId: ordenCompra.proveedorId,
              tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
              numeroDocumentoOrigen: ordenCompra.numeroDocumento,
              fechaDocumentoOrigen: ordenCompra.fechaDocumento,
            });

            if (productoConInventario.producto.cuentaVariacionId) {
              borrador.detalles.push({
                numeroLinea: numeroLinea++,
                planCuentaId: productoConInventario.producto.cuentaVariacionId,
                glosa: `Variación de Existencias - ${referenciaDoc}`,
                debe: debeVar,
                haber: haberVar,
                monedaId: 1, // ⭐ SIEMPRE SOLES
                tipoCambio: ordenCompra.tipoCambio,
                entidadComercialId: ordenCompra.proveedorId,
                tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
                numeroDocumentoOrigen: ordenCompra.numeroDocumento,
                fechaDocumentoOrigen: ordenCompra.fechaDocumento,
              });
            }
          }
        }
      }
    }
    // ========================================
    // CASO 2: FISCAL EXONERADA (sin IGV)
    // ========================================
    else if (ordenCompra.esExoneradoAlIGV) {
      if (esSaldoInicial && cuentaDebe) {
        // SALDO INICIAL
        const montoConvertido = convertirMontoASoles(total, ordenCompra);
        const { debe: debe1, haber: haber1 } = invertirSiEsNC(montoConvertido, 0, esNotaCredito);
        const { debe: debe2, haber: haber2 } = invertirSiEsNC(0, montoConvertido, esNotaCredito);

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaDebe.id,
          glosa: `Saldo Inicial CxP según ${referenciaDoc}`,
          debe: debe1,
          haber: haber1,
          monedaId: 1, // ⭐ SIEMPRE SOLES
          tipoCambio: ordenCompra.tipoCambio,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaHaber.id,
          glosa: `Saldo Inicial CxP según ${referenciaDoc}`,
          debe: debe2,
          haber: haber2,
          monedaId: 1, // ⭐ SIEMPRE SOLES
          tipoCambio: ordenCompra.tipoCambio,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });
      } else {
        // COMPRA NORMAL: Orden: 60→42→20→61
        let totalInventario = 0;

        for (const detalle of ordenCompra.detalles) {
          const { cuenta, usaFallback, mensaje } = await buscarCuentaCompras(detalle.producto);

          if (usaFallback && mensaje) {
            warnings.push(mensaje);
          }

          const subtotalDetalle = Number(detalle.subtotal);
          const montoDetalle = convertirMontoASoles(subtotalDetalle, ordenCompra);

          const { debe, haber } = invertirSiEsNC(montoDetalle, 0, esNotaCredito);
          const { debe: debeOriginal, haber: haberOriginal } = invertirSiEsNC(subtotalDetalle, 0, esNotaCredito);

          borrador.detalles.push({
            numeroLinea: numeroLinea++,
            planCuentaId: cuenta.id,
            glosa: `Compra exonerada ${detalle.producto.descripcionBase} - ${referenciaDoc}`,
            debe: debe,
            haber: haber,
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: debeOriginal,
            haberMonedaExtranjera: haberOriginal,
            centroCostoId: detalle.centroCostoId || ordenCompra.centroCostoId,
            entidadComercialId: ordenCompra.proveedorId,
            tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
            numeroDocumentoOrigen: ordenCompra.numeroDocumento,
            fechaDocumentoOrigen: ordenCompra.fechaDocumento,
          });

          if (detalle.producto.cuentaInventarioId) {
            totalInventario += subtotalDetalle;
          }
        }

        // ⭐ CALCULAR CxP AJUSTADO PARA CUADRAR
        const totalDebeGenerado = borrador.detalles.reduce((sum, d) => sum + Number(d.debe || 0), 0);
        const totalHaberGenerado = borrador.detalles.reduce((sum, d) => sum + Number(d.haber || 0), 0);

        const montoCxPAjustado = esNotaCredito ? totalHaberGenerado : totalDebeGenerado;
        const { debe, haber } = invertirSiEsNC(0, montoCxPAjustado, esNotaCredito);
        const { debe: debeOriginal, haber: haberOriginal } = invertirSiEsNC(0, total, esNotaCredito);

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaHaber.id,
          glosa: `Compra exonerada según ${referenciaDoc}`,
          debe: debe,
          haber: haber,
          monedaId: 1,
          tipoCambio: ordenCompra.tipoCambio,
          debeMonedaExtranjera: debeOriginal,
          haberMonedaExtranjera: haberOriginal,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });
        if (totalInventario > 0) {
          const productoConInventario = ordenCompra.detalles.find(d => d.producto.cuentaInventarioId);

          if (productoConInventario) {
            const montoInventario = convertirMontoASoles(totalInventario, ordenCompra);
            const { debe: debeInv, haber: haberInv } = invertirSiEsNC(montoInventario, 0, esNotaCredito);
            const { debe: debeVar, haber: haberVar } = invertirSiEsNC(0, montoInventario, esNotaCredito);

            borrador.detalles.push({
              numeroLinea: numeroLinea++,
              planCuentaId: productoConInventario.producto.cuentaInventarioId,
              glosa: `Inventario - ${referenciaDoc}`,
              debe: debeInv,
              haber: haberInv,
              monedaId: 1, // ⭐ SIEMPRE SOLES
              tipoCambio: ordenCompra.tipoCambio,
              centroCostoId: ordenCompra.centroCostoId,
              entidadComercialId: ordenCompra.proveedorId,
              tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
              numeroDocumentoOrigen: ordenCompra.numeroDocumento,
              fechaDocumentoOrigen: ordenCompra.fechaDocumento,
            });

            if (productoConInventario.producto.cuentaVariacionId) {
              borrador.detalles.push({
                numeroLinea: numeroLinea++,
                planCuentaId: productoConInventario.producto.cuentaVariacionId,
                glosa: `Variación de Existencias - ${referenciaDoc}`,
                debe: debeVar,
                haber: haberVar,
                monedaId: 1, // ⭐ SIEMPRE SOLES
                tipoCambio: ordenCompra.tipoCambio,
                entidadComercialId: ordenCompra.proveedorId,
                tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
                numeroDocumentoOrigen: ordenCompra.numeroDocumento,
                fechaDocumentoOrigen: ordenCompra.fechaDocumento,
              });
            }
          }
        }
      }
    }
    // ========================================
    // CASO 3: FISCAL CON IGV
    // ========================================
    else {
      const cuentaIGV = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: { startsWith: "40111" },
          activo: true,
        },
        orderBy: {
          codigoCuenta: 'desc'
        }
      });

      if (!cuentaIGV) {
        throw new ValidationError(
          "No se encontró la cuenta de IGV (40111). Configure el plan de cuentas antes de generar el asiento."
        );
      }

      if (esSaldoInicial && cuentaDebe) {
        // SALDO INICIAL
        const montoConvertido = convertirMontoASoles(total, ordenCompra);
        const { debe: debe1, haber: haber1 } = invertirSiEsNC(montoConvertido, 0, esNotaCredito);
        const { debe: debe2, haber: haber2 } = invertirSiEsNC(0, montoConvertido, esNotaCredito);

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaDebe.id,
          glosa: `Saldo Inicial CxP según ${referenciaDoc}`,
          debe: debe1,
          haber: haber1,
          monedaId: 1, // ⭐ SIEMPRE SOLES
          tipoCambio: ordenCompra.tipoCambio,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaHaber.id,
          glosa: `Saldo Inicial CxP según ${referenciaDoc}`,
          debe: debe2,
          haber: haber2,
          monedaId: 1, // ⭐ SIEMPRE SOLES
          tipoCambio: ordenCompra.tipoCambio,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });
      } else {
        // COMPRA NORMAL: Orden: 60→40→42→20→61
        let totalInventario = 0;

        for (const detalle of ordenCompra.detalles) {
          const { cuenta, usaFallback, mensaje } = await buscarCuentaCompras(detalle.producto);

          if (usaFallback && mensaje) {
            warnings.push(mensaje);
          }

          const subtotalDetalle = Number(detalle.subtotal);
          const montoDetalle = convertirMontoASoles(subtotalDetalle, ordenCompra);

          const { debe, haber } = invertirSiEsNC(montoDetalle, 0, esNotaCredito);
          const { debe: debeOriginal, haber: haberOriginal } = invertirSiEsNC(subtotalDetalle, 0, esNotaCredito);

          borrador.detalles.push({
            numeroLinea: numeroLinea++,
            planCuentaId: cuenta.id,
            glosa: `Compra ${detalle.producto.descripcionBase} - ${referenciaDoc}`,
            debe: debe,
            haber: haber,
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: debeOriginal,
            haberMonedaExtranjera: haberOriginal,
            centroCostoId: detalle.centroCostoId || ordenCompra.centroCostoId,
            entidadComercialId: ordenCompra.proveedorId,
            tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
            numeroDocumentoOrigen: ordenCompra.numeroDocumento,
            fechaDocumentoOrigen: ordenCompra.fechaDocumento,
          });

          if (detalle.producto.cuentaInventarioId) {
            totalInventario += subtotalDetalle;
          }
        }

        const montoIGV = convertirMontoASoles(totalIGV, ordenCompra);
        const { debe: debeIGV, haber: haberIGV } = invertirSiEsNC(montoIGV, 0, esNotaCredito);
        const { debe: debeIGVOriginal, haber: haberIGVOriginal } = invertirSiEsNC(totalIGV, 0, esNotaCredito);

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaIGV.id,
          glosa: `IGV 18% según ${referenciaDoc}`,
          debe: debeIGV,
          haber: haberIGV,
          monedaId: 1,
          tipoCambio: ordenCompra.tipoCambio,
          debeMonedaExtranjera: debeIGVOriginal,
          haberMonedaExtranjera: haberIGVOriginal,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });

        // ⭐ CALCULAR MONTO DE CUENTA POR PAGAR (reducido si hay retención)
        let montoCuentaPorPagar = total;
        const tieneRetencion = ordenCompra.aplicaRetencion && ordenCompra.montoRetencion > 0;

        if (tieneRetencion) {
          const empresa = await prisma.empresa.findUnique({
            where: { id: ordenCompra.empresaId },
            select: { soyAgenteRetencion: true }
          });

          if (empresa?.soyAgenteRetencion) {
            // Convertir retención de soles a moneda original para restar correctamente
            const montoRetencionEnMonedaOriginal = Number(ordenCompra.monedaId) === 1
              ? Number(ordenCompra.montoRetencion)
              : Number(ordenCompra.montoRetencion) / Number(ordenCompra.tipoCambio);
            montoCuentaPorPagar = total - montoRetencionEnMonedaOriginal;
          }
        }

        // ⭐ CALCULAR CxP AJUSTADO PARA CUADRAR
        // Sumar todos los DEBE ya generados
        const totalDebeGenerado = borrador.detalles.reduce((sum, d) => sum + Number(d.debe || 0), 0);
        const totalHaberGenerado = borrador.detalles.reduce((sum, d) => sum + Number(d.haber || 0), 0);


        // CxP debe ser igual al total DEBE para cuadrar perfectamente
        // ⭐ PARA NC: usar totalHaberGenerado porque los gastos están en HABER
        const montoCxPEnSoles = convertirMontoASoles(montoCuentaPorPagar, ordenCompra);
        const montoCxPAjustado = tieneRetencion ? montoCxPEnSoles : (esNotaCredito ? totalHaberGenerado : totalDebeGenerado);
        const { debe, haber } = invertirSiEsNC(0, montoCxPAjustado, esNotaCredito);

        const { debe: debeOriginal, haber: haberOriginal } = invertirSiEsNC(0, montoCuentaPorPagar, esNotaCredito);

        borrador.detalles.push({
          numeroLinea: numeroLinea++,
          planCuentaId: cuentaHaber.id,
          glosa: esSaldoInicial
            ? `Saldo Inicial CxP según ${referenciaDoc}`
            : `Compra según ${referenciaDoc}`,
          debe: debe,
          haber: haber,
          monedaId: 1,
          tipoCambio: ordenCompra.tipoCambio,
          debeMonedaExtranjera: debeOriginal,
          haberMonedaExtranjera: haberOriginal,
          entidadComercialId: ordenCompra.proveedorId,
          tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
          numeroDocumentoOrigen: ordenCompra.numeroDocumento,
          fechaDocumentoOrigen: ordenCompra.fechaDocumento,
        });
        // ⭐ AGREGAR CUENTA 401141 SI HAY RETENCIÓN Y EMPRESA ES AGENTE
        if (tieneRetencion) {
          const empresa = await prisma.empresa.findUnique({
            where: { id: ordenCompra.empresaId },
            select: { soyAgenteRetencion: true }
          });

          if (empresa?.soyAgenteRetencion) {
            const cuentaRetencion = await prisma.planCuentasContable.findFirst({
              where: {
                codigoCuenta: "401141",
                activo: true,
              },
            });

            if (!cuentaRetencion) {
              throw new ValidationError(
                "No se encontró la cuenta 401141 (IGV Régimen de Retenciones). Configure el plan de cuentas antes de generar el asiento."
              );
            }

            const montoRetencion = Number(ordenCompra.montoRetencion); // YA ESTÁ EN SOLES
            const { debe: debeRet, haber: haberRet } = invertirSiEsNC(0, montoRetencion, esNotaCredito);
            const { debe: debeRetOriginal, haber: haberRetOriginal } = invertirSiEsNC(0, Number(ordenCompra.montoRetencion), esNotaCredito);

            borrador.detalles.push({
              numeroLinea: numeroLinea++,
              planCuentaId: cuentaRetencion.id,
              glosa: `Retención ${ordenCompra.porcentajeRetencion}% según ${referenciaDoc}`,
              debe: debeRet,
              haber: haberRet,
              monedaId: 1,
              tipoCambio: ordenCompra.tipoCambio,
              debeMonedaExtranjera: debeRetOriginal,
              haberMonedaExtranjera: haberRetOriginal,
              entidadComercialId: ordenCompra.proveedorId,
              tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
              numeroDocumentoOrigen: ordenCompra.numeroDocumento,
              fechaDocumentoOrigen: ordenCompra.fechaDocumento,
            });
          }
        }

        // ⭐ AGREGAR LÍNEAS DE INVENTARIO/VARIACIÓN si hay productos con inventario
        if (totalInventario > 0) {
          const productoConInventario = ordenCompra.detalles.find(d => d.producto.cuentaInventarioId);

          if (productoConInventario) {
            const montoInventario = convertirMontoASoles(totalInventario, ordenCompra);
            const { debe: debeInv, haber: haberInv } = invertirSiEsNC(montoInventario, 0, esNotaCredito);
            const { debe: debeVar, haber: haberVar } = invertirSiEsNC(0, montoInventario, esNotaCredito);

            borrador.detalles.push({
              numeroLinea: numeroLinea++,
              planCuentaId: productoConInventario.producto.cuentaInventarioId,
              glosa: `Inventario - ${referenciaDoc}`,
              debe: debeInv,
              haber: haberInv,
              monedaId: 1, // ⭐ SIEMPRE SOLES
              tipoCambio: ordenCompra.tipoCambio,
              centroCostoId: ordenCompra.centroCostoId,
              entidadComercialId: ordenCompra.proveedorId,
              tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
              numeroDocumentoOrigen: ordenCompra.numeroDocumento,
              fechaDocumentoOrigen: ordenCompra.fechaDocumento,
            });

            if (productoConInventario.producto.cuentaVariacionId) {
              borrador.detalles.push({
                numeroLinea: numeroLinea++,
                planCuentaId: productoConInventario.producto.cuentaVariacionId,
                glosa: `Variación de Existencias - ${referenciaDoc}`,
                debe: debeVar,
                haber: haberVar,
                monedaId: 1, // ⭐ SIEMPRE SOLES
                tipoCambio: ordenCompra.tipoCambio,
                entidadComercialId: ordenCompra.proveedorId,
                tipoDocumentoOrigenId: ordenCompra.tipoDocumentoId,
                numeroDocumentoOrigen: ordenCompra.numeroDocumento,
                fechaDocumentoOrigen: ordenCompra.fechaDocumento,
              });
            }
          }
        }
      }
    }

    // ========================================
    // AGREGAR WARNINGS AL BORRADOR
    // ========================================
    if (warnings.length > 0) {
      borrador.warnings = warnings;
    }

    // ========================================
    // 🔍 DIAGNÓSTICO FINAL DE CUADRE
    // ========================================
    const totalDebe = borrador.detalles.reduce((sum, d) => sum + Number(d.debe || 0), 0);
    const totalHaber = borrador.detalles.reduce((sum, d) => sum + Number(d.haber || 0), 0);
    const diferencia = totalDebe - totalHaber;

    return borrador;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};
/**
 * Genera asiento de destino para centro de costo (92xxxx / 791101)
 * Solo aplica para Facturas, Boletas y Notas de Débito
 * NO aplica para Notas de Crédito ni Saldos Iniciales
 */
const generarAsientoDestinoCentroCosto = async (ordenCompraId, prismaClient = prisma) => {
  try {
    const ordenCompra = await prismaClient.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: {
        empresa: true,
        periodoContable: true,
        tipoDocumento: true,
        tipoDocumentoFinal: true,
        proveedor: true,
        moneda: true,
        centroCosto: {
          include: {
            cuentaContable: {
              include: {
                cuentaPadre: true,
              },
            },
          },
        },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!ordenCompra) {
      throw new NotFoundError("OrdenCompra no encontrada");
    }

    // Validar condiciones para generar el asiento
    const esSaldoInicial = ordenCompra.tipoDocumento?.codigo?.startsWith("SI");
    const esNotaCredito = Number(ordenCompra.tipoDocumentoFinalId) === 8;

    // NO generar asiento si es NC o SI
    if (esNotaCredito || esSaldoInicial) {
      return null;
    }

    // Validar que tenga centro de costo con cuenta contable
    if (!ordenCompra.centroCostoId || !ordenCompra.centroCosto?.cuentaContableId) {
      return null;
    }

    // ⭐ Función helper para formatear referencia del documento
    const obtenerReferenciaDocumento = () => {
      const proveedor = ordenCompra.proveedor?.razonSocial || 'Proveedor';
      const moneda = ordenCompra.moneda?.simbolo || '';
      const monto = Math.abs(Number(ordenCompra.subtotal)).toFixed(2);

      if (ordenCompra.tipoDocumentoFinal && ordenCompra.numeroDocumentoFinal && ordenCompra.fechaFacturacion) {
        const fecha = new Date(ordenCompra.fechaFacturacion);
        const fechaFormateada = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
        return `${proveedor} - ${ordenCompra.tipoDocumentoFinal.codigo} ${ordenCompra.numeroDocumentoFinal} ${fechaFormateada} - ${moneda} ${monto}`;
      }
      // Fallback a número de OC si no hay documento final
      return `OC ${ordenCompra.numeroDocumento} - ${proveedor} - ${moneda} ${monto}`;
    };
    const referenciaDoc = obtenerReferenciaDocumento();

    // Buscar cuenta 791101 (Cargas Imputables)
    const cuenta791101 = await prismaClient.planCuentasContable.findFirst({
      where: {
        codigoCuenta: "791101",
        activo: true,
      },
    });

    if (!cuenta791101) {
      throw new ValidationError(
        "No se encontró la cuenta 791101 (Cargas Imputables). Configure el plan de cuentas antes de generar el asiento."
      );
    }

    // ⭐ CALCULAR SUBTOTAL AJUSTADO
    // Debe coincidir con la suma de detalles 60xxx del asiento principal
    // Para evitar descuadres por redondeo, sumamos los detalles convertidos
    let subtotalEnSoles = 0;

    for (const detalle of ordenCompra.detalles) {
      const subtotalDetalle = Number(detalle.subtotal);
      const montoDetalle = convertirMontoASoles(subtotalDetalle, ordenCompra);
      subtotalEnSoles += montoDetalle;
    }

    // Redondear a 2 decimales
    subtotalEnSoles = Math.round(subtotalEnSoles * 100) / 100;
    if (subtotalEnSoles === 0) {
      return null;
    }

    // Determinar tipo de libro según esGerencial de la orden
    const tipoLibro = ordenCompra.esGerencial ? "GERENCIAL" : "FISCAL";

    // Crear borrador del asiento de destino
    const subtotalOriginal = Number(ordenCompra.subtotal) || 0;

    // ⭐ CALCULAR TOTALES SEGÚN MONEDA DEL ASIENTO
    // Si es USD, usar subtotalOriginal; si es PEN, usar subtotalEnSoles
    const esDolares = Number(ordenCompra.monedaId) === 2;
    const totalDebeHaber = esDolares
      ? Math.round(subtotalOriginal * 100) / 100
      : Math.round(subtotalEnSoles * 100) / 100;

    const borrador = {
      empresaId: ordenCompra.empresaId,
      periodoContableId: ordenCompra.periodoContableId,
      fechaAsiento: ordenCompra.fechaContable,
      glosa: `COSTO DE PRODUCCION - C.C: ${ordenCompra.centroCosto.Nombre} - ${referenciaDoc}`,
      tipoLibro: tipoLibro,
      origenAsiento: "AUTOMATICO",
      monedaId: Number(ordenCompra.monedaId),
      tipoCambio: Number(ordenCompra.tipoCambio),
      totalDebe: Number(totalDebeHaber),
      totalHaber: Number(totalDebeHaber),
      detalles: [],
    };

    let numeroLinea = 1;

    // ⭐ Usar valores absolutos (NC no invierte este asiento, simplemente no se genera)
    // Línea DEBE: Centro de Costo (92xxxx)
    borrador.detalles.push({
      numeroLinea: numeroLinea++,
      planCuentaId: ordenCompra.centroCosto.cuentaContableId,
      glosa: `COSTO DE PRODUCCION - C.C: ${ordenCompra.centroCosto.Nombre} - ${referenciaDoc}`,
      debe: Math.abs(subtotalEnSoles),
      haber: 0,
      monedaId: 1,
      tipoCambio: ordenCompra.tipoCambio,
      debeMonedaExtranjera: subtotalOriginal,
      haberMonedaExtranjera: 0,
      entidadComercialId: ordenCompra.proveedorId,
    });

    borrador.detalles.push({
      numeroLinea: numeroLinea++,
      planCuentaId: cuenta791101.id,
      glosa: `Transferencia cargas imputables - ${referenciaDoc}`,
      debe: 0,
      haber: Math.abs(subtotalEnSoles),
      monedaId: 1,
      tipoCambio: ordenCompra.tipoCambio,
      debeMonedaExtranjera: 0,
      haberMonedaExtranjera: subtotalOriginal,
      entidadComercialId: ordenCompra.proveedorId,
    });

    return borrador;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};
/**
 * Guarda el asiento contable editado por el usuario y lo vincula a la OrdenCompra
 * Patrón: Igual a PreFactura.guardarAsientoContable
 * 
 * @param {BigInt} ordenCompraId - ID de la OrdenCompra
 * @param {Object} asientoData - Datos del asiento editado por el usuario
 * @param {BigInt} creadoPor - ID del usuario que crea el asiento
 * @returns {Promise<Object>} - Asiento contable creado
 */
const guardarAsientoContable = async (ordenCompraId, asientoData, creadoPor) => {
  try {
    // ⭐ VALIDAR QUE asientoData TENGA LA ESTRUCTURA CORRECTA

    if (!asientoData) {
      throw new ValidationError("No se recibieron datos del asiento contable");
    }

    if (!asientoData.detalles || !Array.isArray(asientoData.detalles)) {
      throw new ValidationError(
        `Estructura de asiento inválida. Se esperaba 'detalles' como array, se recibió: ${typeof asientoData.detalles}`
      );
    }

    if (asientoData.detalles.length === 0) {
      throw new ValidationError("El asiento debe tener al menos un detalle");
    }

    // ✅ DETECTAR SI ES EDICIÓN O CREACIÓN
    const esEdicion = asientoData.id !== undefined && asientoData.id !== null;

    // Buscar submódulo "OrdenCompra" dinámicamente
    const submodulo = await prisma.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "OrdenCompra",
        activo: true,
      },
    });

    if (!submodulo) {
      throw new ValidationError(
        'No se encontró el submódulo "OrdenCompra" en el sistema.'
      );
    }

    // ⭐ Calcular totales EN MONEDA ORIGINAL del documento
    // Los detalles están en soles, pero el encabezado debe mostrar el total original
    const MONEDA_SOLES_ID = 1;
    const tipoCambio = Number(asientoData.tipoCambio) || 1;

    // ⭐ LA RETENCIÓN YA VIENE APLICADA DESDE generarBorradorAsiento
    // NO hacer nada aquí, solo validar cuadratura



    // Calcular totales en soles (de los detalles) para validación de cuadre
    const totalDebeEnSoles = asientoData.detalles.reduce(
      (sum, d) => sum + Math.abs(Number(d.debe || 0)),
      0
    );
    const totalHaberEnSoles = asientoData.detalles.reduce(
      (sum, d) => sum + Math.abs(Number(d.haber || 0)),
      0
    );

    // ⭐ USAR TOTALES DEL ASIENTO SI VIENEN DEFINIDOS (desde generarBorradorAsiento)
    // Si no vienen, calcular desde los detalles (compatibilidad con asientos antiguos)

    const totalDebe = asientoData.totalDebe !== undefined && asientoData.totalDebe !== null
      ? Number(asientoData.totalDebe)
      : (Number(asientoData.monedaId) === MONEDA_SOLES_ID
        ? totalDebeEnSoles
        : Math.round((totalDebeEnSoles / tipoCambio) * 100) / 100);

    const totalHaber = asientoData.totalHaber !== undefined && asientoData.totalHaber !== null
      ? Number(asientoData.totalHaber)
      : (Number(asientoData.monedaId) === MONEDA_SOLES_ID
        ? totalHaberEnSoles
        : Math.round((totalHaberEnSoles / tipoCambio) * 100) / 100);


    // ⭐ Validar cuadratura en SOLES (detalles), NO en moneda original
    const diferenciaEnSoles = totalDebeEnSoles - totalHaberEnSoles;

    if (Math.abs(diferenciaEnSoles) > 0.02) {
      throw new ValidationError(
        `El asiento no está cuadrado. Diferencia en soles: ${diferenciaEnSoles.toFixed(2)}`
      );
    }

    // Calcular diferencia en moneda original solo para registro
    const diferencia = totalDebe - totalHaber;

    // Buscar estado "PENDIENTE" para Asientos Contables
    const estadoPendiente = await prisma.estadoMultiFuncion.findFirst({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });

    if (!estadoPendiente) {
      throw new ValidationError(
        "No se encontró el estado 'PENDIENTE' para asientos contables."
      );
    }

    return await prisma.$transaction(async (tx) => {
      let asiento;

      // Obtener OrdenCompra completa para heredar campos del documento final
      // Se obtiene antes de los bloques condicionales para estar disponible en ambos
      const ordenCompraCompleta = await tx.ordenCompra.findUnique({
        where: { id: ordenCompraId },
        include: {
          submoduloOrigen: true,
        }
      });

      // Validar que no se intente modificar asientos de Rendición de Gastos
      if (ordenCompraCompleta?.submoduloOrigen?.ruta === 'rendicionGastos') {
        throw new ValidationError(
          'Los asientos contables de Rendición de Gastos no pueden ser modificados desde Orden de Compra. ' +
          'Debe regenerarlos desde el módulo de Rendición de Gastos donde se creó el gasto original.'
        );
      }
      if (esEdicion) {
        // ✅ EDITAR: Actualizar asiento existente SIN eliminar registros
        // Primero, obtener IDs de detalles existentes
        const detallesExistentes = await tx.detalleAsientoContable.findMany({
          where: { asientoContableId: Number(asientoData.id) },
          select: { id: true },
        });
        // Actualizar asiento (siempre vuelve a PENDIENTE al editar)
        asiento = await tx.asientoContable.update({
          where: { id: Number(asientoData.id) },
          data: {
            fechaAsiento: asientoData.fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro,
            estadoId: estadoPendiente.id,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: Math.abs(diferencia) < 0.01,
            monedaId: asientoData.monedaId,
            tipoCambio: asientoData.tipoCambio,
            esGerencial: ordenCompraCompleta?.esGerencial || false,
          },
        });

        // Actualizar detalles uno por uno (UPDATE, no DELETE+CREATE)
        for (let i = 0; i < asientoData.detalles.length; i++) {
          const detalle = asientoData.detalles[i];
          const detalleExistente = detallesExistentes[i];

          if (detalleExistente) {
            // Actualizar detalle existente
            await tx.detalleAsientoContable.update({
              where: { id: detalleExistente.id },
              data: {
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: 1,
                tipoCambio: asientoData.tipoCambio,
                debeMonedaExtranjera: detalle.debeMonedaExtranjera || null,
                haberMonedaExtranjera: detalle.haberMonedaExtranjera || null,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                tipoDocumentoOrigenId: ordenCompraCompleta?.tipoDocumentoFinalId || null,
                numeroDocumentoOrigen: ordenCompraCompleta?.numeroDocumentoFinal || null,
                fechaDocumentoOrigen: ordenCompraCompleta?.fechaFacturacion || null,
                fechaVenceDocumentoOrigen: ordenCompraCompleta?.fechaVencimiento || null,
              },
            });
          } else {
            // Crear nuevo detalle si hay más detalles que antes
            await tx.detalleAsientoContable.create({
              data: {
                asientoContableId: Number(asientoData.id),
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: 1,
                tipoCambio: asientoData.tipoCambio,
                debeMonedaExtranjera: detalle.debeMonedaExtranjera || null,
                haberMonedaExtranjera: detalle.haberMonedaExtranjera || null,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                tipoDocumentoOrigenId: ordenCompraCompleta?.tipoDocumentoFinalId || null,
                numeroDocumentoOrigen: ordenCompraCompleta?.numeroDocumentoFinal || null,
                fechaDocumentoOrigen: ordenCompraCompleta?.fechaFacturacion || null,
                fechaVenceDocumentoOrigen: ordenCompraCompleta?.fechaVencimiento || null,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: ordenCompraId,
                creadoPor: creadoPor,
              },
            });
          }
        }

        // Si había más detalles antes, marcarlos como inactivos (NO eliminar)
        if (detallesExistentes.length > asientoData.detalles.length) {
          const idsAMantener = detallesExistentes
            .slice(0, asientoData.detalles.length)
            .map((d) => d.id);

          // Aquí podrías agregar un campo 'activo' en el schema
          // Por ahora, los dejamos (no se eliminan)
        }
      } else {
        // ✅ CREAR: Nuevo asiento
        // Obtener OrdenCompra completa para heredar campos
        const ordenCompraCompleta = await tx.ordenCompra.findUnique({
          where: { id: ordenCompraId },
          select: {
            esGerencial: true,
            tipoDocumentoFinalId: true,
            numeroDocumentoFinal: true,
            fechaFacturacion: true,
            fechaVencimiento: true,
          }
        });

        // Obtener último asiento del período para calcular correlativo
        const ultimoAsiento = await tx.asientoContable.findFirst({
          where: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
          },
          orderBy: { correlativo: "desc" },
        });

        const nuevoCorrelativo = ultimoAsiento
          ? ultimoAsiento.correlativo + 1
          : 1;
        const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(5, "0")}`;

        asiento = await tx.asientoContable.create({
          data: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
            numeroAsiento: numeroAsiento,
            correlativo: nuevoCorrelativo,
            fechaAsiento: asientoData.fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro,
            tipoLibroId: asientoData.esSaldoInicial ? TIPO_LIBRO.DIARIO : TIPO_LIBRO.COMPRAS,
            origenAsiento: "AUTOMATICO",
            submoduloOrigenId: submodulo.id,
            procesoOrigenId: ordenCompraId,
            estadoId: estadoPendiente.id,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: Math.abs(diferencia) < 0.01,
            monedaId: asientoData.monedaId,
            tipoCambio: asientoData.tipoCambio,
            esGerencial: ordenCompraCompleta?.esGerencial || false,
            esSaldoInicial: asientoData.esSaldoInicial || false,
            creadoPor: creadoPor,
            ordenesCompra: {
              connect: { id: ordenCompraId },
            },
            detalles: {
              create: asientoData.detalles.map((detalle) => ({
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: 1,
                tipoCambio: asientoData.tipoCambio,
                debeMonedaExtranjera: detalle.debeMonedaExtranjera || null,
                haberMonedaExtranjera: detalle.haberMonedaExtranjera || null,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                tipoDocumentoOrigenId: ordenCompraCompleta?.tipoDocumentoFinalId || null,
                numeroDocumentoOrigen: ordenCompraCompleta?.numeroDocumentoFinal || null,
                fechaDocumentoOrigen: ordenCompraCompleta?.fechaFacturacion || null,
                fechaVenceDocumentoOrigen: ordenCompraCompleta?.fechaVencimiento || null,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: ordenCompraId,
                creadoPor: creadoPor,
              })),
            },
          },
        });
      }
      // ⭐ GENERAR ASIENTO DE DESTINO (92xxxx / 791101) si aplica
      let asientoDestino = null;
      if (!esEdicion) {
        // Solo generar asiento destino en creación, no en edición
        try {
          const borradorDestino = await generarAsientoDestinoCentroCosto(ordenCompraId, tx);

          if (borradorDestino) {
            // ⭐ USAR TOTALES DEL BORRADOR (ya calculados según moneda)
            const totalDebeDestino = Number(borradorDestino.totalDebe);
            const totalHaberDestino = Number(borradorDestino.totalHaber);
            const diferenciaDestino = totalDebeDestino - totalHaberDestino;

            // Generar numeroAsiento y correlativo para asiento destino
            const ultimoAsientoDestino = await tx.asientoContable.findFirst({
              where: {
                empresaId: borradorDestino.empresaId,
                periodoContableId: borradorDestino.periodoContableId,
              },
              orderBy: { correlativo: "desc" },
            });

            const nuevoCorrelativoDestino = ultimoAsientoDestino
              ? ultimoAsientoDestino.correlativo + 1
              : 1;
            const numeroAsientoDestino = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativoDestino).padStart(5, "0")}`;

            asientoDestino = await tx.asientoContable.create({
              data: {
                empresaId: borradorDestino.empresaId,
                periodoContableId: borradorDestino.periodoContableId,
                numeroAsiento: numeroAsientoDestino,
                correlativo: nuevoCorrelativoDestino,
                fechaAsiento: borradorDestino.fechaAsiento,
                glosa: borradorDestino.glosa,
                tipoLibro: borradorDestino.tipoLibro,
                tipoLibroId: borradorDestino.esSaldoInicial ? TIPO_LIBRO.DIARIO : TIPO_LIBRO.COMPRAS,
                origenAsiento: "AUTOMATICO",
                submoduloOrigenId: submodulo.id,
                procesoOrigenId: ordenCompraId,
                estadoId: estadoPendiente.id,
                totalDebe: totalDebeDestino,
                totalHaber: totalHaberDestino,
                diferencia: diferenciaDestino,
                estaCuadrado: Math.abs(diferenciaDestino) < 0.01,
                monedaId: borradorDestino.monedaId,
                tipoCambio: borradorDestino.tipoCambio,
                esGerencial: ordenCompraCompleta?.esGerencial || false,
                creadoPor: creadoPor,
                ordenesCompra: {
                  connect: { id: ordenCompraId },
                },
                detalles: {
                  create: borradorDestino.detalles.map((detalle) => ({
                    numeroLinea: detalle.numeroLinea,
                    planCuentaId: detalle.planCuentaId,
                    glosa: detalle.glosa,
                    debe: detalle.debe,
                    haber: detalle.haber,
                    monedaId: 1,
                    tipoCambio: borradorDestino.tipoCambio,
                    debeMonedaExtranjera: detalle.debeMonedaExtranjera || null,
                    haberMonedaExtranjera: detalle.haberMonedaExtranjera || null,
                    centroCostoId: detalle.centroCostoId || null,
                    entidadComercialId: detalle.entidadComercialId || null,
                    tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId || null,
                    numeroDocumentoOrigen: detalle.numeroDocumentoOrigen || null,
                    fechaDocumentoOrigen: detalle.fechaDocumentoOrigen || null,
                    submoduloOrigenLineaId: submodulo.id,
                    procesoOrigenLineaId: ordenCompraId,
                    creadoPor: creadoPor,
                  })),
                },
              },
            });
          }
        } catch (errDestino) {
          console.error("Error al generar asiento de destino:", errDestino);
          // No fallar la transacción principal si falla el asiento destino
        }
      }

      // Retornar asiento principal con detalles y planCuenta incluidos
      const asientoPrincipal = await tx.asientoContable.findUnique({
        where: { id: asiento.id },
        include: {
          detalles: {
            include: {
              planCuenta: true,
            },
            orderBy: { numeroLinea: "asc" },
          },
        },
      });

      // Retornar ambos asientos si se generó el destino
      return {
        asientoPrincipal,
        asientoDestino: asientoDestino ? await tx.asientoContable.findUnique({
          where: { id: asientoDestino.id },
          include: {
            detalles: {
              include: {
                planCuenta: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
        }) : null,
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Elimina un asiento contable específico
 * Patrón: Igual a PreFactura.eliminarAsientoContable
 * 
 * @param {BigInt} asientoId - ID del asiento a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const eliminarAsientoContable = async (asientoId) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id: asientoId },
    });

    if (!asiento) {
      throw new NotFoundError("Asiento contable no encontrado");
    }

    // Validar que NO esté aprobado
    if (Number(asiento.estadoId) === ESTADO_ASIENTO_CONTABLE.APROBADO) {
      throw new ValidationError(
        "No se puede eliminar un asiento contable aprobado. Debe desaprobarlo primero."
      );
    }

    await prisma.asientoContable.delete({ where: { id: asientoId } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const asignarCentroCostoMasivo = async (centroCostoId, ordenesIds) => {
  try {
    const resultado = await prisma.ordenCompra.updateMany({
      where: {
        id: {
          in: ordenesIds.map(id => BigInt(id))
        }
      },
      data: {
        centroCostoId: BigInt(centroCostoId)
      }
    });

    return {
      success: true,
      count: resultado.count,
      message: `${resultado.count} órdenes actualizadas correctamente`
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

async function exportarRegistroComprasSUNAT(empresaId, periodoContableId) {
  try {
    const [empresa, periodo] = await Promise.all([
      prisma.empresa.findUnique({ where: { id: empresaId } }),
      prisma.periodoContable.findUnique({ where: { id: periodoContableId } })
    ]);

    if (!empresa || !periodo) {
      throw new NotFoundError('Empresa o Periodo no encontrado');
    }

    const ordenesCompra = await prisma.ordenCompra.findMany({
      where: {
        empresaId,
        periodoContableId,
        comprobanteRecibido: true,
        esGerencial: false
      },
      include: {
        proveedor: {
          include: {
            tipoDocumento: true
          }
        },
        tipoDocumentoFinal: true,
        moneda: true,
        tipoOperacionSunat: true,
        dcmtoAfectoNCND: {
          include: {
            tipoDocumentoFinal: true
          }
        }
      },
      orderBy: { fechaRecepcionComprobante: 'asc' }
    });

    const lineas = [];
    let correlativo = 1;

    for (const oc of ordenesCompra) {
      const fechaDoc = oc.fechaDocumento ? new Date(oc.fechaDocumento) : null;
      const fechaCont = oc.fechaContable ? new Date(oc.fechaContable) : null;
      
      if (!fechaDoc || !fechaCont) {
        console.warn(`⚠️ OrdenCompra ${oc.id} sin fechaDocumento o fechaContable, se omite del TXT`);
        continue;
      }
      
      const periodo = `${fechaCont.getFullYear()}${String(fechaCont.getMonth() + 1).padStart(2, '0')}00`;
      const correlativoStr = `M${String(correlativo).padStart(9, '0')}`;
      const fechaEmision = `${String(fechaDoc.getDate()).padStart(2, '0')}/${String(fechaDoc.getMonth() + 1).padStart(2, '0')}/${fechaDoc.getFullYear()}`;
      const fechaVenc = oc.fechaVencimiento ? (() => { const fv = new Date(oc.fechaVencimiento); return `${String(fv.getDate()).padStart(2, '0')}/${String(fv.getMonth() + 1).padStart(2, '0')}/${fv.getFullYear()}`; })() : "";
      const fechaContable = `${String(fechaCont.getDate()).padStart(2, '0')}/${String(fechaCont.getMonth() + 1).padStart(2, '0')}/${fechaCont.getFullYear()}`;

      const tipoDocCodigo = oc.tipoDocumentoFinal?.codigo || "";
      const serie = oc.numSerieDocFinal || "";
      const numero = oc.numCorreDocFinal || "";
      const tipoDocProv = oc.proveedor?.tipoDocumento?.codSunat || "6";
      const nroDocProv = oc.proveedor?.numeroDocumento || "";
      const razonSocialProv = oc.proveedor?.razonSocial || "";

      // ============================================================
      // CONVERSIÓN A SOLES PARA REPORTE SUNAT
      // Todos los montos deben reportarse en PEN según normativa SUNAT
      // Si el documento está en moneda extranjera, se convierte usando el tipo de cambio registrado
      // ============================================================
      const esMonedaExtranjera = oc.moneda?.codigoSunat !== "PEN";
      const tcAplicable = esMonedaExtranjera ? Number(oc.tipoCambio || 1) : 1;
      
      // Convertir montos a soles (si está en ME, multiplica por TC; si ya está en PEN, mantiene el valor)
      const subtotalPEN = Number(oc.subtotal || 0) * tcAplicable;
      const totalIGVPEN = Number(oc.totalIGV || 0) * tcAplicable;
      const totalPEN = Number(oc.total || 0) * tcAplicable;
      
      // Construir campos para el TXT SUNAT (siempre en soles)
      const esExonerado = oc.esExoneradoAlIGV || false;
      const baseGravada = !esExonerado ? subtotalPEN.toFixed(2) : "0.00";
      const igv = totalIGVPEN.toFixed(2);
      const exonerado = esExonerado ? subtotalPEN.toFixed(2) : "0.00";
      const total = totalPEN.toFixed(2);
      const moneda = "PEN";  // SUNAT siempre requiere PEN en el reporte
      const tipoCambio = Number(oc.tipoCambio || 1).toFixed(3);  // Se mantiene como referencia

      const esNCND = ["07", "08", "NC", "ND"].includes(tipoDocCodigo);
      const fechaDocMod = esNCND && oc.fechaDcmtoAfectoNCND ? (() => { const fdm = new Date(oc.fechaDcmtoAfectoNCND); return `${String(fdm.getDate()).padStart(2, '0')}/${String(fdm.getMonth() + 1).padStart(2, '0')}/${fdm.getFullYear()}`; })() : "";
      const tipoDocMod = esNCND && oc.dcmtoAfectoNCND ? oc.dcmtoAfectoNCND.tipoDocumentoFinal?.codigo || "" : "";
      const serieDocMod = esNCND && oc.dcmtoAfectoNCND ? oc.dcmtoAfectoNCND.numSerieDocFinal || "" : "";
      const nroDocMod = esNCND && oc.dcmtoAfectoNCND ? oc.dcmtoAfectoNCND.numCorreDocFinal || "" : "";

      const indDetraccion = oc.aplicaDetraccion ? "1" : "";
      const estadoId = Number(oc.estadoId);
      const estadoSunat = estadoId === 39 ? "1" : "2";

      const linea = [
        periodo, correlativoStr, correlativoStr, fechaEmision, fechaVenc, fechaContable,
        tipoDocCodigo, serie, "", numero, "",
        tipoDocProv, nroDocProv, razonSocialProv,
        baseGravada, igv, "0.00", "0.00", exonerado, "0.00", "0.00", "0.00", "0.00", "0.00",
        total, moneda, tipoCambio,
        fechaDocMod, tipoDocMod, serieDocMod, "", nroDocMod,
        indDetraccion, "01", "", "", "", "", "", "", estadoSunat, ""
      ].join('|');

      lineas.push(linea);
      correlativo++;
    }

    return lineas.join('\n');
  } catch (err) {
    if (err.code && err.code.startsWith('P'))
      throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  aprobar,
  anular,
  reactivarDocumentoOrdenCompra,
  generarKardex,
  regenerarKardex,
  partirOrdenCompra, // ⭐ NUEVO
  generarDesdeRequerimiento,
  obtenerSeriesDoc,
  generarCuentaPorPagar,
  generarBorradorAsiento,
  generarAsientoDestinoCentroCosto,
  guardarAsientoContable, // ⭐ NUEVO
  eliminarAsientoContable, // ⭐ NUEVO
  calcularTotalesEImpuestos, // ⭐ AGREGAR
  asignarCentroCostoMasivo,
  obtenerTodos, // ← AGREGAR ESTA LÍNEA
  exportarRegistroComprasSUNAT
};
