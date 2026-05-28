import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para DesembolsoPrestamo
 * Gestiona los desembolsos de préstamos bancarios.
 * Documentado en español.
 */

/**
 * Valida los datos de un desembolso de préstamo.
 * @param {Object} data - Datos del desembolso
 */
async function validarDesembolsoPrestamo(data) {
  // Validar préstamo
  if (data.prestamoBancarioId) {
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id: data.prestamoBancarioId },
    });
    if (!prestamo) {
      throw new ValidationError("El préstamo bancario referenciado no existe.");
    }
  }

  // Validar movimiento de caja
  if (data.movimientoCajaId) {
    const movimiento = await prisma.movimientoCaja.findUnique({
      where: { id: data.movimientoCajaId },
    });
    if (!movimiento) {
      throw new ValidationError(
        "El movimiento de caja referenciado no existe.",
      );
    }
  }

  // Validar que el monto sea positivo
  if (data.monto && data.monto <= 0) {
    throw new ValidationError("El monto del desembolso debe ser mayor a cero.");
  }
}

/**
 * Actualiza el monto desembolsado del préstamo.
 * @param {BigInt} prestamoBancarioId - ID del préstamo
 */
async function actualizarMontoDesembolsado(prestamoBancarioId) {
  const desembolsos = await prisma.desembolsoPrestamo.findMany({
    where: { prestamoBancarioId },
  });

  const totalDesembolsado = desembolsos.reduce(
    (sum, d) => sum + parseFloat(d.monto),
    0,
  );

  await prisma.prestamoBancario.update({
    where: { id: prestamoBancarioId },
    data: { montoDesembolsado: totalDesembolsado },
  });
}

/**
 * Lista todos los desembolsos de préstamo.
 */
