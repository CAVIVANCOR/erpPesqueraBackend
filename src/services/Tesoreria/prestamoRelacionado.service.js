import { randomUUID } from "crypto";
import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, ConflictError, DatabaseError } from "../../utils/errors.js";
import { ESTADO_PRESTAMO_RELACIONADO } from "../../utils/estados.constants.js";
import { contarAsientosApertura } from "./prestamoRelacionadoAsiento.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: PRÉSTAMOS ENTRE EMPRESAS RELACIONADAS
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Solo mueven capital entre empresas relacionadas (sin intereses ni mora).
 * Nacen de una transferencia entre empresas con los tipos de movimiento PRESTAMOS RELACIONADOS:
 *   - DESEMBOLSO: crea el préstamo (número ingresado a mano, único por empresa prestamista).
 *     Moneda del préstamo = moneda de la cuenta de la prestamista.
 *   - DEVOLUCIÓN: se aplica a un préstamo vigente y baja su saldo. Puede pagarse en otra moneda
 *     (se convierte con el tipo de cambio de la operación). Con saldo cero pasa a PAGADO.
 *
 * Las funciones reciben el cliente (db / tx) para ejecutarse dentro de la transacción de la transferencia.
 */

const TOLERANCIA = 0.01;
const MONEDA_SOLES_ID = 1;

/** Número del préstamo a partir de su id: PR-000001 */
const numeroDesdeId = (id) => `PR-${String(id).padStart(6, "0")}`;

/**
 * Crea el préstamo y le asigna su número definitivo (necesita el id). Se ejecuta dentro de una transacción:
 * el número provisional es único y nunca queda guardado.
 */
async function crearConNumero(tx, datos) {
  const creado = await tx.prestamoRelacionado.create({
    data: { ...datos, numeroPrestamo: `TMP-${randomUUID()}` },
  });
  return tx.prestamoRelacionado.update({
    where: { id: creado.id },
    data: { numeroPrestamo: numeroDesdeId(creado.id) },
  });
}

const num = (valor) => Number(valor ?? 0);
const r2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

/** Convierte un monto entre soles y una moneda extranjera con el tipo de cambio de la operación. */
function convertir(monto, monedaOrigenId, monedaDestinoId, tipoCambio) {
  const origen = Number(monedaOrigenId);
  const destino = Number(monedaDestinoId);
  const valor = Number(monto);
  if (origen === destino) return valor;
  const tc = Number(tipoCambio);
  if (!tc || tc <= 0 || tc === 1) {
    throw new ValidationError(
      "La devolución se paga en una moneda distinta a la del préstamo: ingrese un tipo de cambio válido para convertir el monto.",
    );
  }
  if (origen === MONEDA_SOLES_ID) return valor / tc;
  if (destino === MONEDA_SOLES_ID) return valor * tc;
  throw new ValidationError("No se admite la conversión entre dos monedas extranjeras.");
}

/**
 * Valida la operación ANTES de crear movimientos. Devuelve lo que necesita el registro posterior.
 * Lanza errores con el dato concreto que el usuario debe corregir.
 */
