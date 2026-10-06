import prisma from "../../config/prismaClient.js";
import { NotFoundError, DatabaseError, ValidationError } from "../../utils/errors.js";
import cuotaPrestamoService from "./cuotaPrestamo.service.js";

/**
 * Servicio de consulta y mantenimiento de los pagos de cuotas de préstamo (PagoCuotaPrestamo).
 *
 * Los pagos se crean únicamente desde Caja y Bancos (operacionPrestamo.service.js), que genera
 * los movimientos, saldos y asientos. Aquí solo se listan, se corrigen y se eliminan; después de
 * cada cambio se recalculan desde los pagos los totales de la cuota, los saldos y el estado del
 * préstamo, con la misma función que usan el cron y el botón de la lista de préstamos.
 * Documentado en español.
 */

const INCLUDE_PAGO = {
  cuotaPrestamo: {
    include: {
      prestamo: {
        include: { empresa: true, banco: true, moneda: true, tipoPrestamo: true },
      },
    },
  },
  movimientoCaja: {
    include: { tipoMovimiento: true, moneda: true, medioPago: true },
  },
};

const aCentimos = (valor) => Math.round(Number(valor || 0) * 100);

const COMPONENTES = ["montoCapital", "montoInteres", "montoSeguro", "montoComision", "montoMora"];

/**
 * Lista los pagos de cuotas de préstamo, los más recientes primero. Con cuotaPrestamoId devuelve
 * solo los de esa cuota (detalle de pagos en la edición de la cuota).
 */
const listar = async ({ cuotaPrestamoId } = {}) => {
  try {
    return await prisma.pagoCuotaPrestamo.findMany({
      where: cuotaPrestamoId ? { cuotaPrestamoId } : undefined,
      include: INCLUDE_PAGO,
      orderBy: [{ fechaPago: "desc" }, { id: "desc" }],
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al listar pagos de cuotas", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un pago por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const pago = await prisma.pagoCuotaPrestamo.findUnique({ where: { id }, include: INCLUDE_PAGO });
    if (!pago) throw new NotFoundError("Pago de cuota de préstamo no encontrado");
    return pago;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al obtener el pago", err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un pago.
 *
 * Un pago generado desde Caja ya tiene movimientos, saldos y asientos: editar sus importes o su
 * fecha los dejaría descuadrados, por eso solo se permite actualizar las observaciones (los
 * adjuntos los maneja el sistema PDF). Un pago sin movimiento de Caja sí admite corregir importes
 * y fecha; en ese caso se recalculan la cuota y el préstamo.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.pagoCuotaPrestamo.findUnique({
      where: { id },
      include: { cuotaPrestamo: true },
    });
    if (!existente) throw new NotFoundError("Pago de cuota de préstamo no encontrado");

    if (existente.movimientoCajaId) {
      await prisma.pagoCuotaPrestamo.update({
        where: { id },
        data: {
          observaciones: data.observaciones ?? existente.observaciones,
          actualizadoPor: data.actualizadoPor || null,
        },
      });
      return await obtenerPorId(id);
    }

    const importes = {};
    for (const campo of COMPONENTES) {
      const valor = data[campo] !== undefined ? Number(data[campo]) : Number(existente[campo]);
      if (!Number.isFinite(valor) || valor < 0) {
        throw new ValidationError("Los importes del pago no pueden ser negativos.");
      }
      importes[campo] = valor;
    }
    const totalCent = COMPONENTES.reduce((suma, campo) => suma + aCentimos(importes[campo]), 0);
    if (totalCent <= 0) throw new ValidationError("El pago debe tener un importe mayor a cero.");

    // Lo aplicado a la cuota (sin mora) no puede superar su monto total
    const otrosPagos = await prisma.pagoCuotaPrestamo.findMany({
      where: { cuotaPrestamoId: existente.cuotaPrestamoId, id: { not: id } },
    });
    const aplicadoCent = (p) =>
      aCentimos(p.montoCapital) + aCentimos(p.montoInteres) + aCentimos(p.montoSeguro) + aCentimos(p.montoComision);
    const totalAplicadoCent =
      otrosPagos.reduce((suma, p) => suma + aplicadoCent(p), 0) + aplicadoCent(importes);
    if (totalAplicadoCent > aCentimos(existente.cuotaPrestamo.montoTotal)) {
      throw new ValidationError("Los pagos de la cuota no pueden superar su monto total.");
    }

    await prisma.pagoCuotaPrestamo.update({
      where: { id },
      data: {
        ...importes,
        montoTotal: totalCent / 100,
        fechaPago: data.fechaPago ? new Date(data.fechaPago) : existente.fechaPago,
        observaciones: data.observaciones ?? existente.observaciones,
        actualizadoPor: data.actualizadoPor || null,
      },
    });

    await cuotaPrestamoService.sincronizarEstados(existente.cuotaPrestamo.prestamoBancarioId);
    return await obtenerPorId(id);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al actualizar el pago", err.message);
    }
    throw err;
  }
};

/**
 * Elimina un pago y recalcula la cuota y el préstamo desde los pagos que quedan.
 *
 * Solo borra la fila del pago: NO revierte los movimientos de Caja ni los asientos que la
 * operación generó (la interfaz lo advierte). El derecho de eliminar se valida en la interfaz.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.pagoCuotaPrestamo.findUnique({
      where: { id },
      include: { cuotaPrestamo: { select: { prestamoBancarioId: true } } },
    });
    if (!existente) throw new NotFoundError("Pago de cuota de préstamo no encontrado");

    await prisma.pagoCuotaPrestamo.delete({ where: { id } });
    await cuotaPrestamoService.sincronizarEstados(existente.cuotaPrestamo.prestamoBancarioId);

    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al eliminar el pago", err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  actualizar,
  eliminar,
};
