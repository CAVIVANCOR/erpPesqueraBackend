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
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({
      where: { id: data.tipoMovimientoId },
    }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }),
  ];

  // Agregar validación de Empresa si se proporciona empresaId
  if (data.empresaId) {
    validaciones.push(
      prisma.empresa.findUnique({
        where: { id: data.empresaId },
      }),
    );
  }

  // Agregar validación de ModuloSistema si se proporciona moduloOrigenId
  if (data.moduloOrigenId) {
    validaciones.push(
      prisma.moduloSistema.findUnique({
        where: { id: data.moduloOrigenId },
      }),
    );
  }

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
    responsable,
    tipoMovimiento,
    centroCosto,
    empresa,
    moduloSistema,
    moduloSistemaMovCaja,
    entidadComercial,
  ] = await Promise.all(validaciones);

  if (!responsable) throw new ValidationError("El responsableId no existe.");
  if (!tipoMovimiento)
    throw new ValidationError("El tipoMovimientoId no existe.");
  if (!centroCosto) throw new ValidationError("El centroCostoId no existe.");
  if (data.empresaId && !empresa)
    throw new ValidationError("El empresaId no existe.");
  if (data.moduloOrigenId && !moduloSistema)
    throw new ValidationError("El moduloOrigenId no existe.");
  if (data.moduloOrigenMovCajaId && !moduloSistemaMovCaja)
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
        empresa: true,
        moduloOrigen: true,
        enlaceGastoPlanificado: {
          include: {
            producto: true,
            moneda: true,
          },
        },
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
        empresa: true,
        moduloOrigen: true,
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