export async function validarOperacion(db, data, cuentaOrigen, cuentaDestino) {
  // El número del préstamo se genera automáticamente a partir de su id
  if (data.operacionPrestamoRelacionado === "DESEMBOLSO") {
    return { operacion: "DESEMBOLSO" };
  }

  // DEVOLUCIÓN
  if (!data.prestamoRelacionadoId) {
    throw new ValidationError("Debe seleccionar el préstamo entre relacionadas que se está devolviendo.");
  }
  const prestamo = await db.prestamoRelacionado.findUnique({
    where: { id: BigInt(data.prestamoRelacionadoId) },
    include: {
      empresaPrestamista: { select: { razonSocial: true } },
      empresaPrestataria: { select: { razonSocial: true } },
      moneda: { select: { simbolo: true } },
    },
  });
  if (!prestamo) throw new NotFoundError("El préstamo seleccionado no existe.");

  if (Number(prestamo.estadoId) !== ESTADO_PRESTAMO_RELACIONADO.VIGENTE) {
    throw new ValidationError(
      `El préstamo N° ${prestamo.numeroPrestamo} no admite devoluciones porque no está vigente (ya fue pagado o anulado).`,
    );
  }
  if (
    Number(prestamo.empresaPrestatariaId) !== Number(cuentaOrigen.empresaId) ||
    Number(prestamo.empresaPrestamistaId) !== Number(cuentaDestino.empresaId)
  ) {
    throw new ValidationError(
      `El préstamo N° ${prestamo.numeroPrestamo} es de ${prestamo.empresaPrestamista.razonSocial} a ${prestamo.empresaPrestataria.razonSocial}: ` +
        `la devolución debe salir de una cuenta de ${prestamo.empresaPrestataria.razonSocial} hacia una cuenta de ${prestamo.empresaPrestamista.razonSocial}.`,
    );
  }

  let montoAplicado = r2(convertir(data.monto, cuentaOrigen.monedaId, prestamo.monedaId, data.tipoCambio));
  const saldo = r2(num(prestamo.saldoCapital));
  if (montoAplicado > saldo + TOLERANCIA) {
    throw new ValidationError(
      `La devolución (${prestamo.moneda.simbolo} ${montoAplicado.toFixed(2)}) excede el saldo pendiente del préstamo N° ${prestamo.numeroPrestamo} ` +
        `(${prestamo.moneda.simbolo} ${saldo.toFixed(2)}).`,
    );
  }
  // Diferencias de redondeo por conversión de moneda: se cancela exactamente el saldo
  if (Math.abs(saldo - montoAplicado) <= TOLERANCIA) montoAplicado = saldo;
  if (montoAplicado <= 0) {
    throw new ValidationError("El monto aplicado al préstamo debe ser mayor a cero.");
  }

  return { operacion: "DEVOLUCION", prestamo, montoAplicado };
}

/** Saldo y estado del préstamo a partir de sus pagos (única verdad). */
export async function recalcularPrestamo(tx, prestamoId) {
  const prestamo = await tx.prestamoRelacionado.findUnique({ where: { id: BigInt(prestamoId) } });
  if (!prestamo) return null;

  const suma = await tx.pagoPrestamoRelacionado.aggregate({
    where: { prestamoRelacionadoId: prestamo.id },
    _sum: { montoAplicado: true },
  });
  const capitalDevuelto = r2(num(suma._sum.montoAplicado));
  let saldoCapital = r2(num(prestamo.montoDesembolsado) - num(prestamo.montoPagadoAnterior) - capitalDevuelto);
  if (Math.abs(saldoCapital) <= TOLERANCIA) saldoCapital = 0;

  // Un préstamo anulado conserva su estado
  const estadoId =
    Number(prestamo.estadoId) === ESTADO_PRESTAMO_RELACIONADO.ANULADO
      ? prestamo.estadoId
      : saldoCapital <= 0
        ? ESTADO_PRESTAMO_RELACIONADO.PAGADO
        : ESTADO_PRESTAMO_RELACIONADO.VIGENTE;

  return tx.prestamoRelacionado.update({
    where: { id: prestamo.id },
    data: { capitalDevuelto, saldoCapital, estadoId },
  });
}

/**
 * Registra el préstamo o la devolución con los movimientos ya creados por la transferencia.
 * Se ejecuta dentro de la transacción de la transferencia.
 */
