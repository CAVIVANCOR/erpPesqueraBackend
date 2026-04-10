import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import { puedeEditarRegistroCerrado } from "../../utils/checkSuperUsuario.js";

/**
 * Servicio CRUD para DetMovsEntregaRendir
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const validaciones = [
    prisma.entregaARendir.findUnique({ where: { id: data.entregaARendirId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({
      where: { id: data.tipoMovimientoId },
    }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }),
  ];

  // Agregar validación de ModuloSistema si se proporciona moduloOrigenMovCajaId
  if (data.moduloOrigenMovCajaId) {
    validaciones.push(
      prisma.moduloSistema.findUnique({
        where: { id: data.moduloOrigenMovCajaId },
      }),
    );
  }

  // Agregar validación de EntidadComercial si se proporciona entidadComercialId
  if (data.entidadComercialId) {
    validaciones.push(
      prisma.entidadComercial.findUnique({
        where: { id: data.entidadComercialId },
      }),
    );
  }

  const [
    entrega,
    responsable,
    tipoMovimiento,
    centroCosto,
    moduloSistema,
    entidadComercial,
  ] = await Promise.all(validaciones);

  if (!entrega) throw new ValidationError("El entregaARendirId no existe.");
  if (!responsable) throw new ValidationError("El responsableId no existe.");
  if (!tipoMovimiento)
    throw new ValidationError("El tipoMovimientoId no existe.");
  if (!centroCosto) throw new ValidationError("El centroCostoId no existe.");
  if (data.moduloOrigenMovCajaId && !moduloSistema)
    throw new ValidationError("El moduloOrigenMovCajaId no existe.");
  if (data.entidadComercialId && !entidadComercial)
    throw new ValidationError("El entidadComercialId no existe.");
}

const listar = async () => {
  try {
    return await prisma.detMovsEntregaRendir.findMany({
      include: {
        tipoMovimiento: {
          include: {
            categoria: true,
          },
        },
        entidadComercial: true,
        moneda: true,
        producto: true,
        tipoDocumento: true,
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
    const mov = await prisma.detMovsEntregaRendir.findUnique({
      where: { id },
      include: {
        tipoMovimiento: {
          include: {
            categoria: true,
          },
        },
        entidadComercial: true,
        moneda: true,
        producto: true,
        tipoDocumento: true,
      },
    });
    if (!mov) throw new NotFoundError("DetMovsEntregaRendir no encontrado");
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = [
      "entregaARendirId",
      "responsableId",
      "fechaMovimiento",
      "tipoMovimientoId",
      "centroCostoId",
      "monto",
      "monedaId",
    ];
    for (const campo of obligatorios) {
      if (typeof data[campo] === "undefined" || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }

    // Validación de regla de negocio: Asignaciones deben tener formaParteCalculoEntregaARendir=true
    if (data.tipoMovimientoId === 1 || data.tipoMovimientoId === 2) {
      data.formaParteCalculoEntregaARendir = true;
    }

    // Validación: Si NO es asignación Y formaParteCalculoEntregaARendir=true → asignacionOrigenId es obligatorio
    // NOTA: asignacionOrigenId puede ser 0 (nueva asignación) o un ID > 0 (gasto de asignación existente)
    if (
      data.tipoMovimientoId !== 1 &&
      data.tipoMovimientoId !== 2 &&
      data.formaParteCalculoEntregaARendir === true &&
      (data.asignacionOrigenId === null ||
        data.asignacionOrigenId === undefined)
    ) {
      throw new ValidationError(
        "Debe especificar una asignación origen cuando el movimiento forma parte del cálculo de entrega a rendir.",
      );
    }

    await validarClavesForaneas(data);

    // Convertir asignacionOrigenId=0 a null para Prisma (0 es solo indicador lógico, no FK)
    if (data.asignacionOrigenId === 0) {
      data.asignacionOrigenId = null;
    }

    return await prisma.detMovsEntregaRendir.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data, usuarioId = null) => {
  try {
    const existente = await prisma.detMovsEntregaRendir.findUnique({
      where: { id },
      include: {
        entregaARendir: {
          include: {
            temporadaPesca: {
              include: {
                estadoTemporada: true,
              },
            },
          },
        },
      },
    });
    if (!existente)
      throw new NotFoundError("DetMovsEntregaRendir no encontrado");

    // ========================================
    // ⭐ VALIDACIÓN DE PERMISOS PARA EDITAR
    // ========================================
    const estadosCerrados = await prisma.estadoMultiFuncion.findMany({
      where: {
        tipoProvieneDeId: 4, // Temporada Pesca
        descripcion: { in: ["FINALIZADA", "CANCELADA"] },
        cesado: false,
      },
      select: { id: true },
    });

    const idsEstadosCerrados = estadosCerrados.map((e) => e.id);

    const puedeEditar = await puedeEditarRegistroCerrado(
      usuarioId,
      existente.entregaARendir.temporadaPesca.estadoTemporadaId,
      idsEstadosCerrados,
    );

    if (!puedeEditar) {
      throw new ValidationError(
        `No se puede editar el movimiento porque la temporada está en estado "${existente.entregaARendir?.temporadaPesca?.estadoTemporada?.descripcion}". ` +
          `Solo los superusuarios pueden editar movimientos de temporadas finalizadas o canceladas.`,
      );
    }

    // Validación de regla de negocio: Asignaciones deben tener formaParteCalculoEntregaARendir=true
    if (data.tipoMovimientoId === 1 || data.tipoMovimientoId === 2) {
      data.formaParteCalculoEntregaARendir = true;
    }

    // Validación: Si NO es asignación Y formaParteCalculoEntregaARendir=true → asignacionOrigenId es obligatorio
    const tipoMovFinal = data.tipoMovimientoId || existente.tipoMovimientoId;
    const formaParteCalculo =
      data.formaParteCalculoEntregaARendir !== undefined
        ? data.formaParteCalculoEntregaARendir
        : existente.formaParteCalculoEntregaARendir;
    const asignacionOrigen =
      data.asignacionOrigenId !== undefined
        ? data.asignacionOrigenId
        : existente.asignacionOrigenId;

    if (
      tipoMovFinal !== 1 &&
      tipoMovFinal !== 2 &&
      formaParteCalculo === true &&
      (asignacionOrigen === null || asignacionOrigen === undefined)
    ) {
      throw new ValidationError(
        "Debe especificar una asignación origen cuando el movimiento forma parte del cálculo de entrega a rendir.",
      );
    }

    // Validar claves foráneas si cambian
    const claves = [
      "entregaARendirId",
      "responsableId",
      "tipoMovimientoId",
      "centroCostoId",
      "moduloOrigenMovCajaId",
      "entidadComercialId",
      "monedaId",
    ];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Preparar datos con SOLO campos escalares permitidos
    const datosActualizacion = {
      entregaARendirId: data.entregaARendirId,
      responsableId: data.responsableId,
      fechaMovimiento: data.fechaMovimiento,
      tipoMovimientoId: data.tipoMovimientoId,
      productoId: data.productoId,
      monto: data.monto,
      descripcion: data.descripcion,
      creadoEn: data.creadoEn,
      actualizadoEn: new Date(),
      centroCostoId: data.centroCostoId,
      urlComprobanteMovimiento: data.urlComprobanteMovimiento,
      validadoTesoreria: data.validadoTesoreria,
      fechaValidacionTesoreria: data.fechaValidacionTesoreria,
      operacionSinFactura: data.operacionSinFactura,
      fechaOperacionMovCaja: data.fechaOperacionMovCaja,
      operacionMovCajaId: data.operacionMovCajaId,
      moduloOrigenMovCajaId: data.moduloOrigenMovCajaId,
      entidadComercialId: data.entidadComercialId,
      monedaId: data.monedaId,
      urlComprobanteOperacionMovCaja: data.urlComprobanteOperacionMovCaja,
      tipoDocumentoId: data.tipoDocumentoId,
      numeroSerieComprobante: data.numeroSerieComprobante,
      numeroCorrelativoComprobante: data.numeroCorrelativoComprobante,
      formaParteCalculoLiquidacionTripulantes:
        data.formaParteCalculoLiquidacionTripulantes,
      formaParteCalculoEntregaARendir: data.formaParteCalculoEntregaARendir,
      formaParteCalculoLiqAlquilerCuota: data.formaParteCalculoLiqAlquilerCuota,
      detalleGastosPlanificados: data.detalleGastosPlanificados,
      asignacionOrigenId: data.asignacionOrigenId,
      entregaARendirLiquidada: data.entregaARendirLiquidada, // ← AGREGAR
      fechaLiquidacionEntregaARendir: data.fechaLiquidacionEntregaARendir, // ← AGREGAR
      urlLiquidacionEntregaARendir: data.urlLiquidacionEntregaARendir, // ← AGREGAR
      enlaceAOtroDetalleGastoId: data.enlaceAOtroDetalleGastoId,
      embarcacionId: data.embarcacionId,
    };

    // Convertir asignacionOrigenId=0 a null para Prisma (0 es solo indicador lógico, no FK)
    if (datosActualizacion.asignacionOrigenId === 0) {
      datosActualizacion.asignacionOrigenId = null;
    }

    return await prisma.detMovsEntregaRendir.update({
      where: { id },
      data: datosActualizacion,
    });
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
    const existente = await prisma.detMovsEntregaRendir.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("DetMovsEntregaRendir no encontrado");
    await prisma.detMovsEntregaRendir.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerConGastosAsociados = async (id) => {
  try {
    const mov = await prisma.detMovsEntregaRendir.findUnique({
      where: { id },
      include: {
        tipoMovimiento: {
          include: {
            categoria: true,
          },
        },
        entidadComercial: true,
        moneda: true,
        producto: true,
        tipoDocumento: true,
        embarcacion: {
          include: {
            activo: true, // ⭐ AGREGAR ESTO
          },
        },
        entregaARendir: {
          include: {
            temporadaPesca: {
              include: {
                empresa: true,
              },
            },
          },
        },
        gastosAsociados: {
          include: {
            tipoMovimiento: {
              include: {
                categoria: true,
              },
            },
            moneda: true,
            producto: true,
            embarcacion: {
              include: {
                activo: true, // ⭐ AGREGAR ESTO
              },
            },
            gastosPlanificados: {
              // ⭐ AGREGAR
              include: {
                producto: true,
                moneda: true,
              },
            },
          },
        },
        gastosPlanificados: {
          // ⭐ AGREGAR
          include: {
            producto: true,
            moneda: true,
          },
        },
      },
    });

    if (!mov) throw new NotFoundError("DetMovsEntregaRendir no encontrado");

    // Obtener responsable manualmente
    const responsable = await prisma.personal.findUnique({
      where: { id: mov.responsableId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        numeroDocumento: true,
      },
    });

    // Obtener centro de costo manualmente
    const centroCosto = await prisma.centroCosto.findUnique({
      where: { id: mov.centroCostoId },
      select: {
        id: true,
        Nombre: true,
        Codigo: true,
      },
    });

    // Agregar datos al objeto
    mov.responsable = responsable;
    mov.centroCosto = centroCosto;

    return mov;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtener el label formateado de un enlace a otro detalle de gasto
 */
