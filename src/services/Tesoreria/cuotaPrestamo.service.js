import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import {
  ESTADO_CUOTA_PRESTAMO,
  ESTADOS_CUOTA_PRESTAMO_ABIERTAS,
  ESTADO_PRESTAMO_BANCARIO,
  ESTADOS_PRESTAMO_RECALCULABLES,
} from "../../utils/estados.constants.js";

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

  // Validar estado de la cuota contra el catálogo
  if (data.estadoCuotaId) {
    if (!Object.values(ESTADO_CUOTA_PRESTAMO).includes(Number(data.estadoCuotaId))) {
      throw new ValidationError("El estado de la cuota no es válido.");
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

// ════════════════════════════════════════════════════════════
// RECÁLCULO DESDE LOS PAGOS (fuente única de verdad de totales y saldos)
// ════════════════════════════════════════════════════════════
const aCentimos = (valor) => Math.round(Number(valor || 0) * 100);

// Orden en que se imputa un pago a los componentes de la cuota
const ORDEN_IMPUTACION = ["comision", "seguro", "interes", "capital"];

/** Componentes que debe una cuota, en céntimos. El capital absorbe cualquier diferencia de redondeo. */
const componentesDebidos = (cuota) => {
  const interes = aCentimos(cuota.montoInteres);
  const comision = aCentimos(cuota.montoComision);
  const seguro = aCentimos(cuota.montoSeguro);
  const capital = Math.max(aCentimos(cuota.montoTotal) - interes - comision - seguro, 0);
  return { comision, seguro, interes, capital };
};

/** Imputa `pagadoCent` a los componentes siguiendo ORDEN_IMPUTACION. */
const imputarPago = (debido, pagadoCent) => {
  let resto = pagadoCent;
  const imputado = {};
  for (const clave of ORDEN_IMPUTACION) {
    imputado[clave] = Math.min(resto, debido[clave]);
    resto -= imputado[clave];
  }
  return imputado;
};

/**
 * Recalcula los totales de cada cuota (monto pagado, mora, fecha de pago, días de mora y estado)
 * a partir de sus pagos registrados en PagoCuotaPrestamo. Si se elimina un pago, la cuota vuelve
 * sola al valor que corresponde. Las cuotas Historico (saldoInicialPagada) están pagadas sin filas
 * de pago, por eso no se tocan. Solo escribe las cuotas cuyos valores cambian.
 * @param {BigInt|Number} prestamoBancarioId - ID del préstamo
 * @param {Object} db - Cliente Prisma o transacción
 * @returns {Promise<Array>} Cuotas del préstamo con sus pagos y su estado ya actualizado
 */
async function recalcularTotalesCuotas(prestamoBancarioId, db = prisma) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cuotas = await db.cuotaPrestamo.findMany({
    where: { prestamoBancarioId },
    include: { pagos: true },
    orderBy: { numeroCuota: "asc" },
  });

  for (const cuota of cuotas) {
    if (cuota.saldoInicialPagada) continue;

    const pagos = cuota.pagos;
    const pagadoCent = pagos.reduce(
      (suma, p) =>
        suma +
        aCentimos(p.montoCapital) +
        aCentimos(p.montoInteres) +
        aCentimos(p.montoSeguro) +
        aCentimos(p.montoComision),
      0,
    );
    const moraCent = pagos.reduce((suma, p) => suma + aCentimos(p.montoMora), 0);
    const totalCent = aCentimos(cuota.montoTotal);

    let estadoCuotaId;
    if (pagadoCent > 0 && pagadoCent >= totalCent) estadoCuotaId = ESTADO_CUOTA_PRESTAMO.PAGADO;
    else if (pagadoCent > 0) estadoCuotaId = ESTADO_CUOTA_PRESTAMO.PAGO_PARCIAL;
    else if (new Date(cuota.fechaVencimiento) < hoy) estadoCuotaId = ESTADO_CUOTA_PRESTAMO.VENCIDO;
    else estadoCuotaId = ESTADO_CUOTA_PRESTAMO.PENDIENTE;

    const fechaPago = pagos.length
      ? new Date(Math.max(...pagos.map((p) => new Date(p.fechaPago).getTime())))
      : null;
    const diasMora = Math.max(0, ...pagos.map((p) => p.diasMora || 0));

    const cambios = {};
    if (Number(cuota.estadoCuotaId) !== estadoCuotaId) cambios.estadoCuotaId = estadoCuotaId;
    if (aCentimos(cuota.montoPagado) !== pagadoCent) {
      cambios.montoPagado = pagadoCent > 0 ? pagadoCent / 100 : null;
    }
    if (aCentimos(cuota.montoMora) !== moraCent) {
      cambios.montoMora = moraCent > 0 ? moraCent / 100 : null;
    }
    if ((cuota.fechaPago ? new Date(cuota.fechaPago).getTime() : null) !== (fechaPago ? fechaPago.getTime() : null)) {
      cambios.fechaPago = fechaPago;
    }
    if (pagos.length > 0 && diasMora > 0 && cuota.diasMora !== diasMora) cambios.diasMora = diasMora;
    // Se eliminaron todos los pagos de una cuota que tenía mora registrada
    if (pagos.length === 0 && aCentimos(cuota.montoPagado) > 0 && cuota.diasMora) cambios.diasMora = null;

    if (Object.keys(cambios).length > 0) {
      await db.cuotaPrestamo.update({ where: { id: cuota.id }, data: cambios });
      Object.assign(cuota, cambios);
    }
  }

  return cuotas;
}

/**
 * Recalcula los totales de las cuotas y los saldos del préstamo desde los pagos registrados.
 * Una cuota Historico (saldoInicialPagada) se considera pagada y no tiene filas de pago: no se
 * recalcula desde pagos, se respeta el monto pagado asignado al marcarla y se imputa igual que
 * un pago. Si los saldos no cambian, no escribe.
 * @param {BigInt|Number} prestamoBancarioId - ID del préstamo
 * @param {Object} db - Cliente Prisma o transacción
 */
async function actualizarSaldosPrestamo(prestamoBancarioId, db = prisma) {
  const cuotas = await recalcularTotalesCuotas(prestamoBancarioId, db);

  const prestamo = await db.prestamoBancario.findUnique({ where: { id: prestamoBancarioId } });
  if (!prestamo) return;

  let capitalPagadoCent = 0;
  let interesPagadoCent = 0;
  let saldoInteresCent = 0;
  for (const c of cuotas) {
    if (c.saldoInicialPagada) {
      // Historico: se respeta el monto pagado que se le asignó al marcarla; no hay pagos que leer
      const imputado = imputarPago(componentesDebidos(c), aCentimos(c.montoPagado));
      capitalPagadoCent += imputado.capital;
      interesPagadoCent += imputado.interes;
      continue;
    }

    const capitalCuota = c.pagos.reduce((suma, p) => suma + aCentimos(p.montoCapital), 0);
    const interesCuota = c.pagos.reduce((suma, p) => suma + aCentimos(p.montoInteres), 0);
    capitalPagadoCent += capitalCuota;
    interesPagadoCent += interesCuota;
    if (Number(c.estadoCuotaId) !== ESTADO_CUOTA_PRESTAMO.PAGADO) {
      saldoInteresCent += Math.max(aCentimos(c.montoInteres) - interesCuota, 0);
    }
  }

  const saldoCapitalCent = aCentimos(prestamo.montoDesembolsado) - capitalPagadoCent;
  const igual =
    aCentimos(prestamo.capitalPagado) === capitalPagadoCent &&
    aCentimos(prestamo.interesPagado) === interesPagadoCent &&
    aCentimos(prestamo.saldoCapital) === saldoCapitalCent &&
    aCentimos(prestamo.saldoInteres) === saldoInteresCent;
  if (igual) return;

  await db.prestamoBancario.update({
    where: { id: prestamoBancarioId },
    data: {
      capitalPagado: capitalPagadoCent / 100,
      interesPagado: interesPagadoCent / 100,
      saldoCapital: saldoCapitalCent / 100,
      saldoInteres: saldoInteresCent / 100,
    },
  });
}


/**
 * Recalcula el estado del préstamo según sus cuotas sin pagar. Solo actúa sobre préstamos
 * DESEMBOLSADO, VIGENTE, PAGADO o VENCIDO, y sobre los de saldo inicial aún en APROBADO (no
 * tienen desembolso en Caja). APROBADO lo mueve Caja con el desembolso; REFINANCIADO y ANULADO
 * se respetan. Un préstamo sin cuotas no cambia de estado. Una cuota sin pagar cuenta como
 * vencida si está en VENCIDO o si su fecha ya pasó (cubre pagos parciales atrasados, que el
 * cron no marca como VENCIDO).
 * @param {BigInt} prestamoBancarioId - ID del préstamo
 * @param {Object} db - Cliente Prisma o transacción
 * @returns {Promise<boolean>} true si el estado del préstamo cambió
 */
async function recalcularEstadoPrestamo(prestamoBancarioId, db = prisma) {
  const prestamo = await db.prestamoBancario.findUnique({
    where: { id: prestamoBancarioId },
    select: { estadoId: true, esSaldoInicial: true },
  });
  if (!prestamo) return false;

  const estadoActual = Number(prestamo.estadoId);
  // Un préstamo de saldo inicial no tiene desembolso en Caja: nunca sale de APROBADO por esa vía,
  // así que el cron lo administra desde el inicio
  const esRecalculable =
    ESTADOS_PRESTAMO_RECALCULABLES.includes(estadoActual) ||
    (prestamo.esSaldoInicial && estadoActual === ESTADO_PRESTAMO_BANCARIO.APROBADO);
  if (!esRecalculable) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cuotas = await db.cuotaPrestamo.findMany({
    where: { prestamoBancarioId },
    select: { estadoCuotaId: true, fechaVencimiento: true },
  });
  if (cuotas.length === 0) return false;

  const sinPagar = cuotas.filter((c) => ESTADOS_CUOTA_PRESTAMO_ABIERTAS.includes(Number(c.estadoCuotaId)));

  const estaVencida = (c) =>
    Number(c.estadoCuotaId) === ESTADO_CUOTA_PRESTAMO.VENCIDO || new Date(c.fechaVencimiento) < hoy;

  let nuevoEstadoId = ESTADO_PRESTAMO_BANCARIO.VIGENTE;
  if (sinPagar.length === 0) nuevoEstadoId = ESTADO_PRESTAMO_BANCARIO.PAGADO;
  else if (sinPagar.every(estaVencida)) nuevoEstadoId = ESTADO_PRESTAMO_BANCARIO.VENCIDO;

  if (nuevoEstadoId === estadoActual) return false;

  await db.prestamoBancario.update({
    where: { id: prestamoBancarioId },
    data: { estadoId: nuevoEstadoId },
  });
  return true;
}

/**
 * Fuente única de verdad de cuotas y préstamos. La usan el cron diario, el botón "Actualizar
 * Vencidas" y la edición de un préstamo, para que los tres den siempre el mismo resultado:
 *   1. Las cuotas PENDIENTE con fecha vencida pasan a VENCIDO.
 *   2. Cada préstamo recalcula desde sus pagos los totales de las cuotas y sus saldos
 *      (actualizarSaldosPrestamo), y luego su estado (recalcularEstadoPrestamo).
 * Sin prestamoBancarioId procesa todos los préstamos que administra el cron; con id, solo ese.
 * @param {BigInt|null} prestamoBancarioId - Préstamo a sincronizar, o null para todos
 * @returns {Promise<{cuotasActualizadas: number, prestamosRevisados: number, prestamosEstadoActualizado: number}>}
 */
async function sincronizarEstados(prestamoBancarioId = null) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const { count: cuotasActualizadas } = await prisma.cuotaPrestamo.updateMany({
    where: {
      ...(prestamoBancarioId ? { prestamoBancarioId } : {}),
      fechaVencimiento: { lt: hoy },
      estadoCuotaId: ESTADO_CUOTA_PRESTAMO.PENDIENTE,
    },
    data: { estadoCuotaId: ESTADO_CUOTA_PRESTAMO.VENCIDO },
  });

  // Los de saldo inicial se incluyen desde APROBADO porque no tienen desembolso en Caja
  const prestamos = prestamoBancarioId
    ? [{ id: prestamoBancarioId }]
    : await prisma.prestamoBancario.findMany({
        where: {
          OR: [
            { estadoId: { in: ESTADOS_PRESTAMO_RECALCULABLES } },
            { esSaldoInicial: true, estadoId: ESTADO_PRESTAMO_BANCARIO.APROBADO },
          ],
        },
        select: { id: true },
      });

  let prestamosEstadoActualizado = 0;
  for (const { id } of prestamos) {
    await actualizarSaldosPrestamo(id);
    if (await recalcularEstadoPrestamo(id)) prestamosEstadoActualizado++;
  }

  return { cuotasActualizadas, prestamosRevisados: prestamos.length, prestamosEstadoActualizado };
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
        estadoCuotaId: ESTADO_CUOTA_PRESTAMO.PAGADO,
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

    await recalcularEstadoPrestamo(cuota.prestamoBancarioId, tx);

    return updated;
  });

  // Los saldos se recalculan con el cliente global: deben leer la cuota ya confirmada en BD
  await actualizarSaldosPrestamo(cuota.prestamoBancarioId);

  return cuotaActualizada;
}