export async function registrarOperacion(tx, { data, validacion, cuentaOrigen, cuentaDestino, movimientoEgreso, movimientoIngreso, correlativo, periodoContable, usuarioId }) {
  const fecha = new Date(data.fechaTransferencia);
  const montoDestino = num(data.montoDestino) > 0 ? num(data.montoDestino) : num(data.monto);
  const numeroOperacion = data.numeroOperacion ? String(data.numeroOperacion).slice(0, 40) : null;
  const auditoria = usuarioId ? { creadoPor: BigInt(usuarioId) } : {};

  if (validacion.operacion === "DESEMBOLSO") {
    const hayConversion = Number(cuentaOrigen.monedaId) !== Number(cuentaDestino.monedaId);
    const prestamo = await crearConNumero(tx, {
        empresaPrestamistaId: BigInt(cuentaOrigen.empresaId),
        empresaPrestatariaId: BigInt(cuentaDestino.empresaId),
        esGerencial: Boolean(data.esGerencial),
        numeroOperacion,
        cuentaCorrientePrestamistaId: BigInt(cuentaOrigen.id),
        cuentaCorrientePrestatariaId: BigInt(cuentaDestino.id),
        movimientoCajaDesembolsoPrestamistaId: movimientoEgreso.id,
        movimientoCajaDesembolsoPrestatariaId: movimientoIngreso.id,
        refOperacionEspecializadaMovCaja: correlativo,
        medioPagoPrestamistaId: data.medioPagoOrigenId ? BigInt(data.medioPagoOrigenId) : null,
        medioPagoPrestatariaId: data.medioPagoDestinoId ? BigInt(data.medioPagoDestinoId) : null,
        monedaEntregaPrestamistaId: BigInt(cuentaOrigen.monedaId),
        montoEntregadoPrestamista: r2(data.monto),
        monedaRecepcionPrestatariaId: BigInt(cuentaDestino.monedaId),
        montoRecibidoPrestataria: r2(montoDestino),
        fechaContable: fecha,
        periodoContableId: periodoContable?.id ? BigInt(periodoContable.id) : null,
        fechaDesembolso: fecha,
        monedaId: BigInt(cuentaOrigen.monedaId),
        montoDesembolsado: r2(data.monto),
        tipoCambioAplicado: hayConversion ? num(data.tipoCambio) : null,
        saldoCapital: r2(data.monto),
        capitalDevuelto: 0,
        estadoId: ESTADO_PRESTAMO_RELACIONADO.VIGENTE,
        observaciones: data.descripcion || null,
        ...auditoria,
    });
    return { prestamoRelacionadoId: prestamo.id, numeroPrestamo: prestamo.numeroPrestamo, pagoPrestamoRelacionadoId: null };
  }

  // DEVOLUCIÓN: se bloquea el préstamo y se vuelve a validar con el saldo vigente
  const prestamoId = BigInt(validacion.prestamo.id);
  await tx.$queryRaw`SELECT id FROM "PrestamoRelacionado" WHERE id = ${prestamoId} FOR UPDATE`;
  const vigente = await validarOperacion(tx, data, cuentaOrigen, cuentaDestino);

  const pago = await tx.pagoPrestamoRelacionado.create({
    data: {
      prestamoRelacionadoId: prestamoId,
      fechaPago: fecha,
      numeroOperacion,
      montoAplicado: vigente.montoAplicado,
      monedaPrestamoId: BigInt(vigente.prestamo.monedaId),
      tipoCambio: num(data.tipoCambio) > 0 ? num(data.tipoCambio) : 1,
      monedaPagoPrestatariaId: BigInt(cuentaOrigen.monedaId),
      montoPagadoPrestataria: r2(data.monto),
      medioPagoPrestatariaId: data.medioPagoOrigenId ? BigInt(data.medioPagoOrigenId) : null,
      movimientoCajaPrestatariaId: movimientoEgreso.id,
      monedaCobroPrestamistaId: BigInt(cuentaDestino.monedaId),
      montoCobradoPrestamista: r2(montoDestino),
      medioPagoPrestamistaId: data.medioPagoDestinoId ? BigInt(data.medioPagoDestinoId) : null,
      movimientoCajaPrestamistaId: movimientoIngreso.id,
      observaciones: data.descripcion || null,
      refOperacionEspecializadaMovCaja: correlativo,
      fechaContable: fecha,
      periodoContableId: periodoContable?.id ? BigInt(periodoContable.id) : null,
      ...auditoria,
    },
  });
  await recalcularPrestamo(tx, prestamoId);
  return { prestamoRelacionadoId: prestamoId, numeroPrestamo: vigente.prestamo.numeroPrestamo, pagoPrestamoRelacionadoId: pago.id };
}