const obtenerLabelEnlace = async (enlaceId) => {
  try {
    if (!enlaceId) return null;

    // Buscar en todas las tablas de entregas a rendir
    const [
      pescaIndustrial,
      pescaConsumo,
      ventas,
      compras,
      movAlmacen,
      contratos,
      otMantenimiento,
    ] = await Promise.all([
      prisma.entregaARendir.findUnique({
        where: { id: BigInt(enlaceId) },
        select: {
          temporadaPesca: {
            select: {
              nombre: true,
              empresa: { select: { razonSocial: true } },
            },
          },
        },
      }),
      prisma.entregaARendirPescaConsumo.findUnique({
        where: { id: BigInt(enlaceId) },
        select: {
          novedadPescaConsumo: {
            select: {
              nombre: true,
              empresa: { select: { razonSocial: true } },
            },
          },
        },
      }),
      prisma.entregaARendirPVentas.findUnique({
        where: { id: BigInt(enlaceId) },
        select: {
          cotizacionVentas: {
            select: {
              numeroDocumento: true,
              fechaDocumento: true,
              cliente: { select: { razonSocial: true } },
              empresa: { select: { razonSocial: true } },
            },
          },
        },
      }),
      prisma.entregaARendirPCompras.findUnique({
        where: { id: BigInt(enlaceId) },
        select: {
          requerimientoCompra: {
            select: {
              numeroDocumento: true,
              fechaDocumento: true,
              proveedor: { select: { razonSocial: true } },
              empresa: { select: { razonSocial: true } },
            },
          },
        },
      }),
      prisma.entregaARendirMovAlmacen.findUnique({
        where: { id: BigInt(enlaceId) },
        select: {
          movimientoAlmacen: {
            select: {
              numeroDocumento: true,
              fechaDocumento: true,
              entidadComercial: { select: { razonSocial: true } },
              empresa: { select: { razonSocial: true } },
            },
          },
        },
      }),
      prisma.entregaARendirContratoServicios.findUnique({
        where: { id: BigInt(enlaceId) },
        select: {
          contratoServicio: {
            select: {
              numeroCompleto: true,
              fechaCelebracion: true,
              cliente: { select: { razonSocial: true } },
              empresa: { select: { razonSocial: true } },
            },
          },
        },
      }),
      prisma.entregaARendirOTMantenimiento.findUnique({
        where: { id: BigInt(enlaceId) },
        select: {
          otMantenimiento: {
            select: {
              numeroCompleto: true,
              fechaDocumento: true,
              descripcionProblema: true,
              empresa: { select: { razonSocial: true } },
            },
          },
        },
      }),
    ]);

    const formatearFecha = (fecha) => {
      if (!fecha) return "";
      return new Date(fecha).toLocaleDateString("es-PE");
    };

    if (pescaIndustrial) {
      return `${pescaIndustrial.temporadaPesca?.empresa?.razonSocial || "Sin empresa"} - Temporada Pesca - ${pescaIndustrial.temporadaPesca?.nombre || "Sin nombre"}`;
    }
    if (pescaConsumo) {
      return `${pescaConsumo.novedadPescaConsumo?.empresa?.razonSocial || "Sin empresa"} - Novedad Pesca Consumo - ${pescaConsumo.novedadPescaConsumo?.nombre || "Sin nombre"}`;
    }
    if (ventas) {
      return `${ventas.cotizacionVentas?.empresa?.razonSocial || "Sin empresa"} - Cotización Ventas - ${ventas.cotizacionVentas?.numeroDocumento || "S/N"} | ${formatearFecha(ventas.cotizacionVentas?.fechaDocumento)} | ${ventas.cotizacionVentas?.cliente?.razonSocial || "Sin cliente"}`;
    }
    if (compras) {
      return `${compras.requerimientoCompra?.empresa?.razonSocial || "Sin empresa"} - Requerimiento Compra - ${compras.requerimientoCompra?.numeroDocumento || "S/N"} | ${formatearFecha(compras.requerimientoCompra?.fechaDocumento)} | ${compras.requerimientoCompra?.proveedor?.razonSocial || "Sin proveedor"}`;
    }
    if (movAlmacen) {
      return `${movAlmacen.movimientoAlmacen?.empresa?.razonSocial || "Sin empresa"} - Movimiento Almacén - ${movAlmacen.movimientoAlmacen?.numeroDocumento || "S/N"} | ${formatearFecha(movAlmacen.movimientoAlmacen?.fechaDocumento)} | ${movAlmacen.movimientoAlmacen?.entidadComercial?.razonSocial || "Sin entidad"}`;
    }
    if (contratos) {
      return `${contratos.contratoServicio?.empresa?.razonSocial || "Sin empresa"} - Contrato Servicio - ${contratos.contratoServicio?.numeroCompleto || "S/N"} | ${formatearFecha(contratos.contratoServicio?.fechaCelebracion)} | ${contratos.contratoServicio?.cliente?.razonSocial || "Sin cliente"}`;
    }
    if (otMantenimiento) {
      return `${otMantenimiento.otMantenimiento?.empresa?.razonSocial || "Sin empresa"} - OT Mantenimiento - ${otMantenimiento.otMantenimiento?.numeroCompleto || "S/N"} | ${formatearFecha(otMantenimiento.otMantenimiento?.fechaDocumento)} | ${otMantenimiento.otMantenimiento?.descripcionProblema || "Sin descripción"}`;
    }

    return null;
  } catch (err) {
    console.error("Error al obtener label de enlace:", err);
    return null;
  }
};

