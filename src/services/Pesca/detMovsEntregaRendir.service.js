import prisma from '../../config/prismaClient.js';
import {
  ESTADO_ORDEN_COMPRA,
  ESTADO_CUENTA_POR_PAGAR,
  ESTADO_ASIENTO_CONTABLE,
} from '../../utils/estados.constants.js';
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import { puedeEditarRegistroCerrado } from "../../utils/checkSuperUsuario.js";
import { validarTipoCambio } from '../../utils/tipoCambio.util.js';

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
    const movimientos = await prisma.detMovsEntregaRendir.findMany({
      include: {
        tipoMovimiento: {
          include: {
            categoria: true,
          },
        },
        responsable: true,
        entidadComercial: true,
        centroCosto: {
          include: {
            categoria: true,
          }
        },
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

    return movimientos;
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
      where: { id: Number(data.tipoMovimientoId) },
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

    const movimientoCreado = await prisma.detMovsEntregaRendir.create({ data });

    // Recalcular saldos automáticamente si forma parte del cálculo
    if (data.formaParteCalculoEntregaARendir === true && data.responsableId) {
      await recalcularSaldosAutomatico(data.responsableId);
    }

    return movimientoCreado;
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
        where: { id: Number(data.tipoMovimientoId) },
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
    // IMPORTANTE: Solo validar si se está modificando explícitamente asignacionOrigenId
    // Si solo se actualizan saldos, NO validar
    const estaModificandoAsignacionOrigen = data.hasOwnProperty('asignacionOrigenId') &&
      data.asignacionOrigenId !== existente.asignacionOrigenId;

    if (
      !esAsignacion &&
      formaParteCalculo === true &&
      estaModificandoAsignacionOrigen &&
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
    const movimientoActualizado = await prisma.detMovsEntregaRendir.update({
      where: { id },
      data: datosActualizacion,
    });

    // Recalcular saldos automáticamente si forma parte del cálculo
    const responsableId = movimientoActualizado.responsableId || existente.responsableId;
    const formaParteFinal = movimientoActualizado.formaParteCalculoEntregaARendir ?? existente.formaParteCalculoEntregaARendir;

    if (formaParteFinal === true && responsableId) {
      await recalcularSaldosAutomatico(responsableId);
    }

    return movimientoActualizado;
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

    // Guardar datos antes de eliminar
    const responsableId = existente.responsableId;
    const formaParteCalculo = existente.formaParteCalculoEntregaARendir;

    await prisma.detMovsEntregaRendir.delete({ where: { id } });

    // Recalcular saldos automáticamente si formaba parte del cálculo
    if (formaParteCalculo === true && responsableId) {
      await recalcularSaldosAutomatico(responsableId);
    }

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
        where: { id: Number(enlaceId) },
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
        where: { id: Number(enlaceId) },
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
        where: { id: Number(enlaceId) },
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
        where: { id: Number(enlaceId) },
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
        where: { id: Number(enlaceId) },
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
        where: { id: Number(enlaceId) },
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
        where: { id: Number(entregaARendirId) },
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
          responsableId: Number(responsableId),
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
      where: { id: Number(asignacionId) },
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
 * Recalcular saldos de todos los movimientos de un responsable
 * Usa la misma lógica que el frontend: Asignación → Gastos/Devoluciones (jerarquía)
 * CRÍTICO: Esta función debe mantener exactamente la misma lógica que calcularSaldosDetallados del frontend
 */
const recalcularSaldosResponsable = async (responsableId) => {
  try {
    // ========================================
    // PASO 1: Obtener todos los movimientos del responsable
    // ========================================
    const movimientos = await prisma.detMovsEntregaRendir.findMany({
      where: {
        responsableId: Number(responsableId),
        formaParteCalculoEntregaARendir: true,
      },
      include: {
        tipoMovimiento: {
          select: {
            categoriaId: true,
          },
        },
      },
      orderBy: [
        { fechaMovimiento: 'asc' },
        { id: 'asc' },
      ],
    });

    // ========================================
    // PASO 2: Separar asignaciones de gastos/devoluciones
    // ========================================
    const asignaciones = movimientos.filter(
      (mov) =>
        mov.asignacionOrigenId === null &&
        mov.tipoMovimiento?.categoriaId === 17 // Categoría "GASTOS A RENDIR"
    );

    // ========================================
    // PASO 3: Procesar cada asignación con sus movimientos
    // ========================================
    let SaldoInicial = 0;
    let SaldoFinal = 0;

    for (const asignacion of asignaciones) {
      const asignacionId = Number(asignacion.id);

      // ========================================
      // PASO 3.1: Calcular saldos de la asignación
      // ========================================
      SaldoFinal = SaldoInicial + Number(asignacion.monto || 0);

      // Actualizar asignación en BD
      await prisma.detMovsEntregaRendir.update({
        where: { id: Number(asignacionId) },
        data: {
          saldoInicialAsignacion: SaldoInicial,
          saldoFinalAsignacion: SaldoFinal,
        },
      });

      // Actualizar SaldoInicial para los movimientos de esta asignación
      SaldoInicial = SaldoFinal;

      // ========================================
      // PASO 3.2: Obtener gastos y devoluciones de esta asignación
      // ========================================
      const movimientosAsignacion = movimientos.filter(
        (mov) => Number(mov.asignacionOrigenId) === asignacionId
      );

      // Ordenar por fecha
      movimientosAsignacion.sort((a, b) => {
        const fechaA = new Date(a.fechaMovimiento);
        const fechaB = new Date(b.fechaMovimiento);
        if (fechaA.getTime() !== fechaB.getTime()) {
          return fechaA - fechaB;
        }
        return Number(a.id) - Number(b.id);
      });

      // ========================================
      // PASO 3.3: Procesar cada gasto o devolución
      // ========================================
      for (const movimiento of movimientosAsignacion) {
        const movimientoId = Number(movimiento.id);
        const esDevolucion = Number(movimiento.tipoMovimientoId) === 28;

        // Calcular saldos según tipo de movimiento
        if (esDevolucion) {
          // DEVOLUCIÓN: SUMA al saldo
          SaldoFinal = SaldoInicial + Number(movimiento.monto || 0);
        } else {
          // GASTO: RESTA del saldo
          SaldoFinal = SaldoInicial - Number(movimiento.monto || 0);
        }

        // Actualizar movimiento en BD
        await prisma.detMovsEntregaRendir.update({
          where: { id: Number(movimientoId) },
          data: {
            saldoInicialAsignacion: SaldoInicial,
            saldoFinalAsignacion: SaldoFinal,
          },
        });

        // Actualizar SaldoInicial para el siguiente
        SaldoInicial = SaldoFinal;
      }
    }

    return true;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};


/**
 * Recalcular saldos de un responsable automáticamente
 * Se ejecuta después de crear/editar/eliminar movimientos
 */
const recalcularSaldosAutomatico = async (responsableId) => {
  try {
    // Obtener todos los movimientos del responsable que forman parte del cálculo
    const movimientos = await prisma.detMovsEntregaRendir.findMany({
      where: {
        responsableId: Number(responsableId),
        formaParteCalculoEntregaARendir: true,
      },
      orderBy: [
        { fechaMovimiento: 'asc' },
        { id: 'asc' }
      ],
    });

    if (movimientos.length === 0) return;

    // Separar asignaciones y gastos/devoluciones
    const asignaciones = movimientos.filter(
      m => m.asignacionOrigenId === null || Number(m.asignacionOrigenId) === 0
    );

    let SaldoInicial = 0;
    let SaldoFinal = 0;

    // Procesar cada asignación con sus gastos
    for (const asignacion of asignaciones) {
      const asignacionId = Number(asignacion.id);

      // Calcular saldos de la asignación
      SaldoFinal = SaldoInicial + Number(asignacion.monto || 0);

      await prisma.detMovsEntregaRendir.update({
        where: { id: Number(asignacionId) },
        data: {
          saldoInicialAsignacion: SaldoInicial,
          saldoFinalAsignacion: SaldoFinal,
        },
      });

      SaldoInicial = SaldoFinal;

      // Obtener gastos/devoluciones de esta asignación
      const gastosAsignacion = movimientos.filter(
        m => Number(m.asignacionOrigenId) === asignacionId
      );

      // Procesar cada gasto/devolución
      for (const gasto of gastosAsignacion) {
        const esDevolucion = Number(gasto.tipoMovimientoId) === 28;

        if (esDevolucion) {
          SaldoFinal = SaldoInicial + Number(gasto.monto || 0);
        } else {
          SaldoFinal = SaldoInicial - Number(gasto.monto || 0);
        }

        await prisma.detMovsEntregaRendir.update({
          where: { id: Number(gasto.id) },
          data: {
            saldoInicialAsignacion: SaldoInicial,
            saldoFinalAsignacion: SaldoFinal,
          },
        });

        SaldoInicial = SaldoFinal;
      }
    }
  } catch (error) {
    console.error('Error en recalcularSaldosAutomatico:', error);
    // No lanzar error para no bloquear la operación principal
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
      where: { id: Number(asignacionId) },
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
      where: { id: Number(asignacionId) },
      select: {
        responsableId: true,
      },
    });

    if (!asignacionActual) {
      throw new NotFoundError("Asignación no encontrada para obtener datos");
    }

    // ========================================
    // ✅ RECALCULAR TODOS LOS SALDOS DEL RESPONSABLE
    // ========================================
    // CRÍTICO: Usar la misma lógica que el frontend (Asignación → Gastos/Devoluciones)
    // Esto garantiza que los saldos sean exactamente iguales en frontend y backend
    await recalcularSaldosResponsable(asignacionActual.responsableId);

    // ========================================
    // ✅ OBTENER SALDOS RECALCULADOS DE LA ASIGNACIÓN
    // ========================================
    const asignacionRecalculada = await prisma.detMovsEntregaRendir.findUnique({
      where: { id: Number(asignacionId) },
      select: {
        saldoInicialAsignacion: true,
        saldoFinalAsignacion: true,
      },
    });

    const saldoInicialRecalculado = Number(asignacionRecalculada.saldoInicialAsignacion || 0);
    const saldoFinalRecalculado = Number(asignacionRecalculada.saldoFinalAsignacion || 0);

    // ========================================
    // ✅ ACTUALIZAR LA ASIGNACIÓN CON TODOS LOS CAMPOS
    // ========================================
    const dataActualizacion = {
      entregaARendirLiquidada: true,
      fechaLiquidacionEntregaARendir: new Date(),
      saldoInicialAsignacion: saldoInicialRecalculado,
      saldoFinalAsignacion: saldoFinalRecalculado,
      actualizadoEn: new Date(),
    };

    if (usuarioId) {
      dataActualizacion.actualizadoPorId = usuarioId;
    }

    if (urlLiquidacionPdf) {
      dataActualizacion.urlLiquidacionEntregaARendir = urlLiquidacionPdf;
    }

    const asignacionActualizada = await prisma.detMovsEntregaRendir.update({
      where: { id: Number(asignacionId) },
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



const asignarCentroCostoMasivo = async (centroCostoId, movimientosIds) => {
  try {
    const resultado = await prisma.detMovsEntregaRendir.updateMany({
      where: {
        id: {
          in: movimientosIds.map(id => Number(id))
        }
      },
      data: {
        centroCostoId: Number(centroCostoId)
      }
    });

    return {
      success: true,
      count: resultado.count,
      message: `${resultado.count} movimientos actualizados correctamente`
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};


/**
 * Generar documentos financieros automáticamente desde DetMovsEntregaRendir
 * Genera: OrdenCompra → CuentaPorPagar → Pago → 2 Asientos Contables
 */
async function generarDocumentosFinancieros(detMovId) {
  const detMov = await prisma.detMovsEntregaRendir.findUnique({
    where: { id: Number(detMovId) },
    include: {
      asignacionOrigen: true,
      responsable: true,
      entidadComercial: true,
      tipoDocumento: true,
      producto: true,
      centroCosto: true,
      moneda: true,
      empresa: true,
    },
  });

  if (!detMov) {
    throw new NotFoundError('Movimiento de entrega a rendir no encontrado');
  }

  // Determinar si es operación gerencial (sin factura)
  const esGerencial = detMov.operacionSinFactura === true;

  if (!detMov.entidadComercialId) {
    throw new ValidationError('Debe especificar un proveedor');
  }

  // Solo validar comprobante si NO es operación sin factura
  if (!esGerencial) {
    if (!detMov.tipoDocumentoId) {
      throw new ValidationError('Debe especificar el tipo de comprobante');
    }

    if (!detMov.numeroSerieComprobante || !detMov.numeroCorrelativoComprobante) {
      throw new ValidationError('Debe ingresar serie y correlativo del comprobante');
    }
  }

  if (!detMov.monto || detMov.monto <= 0) {
    throw new ValidationError('El monto debe ser mayor a cero');
  }

  if (!detMov.productoId) {
    throw new ValidationError('Debe especificar un producto/servicio');
  }

  if (!detMov.centroCostoId) {
    throw new ValidationError('Debe especificar un centro de costo');
  }

  // Obtener porcentajes de impuestos de la empresa
  const empresa = await prisma.empresa.findUnique({
    where: { id: detMov.empresaId },
    select: {
      porcentajeIgv: true,
      porcentajeImpuestoRenta: true,
    },
  });

  if (!empresa) {
    throw new NotFoundError('Empresa no encontrada');
  }

  const porcentajeIGV = Number(empresa.porcentajeIgv || 18);
  const porcentajeRenta = Number(empresa.porcentajeImpuestoRenta || 8);

  // Determinar si es Recibo por Honorarios (ajustar ID según tu BD)
  const esReciboHonorarios = Number(detMov.tipoDocumentoId) === 12;

  // El monto del gasto YA INCLUYE impuestos, debemos desagregar
  const montoTotal = Number(detMov.monto);
  let subtotal;
  let igv;
  let total;
  let porcentajeIGVAplicado;

  if (esGerencial) {
    // Sin factura: monto es neto (exonerado, sin impuestos)
    subtotal = montoTotal;
    igv = 0;
    total = montoTotal;
    porcentajeIGVAplicado = 0;
  } else if (esReciboHonorarios) {
    // Recibo por Honorarios: desagregar retención de renta, sin IGV
    subtotal = montoTotal / (1 + porcentajeRenta / 100);
    igv = 0; // Honorarios no tienen IGV
    total = montoTotal;
    porcentajeIGVAplicado = 0;
  } else {
    // Con factura: desagregar IGV del monto total
    subtotal = montoTotal / (1 + porcentajeIGV / 100);
    igv = montoTotal - subtotal;
    total = montoTotal;
    porcentajeIGVAplicado = porcentajeIGV;
  }

  const submodulo = await prisma.submoduloSistema.findFirst({
    where: { ruta: 'rendicionGastos' },
  });

  if (!submodulo) {
    throw new NotFoundError('Submódulo con ruta "rendicionGastos" no encontrado');
  }


  // Obtener cuentas contables para asientos
  const producto = await prisma.producto.findUnique({
    where: { id: detMov.productoId },
    select: { cuentaComprasId: true },
  });

  if (!producto || !producto.cuentaComprasId) {
    throw new ValidationError('El producto no tiene cuenta de compras asignada');
  }

  const centroCosto = await prisma.centroCosto.findUnique({
    where: { id: detMov.centroCostoId },
    select: { cuentaContableId: true },
  });

  if (!centroCosto || !centroCosto.cuentaContableId) {
    throw new ValidationError('El centro de costo no tiene cuenta contable asignada');
  }

  // Determinar cuentas según moneda (siguiendo patrón de ordenCompra.service.js)
  const codigoCuentaEntregasRendir = Number(detMov.monedaId) === 1 ? "141301" : "141302";
  const codigoCuentaFacturasPorPagar = Number(detMov.monedaId) === 1 ? "421201" : "421202";

  // Obtener cuentas contables desde PlanCuentasContable
  const cuentaEntregasRendir = await prisma.planCuentasContable.findFirst({
    where: {
      codigoCuenta: codigoCuentaEntregasRendir,
      activo: true,
    },
  });

  if (!cuentaEntregasRendir) {
    throw new NotFoundError(`Cuenta contable ${codigoCuentaEntregasRendir} no encontrada`);
  }

  const cuentaFacturasPorPagar = await prisma.planCuentasContable.findFirst({
    where: {
      codigoCuenta: codigoCuentaFacturasPorPagar,
      activo: true,
    },
  });

  if (!cuentaFacturasPorPagar) {
    throw new NotFoundError(`Cuenta contable ${codigoCuentaFacturasPorPagar} no encontrada`);
  }

  const cuentaIGV = await prisma.planCuentasContable.findFirst({
    where: {
      codigoCuenta: { startsWith: "40111" },
      activo: true,
    },
  });

  if (!cuentaIGV) {
    throw new NotFoundError('Cuenta contable IGV (40111x) no encontrada');
  }

  const cuenta791101 = await prisma.planCuentasContable.findFirst({
    where: {
      codigoCuenta: "791101",
      activo: true,
    },
  });

  if (!cuenta791101) {
    throw new NotFoundError('Cuenta contable 791101 (Cargas Imputables) no encontrada');
  }

  // Determinar tipo de documento para la Orden de Compra
  let tipoDocumentoIdOC;
  if (esGerencial) {
    tipoDocumentoIdOC = Number(17); // Orden de Compra para gastos sin factura
  } else if (detMov.tipoDocumentoId) {
    tipoDocumentoIdOC = detMov.tipoDocumentoId;
  } else {
    tipoDocumentoIdOC = Number(17); // Default: Orden de Compra
  }
  // Buscar tipos de libro contable SUNAT
  const tipoLibroDiario = await prisma.tipoLibroContableSunat.findFirst({
    where: { codigoSunat: '05', activo: true },
  });

  const tipoLibroCompras = await prisma.tipoLibroContableSunat.findFirst({
    where: { codigoSunat: '08', activo: true },
  });

  if (!tipoLibroDiario || !tipoLibroCompras) {
    throw new NotFoundError('Tipos de libro contable SUNAT no encontrados');
  }
  console.log("tipoDocumentoIdOC", tipoDocumentoIdOC)
  console.log("empresaId", detMov.empresaId)
  // Buscar serie "002" para el tipo de documento y empresa
  const serieDoc = await prisma.serieDoc.findFirst({
    where: {
      tipoDocumentoId: tipoDocumentoIdOC,
      serie: '002',
      activo: true,
      empresaId: detMov.empresaId,  // ← AGREGAR FILTRO POR EMPRESA
    },
  });
  console.log("serieDoc", serieDoc)

  if (!serieDoc) {
    throw new NotFoundError(`Serie "002" no encontrada para tipo documento ${tipoDocumentoIdOC} y empresa ${detMov.empresaId}`);
  }

  const [estadoOCAprobado, estadoCxPPendiente, estadoCxPPagado, estadoAsientoPendiente] = await Promise.all([
    prisma.estadoMultiFuncion.findFirst({ where: { id: ESTADO_ORDEN_COMPRA.APROBADO } }),
    prisma.estadoMultiFuncion.findFirst({ where: { id: ESTADO_CUENTA_POR_PAGAR.PENDIENTE } }),
    prisma.estadoMultiFuncion.findFirst({ where: { id: ESTADO_CUENTA_POR_PAGAR.PAGADO } }),
    prisma.estadoMultiFuncion.findFirst({ where: { id: ESTADO_ASIENTO_CONTABLE.PENDIENTE } }),
  ]);

  const medioPagoEfectivo = await prisma.medioPago.findFirst({ where: { id: Number(1) } });
  if (!medioPagoEfectivo) {
    throw new NotFoundError('Medio de pago "Efectivo" no encontrado');
  }

  const periodoActual = await prisma.periodoContable.findFirst({
    where: {
      empresaId: detMov.empresaId,
      fechaInicio: { lte: detMov.fechaMovimiento },
      fechaFin: { gte: detMov.fechaMovimiento },
    },
  });

  const resultado = await prisma.$transaction(async (tx) => {
    // ═══════════════════════════════════════════════════════
    // FASE 1: BUSCAR Y ELIMINAR DOCUMENTOS EXISTENTES
    // ═══════════════════════════════════════════════════════

    const ordenCompraExistente = await tx.ordenCompra.findFirst({
      where: {
        submoduloOrigenId: submodulo.id,
        procesoOrigenId: Number(detMovId),
      },
    });

    if (ordenCompraExistente) {
      const cuentaPorPagarExistente = await tx.cuentaPorPagar.findFirst({
        where: { ordenCompraId: ordenCompraExistente.id },
      });

      const pagoExistente = cuentaPorPagarExistente
        ? await tx.pagoCuentaPorPagar.findFirst({
          where: { cuentaPorPagarId: cuentaPorPagarExistente.id },
        })
        : null;

      const asientosExistentes = await tx.asientoContable.findMany({
        where: {
          submoduloOrigenId: submodulo.id,
          OR: [
            { procesoOrigenId: Number(detMovId) },
            ...(pagoExistente ? [{ procesoOrigenId: pagoExistente.id }] : []),
          ],
        },
      });

      // Eliminar en orden inverso (cascada)
      for (const asiento of asientosExistentes) {
        await tx.detalleAsientoContable.deleteMany({
          where: { asientoContableId: asiento.id },
        });
      }

      if (asientosExistentes.length > 0) {
        await tx.asientoContable.deleteMany({
          where: { id: { in: asientosExistentes.map(a => a.id) } },
        });
      }

      if (pagoExistente) {
        await tx.pagoCuentaPorPagar.delete({
          where: { id: pagoExistente.id },
        });
      }

      if (cuentaPorPagarExistente) {
        await tx.cuentaPorPagar.delete({
          where: { id: cuentaPorPagarExistente.id },
        });
      }

      await tx.detalleOrdenCompra.deleteMany({
        where: { ordenCompraId: ordenCompraExistente.id },
      });

      await tx.ordenCompra.delete({
        where: { id: ordenCompraExistente.id },
      });
    }

    // ═══════════════════════════════════════════════════════
    // FASE 2: CREAR ORDEN DE COMPRA
    // ═══════════════════════════════════════════════════════

    // Obtener tipo de cambio
    const tipoCambioFinal = await validarTipoCambio(
      null,
      detMov.fechaMovimiento
    );

    // Generar correlativo para la Orden de Compra
    const nuevoCorrelativoOC = Number(serieDoc.correlativo) + 1;
    const numCorreDocFormateado = String(nuevoCorrelativoOC).padStart(serieDoc.numCerosIzqCorre || 6, '0');
    const numeroDocumentoOC = `${serieDoc.serie}-${numCorreDocFormateado}`;

    // Actualizar correlativo de la serie
    await tx.serieDoc.update({
      where: { id: serieDoc.id },
      data: { correlativo: nuevoCorrelativoOC },
    });

    const ordenCompra = await tx.ordenCompra.create({
      data: {
        empresaId: detMov.empresaId,
        tipoDocumentoId: tipoDocumentoIdOC,
        serieDocId: serieDoc.id,
        numSerieDoc: serieDoc.serie,
        numCorreDoc: numCorreDocFormateado,
        numeroDocumento: numeroDocumentoOC,
        proveedorId: detMov.entidadComercialId,
        formaPagoId: 1,
        fechaDocumento: detMov.fechaMovimiento,
        fechaContable: detMov.fechaMovimiento,
        estadoId: estadoOCAprobado.id,
        monedaId: detMov.monedaId,
        tipoCambio: tipoCambioFinal,
        centroCostoId: detMov.centroCostoId,
        observaciones: esGerencial
          ? `GASTO GERENCIAL SIN FACTURA - RENDICIÓN DE GASTOS - MOV-${detMovId}`
          : detMov.descripcion || `GENERADO DESDE RENDICIÓN DE GASTOS - MOV-${detMovId}`,
        subtotal,
        totalIGV: igv,
        total,
        porcentajeIGV: esGerencial ? 0 : porcentajeIGVAplicado,
        esExoneradoAlIGV: esGerencial,
        tipoDocumentoFinalId: esGerencial ? tipoDocumentoIdOC : detMov.tipoDocumentoId,
        numSerieDocFinal: esGerencial ? serieDoc.serie : detMov.numeroSerieComprobante,
        numCorreDocFinal: esGerencial ? numCorreDocFormateado : detMov.numeroCorrelativoComprobante,
        numeroDocumentoFinal: esGerencial ? numeroDocumentoOC : `${detMov.numeroSerieComprobante}-${detMov.numeroCorrelativoComprobante}`,
        fechaFacturacion: detMov.fechaMovimiento,
        fechaVencimiento: detMov.fechaMovimiento,
        comprobanteRecibido: true,
        fechaRecepcionComprobante: detMov.fechaMovimiento,
        facturado: false,
        esGerencial: esGerencial,
        periodoContableId: periodoActual?.id,
        submoduloOrigenId: submodulo.id,
        procesoOrigenId: Number(detMovId),
      },
    });

    await tx.detalleOrdenCompra.create({
      data: {
        ordenCompraId: ordenCompra.id,
        productoId: detMov.productoId,
        cantidad: 1,
        precioUnitario: subtotal,
        subtotal,
        centroCostoId: detMov.centroCostoId,
        observaciones: detMov.descripcion,
        cantidadCompra: 1,
        precioUnitarioCompra: subtotal,
      },
    });

    const cuentaPorPagar = await tx.cuentaPorPagar.create({
      data: {
        ordenCompraId: ordenCompra.id,
        empresaId: ordenCompra.empresaId,
        proveedorId: ordenCompra.proveedorId,
        numeroOrdenCompra: ordenCompra.numeroDocumento,
        fechaEmision: ordenCompra.fechaDocumento,
        fechaVencimiento: ordenCompra.fechaDocumento,
        montoTotal: ordenCompra.total,
        montoPagado: 0,
        saldoPendiente: ordenCompra.total,
        monedaId: ordenCompra.monedaId,
        esContado: true,
        estadoId: estadoCxPPendiente.id,
        observaciones: ordenCompra.observaciones,
        fechaContable: ordenCompra.fechaContable,
        periodoContableId: ordenCompra.periodoContableId,
        esGerencial: ordenCompra.esGerencial,
      },
    });

    const pago = await tx.pagoCuentaPorPagar.create({
      data: {
        cuentaPorPagarId: cuentaPorPagar.id,
        empresaId: cuentaPorPagar.empresaId,
        fechaPago: cuentaPorPagar.fechaEmision,
        montoPagado: cuentaPorPagar.montoTotal,
        monedaPagoId: cuentaPorPagar.monedaId,
        monedaDeudaId: cuentaPorPagar.monedaId,
        tipoCambio: ordenCompra.tipoCambio,
        montoAplicadoDeuda: cuentaPorPagar.montoTotal,
        medioPagoId: medioPagoEfectivo.id,
        observaciones: `PAGO DESDE RENDICIÓN DE GASTOS - MOV-${detMovId}`,
        fechaContable: cuentaPorPagar.fechaContable,
        periodoContableId: cuentaPorPagar.periodoContableId,
        tieneDetraccion: false,
        montoDetraccion: 0,
        tieneRetencion: false,
        montoRetencion: 0,
        tienePercepcion: false,
        montoPercepcion: 0,
        creadoPor: Number(1),
      },
    });

    await tx.cuentaPorPagar.update({
      where: { id: cuentaPorPagar.id },
      data: {
        montoPagado: total,
        saldoPendiente: 0,
        estadoId: estadoCxPPagado.id,
      },
    });

    // ═══════════════════════════════════════════════════════
    // CREAR ASIENTOS CONTABLES
    // ═══════════════════════════════════════════════════════

    let asientoPago;

    if (esGerencial) {
      // SIN FACTURA: 1 Asiento con 4 líneas
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: {
          empresaId: detMov.empresaId,
          periodoContableId: periodoActual?.id,
        },
        orderBy: { correlativo: 'desc' },
      });

      const nuevoCorrelativo = ultimoAsiento ? ultimoAsiento.correlativo + 1 : 1;
      const numeroAsiento = `ASI-${new Date(detMov.fechaMovimiento).getFullYear()}-${String(nuevoCorrelativo).padStart(6, '0')}`;

      asientoPago = await tx.asientoContable.create({
        data: {
          empresaId: ordenCompra.empresaId,
          periodoContableId: ordenCompra.periodoContableId,
          numeroAsiento: numeroAsiento,
          correlativo: nuevoCorrelativo,
          tipoLibro: 'GERENCIAL',
          tipoLibroId: tipoLibroDiario.id,
          esGerencial: true,
          fechaAsiento: ordenCompra.fechaContable,
          glosa: `PAGO SIN FACTURA - ${detMov.descripcion || ''} - MOV-${detMovId}`,
          totalDebe: ordenCompra.total * 2,
          totalHaber: ordenCompra.total * 2,
          diferencia: 0,
          estaCuadrado: true,
          monedaId: ordenCompra.monedaId,
          tipoCambio: ordenCompra.tipoCambio,
          estadoId: estadoAsientoPendiente.id,
          origenAsiento: 'AUTOMATICO',
          submoduloOrigenId: ordenCompra.submoduloOrigenId,
          procesoOrigenId: Number(detMovId),
          ordenesCompra: {
            connect: { id: ordenCompra.id },
          },
        },
      });

      const esMonedaExtranjera = Number(ordenCompra.monedaId) !== 1;
      const totalPEN = esMonedaExtranjera ? ordenCompra.total * Number(ordenCompra.tipoCambio) : ordenCompra.total;
      const totalExtranjero = esMonedaExtranjera ? ordenCompra.total : null;

      await tx.detalleAsientoContable.createMany({
        data: [
          {
            asientoContableId: asientoPago.id,
            numeroLinea: 1,
            planCuentaId: producto.cuentaComprasId,
            debe: totalPEN,
            haber: 0,
            glosa: 'PAGO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: totalExtranjero,
            haberMonedaExtranjera: null,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
          {
            asientoContableId: asientoPago.id,
            numeroLinea: 2,
            planCuentaId: cuentaEntregasRendir.id,
            debe: 0,
            haber: totalPEN,
            glosa: 'PAGO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: null,
            haberMonedaExtranjera: totalExtranjero,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
          {
            asientoContableId: asientoPago.id,
            numeroLinea: 3,
            planCuentaId: centroCosto.cuentaContableId,
            debe: totalPEN,
            haber: 0,
            glosa: 'DESTINO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: totalExtranjero,
            haberMonedaExtranjera: null,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
          {
            asientoContableId: asientoPago.id,
            numeroLinea: 4,
            planCuentaId: cuenta791101.id,
            debe: 0,
            haber: totalPEN,
            glosa: 'DESTINO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: null,
            haberMonedaExtranjera: totalExtranjero,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
        ],
      });
    } else {
      // CON FACTURA: 3 Asientos

      // Asiento 1: Registro de Compra
      const ultimoAsiento1 = await tx.asientoContable.findFirst({
        where: {
          empresaId: detMov.empresaId,
          periodoContableId: periodoActual?.id,
        },
        orderBy: { correlativo: 'desc' },
      });

      const nuevoCorrelativo1 = ultimoAsiento1 ? ultimoAsiento1.correlativo + 1 : 1;
      const numeroAsiento1 = `ASI-${new Date(detMov.fechaMovimiento).getFullYear()}-${String(nuevoCorrelativo1).padStart(6, '0')}`;

      const asientoCompra = await tx.asientoContable.create({
        data: {
          empresaId: ordenCompra.empresaId,
          periodoContableId: ordenCompra.periodoContableId,
          numeroAsiento: numeroAsiento1,
          correlativo: nuevoCorrelativo1,
          tipoLibro: 'FISCAL',
          tipoLibroId: tipoLibroCompras.id,
          esGerencial: false,
          fechaAsiento: ordenCompra.fechaContable,
          glosa: `REGISTRO COMPRA - FACTURA ${detMov.numeroSerieComprobante}-${detMov.numeroCorrelativoComprobante}`,
          totalDebe: ordenCompra.total,
          totalHaber: ordenCompra.total,
          diferencia: 0,
          estaCuadrado: true,
          monedaId: ordenCompra.monedaId,
          tipoCambio: ordenCompra.tipoCambio,
          estadoId: estadoAsientoPendiente.id,
          origenAsiento: 'AUTOMATICO',
          submoduloOrigenId: ordenCompra.submoduloOrigenId,
          procesoOrigenId: Number(detMovId),
          ordenesCompra: {
            connect: { id: ordenCompra.id },
          },
        },
      });

      const esMonedaExtranjeraCompra = Number(ordenCompra.monedaId) !== 1;
      const subtotalPEN = esMonedaExtranjeraCompra ? subtotal * Number(ordenCompra.tipoCambio) : subtotal;
      const igvPEN = esMonedaExtranjeraCompra ? igv * Number(ordenCompra.tipoCambio) : igv;
      const totalPENCompra = esMonedaExtranjeraCompra ? ordenCompra.total * Number(ordenCompra.tipoCambio) : ordenCompra.total;
      const subtotalExtranjero = esMonedaExtranjeraCompra ? subtotal : null;
      const igvExtranjero = esMonedaExtranjeraCompra ? igv : null;
      const totalExtranjeraCompra = esMonedaExtranjeraCompra ? ordenCompra.total : null;

      await tx.detalleAsientoContable.createMany({
        data: [
          {
            asientoContableId: asientoCompra.id,
            numeroLinea: 1,
            planCuentaId: producto.cuentaComprasId,
            debe: subtotalPEN,
            haber: 0,
            glosa: 'R. COMPRA',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: subtotalExtranjero,
            haberMonedaExtranjera: null,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
          {
            asientoContableId: asientoCompra.id,
            numeroLinea: 2,
            planCuentaId: cuentaIGV.id,
            debe: igvPEN,
            haber: 0,
            glosa: 'R. COMPRA',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: igvExtranjero,
            haberMonedaExtranjera: null,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
          {
            asientoContableId: asientoCompra.id,
            numeroLinea: 3,
            planCuentaId: cuentaFacturasPorPagar.id,
            debe: 0,
            haber: totalPENCompra,
            glosa: 'R. COMPRA',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: null,
            haberMonedaExtranjera: totalExtranjeraCompra,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
        ],
      });

      // Asiento 2: Destino del Gasto
      const ultimoAsiento2 = await tx.asientoContable.findFirst({
        where: {
          empresaId: detMov.empresaId,
          periodoContableId: periodoActual?.id,
        },
        orderBy: { correlativo: 'desc' },
      });

      const nuevoCorrelativo2 = ultimoAsiento2 ? ultimoAsiento2.correlativo + 1 : 1;
      const numeroAsiento2 = `ASI-${new Date(detMov.fechaMovimiento).getFullYear()}-${String(nuevoCorrelativo2).padStart(6, '0')}`;

      const asientoDestino = await tx.asientoContable.create({
        data: {
          empresaId: ordenCompra.empresaId,
          periodoContableId: ordenCompra.periodoContableId,
          numeroAsiento: numeroAsiento2,
          correlativo: nuevoCorrelativo2,
          tipoLibro: 'FISCAL',
          tipoLibroId: tipoLibroDiario.id,
          esGerencial: false,
          fechaAsiento: ordenCompra.fechaContable,
          glosa: `DESTINO DE GASTOS - ${detMov.descripcion || ''}`,
          totalDebe: subtotalPEN,
          totalHaber: subtotalPEN,
          diferencia: 0,
          estaCuadrado: true,
          monedaId: ordenCompra.monedaId,
          tipoCambio: ordenCompra.tipoCambio,
          estadoId: estadoAsientoPendiente.id,
          origenAsiento: 'AUTOMATICO',
          submoduloOrigenId: ordenCompra.submoduloOrigenId,
          procesoOrigenId: Number(detMovId),
          ordenesCompra: {
            connect: { id: ordenCompra.id },
          },
        },
      });
      await tx.detalleAsientoContable.createMany({
        data: [
          {
            asientoContableId: asientoDestino.id,
            numeroLinea: 1,
            planCuentaId: centroCosto.cuentaContableId,
            debe: subtotalPEN,
            haber: 0,
            glosa: 'DESTINO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: subtotalExtranjero,
            haberMonedaExtranjera: null,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
          {
            asientoContableId: asientoDestino.id,
            numeroLinea: 2,
            planCuentaId: cuenta791101.id,
            debe: 0,
            haber: subtotalPEN,
            glosa: 'DESTINO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: null,
            haberMonedaExtranjera: subtotalExtranjero,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
        ],
      });

      // Asiento 3: Pago de Factura
      const ultimoAsiento3 = await tx.asientoContable.findFirst({
        where: {
          empresaId: detMov.empresaId,
          periodoContableId: periodoActual?.id,
        },
        orderBy: { correlativo: 'desc' },
      });

      const nuevoCorrelativo3 = ultimoAsiento3 ? ultimoAsiento3.correlativo + 1 : 1;
      const numeroAsiento3 = `ASI-${new Date(detMov.fechaMovimiento).getFullYear()}-${String(nuevoCorrelativo3).padStart(6, '0')}`;

      asientoPago = await tx.asientoContable.create({
        data: {
          empresaId: ordenCompra.empresaId,
          periodoContableId: ordenCompra.periodoContableId,
          numeroAsiento: numeroAsiento3,
          correlativo: nuevoCorrelativo3,
          tipoLibro: 'FISCAL',
          tipoLibroId: tipoLibroDiario.id,
          esGerencial: false,
          fechaAsiento: ordenCompra.fechaContable,
          glosa: `PAGO FACTURA ${detMov.numeroSerieComprobante}-${detMov.numeroCorrelativoComprobante}`,
          totalDebe: totalPENCompra,
          totalHaber: totalPENCompra,
          diferencia: 0,
          estaCuadrado: true,
          monedaId: ordenCompra.monedaId,
          tipoCambio: ordenCompra.tipoCambio,
          estadoId: estadoAsientoPendiente.id,
          origenAsiento: 'AUTOMATICO',
          submoduloOrigenId: ordenCompra.submoduloOrigenId,
          procesoOrigenId: Number(detMovId),
          ordenesCompra: {
            connect: { id: ordenCompra.id },
          },
        },
      });

      await tx.detalleAsientoContable.createMany({
        data: [
          {
            asientoContableId: asientoPago.id,
            numeroLinea: 1,
            planCuentaId: cuentaFacturasPorPagar.id,
            debe: totalPENCompra,
            haber: 0,
            glosa: 'PAGO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: totalExtranjeraCompra,
            haberMonedaExtranjera: null,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
          {
            asientoContableId: asientoPago.id,
            numeroLinea: 2,
            planCuentaId: cuentaEntregasRendir.id,
            debe: 0,
            haber: totalPENCompra,
            glosa: 'PAGO',
            monedaId: 1,
            tipoCambio: ordenCompra.tipoCambio,
            debeMonedaExtranjera: null,
            haberMonedaExtranjera: totalExtranjeraCompra,
            submoduloOrigenLineaId: ordenCompra.submoduloOrigenId,
            procesoOrigenLineaId: BigInt(detMovId),
          },
        ],
      });
    }

    await tx.detMovsEntregaRendir.update({
      where: { id: Number(detMovId) },
      data: {
        operacionMovCajaId: pago.id,
        fechaOperacionMovCaja: detMov.fechaMovimiento,
        moduloOrigenMovCajaId: 3,
      },
    });

    return {
      success: true,
      message: 'Documentos generados exitosamente',
      documentosGenerados: {
        ordenCompra: { id: ordenCompra.id, total: ordenCompra.total },
        cuentaPorPagar: { id: cuentaPorPagar.id, montoTotal: ordenCompra.total },
        pago: { id: pago.id, montoPago: ordenCompra.total },
        asientoPago: { id: asientoPago.id, totalDebe: ordenCompra.total * (esGerencial ? 2 : 1), totalHaber: ordenCompra.total * (esGerencial ? 2 : 1) },
      },
    };
  });

  return resultado;
}

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
  recalcularSaldosResponsable,
  recalcularSaldosAutomatico,
  liquidarAsignacion,
  asignarCentroCostoMasivo,
  generarDocumentosFinancieros
};