/**
 * Préstamos vigentes con saldo entre dos empresas (para elegir en una devolución).
 * La devolución sale de la prestataria y llega a la prestamista.
 */
export async function listarVigentes({ empresaPrestamistaId, empresaPrestatariaId }) {
  if (!empresaPrestamistaId || !empresaPrestatariaId) {
    throw new ValidationError("Indique la empresa prestamista y la empresa prestataria.");
  }
  const prestamos = await prisma.prestamoRelacionado.findMany({
    where: {
      empresaPrestamistaId: BigInt(empresaPrestamistaId),
      empresaPrestatariaId: BigInt(empresaPrestatariaId),
      estadoId: ESTADO_PRESTAMO_RELACIONADO.VIGENTE,
      saldoCapital: { gt: 0 },
    },
    include: { moneda: { select: { id: true, simbolo: true, codigoSunat: true } } },
    orderBy: [{ fechaDesembolso: "asc" }, { id: "asc" }],
  });
  return prestamos.map((p) => ({
    id: p.id,
    numeroPrestamo: p.numeroPrestamo,
    fechaDesembolso: p.fechaDesembolso,
    fechaVencimiento: p.fechaVencimiento,
    monedaId: p.monedaId,
    simbolo: p.moneda?.simbolo || "",
    montoDesembolsado: num(p.montoDesembolsado),
    saldoCapital: num(p.saldoCapital),
  }));
}

// ════════════════════════════════════════════════════════════
// MANTENIMIENTO (pantalla de préstamos entre relacionadas)
// ════════════════════════════════════════════════════════════
// Los préstamos nuevos nacen en Tesorería (transferencia). Desde la pantalla se registran los préstamos
// anteriores al sistema (saldo inicial, sin movimiento de caja) y se editan datos que no afectan la
// contabilidad. Un préstamo generado desde Tesorería solo se elimina revirtiendo su operación.

const incluirEmpresasYMoneda = {
  empresaPrestamista: { select: { id: true, razonSocial: true } },
  empresaPrestataria: { select: { id: true, razonSocial: true } },
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  estado: true,
};

const vinculadoACaja = (prestamo) =>
  Boolean(prestamo.movimientoCajaDesembolsoPrestamistaId || prestamo.movimientoCajaDesembolsoPrestatariaId);

const aFecha = (valor) => (valor ? new Date(valor) : null);

const envolverErrores = (err, mensaje) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) return err;
  if (err.code && String(err.code).startsWith("P")) return new DatabaseError(mensaje, err.message);
  return err;
};

/** Lista todos los préstamos entre relacionadas. */
const listar = async () => {
  try {
    return await prisma.prestamoRelacionado.findMany({
      include: { ...incluirEmpresasYMoneda, _count: { select: { pagos: true } } },
      orderBy: [{ fechaDesembolso: "desc" }, { id: "desc" }],
    });
  } catch (err) {
    throw envolverErrores(err, "Error al listar los préstamos entre relacionadas");
  }
};

const incluirMovimientoCaja = {
  tipoMovimiento: { select: { id: true, nombre: true, esIngreso: true } },
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  empresa: { select: { id: true, razonSocial: true } },
  medioPago: true,
  cuentaCorrienteOrigen: { include: { banco: true } },
  cuentaCorrienteDestino: { include: { banco: true } },
};

// Los movimientos de la otra empresa comparten el número de operación, que se repite entre empresas:
// solo se toman los creados en la misma transacción (mismo usuario y tiempos muy cercanos).
const VENTANA_OPERACION_MS = 120000;