const obtenerTodasAsignacionesNoLiquidadas = async () => {
  try {
    // Obtener ENTREGAS A RENDIR de todos los módulos que NO estén liquidadas
    const [
      pescaIndustrial,
      pescaConsumo,
      ventas,
      compras,
      movAlmacen,
      contratos,
      otMantenimiento,
    ] = await Promise.all([
      // 1. Pesca Industrial
      prisma.entregaARendir.findMany({
        where: {
          entregaLiquidada: false,
        },
        select: {
          id: true,
          temporadaPesca: {
            select: {
              nombre: true,
              empresa: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
      }),
      // 2. Pesca Consumo
      prisma.entregaARendirPescaConsumo.findMany({
        where: {
          entregaLiquidada: false,
        },
        select: {
          id: true,
          novedadPescaConsumo: {
            select: {
              nombre: true,
              empresa: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
      }),
      // 3. Ventas
      prisma.entregaARendirPVentas.findMany({
        where: {
          entregaLiquidada: false,
        },
        select: {
          id: true,
          cotizacionVentas: {
            select: {
              numeroDocumento: true,
              fechaDocumento: true,
              cliente: {
                select: {
                  razonSocial: true,
                },
              },
              empresa: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
      }),
      // 4. Compras
      prisma.entregaARendirPCompras.findMany({
        where: {
          entregaLiquidada: false,
        },
        select: {
          id: true,
          requerimientoCompra: {
            select: {
              numeroDocumento: true,
              fechaDocumento: true,
              proveedor: {
                select: {
                  razonSocial: true,
                },
              },
              empresa: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
      }),
      // 5. Movimiento Almacén
      prisma.entregaARendirMovAlmacen.findMany({
        where: {
          entregaLiquidada: false,
        },
        select: {
          id: true,
          movimientoAlmacen: {
            select: {
              numeroDocumento: true,
              fechaDocumento: true,
              entidadComercial: {
                select: {
                  razonSocial: true,
                },
              },
              empresa: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
      }),
      // 6. Contratos
      prisma.entregaARendirContratoServicios.findMany({
        where: {
          entregaLiquidada: false,
        },
        select: {
          id: true,
          contratoServicio: {
            select: {
              numeroCompleto: true,
              fechaCelebracion: true,
              cliente: {
                select: {
                  razonSocial: true,
                },
              },
              empresa: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
      }),
      // 7. OT Mantenimiento
      prisma.entregaARendirOTMantenimiento.findMany({
        where: {
          entregaLiquidada: false,
        },
        select: {
          id: true,
          otMantenimiento: {
            select: {
              numeroCompleto: true,
              fechaDocumento: true,
              descripcionProblema: true,
              empresa: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
      }),
    ]);
    // Formatear y unificar resultados
    const formatearFecha = (fecha) => {
      if (!fecha) return "";
      return new Date(fecha).toLocaleDateString("es-PE");
    };

    const asignacionesFormateadas = [
      ...pescaIndustrial.map((a) => ({
        id: Number(a.id),
        modulo: "PESCA_INDUSTRIAL",
        label: `${a.temporadaPesca?.empresa?.razonSocial || "Sin empresa"} - Temporada Pesca - ${a.temporadaPesca?.nombre || "Sin nombre"}`,
      })),
      ...pescaConsumo.map((a) => ({
        id: Number(a.id),
        modulo: "PESCA_CONSUMO",
        label: `${a.novedadPescaConsumo?.empresa?.razonSocial || "Sin empresa"} - Novedad Pesca Consumo - ${a.novedadPescaConsumo?.nombre || "Sin nombre"}`,
      })),
      ...ventas.map((a) => ({
        id: Number(a.id),
        modulo: "VENTAS",
        label: `${a.cotizacionVentas?.empresa?.razonSocial || "Sin empresa"} - Cotización Ventas - ${a.cotizacionVentas?.numeroDocumento || "S/N"} | ${formatearFecha(a.cotizacionVentas?.fechaDocumento)} | ${a.cotizacionVentas?.cliente?.razonSocial || "Sin cliente"}`,
      })),
      ...compras.map((a) => ({
        id: Number(a.id),
        modulo: "COMPRAS",
        label: `${a.requerimientoCompra?.empresa?.razonSocial || "Sin empresa"} - Requerimiento Compra - ${a.requerimientoCompra?.numeroDocumento || "S/N"} | ${formatearFecha(a.requerimientoCompra?.fechaDocumento)} | ${a.requerimientoCompra?.proveedor?.razonSocial || "Sin proveedor"}`,
      })),
      ...movAlmacen.map((a) => ({
        id: Number(a.id),
        modulo: "MOV_ALMACEN",
        label: `${a.movimientoAlmacen?.empresa?.razonSocial || "Sin empresa"} - Movimiento Almacén - ${a.movimientoAlmacen?.numeroDocumento || "S/N"} | ${formatearFecha(a.movimientoAlmacen?.fechaDocumento)} | ${a.movimientoAlmacen?.entidadComercial?.razonSocial || "Sin entidad"}`,
      })),
      ...contratos.map((a) => ({
        id: Number(a.id),
        modulo: "CONTRATOS",
        label: `${a.contratoServicio?.empresa?.razonSocial || "Sin empresa"} - Contrato Servicio - ${a.contratoServicio?.numeroCompleto || "S/N"} | ${formatearFecha(a.contratoServicio?.fechaCelebracion)} | ${a.contratoServicio?.cliente?.razonSocial || "Sin cliente"}`,
      })),
      ...otMantenimiento.map((a) => ({
        id: Number(a.id),
        modulo: "OT_MANTENIMIENTO",
        label: `${a.otMantenimiento?.empresa?.razonSocial || "Sin empresa"} - OT Mantenimiento - ${a.otMantenimiento?.numeroCompleto || "S/N"} | ${formatearFecha(a.otMantenimiento?.fechaDocumento)} | ${a.otMantenimiento?.descripcionProblema || "Sin descripción"}`,
      })),
    ];

    // Ordenar alfabéticamente por módulo y luego por label
    return asignacionesFormateadas.sort((a, b) => {
      if (a.modulo !== b.modulo) {
        return a.modulo.localeCompare(b.modulo);
      }
      return a.label.localeCompare(b.label);
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerValoresIniciales = async (moduloOrigen, entregaARendirId) => {
  try {
    const resultado = {
      enlaceAOtroDetalleGastoId: Number(entregaARendirId),
      embarcacionId: null,
    };

    // Solo para PESCA_INDUSTRIAL y PESCA_CONSUMO se calcula embarcacionId
    if (moduloOrigen === "PESCA_INDUSTRIAL") {
      // Obtener la EntregaARendir para sacar el temporadaPescaId
      const entrega = await prisma.entregaARendir.findUnique({
        where: { id: BigInt(entregaARendirId) },
        select: { temporadaPescaId: true },
      });

      if (!entrega) {
        throw new NotFoundError("EntregaARendir no encontrada");
      }

      // Buscar la faena más reciente de esa temporada
      const faenaMasReciente = await prisma.faenaPesca.findFirst({
        where: { temporadaId: entrega.temporadaPescaId },
        orderBy: { fechaSalida: "desc" },
        select: { embarcacionId: true },
      });

      if (faenaMasReciente && faenaMasReciente.embarcacionId) {
        resultado.embarcacionId = Number(faenaMasReciente.embarcacionId);
      }
    } else if (moduloOrigen === "PESCA_CONSUMO") {
      // Obtener la EntregaARendirPescaConsumo para sacar el novedadPescaConsumoId
      const entrega = await prisma.entregaARendirPescaConsumo.findUnique({
        where: { id: BigInt(entregaARendirId) },
        select: { novedadPescaConsumoId: true },
      });

      if (!entrega) {
        throw new NotFoundError("EntregaARendirPescaConsumo no encontrada");
      }

      // Buscar la faena más reciente de esa novedad
      const faenaMasReciente = await prisma.faenaPescaConsumo.findFirst({
        where: { novedadPescaConsumoId: entrega.novedadPescaConsumoId },
        orderBy: { fechaSalida: "desc" },
        select: { embarcacionId: true },
      });

      if (faenaMasReciente && faenaMasReciente.embarcacionId) {
        resultado.embarcacionId = Number(faenaMasReciente.embarcacionId);
      }
    }

    return resultado;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerConGastosAsociados,
  obtenerLabelEnlace,
  obtenerTodasAsignacionesNoLiquidadas,
  obtenerValoresIniciales,
};
