import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para InversionFinanciera
 * Gestiona inversiones financieras (plazos fijos, fondos mutuos, bonos, acciones).
 * Documentado en español.
 */

/**
 * Valida los datos de una inversión financiera.
 * @param {Object} data - Datos de la inversión
 */
async function validarInversionFinanciera(data) {
  // Validar empresa
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa) {
      throw new ValidationError("La empresa referenciada no existe.");
    }
  }

  // Validar banco si existe
  if (data.bancoId) {
    const banco = await prisma.banco.findUnique({
      where: { id: data.bancoId },
    });
    if (!banco) {
      throw new ValidationError("El banco referenciado no existe.");
    }
  }

  // Validar moneda
  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) {
      throw new ValidationError("La moneda referenciada no existe.");
    }
  }

  // Validar estado
  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: data.estadoId },
    });
    if (!estado) {
      throw new ValidationError("El estado referenciado no existe.");
    }
  }

  // Validar número de inversión único por empresa
  if (data.numeroInversion && data.empresaId) {
    const existente = await prisma.inversionFinanciera.findFirst({
      where: {
        empresaId: data.empresaId,
        numeroInversion: data.numeroInversion,
        id: data.id ? { not: data.id } : undefined,
      },
    });
    if (existente) {
      throw new ValidationError(
        `El número de inversión "${data.numeroInversion}" ya existe para esta empresa.`,
      );
    }
  }

  // Validar tipo de inversión
  if (data.tipoInversion) {
    const tiposValidos = [
      "PLAZO_FIJO",
      "FONDO_MUTUO",
      "BONOS",
      "ACCIONES",
      "CTS",
    ];
    if (!tiposValidos.includes(data.tipoInversion)) {
      throw new ValidationError("El tipo de inversión no es válido.");
    }
  }

  // Validar fechas
  if (data.fechaInversion && data.fechaVencimiento) {
    if (new Date(data.fechaVencimiento) <= new Date(data.fechaInversion)) {
      throw new ValidationError(
        "La fecha de vencimiento debe ser posterior a la fecha de inversión.",
      );
    }
  }

  // Validar montos
  if (data.valorActual && data.montoInvertido) {
    if (data.valorActual < 0) {
      throw new ValidationError("El valor actual no puede ser negativo.");
    }
  }
}

/**
 * Calcula el rendimiento acumulado de una inversión.
 * @param {Object} inversion - Datos de la inversión
 * @returns {number} Rendimiento acumulado
 */
function calcularRendimientoAcumulado(inversion) {
  const { montoInvertido, valorActual } = inversion;
  return parseFloat(valorActual) - parseFloat(montoInvertido);
}

/**
 * Lista todas las inversiones financieras.
 */