/**
 * Movimientos de caja de cada operación de Tesorería del préstamo: el desembolso ("desembolso") y cada
 * devolución ("pago-<id>"). Incluye los movimientos principales, el ITF y las comisiones de ambas empresas.
 */
async function cargarMovimientosOperaciones(db, prestamo) {
  const operaciones = [
    {
      clave: "desembolso",
      ref: prestamo.refOperacionEspecializadaMovCaja,
      principales: [prestamo.movimientoCajaDesembolsoPrestamistaId, prestamo.movimientoCajaDesembolsoPrestatariaId],
    },
    ...prestamo.pagos.map((p) => ({
      clave: `pago-${p.id}`,
      ref: p.refOperacionEspecializadaMovCaja,
      principales: [p.movimientoCajaPrestatariaId, p.movimientoCajaPrestamistaId],
    })),
  ].filter((o) => o.ref && o.principales.some(Boolean));

  const resultado = {};
  for (const operacion of operaciones) {
    const base = await db.movimientoCaja.findMany({
      where: { id: { in: operacion.principales.filter(Boolean) } },
      select: { fechaCreacion: true, usuarioId: true },
    });
    const tiempos = base.map((m) => m.fechaCreacion?.getTime()).filter(Boolean);
    if (base.length === 0 || tiempos.length === 0) continue;
    resultado[operacion.clave] = await db.movimientoCaja.findMany({
      where: {
        refOperacionEspecializadaMovCaja: operacion.ref,
        empresaId: { in: [prestamo.empresaPrestamistaId, prestamo.empresaPrestatariaId] },
        usuarioId: base[0].usuarioId,
        fechaCreacion: {
          gte: new Date(Math.min(...tiempos) - VENTANA_OPERACION_MS),
          lte: new Date(Math.max(...tiempos) + VENTANA_OPERACION_MS),
        },
      },
      include: incluirMovimientoCaja,
      orderBy: { id: "asc" },
    });
  }
  return resultado;
}

/** Obtiene un préstamo con sus devoluciones y los movimientos de caja que lo originaron. */
const obtenerPorId = async (id) => {
  try {
    const prestamo = await prisma.prestamoRelacionado.findUnique({
      where: { id: BigInt(id) },
      include: {
        ...incluirEmpresasYMoneda,
        cuentaCorrientePrestamista: { include: { banco: true, moneda: true } },
        cuentaCorrientePrestataria: { include: { banco: true, moneda: true } },
        pagos: {
          orderBy: [{ fechaPago: "asc" }, { id: "asc" }],
          include: {
            monedaPagoPrestataria: { select: { id: true, simbolo: true, codigoSunat: true } },
            monedaCobroPrestamista: { select: { id: true, simbolo: true, codigoSunat: true } },
          },
        },
      },
    });
    if (!prestamo) throw new NotFoundError("Préstamo entre relacionadas no encontrado");

    // Movimientos de caja que originaron el desembolso y cada devolución (incluye ITF y comisiones de la operación)
    const movimientos = await cargarMovimientosOperaciones(prisma, prestamo);
    return {
      ...prestamo,
      movimientosDesembolso: movimientos.desembolso || [],
      pagos: prestamo.pagos.map((p) => ({ ...p, movimientos: movimientos[`pago-${p.id}`] || [] })),
    };
  } catch (err) {
    throw envolverErrores(err, "Error al obtener el préstamo entre relacionadas");
  }
};