const crear = async (data, usuarioId = null) => {
  try {
    const obligatorios = [
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

    // Asignar defaults si no vienen
    data.empresaId = data.empresaId || 1; // MEGUI
    data.moduloOrigenId = data.moduloOrigenId || 2; // Pesca Industrial
    data.documentoOrigenId = data.documentoOrigenId || 37; // Temporada actual

    // Campos de auditoría
    if (usuarioId) {
      data.creadoPorId = usuarioId;
      data.actualizadoPorId = usuarioId;
    }

    // Obtener el tipo de movimiento para validar si es asignación
    const tipoMovimiento = await prisma.tipoMovEntregaRendir.findUnique({
      where: { id: BigInt(data.tipoMovimientoId) },
      select: { categoriaId: true },
    });

    const esAsignacion = tipoMovimiento?.categoriaId === 17; // GASTOS A RENDIR

    // Validación de regla de negocio: Asignaciones deben tener formaParteCalculoEntregaARendir=true
    if (esAsignacion) {
      data.formaParteCalculoEntregaARendir = true;
    }

    // Validación: Si NO es asignación Y formaParteCalculoEntregaARendir=true → asignacionOrigenId es obligatorio
    if (
      !esAsignacion &&
      data.formaParteCalculoEntregaARendir === true &&
      (data.asignacionOrigenId === null ||
        data.asignacionOrigenId === undefined)
    ) {
      throw new ValidationError(
        "Debe especificar una asignación origen cuando el movimiento forma parte del cálculo de entrega a rendir.",
      );
    }

    await validarClavesForaneas(data);

    // Si es asignación principal, calcular saldo inicial automáticamente
    if (
      esAsignacion &&
      data.formaParteCalculoEntregaARendir === true &&
      (data.asignacionOrigenId === null || data.asignacionOrigenId === 0)
    ) {
      const saldoInicial = await obtenerSaldoInicialAsignacion(
        data.empresaId,
        data.moduloOrigenId,
        data.documentoOrigenId,
        data.responsableId,
        data.fechaMovimiento,
      );
      data.saldoInicialAsignacion = saldoInicial;
      data.saldoFinalAsignacion = null; // Se calculará al liquidar
    } else {
      // Para gastos asociados y gastos directos, los saldos son null
      data.saldoInicialAsignacion = null;
      data.saldoFinalAsignacion = null;
    }

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
        tipoMovimiento: {
          select: { categoriaId: true },
        },
      },
    });
    if (!existente)
      throw new NotFoundError("DetMovsEntregaRendir no encontrado");

    // Campos de auditoría
    if (usuarioId) {
      data.actualizadoPorId = usuarioId;
    }

    // Determinar si el tipo de movimiento final es una asignación
    let esAsignacion = existente.tipoMovimiento?.categoriaId === 17;

    // Si se está cambiando el tipo de movimiento, verificar el nuevo tipo
    if (
      data.tipoMovimientoId &&
      data.tipoMovimientoId !== existente.tipoMovimientoId
    ) {
      const nuevoTipoMovimiento = await prisma.tipoMovEntregaRendir.findUnique({
        where: { id: BigInt(data.tipoMovimientoId) },
        select: { categoriaId: true },
      });
      esAsignacion = nuevoTipoMovimiento?.categoriaId === 17;
    }

    // Validación de regla de negocio: Asignaciones deben tener formaParteCalculoEntregaARendir=true
    if (esAsignacion) {
      data.formaParteCalculoEntregaARendir = true;
    }

    const formaParteCalculo =
      data.formaParteCalculoEntregaARendir !== undefined
        ? data.formaParteCalculoEntregaARendir
        : existente.formaParteCalculoEntregaARendir;
    const asignacionOrigen =
      data.asignacionOrigenId !== undefined
        ? data.asignacionOrigenId
        : existente.asignacionOrigenId;

    // Validación: Si NO es asignación Y formaParteCalculo=true
    if (
      !esAsignacion &&
      formaParteCalculo === true &&
      (asignacionOrigen === null || asignacionOrigen === undefined)
    ) {
      throw new ValidationError(
        "Debe especificar una asignación origen cuando el movimiento forma parte del cálculo de entrega a rendir.",
      );
    }

    // Validar claves foráneas si cambian
    const claves = [
      "responsableId",
      "tipoMovimientoId",
      "centroCostoId",
      "empresaId",
      "moduloOrigenId",
      "moduloOrigenMovCajaId",
      "entidadComercialId",
      "monedaId",
    ];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Preparar datos con SOLO campos escalares permitidos
    const datosActualizacion = {
      responsableId: data.responsableId,
      fechaMovimiento: data.fechaMovimiento,
      tipoMovimientoId: data.tipoMovimientoId,
      productoId: data.productoId,
      monto: data.monto,
      descripcion: data.descripcion,
      creadoEn: data.creadoEn,
      actualizadoEn: new Date(),
      centroCostoId: data.centroCostoId,
      empresaId: data.empresaId,
      moduloOrigenId: data.moduloOrigenId,
      documentoOrigenId: data.documentoOrigenId,
      creadoPorId: data.creadoPorId,
      actualizadoPorId: data.actualizadoPorId,
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
      entregaARendirLiquidada: data.entregaARendirLiquidada,
      fechaLiquidacionEntregaARendir: data.fechaLiquidacionEntregaARendir,
      urlLiquidacionEntregaARendir: data.urlLiquidacionEntregaARendir,
      enlaceAOtroDetalleGastoId: data.enlaceAOtroDetalleGastoId,
      embarcacionId: data.embarcacionId,
      saldoInicialAsignacion: data.saldoInicialAsignacion,
      saldoFinalAsignacion: data.saldoFinalAsignacion,
      enlaceGastosPlanificadosId: data.enlaceGastosPlanificadosId,
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
        empresa: true,
        moduloOrigen: true,
        embarcacion: {
          include: {
            activo: true,
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
            tipoDocumento: true,
            embarcacion: {
              include: {
                activo: true,
              },
            },
            gastosPlanificados: {
              include: {
                producto: true,
                moneda: true,
              },
            },
          },
        },
        gastosPlanificados: {
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
      pescaConsumo,
      ventas,
      compras,
      movAlmacen,
      contratos,
      otMantenimiento,
    ] = await Promise.all([
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
      pescaConsumo,
      ventas,
      compras,
      movAlmacen,
      contratos,
      otMantenimiento,
    ] = await Promise.all([
      // Pesca Consumo
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
      // Ventas
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
      // Compras
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
      // Movimiento Almacén
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
      // Contratos
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
      // OT Mantenimiento
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

    // Solo para PESCA_CONSUMO se calcula embarcacionId
    if (moduloOrigen === "PESCA_CONSUMO") {
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

/**
 * Buscar la última asignación liquidada del mismo contexto
 * para obtener el saldo inicial de una nueva asignación
 */
const obtenerSaldoInicialAsignacion = async (
  empresaId,
  moduloOrigenId,
  documentoOrigenId,
  responsableId,
  fechaMovimiento,
) => {
  try {
    // Buscar la última asignación liquidada del mismo responsable
    // SIN filtrar por documentoOrigenId para arrastrar saldo entre temporadas
    const ultimaAsignacionLiquidada =
      await prisma.detMovsEntregaRendir.findFirst({
        where: {
          responsableId: BigInt(responsableId),
          asignacionOrigenId: null,
          formaParteCalculoEntregaARendir: true,
          entregaARendirLiquidada: true,
          tipoMovimiento: {
            categoriaId: 17,
          },
          fechaMovimiento: {
            lt: new Date(fechaMovimiento),
          },
        },
        orderBy: [{ fechaMovimiento: "desc" }, { id: "desc" }],
        select: {
          id: true,
          saldoFinalAsignacion: true,
        },
      });

    // Si existe una asignación anterior liquidada, retornar su saldo final
    if (
      ultimaAsignacionLiquidada &&
      ultimaAsignacionLiquidada.saldoFinalAsignacion !== null
    ) {
      return Number(ultimaAsignacionLiquidada.saldoFinalAsignacion);
    }

    // Si no hay asignación anterior, el saldo inicial es 0
    return 0;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Calcular el saldo final de una asignación al liquidarla
 * Fórmula: Saldo Final = Saldo Inicial + Asignación - Gastos + Devoluciones
 */
const calcularSaldoFinalAsignacion = async (asignacionId) => {
  try {
    // Obtener la asignación con sus gastos asociados
    const asignacion = await prisma.detMovsEntregaRendir.findUnique({
      where: { id: BigInt(asignacionId) },
      include: {
        gastosAsociados: {
          where: {
            formaParteCalculoEntregaARendir: true, // Solo gastos que forman parte del cálculo
          },
          select: {
            monto: true,
            tipoMovimientoId: true, // Necesario para identificar devoluciones
          },
        },
      },
    });

    if (!asignacion) {
      throw new NotFoundError("Asignación no encontrada");
    }

    // Validar que sea una asignación principal
    if (asignacion.asignacionOrigenId !== null) {
      throw new ValidationError(
        "Solo se puede calcular saldo de asignaciones principales",
      );
    }

    // Separar gastos y devoluciones
    let totalGastos = 0;
    let totalDevoluciones = 0;

    asignacion.gastosAsociados.forEach((movimiento) => {
      const monto = Number(movimiento.monto);

      // tipoMovimientoId = 28 es "Devolución a Rendir"
      if (Number(movimiento.tipoMovimientoId) === 28) {
        totalDevoluciones += monto;
      } else {
        totalGastos += monto;
      }
    });

    // Calcular saldo final
    // Fórmula: Saldo Final = Saldo Inicial + Asignación - Gastos + Devoluciones
    const saldoInicial = Number(asignacion.saldoInicialAsignacion || 0);
    const montoAsignacion = Number(asignacion.monto);
    const saldoFinal =
      saldoInicial + montoAsignacion - totalGastos + totalDevoluciones;

    return saldoFinal;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Liquidar una asignación (marcarla como liquidada y calcular saldo final)
 */
const liquidarAsignacion = async (
  asignacionId,
  usuarioId = null,
  permitirRegeneracion = false,
  urlLiquidacionPdf = null,
) => {
  try {
    // Validar que la asignación existe y es principal
    const asignacion = await prisma.detMovsEntregaRendir.findUnique({
      where: { id: BigInt(asignacionId) },
      select: {
        id: true,
        asignacionOrigenId: true,
        formaParteCalculoEntregaARendir: true,
        entregaARendirLiquidada: true,
      },
    });

    if (!asignacion) {
      throw new NotFoundError("Asignación no encontrada");
    }

    if (asignacion.asignacionOrigenId !== null) {
      throw new ValidationError(
        "Solo se pueden liquidar asignaciones principales",
      );
    }

    if (!asignacion.formaParteCalculoEntregaARendir) {
      throw new ValidationError(
        "La asignación no forma parte del cálculo de entrega a rendir",
      );
    }

    // ========================================
    // ✅ VALIDAR REGENERACIÓN SI YA ESTÁ LIQUIDADA
    // ========================================
    if (asignacion.entregaARendirLiquidada) {
      if (!permitirRegeneracion) {
        throw new ValidationError("La asignación ya está liquidada");
      }

      // ========================================
      // ✅ VERIFICAR PERMISO puedeReactivarDocs
      // ========================================
      if (!usuarioId) {
        throw new ValidationError(
          "Usuario no autenticado para regenerar liquidaciones",
        );
      }

      // Buscar el submódulo de rendicionGastos
      const submodulo = await prisma.submoduloSistema.findFirst({
        where: {
          ruta: "rendicionGastos",
          activo: true,
        },
        select: { id: true, nombre: true },
      });

      if (!submodulo) {
        throw new ValidationError(
          "Submódulo de Rendición de Gastos no encontrado",
        );
      }

      // Verificar si el usuario es superusuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { esSuperUsuario: true },
      });

      let tienePermiso = false;

      if (usuario?.esSuperUsuario) {
        tienePermiso = true;
      } else {
        // Buscar acceso del usuario al submódulo
        const acceso = await prisma.accesosUsuario.findFirst({
          where: {
            usuarioId,
            submoduloId: submodulo.id,
            activo: true,
          },
          select: {
            puedeReactivarDocs: true,
          },
        });

        if (!acceso) {
          throw new ValidationError(
            `No tiene acceso al módulo '${submodulo.nombre}'`,
          );
        }

        tienePermiso = acceso.puedeReactivarDocs;
      }

      if (!tienePermiso) {
        throw new ValidationError(
          'No tiene permiso para regenerar liquidaciones. Se requiere el permiso "Reactivar Documentos".',
        );
      }
    }

    // ========================================
    // ✅ OBTENER DATOS DE LA ASIGNACIÓN ACTUAL
    // ========================================
    const asignacionActual = await prisma.detMovsEntregaRendir.findUnique({
      where: { id: BigInt(asignacionId) },
      select: {
        empresaId: true,
        moduloOrigenId: true,
        documentoOrigenId: true,
        responsableId: true,
        fechaMovimiento: true,
      },
    });

    if (!asignacionActual) {
      throw new NotFoundError("Asignación no encontrada para obtener datos");
    }

    // ========================================
    // ✅ RECALCULAR SALDO INICIAL (SIEMPRE)
    // ========================================
    // Esto garantiza que si se liquidó otra asignación anterior después,
    // el saldo inicial se actualice correctamente
    const saldoInicialRecalculado = await obtenerSaldoInicialAsignacion(
      asignacionActual.empresaId,
      asignacionActual.moduloOrigenId,
      asignacionActual.documentoOrigenId,
      asignacionActual.responsableId,
      asignacionActual.fechaMovimiento,
    );

    // ========================================
    // ✅ ACTUALIZAR SALDO INICIAL EN BD PRIMERO
    // ========================================
    // Esto es crítico para que calcularSaldoFinalAsignacion use el valor correcto
    await prisma.detMovsEntregaRendir.update({
      where: { id: BigInt(asignacionId) },
      data: {
        saldoInicialAsignacion: saldoInicialRecalculado,
      },
    });

    // ========================================
    // ✅ CALCULAR SALDO FINAL (DESPUÉS DE ACTUALIZAR SALDO INICIAL)
    // ========================================
    const saldoFinal = await calcularSaldoFinalAsignacion(asignacionId);

    // ========================================
    // ✅ ACTUALIZAR LA ASIGNACIÓN CON TODOS LOS CAMPOS
    // ========================================
    const dataActualizacion = {
      entregaARendirLiquidada: true,
      fechaLiquidacionEntregaARendir: new Date(),
      saldoInicialAsignacion: saldoInicialRecalculado,
      saldoFinalAsignacion: saldoFinal,
      actualizadoEn: new Date(),
    };

    if (usuarioId) {
      dataActualizacion.actualizadoPorId = usuarioId;
    }

    if (urlLiquidacionPdf) {
      dataActualizacion.urlLiquidacionEntregaARendir = urlLiquidacionPdf;
    }

    const asignacionActualizada = await prisma.detMovsEntregaRendir.update({
      where: { id: BigInt(asignacionId) },
      data: dataActualizacion,
    });

    return asignacionActualizada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
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
  obtenerSaldoInicialAsignacion,
  calcularSaldoFinalAsignacion,
  liquidarAsignacion,
};