const listar = async () => {
  try {
    return await prisma.inversionFinanciera.findMany({
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        movimientos: {
          orderBy: { fechaMovimiento: "desc" },
          take: 5,
        },
      },
      orderBy: { fechaInversion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Obtiene una inversión financiera por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const inversion = await prisma.inversionFinanciera.findUnique({
      where: { id },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        movimientos: {
          orderBy: { fechaMovimiento: "desc" },
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
      },
    });
    if (!inversion)
      throw new NotFoundError("Inversión financiera no encontrada");
    return inversion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva inversión financiera.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (
      !data.empresaId ||
      !data.numeroInversion ||
      !data.tipoInversion ||
      !data.descripcion ||
      !data.fechaInversion ||
      !data.montoInvertido ||
      !data.monedaId ||
      !data.valorActual ||
      !data.estadoId
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios para crear la inversión.",
      );
    }

    await validarInversionFinanciera(data);

    // Calcular rendimiento acumulado inicial
    const rendimientoAcumulado = calcularRendimientoAcumulado({
      montoInvertido: data.montoInvertido,
      valorActual: data.valorActual,
    });

    const inversion = await prisma.inversionFinanciera.create({
      data: {
        ...data,
        rendimientoAcumulado,
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
      },
    });

    return inversion;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Actualiza una inversión financiera existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.inversionFinanciera.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("Inversión financiera no encontrada");

    await validarInversionFinanciera({ ...data, id });

    // Recalcular rendimiento si se actualizan montos
    let rendimientoAcumulado = existente.rendimientoAcumulado;
    if (data.valorActual !== undefined) {
      const montoInvertido =
        data.montoInvertido !== undefined
          ? data.montoInvertido
          : existente.montoInvertido;
      rendimientoAcumulado = calcularRendimientoAcumulado({
        montoInvertido,
        valorActual: data.valorActual,
      });
    }

    return await prisma.inversionFinanciera.update({
      where: { id },
      data: {
        ...data,
        rendimientoAcumulado,
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
        movimientos: {
          orderBy: { fechaMovimiento: "desc" },
        },
      },
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
 * Elimina una inversión financiera por ID.
 * Valida que esté en estado CANCELADA o no tenga movimientos.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.inversionFinanciera.findUnique({
      where: { id },
      include: {
        movimientos: true,
      },
    });

    if (!existente)
      throw new NotFoundError("Inversión financiera no encontrada");

    // Validar que no tenga movimientos o esté cancelada
    if (
      existente.movimientos &&
      existente.movimientos.length > 0 &&
      existente.estadoId !== 94
    ) {
      throw new ConflictError(
        "No se puede eliminar la inversión porque tiene movimientos registrados.",
      );
    }

    await prisma.inversionFinanciera.delete({ where: { id } });
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
 * Registra un movimiento de inversión.
 */
const registrarMovimiento = async (inversionFinancieraId, dataMovimiento) => {
  try {
    const inversion = await prisma.inversionFinanciera.findUnique({
      where: { id: inversionFinancieraId },
    });
    if (!inversion)
      throw new NotFoundError("Inversión financiera no encontrada");

    const {
      tipoMovimiento,
      fechaMovimiento,
      monto,
      descripcion,
      movimientoCajaId,
    } = dataMovimiento;

    if (!tipoMovimiento || !fechaMovimiento || !monto || !descripcion) {
      throw new ValidationError(
        "Tipo, fecha, monto y descripción son obligatorios.",
      );
    }

    // Validar tipo de movimiento
    const tiposValidos = [
      "INVERSION",
      "RENDIMIENTO",
      "RETIRO",
      "AJUSTE",
      "LIQUIDACION",
    ];
    if (!tiposValidos.includes(tipoMovimiento)) {
      throw new ValidationError("El tipo de movimiento no es válido.");
    }

    // Crear movimiento en una transacción
    const movimiento = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.movimientoInversion.create({
        data: {
          inversionFinancieraId,
          tipoMovimiento,
          fechaMovimiento,
          monto,
          descripcion,
          movimientoCajaId: movimientoCajaId || null,
        },
      });

      // Actualizar valor actual de la inversión según tipo de movimiento
      let nuevoValorActual = parseFloat(inversion.valorActual);

      switch (tipoMovimiento) {
        case "INVERSION":
          nuevoValorActual += parseFloat(monto);
          break;
        case "RENDIMIENTO":
          nuevoValorActual += parseFloat(monto);
          break;
        case "RETIRO":
          nuevoValorActual -= parseFloat(monto);
          break;
        case "AJUSTE":
          nuevoValorActual = parseFloat(monto);
          break;
        case "LIQUIDACION":
          nuevoValorActual = 0;
          break;
      }

      const rendimientoAcumulado =
        nuevoValorActual - parseFloat(inversion.montoInvertido);

      await tx.inversionFinanciera.update({
        where: { id: inversionFinancieraId },
        data: {
          valorActual: nuevoValorActual,
          rendimientoAcumulado,
        },
      });

      return nuevo;
    });

    return await prisma.movimientoInversion.findUnique({
      where: { id: movimiento.id },
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
      },
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
 * Liquida una inversión financiera.
 */
const liquidar = async (id, dataLiquidacion) => {
  try {
    const inversion = await prisma.inversionFinanciera.findUnique({
      where: { id },
    });
    if (!inversion)
      throw new NotFoundError("Inversión financiera no encontrada");

    if (inversion.estadoId === 93) {
      throw new ConflictError("La inversión ya está liquidada.");
    }

    const {
      fechaLiquidacion,
      montoLiquidado,
      movimientoCajaId,
      observaciones,
    } = dataLiquidacion;

    if (!fechaLiquidacion || !montoLiquidado) {
      throw new ValidationError(
        "Fecha de liquidación y monto liquidado son obligatorios.",
      );
    }

    // Liquidar en una transacción
    const inversionLiquidada = await prisma.$transaction(async (tx) => {
      // Registrar movimiento de liquidación
      await tx.movimientoInversion.create({
        data: {
          inversionFinancieraId: id,
          tipoMovimiento: "LIQUIDACION",
          fechaMovimiento: fechaLiquidacion,
          monto: montoLiquidado,
          descripcion: "Liquidación de inversión",
          movimientoCajaId: movimientoCajaId || null,
        },
      });

      // Actualizar inversión
      const updated = await tx.inversionFinanciera.update({
        where: { id },
        data: {
          fechaLiquidacion,
          montoLiquidado,
          valorActual: 0,
          estadoId: 93, // LIQUIDADA
          movimientoCajaId: movimientoCajaId || null,
          observaciones: observaciones || null,
        },
        include: {
          empresa: true,
          banco: true,
          moneda: true,
          estado: true,
          movimientos: {
            orderBy: { fechaMovimiento: "desc" },
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
        },
      });

      return updated;
    });

    return inversionLiquidada;
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista inversiones por empresa.
 */
const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.inversionFinanciera.findMany({
      where: { empresaId },
      include: {
        banco: true,
        moneda: true,
        estado: true,
        movimientos: {
          orderBy: { fechaMovimiento: "desc" },
          take: 3,
        },
      },
      orderBy: { fechaInversion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista inversiones vigentes.
 */
const listarVigentes = async () => {
  try {
    // Estado: 91=VIGENTE
    return await prisma.inversionFinanciera.findMany({
      where: {
        estadoId: 91,
      },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
      },
      orderBy: { fechaVencimiento: "asc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista inversiones por tipo.
 */
const listarPorTipo = async (tipoInversion) => {
  try {
    return await prisma.inversionFinanciera.findMany({
      where: { tipoInversion },
      include: {
        empresa: true,
        banco: true,
        moneda: true,
        estado: true,
      },
      orderBy: { fechaInversion: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista movimientos de una inversión.
 */
const listarMovimientos = async (inversionFinancieraId) => {
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
 * Obtiene resumen de rendimientos por empresa.
 */
const obtenerResumenRendimientos = async (empresaId) => {
  try {
    const inversiones = await prisma.inversionFinanciera.findMany({
      where: {
        empresaId,
        estadoId: { in: [91, 92] }, // VIGENTE o VENCIDA
      },
      include: {
        moneda: true,
      },
    });

    const resumen = inversiones.reduce((acc, inv) => {
      const moneda = inv.moneda.codigoSunat;
      if (!acc[moneda]) {
        acc[moneda] = {
          moneda,
          totalInvertido: 0,
          valorActual: 0,
          rendimientoAcumulado: 0,
          cantidad: 0,
        };
      }
      acc[moneda].totalInvertido += parseFloat(inv.montoInvertido);
      acc[moneda].valorActual += parseFloat(inv.valorActual);
      acc[moneda].rendimientoAcumulado += parseFloat(inv.rendimientoAcumulado);
      acc[moneda].cantidad += 1;
      return acc;
    }, {});

    return Object.values(resumen);
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
  registrarMovimiento,
  liquidar,
  listarPorEmpresa,
  listarVigentes,
  listarPorTipo,
  listarMovimientos,
  obtenerResumenRendimientos,
};