/** Valida los datos del préstamo anterior al sistema (saldo inicial). */
async function validarSaldoInicial(db, data) {
  const faltantes = [];
  if (!data.empresaPrestamistaId) faltantes.push("Empresa prestamista");
  if (!data.empresaPrestatariaId) faltantes.push("Empresa prestataria");
  if (!data.monedaId) faltantes.push("Moneda");
  if (!data.fechaDesembolso) faltantes.push("Fecha de desembolso");
  if (!(num(data.montoDesembolsado) > 0)) faltantes.push("Monto desembolsado (mayor a cero)");
  if (faltantes.length > 0) {
    throw new ValidationError(`Faltan campos obligatorios: ${faltantes.join(", ")}.`);
  }
  if (Number(data.empresaPrestamistaId) === Number(data.empresaPrestatariaId)) {
    throw new ValidationError("La empresa prestamista y la prestataria deben ser distintas.");
  }
  const pagadoAnterior = num(data.montoPagadoAnterior);
  if (pagadoAnterior < 0 || pagadoAnterior > num(data.montoDesembolsado)) {
    throw new ValidationError("Lo devuelto antes del sistema debe estar entre cero y el monto desembolsado.");
  }
  if (data.fechaVencimiento && new Date(data.fechaVencimiento) < new Date(data.fechaDesembolso)) {
    throw new ValidationError("La fecha de vencimiento no puede ser anterior a la fecha de desembolso.");
  }

  const empresas = await db.empresa.findMany({
    where: { id: { in: [BigInt(data.empresaPrestamistaId), BigInt(data.empresaPrestatariaId)] } },
    select: { id: true, razonSocial: true },
  });
  if (empresas.length !== 2) throw new NotFoundError("Una de las empresas indicadas no existe.");
}

/** Registra un préstamo anterior al sistema (saldo inicial: sin movimientos de caja). */
const crear = async (data, usuarioId = null) => {
  try {
    await validarSaldoInicial(prisma, data);
    const montoDesembolsado = r2(data.montoDesembolsado);
    const montoPagadoAnterior = r2(data.montoPagadoAnterior);
    const saldoCapital = r2(montoDesembolsado - montoPagadoAnterior);
    const fechaDesembolso = aFecha(data.fechaDesembolso);

    return await prisma.$transaction(async (tx) => {
      const creado = await crearConNumero(tx, {
        empresaPrestamistaId: BigInt(data.empresaPrestamistaId),
        empresaPrestatariaId: BigInt(data.empresaPrestatariaId),
        esGerencial: Boolean(data.esGerencial),
        esSaldoInicial: true,
        montoPagadoAnterior,
        fechaContable: aFecha(data.fechaContable) || fechaDesembolso,
        fechaDesembolso,
        fechaVencimiento: aFecha(data.fechaVencimiento),
        monedaId: BigInt(data.monedaId),
        montoDesembolsado,
        tipoCambioAplicado: num(data.tipoCambioAplicado) > 0 ? num(data.tipoCambioAplicado) : null,
        saldoCapital,
        capitalDevuelto: 0,
        estadoId: saldoCapital <= 0 ? ESTADO_PRESTAMO_RELACIONADO.PAGADO : ESTADO_PRESTAMO_RELACIONADO.VIGENTE,
        observaciones: data.observaciones || null,
        ...(usuarioId ? { creadoPor: BigInt(usuarioId) } : {}),
      });
      return tx.prestamoRelacionado.findUnique({ where: { id: creado.id }, include: incluirEmpresasYMoneda });
    });
  } catch (err) {
    throw envolverErrores(err, "Error al crear el préstamo entre relacionadas");
  }
};

/**
 * Actualiza un préstamo.
 *  - El número del préstamo (PR-000001) lo genera el sistema desde su id y no se modifica.
 *  - Préstamo generado desde Tesorería o con devoluciones: solo vencimiento y observaciones
 *    (empresas, moneda y montos están respaldados por movimientos de caja y asientos).
 *  - Préstamo anterior al sistema sin devoluciones: también empresas, moneda, montos y fechas.
 */
