import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import crearMovimientoAlmacenService from "../Almacen/crearMovimientoAlmacen.service.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";

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
    return await prisma.ordenCompra.findMany({
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        requerimientoCompra: true,
        proveedor: true,
        formaPago: true,
        moneda: true,
        unidadNegocio: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: {
        fechaDocumento: "desc",
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        empresa: true,
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
      const empresa = await tx.empresa.findUnique({
        where: { id: BigInt(data.empresaId) },
      });

      if (!empresa) {
        throw new ValidationError("Empresa no encontrada.");
      }

      const serie = await tx.serieDoc.findUnique({
        where: { id: BigInt(data.serieDocId) },
      });

      if (!serie) {
        throw new ValidationError("Serie de documento no encontrada.");
      }

      const nuevoCorrelativo = Number(serie.correlativo) + 1;
      const numSerie = String(serie.serie).padStart(
        serie.numCerosIzqSerie,
        "0",
      );
      const numCorre = String(nuevoCorrelativo).padStart(
        serie.numCerosIzqCorre,
        "0",
      );
      const numeroDocumento = `${numSerie}-${numCorre}`;

      await tx.serieDoc.update({
        where: { id: BigInt(data.serieDocId) },
        data: { correlativo: BigInt(nuevoCorrelativo) },
      });

      const estadoInicial = await tx.estadoMultiFuncion.findFirst({
        where: { id: 38 },
      });

      if (!estadoInicial) {
        throw new ValidationError(
          "No se encontró el estado inicial PENDIENTE (id=38)",
        );
      }

      const datosLimpios = {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        numeroDocumento,
        fechaDocumento: data.fechaDocumento || new Date(),
        requerimientoCompraId: data.requerimientoCompraId,
        proveedorId: data.proveedorId,
        formaPagoId: data.formaPagoId,
        monedaId: data.monedaId,
        tipoCambio: tipoCambioFinal, // ✅ Usar valor validado
        fechaEntrega: data.fechaEntrega,
        fechaRecepcion: data.fechaRecepcion,
        solicitanteId: data.solicitanteId,
        aprobadoPorId: data.aprobadoPorId,
        estadoId: estadoInicial.id,
        centroCostoId: data.centroCostoId,
        movIngresoAlmacenId: data.movIngresoAlmacenId,
        observaciones: data.observaciones,
        urlOrdenCompraPdf: data.urlOrdenCompraPdf,
        unidadNegocioId: data.unidadNegocioId,
        creadoEn: data.creadoEn || new Date(),
        actualizadoEn: data.actualizadoEn || new Date(),
        creadoPor: data.creadoPor,
        actualizadoPor: data.actualizadoPor,
        porcentajeIGV:
          data.porcentajeIGV !== undefined
            ? data.porcentajeIGV
            : empresa.porcentajeIgv,
        esExoneradoAlIGV:
          data.esExoneradoAlIGV !== undefined ? data.esExoneradoAlIGV : false,
        tipoDocumentoFinalId: data.tipoDocumentoFinalId,
        serieDocFinalId: data.serieDocFinalId,
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
        esParticionada:
          data.esParticionada !== undefined ? data.esParticionada : false,
      };
      const ordenCreada = await tx.ordenCompra.create({
        data: datosLimpios,
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          moneda: true,
          unidadNegocio: true,
        },
      });

      return ordenCreada;
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

    if (Number(existe.estadoId) === 40) {
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
      // Objeto para edición (CON relaciones para validación)
      const dataParaEdicion = {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numSerieDoc: data.numSerieDoc,
        numCorreDoc: data.numCorreDoc,
        numeroDocumento: data.numeroDocumento,
        fechaDocumento: data.fechaDocumento,
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
        porcentajeIGV: data.porcentajeIGV,
        esExoneradoAlIGV: data.esExoneradoAlIGV,
        tipoDocumentoFinalId: data.tipoDocumentoFinalId,
        serieDocFinalId: data.serieDocFinalId,
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
      };

      // Objeto para grabación (SIN relaciones, solo IDs)
      const dataParaGrabacion = {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numSerieDoc: data.numSerieDoc,
        numCorreDoc: data.numCorreDoc,
        numeroDocumento: data.numeroDocumento,
        fechaDocumento: data.fechaDocumento,
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
        porcentajeIGV: data.porcentajeIGV,
        esExoneradoAlIGV: data.esExoneradoAlIGV,
        tipoDocumentoFinalId: data.tipoDocumentoFinalId,
        serieDocFinalId: data.serieDocFinalId,
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
        actualizadoEn: new Date(),
      };

      const ordenActualizada = await tx.ordenCompra.update({
        where: { id },
        data: dataParaGrabacion,
        include: {
          empresa: true,
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

      const detalles = await tx.detalleOrdenCompra.findMany({
        where: { ordenCompraId: id },
      });

      if (detalles && detalles.length > 0) {
        for (const detalle of detalles) {
          const subtotalCalculado =
            Number(detalle.cantidad) * Number(detalle.precioUnitario);
          await tx.detalleOrdenCompra.update({
            where: { id: detalle.id },
            data: {
              subtotal: subtotalCalculado,
            },
          });
        }
      }

      return await tx.ordenCompra.findUnique({
        where: { id },
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          moneda: true,
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

const eliminar = async (id) => {
  try {
    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError("OrdenCompra no encontrada");

    if (Number(existe.estadoId) === 40) {
      throw new ValidationError("No se puede eliminar una orden anulada.");
    }

    await prisma.ordenCompra.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerSeriesDoc = async (empresaId, tipoDocumentoId) => {
  try {
    const where = {
      activo: true,
    };

    if (empresaId) where.empresaId = BigInt(empresaId);
    if (tipoDocumentoId) where.tipoDocumentoId = BigInt(tipoDocumentoId);

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

    if (Number(orden.estadoId) !== 38) {
      throw new ValidationError(
        "Solo se pueden aprobar órdenes en estado PENDIENTE",
      );
    }

    // ⭐ VALIDACIÓN OBLIGATORIA: Contacto del Proveedor
    if (!orden.contactoProveedorId) {
      throw new ValidationError(
        "Debe seleccionar un contacto del proveedor antes de aprobar la orden de compra",
      );
    }

    // ⭐ VALIDACIÓN OBLIGATORIA: Dirección de Recepción de Mercadería
    if (!orden.direccionRecepcionAlmacenId) {
      throw new ValidationError(
        "Debe seleccionar una dirección de recepción de mercadería antes de aprobar la orden de compra",
      );
    }

    // Validar que la dirección tenga concepto de almacén configurado
    const direccion = await prisma.direccionEntidad.findUnique({
      where: { id: orden.direccionRecepcionAlmacenId },
    });

    if (!direccion) {
      throw new ValidationError(
        "La dirección de recepción seleccionada no existe",
      );
    }

    if (!direccion.conceptoAlmacenCompraId) {
      throw new ValidationError(
        "La dirección de recepción no tiene un concepto de almacén de compra configurado. Por favor, configure el concepto de almacén en la dirección.",
      );
    }

    const parametroAprobador = await prisma.parametroAprobador.findFirst({
      where: {
        empresaId: orden.empresaId,
        moduloSistemaId: BigInt(4),
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
        estadoId: BigInt(39),
        aprobadoPorId: parametroAprobador.personalRespId,
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
      if (Number(orden.estadoId) === 40) {
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
          estadoId: BigInt(40),
          movIngresoAlmacenId: null,
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

const generarKardex = async (id, usuarioId) => {
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

      if (Number(orden.estadoId) !== 39) {
        throw new ValidationError(
          "Solo se puede generar kardex para órdenes aprobadas",
        );
      }

      if (orden.movIngresoAlmacenId) {
        throw new ValidationError(
          "Esta orden ya tiene un movimiento de almacén generado",
        );
      }

      if (!orden.detalles || orden.detalles.length === 0) {
        throw new ValidationError(
          "La orden no tiene detalles para generar el kardex",
        );
      }

      // ⭐ VALIDAR que tenga dirección de recepción
      if (!orden.direccionRecepcionAlmacenId) {
        throw new ValidationError(
          "La orden no tiene dirección de recepción configurada",
        );
      }

      // ========================================
      // PASO 2: OBTENER DIRECCIÓN Y CONCEPTO DE ALMACÉN
      // ========================================
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
      // PASO 3: OBTENER RESPONSABLE DE ALMACÉN
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
      // PASO 4: OBTENER SERIE DE DOCUMENTO
      // ========================================
      if (!orden.serieDoc || !orden.serieDoc.serie) {
        throw new ValidationError(
          "La orden de compra no tiene serie configurada",
        );
      }

      const serieMovAlmacen = await tx.serieDoc.findFirst({
        where: {
          empresaId: orden.empresaId,
          tipoDocumentoId: BigInt(13), // Nota de Ingreso
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
      // PASO 4.5: OBTENER DIRECCIÓN ORIGEN (PROVEEDOR)
      // ========================================
      const direccionOrigenId = await obtenerDireccionProveedor(
        orden.proveedorId,
        tx,
      );

      // ========================================
      // PASO 5: PREPARAR CABECERA DEL MOVIMIENTO
      // ========================================
      const cabecera = {
        empresaId: orden.empresaId,
        tipoDocumentoId: BigInt(13), // Nota de Ingreso
        conceptoMovAlmacenId: direccion.conceptoAlmacenCompraId,
        serieDocId: serieMovAlmacen.id,
        fechaDocumento: new Date(),
        entidadComercialId: orden.proveedorId,
        estadoDocAlmacenId: BigInt(30), // PENDIENTE
        esCustodia: false,
        personalRespAlmacen: parametroAprobador.personalRespId,
        ordenCompraId: orden.id,
        dirOrigenId: direccionOrigenId,
        dirDestinoId: orden.direccionRecepcionAlmacenId,
        observaciones: `Ingreso por Orden de Compra ${orden.numeroDocumento}`,
      };

      // ========================================
      // PASO 6: PREPARAR DETALLES DEL MOVIMIENTO
      // ========================================
      const fechaActual = new Date();
      const fechaVencimiento = new Date(fechaActual);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // +30 días

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
        estadoMercaderiaId: BigInt(6), // Estado por defecto
        estadoCalidadId: BigInt(10), // Calidad por defecto
        entidadComercialId: orden.proveedorId,
        esCustodia: false,
        empresaId: orden.empresaId,
        costoUnitario: det.precioUnitario || 0,
        observaciones: null,
        detalleReqCompraId: det.detalleReqCompraId || null,
      }));

      // ========================================
      // PASO 7: CREAR MOVIMIENTO DE ALMACÉN CON KARDEX
      // ========================================
      const resultado =
        await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
          cabecera,
          detalles,
          usuarioId,
          tx, // Pasar la transacción actual
        );

      // ========================================
      // PASO 8: ACTUALIZAR ORDEN DE COMPRA
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

      // ✅ Validar que la orden esté APROBADA (39) y tenga kardex generado
      if (Number(orden.estadoId) !== 39) {
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
          estadoId: BigInt(39), // APROBADO
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
          tipoDocumentoId: BigInt(13), // Nota de Ingreso
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
        tipoDocumentoId: BigInt(13), // Nota de Ingreso
        conceptoMovAlmacenId: direccion.conceptoAlmacenCompraId,
        serieDocId: serieMovAlmacen.id,
        fechaDocumento: new Date(),
        entidadComercialId: orden.proveedorId,
        estadoDocAlmacenId: BigInt(30), // PENDIENTE
        esCustodia: false,
        personalRespAlmacen: parametroAprobador.personalRespId,
        dirOrigenId: direccionOrigenId,
        dirDestinoId: orden.direccionRecepcionAlmacenId,
        ordenCompraId: orden.id,
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
        estadoMercaderiaId: BigInt(6),
        estadoCalidadId: BigInt(10),
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

const generarDesdeRequerimiento = async (requerimientoCompraId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const requerimiento = await tx.requerimientoCompra.findUnique({
        where: { id: BigInt(requerimientoCompraId) },
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

      if (requerimiento.estadoId !== BigInt(35)) {
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
              `El detalle del producto ${
                detalle.producto?.nombre || detalle.productoId
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
            BigInt(proveedorId),
            detalles,
          );
          ordenesGeneradas.push(orden);
        }
      } else {
        const cotizaciones = await tx.cotizacionProveedor.findMany({
          where: {
            requerimientoCompraId: BigInt(requerimientoCompraId),
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
            const key = `${cotizacion.proveedorId}-${
              cotizacion.monedaId || "null"
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
        where: { id: BigInt(requerimientoCompraId) },
        data: {
          estadoId: BigInt(37),
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
      tipoDocumentoId: BigInt(17),
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
    data: { correlativo: BigInt(nuevoCorrelativo) },
  });

  const ordenCompra = await tx.ordenCompra.create({
    data: {
      empresaId: requerimiento.empresaId,
      tipoDocumentoId: BigInt(17),
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
      estadoId: BigInt(38),
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
      tipoDocumentoId: BigInt(17),
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
    data: { correlativo: BigInt(nuevoCorrelativo) },
  });

  const ordenCompra = await tx.ordenCompra.create({
    data: {
      empresaId: requerimiento.empresaId,
      tipoDocumentoId: BigInt(17),
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
      estadoId: BigInt(38),
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

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  aprobar,
  anular,
  generarKardex,
  regenerarKardex, // ← NUEVO
  generarDesdeRequerimiento,
  obtenerSeriesDoc,
};
