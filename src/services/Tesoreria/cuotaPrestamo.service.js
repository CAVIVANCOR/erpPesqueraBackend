import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para CuotaPrestamo
 * Gestiona las cuotas de préstamos bancarios y sus pagos.
 * Documentado en español.
 */

/**
 * Valida los datos de una cuota de préstamo.
 * @param {Object} data - Datos de la cuota
 */
async function validarCuotaPrestamo(data) {
  // Validar préstamo
  if (data.prestamoBancarioId) {
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id: data.prestamoBancarioId },
    });
    if (!prestamo) {
      throw new ValidationError("El préstamo bancario referenciado no existe.");
    }
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

  // Validar estado de pago
  if (data.estadoPago) {
    const estadosValidos = ["PENDIENTE", "PAGADO", "VENCIDO", "PARCIAL"];
    if (!estadosValidos.includes(data.estadoPago)) {
      throw new ValidationError("El estado de pago no es válido.");
    }
  }

  // Validar que monto pagado no sea mayor al monto total
  if (data.montoPagado && data.montoTotal) {
    if (data.montoPagado > data.montoTotal) {
      throw new ValidationError(
        "El monto pagado no puede ser mayor al monto total de la cuota.",
      );
    }
  }
}

/**
 * Calcula los saldos de capital para una cuota.
 * @param {Number} prestamoBancarioId - ID del préstamo
 * @param {number} numeroCuota - Número de cuota
 * @param {number} montoCapital - Monto de capital de la cuota
 * @returns {Object} { saldoCapitalAntes, saldoCapitalDespues }
 */
async function calcularSaldosCapital(
  prestamoBancarioId,
  numeroCuota,
  montoCapital,
) {
  // Obtener el préstamo
  const prestamo = await prisma.prestamoBancario.findUnique({
    where: { id: prestamoBancarioId },
  });

  if (!prestamo) {
    throw new ValidationError("El préstamo bancario no existe.");
  }

  let saldoCapitalAntes;

  if (numeroCuota === 1) {
    // Primera cuota: saldo inicial es el monto desembolsado
    saldoCapitalAntes = parseFloat(prestamo.montoDesembolsado);
  } else {
    // Cuotas siguientes: obtener el saldo después de la cuota anterior
    const cuotaAnterior = await prisma.cuotaPrestamo.findFirst({
      where: {
        prestamoBancarioId,
        numeroCuota: numeroCuota - 1,
      },
    });

    if (cuotaAnterior) {
      saldoCapitalAntes = parseFloat(cuotaAnterior.saldoCapitalDespues);
    } else {
      // Si no existe cuota anterior, usar monto desembolsado
      saldoCapitalAntes = parseFloat(prestamo.montoDesembolsado);
    }
  }

  const saldoCapitalDespues = saldoCapitalAntes - parseFloat(montoCapital);

  return {
    saldoCapitalAntes,
    saldoCapitalDespues,
  };
}

/**
 * Calcula los días de mora de una cuota.
 * @param {Date} fechaVencimiento - Fecha de vencimiento
 * @param {Date} fechaPago - Fecha de pago (o fecha actual si no está pagada)
 * @returns {number} Días de mora
 */
function calcularDiasMora(fechaVencimiento, fechaPago = null) {
  const fechaComparacion = fechaPago ? new Date(fechaPago) : new Date();
  const fechaVenc = new Date(fechaVencimiento);

  if (fechaComparacion <= fechaVenc) {
    return 0;
  }

  const diferenciaMilisegundos = fechaComparacion - fechaVenc;
  const diasMora = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
  return diasMora;
}

/**
 * Actualiza los saldos del préstamo después de un pago.
 * @param {Number} prestamoBancarioId - ID del préstamo
 */