const actualizar = async (id, data, usuarioId = null) => {
  try {
    const existente = await prisma.prestamoRelacionado.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { pagos: true } } },
    });
    if (!existente) throw new NotFoundError("Préstamo entre relacionadas no encontrado");
    if (Number(existente.estadoId) === ESTADO_PRESTAMO_RELACIONADO.ANULADO) {
      throw new ValidationError(`El préstamo N° ${existente.numeroPrestamo} está anulado y no se puede modificar.`);
    }

    const soloDatosBasicos =
      !existente.esSaldoInicial ||
      vinculadoACaja(existente) ||
      existente._count.pagos > 0 ||
      (await contarAsientosApertura(prisma, existente.id)) > 0;
    const auditoria = { ...(usuarioId ? { actualizadoPor: BigInt(usuarioId) } : {}) };

    if (soloDatosBasicos) {
      const fechaVencimiento = aFecha(data.fechaVencimiento);
      if (fechaVencimiento && fechaVencimiento < existente.fechaDesembolso) {
        throw new ValidationError("La fecha de vencimiento no puede ser anterior a la fecha de desembolso.");
      }
      await prisma.prestamoRelacionado.update({
        where: { id: existente.id },
        data: { fechaVencimiento, observaciones: data.observaciones || null, ...auditoria },
      });
    } else {
      await validarSaldoInicial(prisma, data);
      const montoDesembolsado = r2(data.montoDesembolsado);
      const montoPagadoAnterior = r2(data.montoPagadoAnterior);
      const fechaDesembolso = aFecha(data.fechaDesembolso);
      await prisma.prestamoRelacionado.update({
        where: { id: existente.id },
        data: {
          empresaPrestamistaId: BigInt(data.empresaPrestamistaId),
          empresaPrestatariaId: BigInt(data.empresaPrestatariaId),
          esGerencial: Boolean(data.esGerencial),
          montoPagadoAnterior,
          fechaContable: aFecha(data.fechaContable) || fechaDesembolso,
          fechaDesembolso,
          fechaVencimiento: aFecha(data.fechaVencimiento),
          monedaId: BigInt(data.monedaId),
          montoDesembolsado,
          tipoCambioAplicado: num(data.tipoCambioAplicado) > 0 ? num(data.tipoCambioAplicado) : null,
          observaciones: data.observaciones || null,
          ...auditoria,
        },
      });
    }

    await recalcularPrestamo(prisma, existente.id);
    return await obtenerPorId(existente.id);
  } catch (err) {
    throw envolverErrores(err, "Error al actualizar el préstamo entre relacionadas");
  }
};

/** Elimina un préstamo anterior al sistema sin devoluciones. Los generados desde Tesorería se revierten allí. */
const eliminar = async (id) => {
  try {
    const existente = await prisma.prestamoRelacionado.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { pagos: true } } },
    });
    if (!existente) throw new NotFoundError("Préstamo entre relacionadas no encontrado");

    if (vinculadoACaja(existente)) {
      throw new ConflictError(
        `El préstamo N° ${existente.numeroPrestamo} se generó desde Tesorería` +
          (existente.refOperacionEspecializadaMovCaja ? ` (operación #${existente.refOperacionEspecializadaMovCaja})` : "") +
          ". Para eliminarlo, revierta esa operación desde Tesorería Pendientes (Revertir Operación).",
      );
    }
    if (existente._count.pagos > 0) {
      throw new ConflictError(
        `No se puede eliminar el préstamo N° ${existente.numeroPrestamo} porque tiene ${existente._count.pagos} devolución(es) registrada(s). Primero revierta esas operaciones desde Tesorería Pendientes.`,
      );
    }

    const asientos = await contarAsientosApertura(prisma, existente.id);
    if (asientos > 0) {
      throw new ConflictError(
        `El préstamo N° ${existente.numeroPrestamo} tiene ${asientos} asiento(s) de apertura. Primero elimine los asientos de apertura y luego el préstamo.`,
      );
    }

    await prisma.prestamoRelacionado.delete({ where: { id: existente.id } });
    return true;
  } catch (err) {
    throw envolverErrores(err, "Error al eliminar el préstamo entre relacionadas");
  }
};

export default {
  validarOperacion,
  registrarOperacion,
  recalcularPrestamo,
  listarVigentes,
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