const listar = async () => {
  try {
    return await prisma.desembolsoPrestamo.findMany({
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          },
        },
        movimientoCaja: true,
        asientosContables: {
          // ✅ AGREGAR
          include: {
            detalles: {
              include: {
                planCuenta: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
        personalCreador: true,
      },
      orderBy: { fechaDesembolso: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un desembolso de préstamo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const desembolso = await prisma.desembolsoPrestamo.findUnique({
      where: { id },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          },
        },
        movimientoCaja: true,
        asientosContables: {
          // ✅ AGREGAR
          include: {
            detalles: {
              include: {
                planCuenta: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
        personalCreador: true,
      },
    });
    if (!desembolso)
      throw new NotFoundError("Desembolso de préstamo no encontrado");
    return desembolso;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo desembolso de préstamo.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (
      !data.prestamoBancarioId ||
      !data.numeroDesembolso ||
      !data.fechaDesembolso ||
      data.monto === null ||
      data.monto === undefined ||
      !data.movimientoCajaId
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios para crear el desembolso.",
      );
    }

    await validarDesembolsoPrestamo(data);

    // Verificar que no exista otro desembolso con el mismo número para este préstamo
    const existente = await prisma.desembolsoPrestamo.findFirst({
      where: {
        prestamoBancarioId: data.prestamoBancarioId,
        numeroDesembolso: data.numeroDesembolso,
      },
    });

    if (existente) {
      throw new ConflictError(
        "Ya existe un desembolso con este número para el préstamo.",
      );
    }

    // Validar que el monto no exceda el monto aprobado
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id: data.prestamoBancarioId },
    });

    const desembolsosExistentes = await prisma.desembolsoPrestamo.findMany({
      where: { prestamoBancarioId: data.prestamoBancarioId },
    });

    const totalDesembolsado = desembolsosExistentes.reduce(
      (sum, d) => sum + parseFloat(d.monto),
      0,
    );

    if (
      totalDesembolsado + parseFloat(data.monto) >
      parseFloat(prestamo.montoAprobado)
    ) {
      throw new ValidationError(
        "El monto total desembolsado excedería el monto aprobado del préstamo.",
      );
    }

    // Crear desembolso en una transacción
    const desembolso = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.desembolsoPrestamo.create({
        data,
        include: {
          prestamo: true,
          movimientoCaja: true,
          personalCreador: true,
        },
      });

      // Actualizar monto desembolsado del préstamo
      await tx.prestamoBancario.update({
        where: { id: data.prestamoBancarioId },
        data: {
          montoDesembolsado: totalDesembolsado + parseFloat(data.monto),
          saldoCapital: totalDesembolsado + parseFloat(data.monto),
        },
      });

      return nuevo;
    });

    return desembolso;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un desembolso de préstamo existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.desembolsoPrestamo.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("Desembolso de préstamo no encontrado");

    await validarDesembolsoPrestamo({ ...data, id });

    // Si se cambia el monto, validar que no exceda el monto aprobado
    if (data.monto && data.monto !== existente.monto) {
      const prestamo = await prisma.prestamoBancario.findUnique({
        where: { id: existente.prestamoBancarioId },
      });

      const desembolsosExistentes = await prisma.desembolsoPrestamo.findMany({
        where: {
          prestamoBancarioId: existente.prestamoBancarioId,
          id: { not: id },
        },
      });

      const totalDesembolsado = desembolsosExistentes.reduce(
        (sum, d) => sum + parseFloat(d.monto),
        0,
      );

      if (
        totalDesembolsado + parseFloat(data.monto) >
        parseFloat(prestamo.montoAprobado)
      ) {
        throw new ValidationError(
          "El monto total desembolsado excedería el monto aprobado del préstamo.",
        );
      }
    }

    // Actualizar desembolso en una transacción
    const desembolso = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.desembolsoPrestamo.update({
        where: { id },
        data,
        include: {
          prestamo: true,
          movimientoCaja: true,
          asientosContables: {
            // ✅ AGREGAR
            include: {
              detalles: {
                include: {
                  planCuenta: true,
                },
                orderBy: { numeroLinea: "asc" },
              },
            },
            orderBy: { fechaAsiento: "desc" },
          },
          personalCreador: true,
        },
      });

      // Recalcular monto desembolsado del préstamo
      await actualizarMontoDesembolsado(existente.prestamoBancarioId);

      return actualizado;
    });

    return desembolso;
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
 * Elimina un desembolso de préstamo por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.desembolsoPrestamo.findUnique({
      where: { id },
      include: { prestamo: true },
    });

    if (!existente)
      throw new NotFoundError("Desembolso de préstamo no encontrado");

    // Validar que no sea el único desembolso si el préstamo tiene cuotas
    const cuotas = await prisma.cuotaPrestamo.count({
      where: { prestamoBancarioId: existente.prestamoBancarioId },
    });

    if (cuotas > 0) {
      const desembolsos = await prisma.desembolsoPrestamo.count({
        where: { prestamoBancarioId: existente.prestamoBancarioId },
      });

      if (desembolsos === 1) {
        throw new ConflictError(
          "No se puede eliminar el único desembolso de un préstamo con cuotas generadas.",
        );
      }
    }

    // Eliminar desembolso en una transacción
    await prisma.$transaction(async (tx) => {
      await tx.desembolsoPrestamo.delete({ where: { id } });

      // Recalcular monto desembolsado del préstamo
      await actualizarMontoDesembolsado(existente.prestamoBancarioId);
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista desembolsos por préstamo.
 */
const listarPorPrestamo = async (prestamoBancarioId) => {
  try {
    return await prisma.desembolsoPrestamo.findMany({
      where: { prestamoBancarioId },
      include: {
        movimientoCaja: true,
        asientosContables: {
          // ✅ AGREGAR
          include: {
            detalles: {
              include: {
                planCuenta: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
        personalCreador: true,
      },
      orderBy: { numeroDesembolso: "asc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene el total desembolsado de un préstamo.
 */
const obtenerTotalDesembolsado = async (prestamoBancarioId) => {
  try {
    const desembolsos = await prisma.desembolsoPrestamo.findMany({
      where: { prestamoBancarioId },
    });

    const total = desembolsos.reduce((sum, d) => sum + parseFloat(d.monto), 0);

    return { total, cantidad: desembolsos.length };
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorPrestamo,
  obtenerTotalDesembolsado,
};
