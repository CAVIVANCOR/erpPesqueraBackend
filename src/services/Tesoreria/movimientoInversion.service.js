import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para MovimientoInversion
 * Gestiona los movimientos de inversiones financieras (inversiones, retiros, rendimientos).
 * Documentado en español.
 */

/**
 * Valida los datos de un movimiento de inversión.
 * @param {Object} data - Datos del movimiento
 */
async function validarMovimientoInversion(data) {
  // Validar inversión
  if (data.inversionFinancieraId) {
    const inversion = await prisma.inversionFinanciera.findUnique({
      where: { id: data.inversionFinancieraId },
    });
    if (!inversion) {
      throw new ValidationError(
        "La inversión financiera referenciada no existe.",
      );
    }
  }

  // Validar tipo de movimiento
  if (data.tipoMovimiento) {
    const tiposValidos = [
      "INVERSION",
      "RENDIMIENTO",
      "RETIRO",
      "AJUSTE",
      "LIQUIDACION",
    ];
    if (!tiposValidos.includes(data.tipoMovimiento)) {
      throw new ValidationError("El tipo de movimiento no es válido.");
    }
  }

  // Validar que el monto sea positivo
  if (data.monto && data.monto <= 0) {
    throw new ValidationError("El monto del movimiento debe ser mayor a cero.");
  }

  // Validar movimiento de caja si existe
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
}

/**
 * Actualiza el valor actual de la inversión.
 * @param {BigInt} inversionFinancieraId - ID de la inversión
 */
async function actualizarValorInversion(inversionFinancieraId) {
  const movimientos = await prisma.movimientoInversion.findMany({
    where: { inversionFinancieraId },
  });

  let valorActual = 0;

  movimientos.forEach((mov) => {
    const monto = parseFloat(mov.monto);
    switch (mov.tipoMovimiento) {
      case "INVERSION":
      case "RENDIMIENTO":
        valorActual += monto;
        break;
      case "RETIRO":
      case "AJUSTE":
      case "LIQUIDACION":
        valorActual -= monto;
        break;
    }
  });

  // Calcular rendimiento acumulado
  const inversion = await prisma.inversionFinanciera.findUnique({
    where: { id: inversionFinancieraId },
  });

  const rendimientoAcumulado =
    valorActual - parseFloat(inversion.montoInvertido);

  await prisma.inversionFinanciera.update({
    where: { id: inversionFinancieraId },
    data: {
      valorActual,
      rendimientoAcumulado,
    },
  });
}

/**
 * Lista todos los movimientos de inversión.
 */
const listar = async () => {
  try {
    return await prisma.movimientoInversion.findMany({
      include: {
        inversion: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          },
        },
        movimientoCaja: true,
        asientosContables: {
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
      orderBy: { fechaMovimiento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene un movimiento de inversión por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const movimiento = await prisma.movimientoInversion.findUnique({
      where: { id },
      include: {
        inversion: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          },
        },
        movimientoCaja: true,
        asientosContables: {
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
    if (!movimiento)
      throw new NotFoundError("Movimiento de inversión no encontrado");
    return movimiento;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Crea un nuevo movimiento de inversión.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (
      !data.inversionFinancieraId ||
      !data.tipoMovimiento ||
      !data.fechaMovimiento ||
      data.monto === null ||
      data.monto === undefined ||
      !data.descripcion
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios para crear el movimiento.",
      );
    }

    await validarMovimientoInversion(data);

    // Crear movimiento en una transacción
    const movimiento = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.movimientoInversion.create({
        data,
        include: {
          inversion: true,
          movimientoCaja: true,
          asientosContables: {
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

      // Actualizar valor actual de la inversión
      await actualizarValorInversion(data.inversionFinancieraId);

      return nuevo;
    });

    return movimiento;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Actualiza un movimiento de inversión existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movimientoInversion.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("Movimiento de inversión no encontrado");

    await validarMovimientoInversion({ ...data, id });

    // Actualizar movimiento en una transacción
    const movimiento = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.movimientoInversion.update({
        where: { id },
        data,
        include: {
          inversion: true,
          movimientoCaja: true,
          asientosContables: {
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

      // Recalcular valor actual de la inversión
      await actualizarValorInversion(existente.inversionFinancieraId);

      return actualizado;
    });

    return movimiento;
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
 * Elimina un movimiento de inversión por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.movimientoInversion.findUnique({
      where: { id },
      include: { inversion: true },
    });

    if (!existente)
      throw new NotFoundError("Movimiento de inversión no encontrado");

    // Eliminar movimiento en una transacción
    await prisma.$transaction(async (tx) => {
      await tx.movimientoInversion.delete({ where: { id } });

      // Recalcular valor actual de la inversión
      await actualizarValorInversion(existente.inversionFinancieraId);
    });

    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista movimientos por inversión.
 */
const listarPorInversion = async (inversionFinancieraId) => {
  try {
    return await prisma.movimientoInversion.findMany({
      where: { inversionFinancieraId },
      include: {
        movimientoCaja: true,
        asientosContables: {
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
      orderBy: { fechaMovimiento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista movimientos por tipo.
 */
const listarPorTipo = async (tipoMovimiento) => {
  try {
    return await prisma.movimientoInversion.findMany({
      where: { tipoMovimiento },
      include: {
        inversion: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          },
        },
        movimientoCaja: true,
        personalCreador: true,
      },
      orderBy: { fechaMovimiento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene el resumen de movimientos de una inversión.
 */
const obtenerResumenPorInversion = async (inversionFinancieraId) => {
  try {
    const movimientos = await prisma.movimientoInversion.findMany({
      where: { inversionFinancieraId },
    });

    const resumen = {
      totalInversiones: 0,
      totalRetiros: 0,
      totalRendimientos: 0,
      totalAjustes: 0,
      totalLiquidaciones: 0,
      cantidadMovimientos: movimientos.length,
    };

    movimientos.forEach((mov) => {
      const monto = parseFloat(mov.monto);
      switch (mov.tipoMovimiento) {
        case "INVERSION":
          resumen.totalInversiones += monto;
          break;
        case "RETIRO":
          resumen.totalRetiros += monto;
          break;
        case "RENDIMIENTO":
          resumen.totalRendimientos += monto;
          break;
        case "AJUSTE":
          resumen.totalAjustes += monto;
          break;
        case "LIQUIDACION":
          resumen.totalLiquidaciones += monto;
          break;
      }
    });

    return resumen;
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
  listarPorInversion,
  listarPorTipo,
  obtenerResumenPorInversion,
};