async function actualizarSaldosPrestamo(prestamoBancarioId) {
  const cuotas = await prisma.cuotaPrestamo.findMany({
    where: { prestamoBancarioId },
    include: {
      prestamo: {
        include: {
          estado: true,
        },
      },
    },
  });

  // Filtrar cuotas pagadas (PAGADO o SALDO_INICIAL)
  const cuotasPagadas = cuotas.filter(
    (c) => c.estadoPago === "PAGADO" || c.saldoInicialPagada
  );

  const capitalPagado = cuotasPagadas.reduce(
    (sum, c) => sum + parseFloat(c.montoCapital),
    0
  );

  const interesPagado = cuotasPagadas.reduce(
    (sum, c) => sum + parseFloat(c.montoInteres),
    0
  );

  const prestamo = await prisma.prestamoBancario.findUnique({
    where: { id: prestamoBancarioId },
  });

  const saldoCapital = parseFloat(prestamo.montoDesembolsado) - capitalPagado;
  const saldoInteres = cuotas
    .filter((c) => c.estadoPago === "PENDIENTE" || c.estadoPago === "VENCIDO")
    .reduce((sum, c) => sum + parseFloat(c.montoInteres), 0);

  await prisma.prestamoBancario.update({
    where: { id: prestamoBancarioId },
    data: {
      capitalPagado,
      interesPagado,
      saldoCapital,
      saldoInteres,
    },
  });
}


/**
 * Marca una cuota como saldo inicial (pagada antes del 01/01/2026)
 * @param {BigInt} cuotaId - ID de la cuota
 * @param {BigInt} usuarioId - ID del usuario que realiza la acción
 * @returns {Promise<Object>} Cuota actualizada
 */
async function marcarComoSaldoInicial(cuotaId, usuarioId) {
  const cuota = await prisma.cuotaPrestamo.findUnique({
    where: { id: cuotaId },
    include: { prestamo: true },
  });

  if (!cuota) {
    throw new NotFoundError("La cuota no existe.");
  }

  if (cuota.saldoInicialPagada) {
    throw new ConflictError("La cuota ya está marcada como saldo inicial.");
  }

  const fechaCorte = new Date("2026-01-01");
  if (cuota.fechaVencimiento >= fechaCorte) {
    throw new ValidationError(
      "Solo se pueden marcar como saldo inicial las cuotas con vencimiento anterior al 01/01/2026."
    );
  }

  const cuotaActualizada = await prisma.$transaction(async (tx) => {
    const updated = await tx.cuotaPrestamo.update({
      where: { id: cuotaId },
      data: {
        saldoInicialPagada: true,
        estadoPago: "PAGADO", // Prisma enum
        fechaPago: new Date("2025-12-31"),
        montoPagado: cuota.montoTotal,
        diasMora: 0,
        montoMora: 0,
        actualizadoPor: usuarioId,
      },
      include: {
        prestamo: {
          include: {
            moneda: true,
            estado: true,
          },
        },
      },
    });

    await actualizarSaldosPrestamo(cuota.prestamoBancarioId);

    const cuotasPendientes = await tx.cuotaPrestamo.count({
      where: {
        prestamoBancarioId: cuota.prestamoBancarioId,
        estadoPago: { in: ["PENDIENTE", "VENCIDO", "PARCIAL"] },
      },
    });

    let nuevoEstadoId;
    if (cuotasPendientes === 0) {
      nuevoEstadoId = BigInt(82);
    } else {
      const cuotasVencidas = await tx.cuotaPrestamo.count({
        where: {
          prestamoBancarioId: cuota.prestamoBancarioId,
          estadoPago: "VENCIDO",
        },
      });
      nuevoEstadoId = cuotasVencidas > 0 ? BigInt(83) : BigInt(81);
    }

    await tx.prestamoBancario.update({
      where: { id: cuota.prestamoBancarioId },
      data: { estadoId: nuevoEstadoId },
    });

    return updated;
  });

  return cuotaActualizada;
}

/**
 * Lista todas las cuotas de préstamo.
 */