/**
 * Revierte la marca de saldo inicial de una cuota: vuelve a ser una cuota normal sin pagar
 * (PENDIENTE o VENCIDO según su fecha) para registrar su pago real desde Caja. Un préstamo
 * PAGADO se reabre porque deja de tener todas sus cuotas canceladas.
 * @param {BigInt} cuotaId - ID de la cuota
 * @param {BigInt} usuarioId - ID del usuario que realiza la acción
 * @returns {Promise<Object>} Cuota actualizada
 */
async function desmarcarComoSaldoInicial(cuotaId, usuarioId) {
  const cuota = await prisma.cuotaPrestamo.findUnique({
    where: { id: cuotaId },
    include: { prestamo: true },
  });

  if (!cuota) {
    throw new NotFoundError("La cuota no existe.");
  }

  if (!cuota.saldoInicialPagada) {
    throw new ConflictError("La cuota no está marcada como saldo inicial.");
  }

  const pagosRegistrados = await prisma.pagoCuotaPrestamo.count({ where: { cuotaPrestamoId: cuotaId } });
  if (pagosRegistrados > 0) {
    throw new ConflictError("La cuota tiene un pago registrado en Caja: no se puede desmarcar.");
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const estadoCuotaId =
    new Date(cuota.fechaVencimiento) < hoy ? ESTADO_CUOTA_PRESTAMO.VENCIDO : ESTADO_CUOTA_PRESTAMO.PENDIENTE;

  const cuotaActualizada = await prisma.$transaction(async (tx) => {
    const updated = await tx.cuotaPrestamo.update({
      where: { id: cuotaId },
      data: {
        saldoInicialPagada: false,
        estadoCuotaId,
        fechaPago: null,
        montoPagado: null,
        montoMora: null,
        diasMora: 0,
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

    // Un préstamo PAGADO se reabre solo: recalcularEstadoPrestamo también evalúa ese estado
    await recalcularEstadoPrestamo(cuota.prestamoBancarioId, tx);

    return updated;
  });

  await actualizarSaldosPrestamo(cuota.prestamoBancarioId);

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
      !data.estadoCuotaId
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
    if (Number(existente.estadoCuotaId) !== ESTADO_CUOTA_PRESTAMO.PENDIENTE) {
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
 * Lista cuotas por préstamo.
 */
const listarPorPrestamo = async (prestamoBancarioId) => {
  try {
    return await prisma.cuotaPrestamo.findMany({
      where: { prestamoBancarioId },
      include: {
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
        estadoCuotaId: { in: ESTADOS_CUOTA_PRESTAMO_ABIERTAS },
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
        estadoCuotaId: { in: ESTADOS_CUOTA_PRESTAMO_ABIERTAS },
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
        estadoCuotaId: ESTADO_CUOTA_PRESTAMO.PENDIENTE,
      },
      data: {
        estadoCuotaId: ESTADO_CUOTA_PRESTAMO.VENCIDO,
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
      (c) => Number(c.estadoCuotaId) === ESTADO_CUOTA_PRESTAMO.PAGADO,
    );
    const cuotasPendientes = todasLasCuotas.filter(
      (c) => Number(c.estadoCuotaId) === ESTADO_CUOTA_PRESTAMO.PENDIENTE,
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
        .filter((c) => Number(c.estadoCuotaId) === ESTADO_CUOTA_PRESTAMO.PAGADO)
        .reduce((sum, c) => sum + parseFloat(c.montoCapital || 0), 0);

      const interesPagadoFinal = todasLasCuotasActualizadas
        .filter((c) => Number(c.estadoCuotaId) === ESTADO_CUOTA_PRESTAMO.PAGADO)
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
      estadoCuotaId: ESTADO_CUOTA_PRESTAMO.PENDIENTE,
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
        estadoCuotaId: ESTADO_CUOTA_PRESTAMO.PENDIENTE,
        diasMora: 0,
        creadoPor: prestamo.creadoPor || null,
      });
      saldoCapital = saldoDespues;
    }
  }

  // Convertir prestamoBancarioId a Number
  const prestamoId = Number(prestamoBancarioId);

  // Regenerar borra las cuotas: con pagos registrados se perdería el historial de pagos
  const pagosRegistrados = await prisma.pagoCuotaPrestamo.count({
    where: { cuotaPrestamo: { prestamoBancarioId: prestamoId } },
  });
  if (pagosRegistrados > 0) {
    throw new ConflictError(
      "El préstamo tiene pagos registrados: no se puede regenerar el cronograma.",
    );
  }

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
          estadoCuotaId: cuota.estadoCuotaId,
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
      estadoCuotaId: cuota.estadoCuotaId ? BigInt(cuota.estadoCuotaId) : ESTADO_CUOTA_PRESTAMO.PENDIENTE,
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
  actualizarEstadosVencidos,
  generarCronograma,
  guardarBulk,
  recalcularCuotasPorPrestamo,
  marcarComoSaldoInicial,
  desmarcarComoSaldoInicial,
  actualizarSaldosPrestamo,
  recalcularTotalesCuotas,
  recalcularEstadoPrestamo,
  sincronizarEstados,
};