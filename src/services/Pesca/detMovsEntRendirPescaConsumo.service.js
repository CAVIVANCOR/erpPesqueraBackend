import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para DetMovsEntRendirPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const validaciones = [
    prisma.entregaARendirPescaConsumo.findUnique({
      where: { id: data.entregaARendirPescaConsumoId },
    }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({
      where: { id: data.tipoMovimientoId },
    }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }),
  ];

  // Agregar validación de EntidadComercial si se proporciona entidadComercialId
  if (data.entidadComercialId) {
    validaciones.push(
      prisma.entidadComercial.findUnique({
        where: { id: data.entidadComercialId },
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

    const [
    entrega,
    responsable,
    tipoMovimiento,
    centroCosto,
    moduloSistema,
    entidadComercial,
  ] = await Promise.all(validaciones);

  if (!entrega)
    throw new ValidationError("El entregaARendirPescaConsumoId no existe.");
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
    return await prisma.detMovsEntRendirPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detMovsEntRendirPescaConsumo.findUnique({
      where: { id: BigInt(id) },
    });
    if (!det)
      throw new NotFoundError("DetMovsEntRendirPescaConsumo no encontrado");
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

async function crear(data) {
   try {
    const obligatorios = [
      "entregaARendirPescaConsumoId",
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
    if (
      data.tipoMovimientoId !== 1 &&
      data.tipoMovimientoId !== 2 &&
      data.formaParteCalculoEntregaARendir === true &&
      (!data.asignacionOrigenId || data.asignacionOrigenId === null)
    ) {
      throw new ValidationError(
        "Debe especificar una asignación origen cuando el movimiento forma parte del cálculo de entrega a rendir.",
      );
    }

    await validarClavesForaneas(data);
    return await prisma.detMovsEntRendirPescaConsumo.create({ data });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    if (error.code && error.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", error.message);
    throw error;
  }
}

async function actualizar(id, data) {
  try {
    const existente = await prisma.detMovsEntRendirPescaConsumo.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existente)
      throw new NotFoundError("DetMovsEntRendirPescaConsumo no encontrado");

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
      (!asignacionOrigen || asignacionOrigen === null)
    ) {
      throw new ValidationError(
        "Debe especificar una asignación origen cuando el movimiento forma parte del cálculo de entrega a rendir.",
      );
    }

    // Validar claves foráneas si cambian
    const claves = [
      "entregaARendirPescaConsumoId",
      "responsableId",
      "tipoMovimientoId",
      "centroCostoId",
      "moduloOrigenMovCajaId",
      "entidadComercialId",
      "monedaId",
      "tipoDocumentoId",
    ];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Preparar datos con SOLO campos escalares permitidos
    const datosActualizacion = {
      entregaARendirPescaConsumoId: data.entregaARendirPescaConsumoId,
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
      detalleGastosPlanificados: data.detalleGastosPlanificados,
      asignacionOrigenId: data.asignacionOrigenId,
    };

    return await prisma.detMovsEntRendirPescaConsumo.update({
      where: { id: BigInt(id) },
      data: datosActualizacion,
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
}

const eliminar = async (id) => {
  try {
    const existente = await prisma.detMovsEntRendirPescaConsumo.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existente)
      throw new NotFoundError("DetMovsEntRendirPescaConsumo no encontrado");
    await prisma.detMovsEntRendirPescaConsumo.delete({
      where: { id: BigInt(id) },
    });
    return true;
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
};