const listar = async () => {
  try {
    return await prisma.cuotaPrestamo.findMany({
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
 * Obtiene una cuota de préstamo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const cuota = await prisma.cuotaPrestamo.findUnique({
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
      },
    });
    if (!cuota) throw new NotFoundError("Cuota de préstamo no encontrada");
    return cuota;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Crea una nueva cuota de préstamo.
 * Los campos saldoCapitalAntes y saldoCapitalDespues se calculan automáticamente.
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios (permitir 0 pero no null/undefined)
    if (
      !data.prestamoBancarioId ||
      data.numeroCuota === null ||
      data.numeroCuota === undefined ||
      !data.fechaVencimiento ||
      data.montoCapital === null ||
      data.montoCapital === undefined ||
      data.montoInteres === null ||
      data.montoInteres === undefined ||
      data.montoTotal === null ||
      data.montoTotal === undefined ||
      !data.estadoPago
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios para crear la cuota.",
      );
    }

    await validarCuotaPrestamo(data);

    // Calcular saldos de capital automáticamente
    const { saldoCapitalAntes, saldoCapitalDespues } =
      await calcularSaldosCapital(
        data.prestamoBancarioId,
        data.numeroCuota,
        data.montoCapital,
      );

    // Crear cuota con saldos calculados (ignorar saldos que vengan en data)
    const cuotaData = {
      ...data,
      saldoCapitalAntes,
      saldoCapitalDespues,
    };

    return await prisma.cuotaPrestamo.create({
      data: cuotaData,
      include: {
        prestamo: true,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Actualiza una cuota de préstamo existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cuotaPrestamo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("Cuota de préstamo no encontrada");

    await validarCuotaPrestamo({ ...data, id });

    // Si se actualiza el montoCapital, recalcular saldos
    let dataActualizada = { ...data };
    if (data.montoCapital !== undefined && data.montoCapital !== null) {
      const { saldoCapitalAntes, saldoCapitalDespues } =
        await calcularSaldosCapital(
          existente.prestamoBancarioId,
          existente.numeroCuota,
          data.montoCapital,
        );
      dataActualizada.saldoCapitalAntes = saldoCapitalAntes;
      dataActualizada.saldoCapitalDespues = saldoCapitalDespues;
    }

    return await prisma.cuotaPrestamo.update({
      where: { id },
      data: dataActualizada,
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
 * Elimina una cuota de préstamo por ID.
 * Solo permite eliminar cuotas pendientes.
 * Después de eliminar, renumera las cuotas restantes ordenadas por fecha de vencimiento
 * y recalcula los saldos de capital.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.cuotaPrestamo.findUnique({ where: { id } });

    if (!existente) throw new NotFoundError("Cuota de préstamo no encontrada");

    // Validar que la cuota esté pendiente
    if (existente.estadoPago !== "PENDIENTE") {
      throw new ConflictError("Solo se pueden eliminar cuotas pendientes.");
    }

    const prestamoBancarioId = existente.prestamoBancarioId;

    // Eliminar la cuota, renumerar y recalcular saldos en una transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar la cuota
      await tx.cuotaPrestamo.delete({ where: { id } });

      // Obtener cuotas restantes ordenadas por fecha de vencimiento
      const cuotasRestantes = await tx.cuotaPrestamo.findMany({
        where: { prestamoBancarioId },
        orderBy: { fechaVencimiento: "asc" },
      });

      // Obtener el préstamo para saldo inicial
      const prestamo = await tx.prestamoBancario.findUnique({
        where: { id: prestamoBancarioId },
      });

      let saldoCapitalAntes = parseFloat(prestamo.montoDesembolsado);

      // Renumerar y recalcular saldos de las cuotas
      for (let i = 0; i < cuotasRestantes.length; i++) {
        const cuota = cuotasRestantes[i];
        const saldoCapitalDespues =
          saldoCapitalAntes - parseFloat(cuota.montoCapital);

        await tx.cuotaPrestamo.update({
          where: { id: cuota.id },
          data: {
            numeroCuota: i + 1,
            saldoCapitalAntes,
            saldoCapitalDespues,
          },
        });

        // El saldo después de esta cuota es el saldo antes de la siguiente
        saldoCapitalAntes = saldoCapitalDespues;
      }
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
 * Registra el pago de una cuota.
 */
const registrarPago = async (id, dataPago) => {
  try {
    const cuota = await prisma.cuotaPrestamo.findUnique({
      where: { id },
      include: { prestamo: true },
    });

    if (!cuota) throw new NotFoundError("Cuota de préstamo no encontrada");

    if (cuota.estadoPago === "PAGADO") {
      throw new ConflictError("La cuota ya está pagada.");
    }

    const { fechaPago, montoPagado, movimientoCajaId, observaciones } =
      dataPago;

    if (!fechaPago || !montoPagado) {
      throw new ValidationError(
        "Fecha de pago y monto pagado son obligatorios.",
      );
    }

    // Calcular días de mora
    const diasMora = calcularDiasMora(cuota.fechaVencimiento, fechaPago);

    // Calcular mora si hay atraso
    let montoMora = 0;
    if (diasMora > 0 && cuota.prestamo.tasaMoratoria) {
      const tasaMoraDiaria =
        parseFloat(cuota.prestamo.tasaMoratoria) / 100 / 365;
      montoMora = parseFloat(cuota.montoTotal) * tasaMoraDiaria * diasMora;
    }

    // Determinar estado de pago
    let estadoPago = "PAGADO";
    if (montoPagado < cuota.montoTotal) {
      estadoPago = "PARCIAL";
    }

    // Actualizar cuota en una transacción
    const cuotaActualizada = await prisma.$transaction(async (tx) => {
      const updated = await tx.cuotaPrestamo.update({
        where: { id },
        data: {
          fechaPago,
          montoPagado,
          montoMora: montoMora > 0 ? montoMora : null,
          diasMora: diasMora > 0 ? diasMora : null,
          estadoPago,
          movimientoCajaId: movimientoCajaId || null,
          observaciones: observaciones || null,
        },
        include: {
          prestamo: {
            include: {
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
        },
      });

      // Actualizar saldos del préstamo
      await actualizarSaldosPrestamo(cuota.prestamoBancarioId);

      // Verificar si todas las cuotas están pagadas para cambiar estado del préstamo
      const cuotasPendientes = await tx.cuotaPrestamo.count({
        where: {
          prestamoBancarioId: cuota.prestamoBancarioId,
          estadoPago: { in: ["PENDIENTE", "VENCIDO", "PARCIAL"] },
        },
      });

      if (cuotasPendientes === 0) {
        // Todas las cuotas pagadas, actualizar estado del préstamo a PAGADO (ID 82)
        await tx.prestamoBancario.update({
          where: { id: cuota.prestamoBancarioId },
          data: { estadoId: Number(82) },
        });
      }

      return updated;
    });

    return cuotaActualizada;
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
 * Lista cuotas por préstamo.
 */
const listarPorPrestamo = async (prestamoBancarioId) => {
  try {
    return await prisma.cuotaPrestamo.findMany({
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
      },
      orderBy: { numeroCuota: "asc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Lista cuotas pendientes de pago.
 */
const listarPendientes = async () => {
  try {
    return await prisma.cuotaPrestamo.findMany({
      where: {
        estadoPago: { in: ["PENDIENTE", "VENCIDO", "PARCIAL"] },
      },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          },
        },
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
 * Lista cuotas vencidas.
 */
const listarVencidas = async () => {
  try {
    const hoy = new Date();
    return await prisma.cuotaPrestamo.findMany({
      where: {
        fechaVencimiento: { lt: hoy },
        estadoPago: { in: ["PENDIENTE", "VENCIDO", "PARCIAL"] },
      },
      include: {
        prestamo: {
          include: {
            empresa: true,
            banco: true,
            moneda: true,
          },
        },
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
 * Actualiza estados de cuotas vencidas.
 */
const actualizarEstadosVencidos = async () => {
  try {
    const hoy = new Date();
    const resultado = await prisma.cuotaPrestamo.updateMany({
      where: {
        fechaVencimiento: { lt: hoy },
        estadoPago: "PENDIENTE",
      },
      data: {
        estadoPago: "VENCIDO",
      },
    });
    return resultado;
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};
/**
 * Recalcula todas las cuotas pendientes de un préstamo después de actualizar la cabecera.
 * Valida que el número de cuotas coincida con PrestamoBancario.numeroCuotas.
 * Solo recalcula cuotas PENDIENTES y actualiza los saldos de la cabecera.
 * NO recalcula montoComision ni montoSeguro (vienen de importación).
 * @param {Number} prestamoBancarioId - ID del préstamo
 */
const recalcularCuotasPorPrestamo = async (prestamoBancarioId) => {
  try {
    // Obtener el préstamo
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id: prestamoBancarioId },
    });

    if (!prestamo) {
      throw new NotFoundError("Préstamo bancario no encontrado");
    }

    // Obtener todas las cuotas del préstamo ordenadas por número de cuota
    const todasLasCuotas = await prisma.cuotaPrestamo.findMany({
      where: { prestamoBancarioId },
      orderBy: { numeroCuota: "asc" },
    });

    // Validar que el número de cuotas coincida
    if (todasLasCuotas.length !== prestamo.numeroCuotas) {
      throw new ValidationError(
        `El número de cuotas en el detalle (${todasLasCuotas.length}) no coincide con el campo numeroCuotas del préstamo (${prestamo.numeroCuotas})`,
      );
    }

    // Separar cuotas pagadas y pendientes
    const cuotasPagadas = todasLasCuotas.filter(
      (c) => c.estadoPago === "PAGADO",
    );
    const cuotasPendientes = todasLasCuotas.filter(
      (c) => c.estadoPago === "PENDIENTE",
    );

    // Calcular capital e interés pagado ANTES del recálculo (de cuotas ya pagadas)
    const capitalPagadoInicial = cuotasPagadas.reduce(
      (sum, c) => sum + parseFloat(c.montoCapital || 0),
      0,
    );

    const interesPagadoInicial = cuotasPagadas.reduce(
      (sum, c) => sum + parseFloat(c.montoInteres || 0),
      0,
    );

    if (cuotasPendientes.length === 0) {
      // Actualizar saldos de la cabecera aunque no haya cuotas pendientes
      await prisma.prestamoBancario.update({
        where: { id: prestamoBancarioId },
        data: {
          saldoCapital: 0,
          saldoInteres: 0,
          capitalPagado: parseFloat(capitalPagadoInicial.toFixed(2)),
          interesPagado: parseFloat(interesPagadoInicial.toFixed(2)),
        },
      });

      return {
        mensaje:
          "No hay cuotas pendientes para recalcular. Saldos de cabecera actualizados.",
        cuotasRecalculadas: 0,
        numeroCuotasTotal: todasLasCuotas.length,
        numeroCuotasEsperado: prestamo.numeroCuotas,
        saldosActualizados: {
          saldoCapital: 0,
          capitalPagado: capitalPagadoInicial,
          interesPagado: interesPagadoInicial,
        },
      };
    }

    // Saldo de capital inicial para las cuotas pendientes
    let saldoCapital =
      parseFloat(prestamo.montoDesembolsado) - capitalPagadoInicial;
    const tasaInteresMensual = parseFloat(prestamo.tasaInteresAnual) / 100 / 12;
    const numeroCuotasPendientes = cuotasPendientes.length;

    // Recalcular cada cuota pendiente en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      let saldoInteresPendienteTotal = 0;

      for (let i = 0; i < cuotasPendientes.length; i++) {
        const cuota = cuotasPendientes[i];

        const saldoCapitalAntes = saldoCapital;

        // Calcular montos según tipo de amortización
        let montoCapital, montoInteres, montoTotal;

        if (prestamo.tipoAmortizacion === "FRANCES") {
          // Sistema Francés: cuota fija
          const cuotaFija =
            (saldoCapital *
              tasaInteresMensual *
              Math.pow(1 + tasaInteresMensual, numeroCuotasPendientes - i)) /
            (Math.pow(1 + tasaInteresMensual, numeroCuotasPendientes - i) - 1);

          montoInteres = saldoCapital * tasaInteresMensual;
          montoCapital = cuotaFija - montoInteres;
          montoTotal = cuotaFija;
        } else if (prestamo.tipoAmortizacion === "ALEMAN") {
          // Sistema Alemán: capital constante
          montoCapital = saldoCapital / (numeroCuotasPendientes - i);
          montoInteres = saldoCapital * tasaInteresMensual;
          montoTotal = montoCapital + montoInteres;
        } else {
          // Sistema Americano o por defecto: solo intereses hasta última cuota
          if (i === numeroCuotasPendientes - 1) {
            montoCapital = saldoCapital;
            montoInteres = saldoCapital * tasaInteresMensual;
          } else {
            montoCapital = 0;
            montoInteres = saldoCapital * tasaInteresMensual;
          }
          montoTotal = montoCapital + montoInteres;
        }

        // IMPORTANTE: NO recalcular comisión ni seguro, mantener valores existentes
        const montoComision = parseFloat(cuota.montoComision || 0);
        const montoSeguro = parseFloat(cuota.montoSeguro || 0);
        montoTotal += montoComision + montoSeguro;

        // Calcular saldo después
        const saldoCapitalDespues = saldoCapital - montoCapital;

        // Acumular interés pendiente
        saldoInteresPendienteTotal += montoInteres;

        // Actualizar cuota (NO actualizar montoComision ni montoSeguro)
        await tx.cuotaPrestamo.update({
          where: { id: cuota.id },
          data: {
            montoCapital: parseFloat(montoCapital.toFixed(2)),
            montoInteres: parseFloat(montoInteres.toFixed(2)),
            // NO actualizar montoComision ni montoSeguro
            montoTotal: parseFloat(montoTotal.toFixed(2)),
            saldoCapitalAntes: parseFloat(saldoCapitalAntes.toFixed(2)),
            saldoCapitalDespues: parseFloat(saldoCapitalDespues.toFixed(2)),
          },
        });

        // Actualizar saldo para siguiente cuota
        saldoCapital = saldoCapitalDespues;
      }

      // DESPUÉS de recalcular, obtener TODAS las cuotas actualizadas para calcular totales
      const todasLasCuotasActualizadas = await tx.cuotaPrestamo.findMany({
        where: { prestamoBancarioId },
        orderBy: { numeroCuota: "asc" },
      });

      // Calcular capital e interés pagado de cuotas PAGADAS (con valores actualizados)
      const capitalPagadoFinal = todasLasCuotasActualizadas
        .filter((c) => c.estadoPago === "PAGADO")
        .reduce((sum, c) => sum + parseFloat(c.montoCapital || 0), 0);

      const interesPagadoFinal = todasLasCuotasActualizadas
        .filter((c) => c.estadoPago === "PAGADO")
        .reduce((sum, c) => sum + parseFloat(c.montoInteres || 0), 0);

      // Calcular saldo de capital e interés pendiente
      const saldoCapitalFinal =
        parseFloat(prestamo.montoDesembolsado) - capitalPagadoFinal;

      // Actualizar saldos de la cabecera del préstamo
      await tx.prestamoBancario.update({
        where: { id: prestamoBancarioId },
        data: {
          saldoCapital: parseFloat(saldoCapitalFinal.toFixed(2)),
          saldoInteres: parseFloat(saldoInteresPendienteTotal.toFixed(2)),
          capitalPagado: parseFloat(capitalPagadoFinal.toFixed(2)),
          interesPagado: parseFloat(interesPagadoFinal.toFixed(2)),
        },
      });

      return {
        capitalPagadoFinal,
        interesPagadoFinal,
        saldoCapitalFinal,
        saldoInteresPendienteTotal,
      };
    });

    return {
      mensaje: "Cuotas y saldos recalculados exitosamente",
      cuotasRecalculadas: cuotasPendientes.length,
      numeroCuotasTotal: todasLasCuotas.length,
      numeroCuotasEsperado: prestamo.numeroCuotas,
      saldosActualizados: {
        saldoCapital: resultado.saldoCapitalFinal,
        capitalPagado: resultado.capitalPagadoFinal,
        interesPagado: resultado.interesPagadoFinal,
      },
    };
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
 * Generar cronograma de cuotas automáticamente según tipo de amortización
 */
async function generarCronograma(prestamoBancarioId) {
  const prestamo = await prisma.prestamoBancario.findUnique({
    where: { id: prestamoBancarioId },
    include: {
      moneda: true,
    },
  });

  if (!prestamo) {
    throw new NotFoundError("Préstamo bancario no encontrado.");
  }

  const cuotas = [];
  const montoDesembolsado = parseFloat(prestamo.montoDesembolsado);

  // Priorizar tasaInteresEfectiva (TCEA) para cálculos, fallback a tasaInteresAnual (TNA)
  const tasaAnual = prestamo.tasaInteresEfectiva
    ? parseFloat(prestamo.tasaInteresEfectiva)
    : parseFloat(prestamo.tasaInteresAnual);

  const numeroCuotas = prestamo.numeroCuotas;
  const plazoMeses = prestamo.plazoMeses;
  const comision = parseFloat(prestamo.comisionMantenimiento || 0);
  const seguro = parseFloat(prestamo.seguroDesgravamen || 0);

  // Calcular tasa mensual efectiva desde tasa anual efectiva
  const tasaMensual = Math.pow(1 + tasaAnual / 100, 1 / 12) - 1;

  let saldoCapital = montoDesembolsado;

  // CASO ESPECIAL: 1 sola cuota (Préstamo Bullet)
  if (numeroCuotas === 1) {
    const fechaVencimiento = new Date(prestamo.fechaVencimiento);

    // Calcular días reales entre desembolso y vencimiento
    const fechaDesembolso = new Date(prestamo.fechaDesembolso);
    const dias = Math.round((fechaVencimiento - fechaDesembolso) / (1000 * 60 * 60 * 24));

    // Calcular interés con días reales (base 360)
    const tasaAnualDecimal = tasaAnual / 100;
    const tasaPeriodo = Math.pow(1 + tasaAnualDecimal, dias / 360) - 1;
    const interesTotal = montoDesembolsado * tasaPeriodo;
    cuotas.push({
      prestamoBancarioId,
      numeroCuota: 1,
      fechaVencimiento,
      montoCapital: montoDesembolsado,
      montoInteres: interesTotal,
      montoComision: comision,
      montoSeguro: seguro,
      montoTotal: montoDesembolsado + interesTotal + comision + seguro,
      saldoCapitalAntes: montoDesembolsado,
      saldoCapitalDespues: 0,
      estadoPago: "PENDIENTE",
      diasMora: 0,
      creadoPor: prestamo.creadoPor || null,
    });
  } else {
    // CASO NORMAL: Múltiples cuotas
    for (let i = 1; i <= numeroCuotas; i++) {
      const fechaVencimiento = calcularFechaVencimiento(prestamo, i);

      let montoCapital = 0;
      let montoInteres = saldoCapital * tasaMensual;

      if (prestamo.tipoAmortizacion === "FRANCES") {
        const cuotaFija = montoDesembolsado * (tasaMensual * Math.pow(1 + tasaMensual, numeroCuotas)) / (Math.pow(1 + tasaMensual, numeroCuotas) - 1);
        montoCapital = cuotaFija - montoInteres;
      } else if (prestamo.tipoAmortizacion === "ALEMAN") {
        montoCapital = montoDesembolsado / numeroCuotas;
      } else if (prestamo.tipoAmortizacion === "AMERICANO") {
        montoCapital = i === numeroCuotas ? montoDesembolsado : 0;
      }

      // Ajuste en última cuota para cuadrar saldo
      if (i === numeroCuotas) {
        montoCapital = saldoCapital;
      }

      const saldoAntes = saldoCapital;
      const saldoDespues = saldoCapital - montoCapital;
      const montoTotal = montoCapital + montoInteres + comision + seguro;

      cuotas.push({
        prestamoBancarioId,
        numeroCuota: i,
        fechaVencimiento,
        montoCapital,
        montoInteres,
        montoComision: comision,
        montoSeguro: seguro,
        montoTotal,
        saldoCapitalAntes: saldoAntes,
        saldoCapitalDespues: saldoDespues,
        estadoPago: "PENDIENTE",
        diasMora: 0,
        creadoPor: prestamo.creadoPor || null,
      });
      saldoCapital = saldoDespues;
    }
  }

  // Convertir prestamoBancarioId a Number
  const prestamoId = Number(prestamoBancarioId);

  // Eliminar cuotas existentes antes de crear nuevas
  await prisma.cuotaPrestamo.deleteMany({
    where: { prestamoBancarioId: prestamoId },
  });

  // Crear cuotas sin include
  await prisma.$transaction(
    cuotas.map((cuota) =>
      prisma.cuotaPrestamo.create({
        data: {
          prestamoBancarioId: prestamoId,
          numeroCuota: cuota.numeroCuota,
          fechaVencimiento: cuota.fechaVencimiento,
          montoCapital: cuota.montoCapital,
          montoInteres: cuota.montoInteres,
          montoComision: cuota.montoComision,
          montoSeguro: cuota.montoSeguro,
          montoTotal: cuota.montoTotal,
          saldoCapitalAntes: cuota.saldoCapitalAntes,
          saldoCapitalDespues: cuota.saldoCapitalDespues,
          estadoPago: cuota.estadoPago,
          diasMora: cuota.diasMora,
        },
      })
    )
  );

  // Cargar cuotas con relaciones después de crearlas
  const cuotasCreadas = await prisma.cuotaPrestamo.findMany({
    where: { prestamoBancarioId: prestamoId },
    include: {
      prestamo: {
        include: {
          moneda: true,
          estado: true,
        },
      },
    },
    orderBy: { numeroCuota: 'asc' },
  });

  return cuotasCreadas;
}

/**
 * Calcular fecha de vencimiento según frecuencia de pago
 */
function calcularFechaVencimiento(prestamo, numeroCuota) {
  // Si es la última cuota, usar siempre la fecha de vencimiento del préstamo
  if (numeroCuota === prestamo.numeroCuotas) {
    return new Date(prestamo.fechaVencimiento);
  }

  const fechaBase = new Date(prestamo.fechaDesembolso);
  let fecha = new Date(fechaBase);

  // Calcular mes/año según frecuencia (mantener día original por ahora)
  if (prestamo.frecuenciaPago === "MENSUAL") {
    fecha.setMonth(fechaBase.getMonth() + numeroCuota);
  } else if (prestamo.frecuenciaPago === "TRIMESTRAL") {
    fecha.setMonth(fechaBase.getMonth() + numeroCuota * 3);
  } else if (prestamo.frecuenciaPago === "SEMESTRAL") {
    fecha.setMonth(fechaBase.getMonth() + numeroCuota * 6);
  } else if (prestamo.frecuenciaPago === "ANUAL") {
    fecha.setFullYear(fechaBase.getFullYear() + numeroCuota);
  } else if (prestamo.frecuenciaPago === "DIAS" && prestamo.numeroDias) {
    fecha.setDate(fechaBase.getDate() + numeroCuota * prestamo.numeroDias);
    return fecha; // Para DIAS no aplicar diaPago
  }

  // FORZAR día específico si diaPago está definido
  if (prestamo.diaPago && prestamo.diaPago > 0) {
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();
    const ultimoDiaMes = new Date(anio, mes + 1, 0).getDate();
    const diaFinal = Math.min(prestamo.diaPago, ultimoDiaMes);
    fecha.setDate(diaFinal);
  }

  return fecha;
}

/**
 * Guardar/actualizar múltiples cuotas (bulk)
 */
async function guardarBulk(prestamoBancarioId, cuotas) {
  // Convertir a Number para Prisma
  const prestamoId = Number(prestamoBancarioId);

  // ✅ ACTUALIZAR cuotas existentes (NO eliminar)
  const operaciones = cuotas.map((cuota, index) => {
    const cuotaId = BigInt(cuota.id);

    const data = {
      numeroCuota: parseInt(cuota.numeroCuota),
      fechaVencimiento: new Date(cuota.fechaVencimiento),
      montoCapital: parseFloat(cuota.montoCapital || 0),
      montoInteres: parseFloat(cuota.montoInteres || 0),
      montoComision: parseFloat(cuota.montoComision || 0),
      montoSeguro: parseFloat(cuota.montoSeguro || 0),
      montoTotal: parseFloat(cuota.montoTotal || 0),
      saldoCapitalAntes: parseFloat(cuota.saldoCapitalAntes || 0),
      saldoCapitalDespues: parseFloat(cuota.saldoCapitalDespues || 0),
      estadoPago: cuota.estadoPago || "PENDIENTE",
      diasMora: parseInt(cuota.diasMora || 0),
      actualizadoPor: cuota.actualizadoPor ? BigInt(cuota.actualizadoPor) : null,
    };

    return prisma.cuotaPrestamo.update({
      where: { id: cuotaId },
      data: data
    });
  });

  await prisma.$transaction(operaciones);

  // Cargar las cuotas con sus relaciones DESPUÉS de actualizar
  const cuotasConRelaciones = await prisma.cuotaPrestamo.findMany({
    where: { prestamoBancarioId: prestamoId },
    include: {
      prestamo: {
        include: {
          moneda: true,
          estado: true,
        },
      },
    },
    orderBy: { numeroCuota: 'asc' },
  });

  return cuotasConRelaciones;
}

export default {
  listar,
  listarPendientes,
  listarVencidas,
  listarPorPrestamo,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  registrarPago,
  actualizarEstadosVencidos,
  generarCronograma,
  guardarBulk,
  recalcularCuotasPorPrestamo,
  marcarComoSaldoInicial,
  actualizarSaldosPrestamo,
};