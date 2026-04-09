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

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerConGastosAsociados,
};
