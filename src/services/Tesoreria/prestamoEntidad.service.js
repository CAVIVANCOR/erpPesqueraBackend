import { randomUUID } from "crypto";
import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, ConflictError, DatabaseError } from "../../utils/errors.js";
import { ESTADO_PRESTAMO_RELACIONADO as ESTADO } from "../../utils/estados.constants.js";
import { SENTIDO_PRESTAMO_ENTIDAD as SENTIDO, PREFIJO_NUMERO_PRESTAMO_ENTIDAD } from "../../utils/prestamoEntidad.constants.js";
import { contarAsientosApertura } from "./prestamoEntidadAsiento.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: PRÉSTAMOS CON ACCIONISTAS Y TERCEROS (mantenimiento y saldos)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Préstamos simples de solo capital (sin intereses, mora ni retención), en ambos sentidos:
 *   RECIBIDO: la empresa es la deudora. OTORGADO: la empresa es la acreedora.
 * Nacen en Tesorería (operación "Préstamo con accionista / tercero", ver prestamoEntidadOperacion.service.js).
 * Desde la pantalla se registran los préstamos anteriores al sistema (saldo inicial, sin movimiento de caja)
 * y se editan datos que no afectan la contabilidad.
 */

const TOLERANCIA = 0.01;
export const num = (valor) => Number(valor ?? 0);
export const r2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

const numeroDesdeId = (id) => `${PREFIJO_NUMERO_PRESTAMO_ENTIDAD}-${String(id).padStart(6, "0")}`;
const aFecha = (valor) => (valor ? new Date(valor) : null);

/** Crea el préstamo y le asigna su número definitivo (necesita el id); el provisional nunca queda guardado. */
export async function crearConNumero(tx, datos) {
  const creado = await tx.prestamoEntidad.create({ data: { ...datos, numeroPrestamo: `TMP-${randomUUID()}` } });
  return tx.prestamoEntidad.update({ where: { id: creado.id }, data: { numeroPrestamo: numeroDesdeId(creado.id) } });
}

/** Saldo y estado del préstamo a partir de sus pagos (única verdad). */
export async function recalcularPrestamo(tx, prestamoId) {
  const prestamo = await tx.prestamoEntidad.findUnique({ where: { id: BigInt(prestamoId) } });
  if (!prestamo) return null;
  const suma = await tx.pagoPrestamoEntidad.aggregate({
    where: { prestamoEntidadId: prestamo.id },
    _sum: { montoAplicado: true },
  });
  const capitalPagado = r2(num(suma._sum.montoAplicado));
  let saldoCapital = r2(num(prestamo.montoDesembolsado) - num(prestamo.montoPagadoAnterior) - capitalPagado);
  if (Math.abs(saldoCapital) <= TOLERANCIA) saldoCapital = 0;
  const estadoId =
    Number(prestamo.estadoId) === ESTADO.ANULADO ? prestamo.estadoId : saldoCapital <= 0 ? ESTADO.PAGADO : ESTADO.VIGENTE;
  return tx.prestamoEntidad.update({ where: { id: prestamo.id }, data: { capitalPagado, saldoCapital, estadoId } });
}

const envolverErrores = (err, mensaje) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) return err;
  if (err.code && String(err.code).startsWith("P")) return new DatabaseError(mensaje, err.message);
  return err;
};

const incluirBase = {
  empresa: { select: { id: true, razonSocial: true } },
  entidadComercial: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  estado: true,
};

const vinculadoACaja = (prestamo) => Boolean(prestamo.movimientoCajaDesembolsoId);

/** Lista los préstamos. Filtros opcionales: empresaId, sentido, esAccionista, entidadComercialId. */
const listar = async (filtros = {}) => {
  try {
    const { empresaId, sentido, esAccionista, entidadComercialId } = filtros;
    return await prisma.prestamoEntidad.findMany({
      where: {
        ...(empresaId ? { empresaId: BigInt(empresaId) } : {}),
        ...(sentido ? { sentido } : {}),
        ...(esAccionista !== undefined && esAccionista !== "" ? { esAccionista: String(esAccionista) === "true" } : {}),
        ...(entidadComercialId ? { entidadComercialId: BigInt(entidadComercialId) } : {}),
      },
      include: { ...incluirBase, _count: { select: { pagos: true } } },
      orderBy: [{ fechaDesembolso: "desc" }, { id: "desc" }],
    });
  } catch (err) {
    throw envolverErrores(err, "Error al listar los préstamos con accionistas y terceros");
  }
};

/** Préstamos vigentes con saldo de una empresa (para elegir en un pago o cobro). Opcional: sentido, entidad. */
const listarVigentes = async ({ empresaId, sentido, entidadComercialId }) => {
  if (!empresaId) throw new ValidationError("Indique la empresa del préstamo.");
  const prestamos = await prisma.prestamoEntidad.findMany({
    where: {
      empresaId: BigInt(empresaId),
      estadoId: ESTADO.VIGENTE,
      saldoCapital: { gt: 0 },
      ...(sentido ? { sentido } : {}),
      ...(entidadComercialId ? { entidadComercialId: BigInt(entidadComercialId) } : {}),
    },
    include: { entidadComercial: { select: { id: true, razonSocial: true } }, moneda: { select: { id: true, simbolo: true } } },
    orderBy: [{ fechaDesembolso: "asc" }, { id: "asc" }],
  });
  return prestamos.map((p) => ({
    id: p.id,
    numeroPrestamo: p.numeroPrestamo,
    sentido: p.sentido,
    esAccionista: p.esAccionista,
    entidadComercialId: p.entidadComercialId,
    entidad: p.entidadComercial?.razonSocial || "",
    fechaDesembolso: p.fechaDesembolso,
    fechaVencimiento: p.fechaVencimiento,
    monedaId: p.monedaId,
    simbolo: p.moneda?.simbolo || "",
    montoDesembolsado: num(p.montoDesembolsado),
    saldoCapital: num(p.saldoCapital),
  }));
};

/** Obtiene un préstamo con sus pagos/cobros y los movimientos de caja que lo originaron. */
const obtenerPorId = async (id) => {
  try {
    const prestamo = await prisma.prestamoEntidad.findUnique({
      where: { id: BigInt(id) },
      include: {
        ...incluirBase,
        cuentaCorriente: { include: { banco: true, moneda: true } },
        medioPago: true,
        pagos: {
          orderBy: [{ fechaPago: "asc" }, { id: "asc" }],
          include: { medioPago: true, moneda: { select: { id: true, simbolo: true, codigoSunat: true } } },
        },
      },
    });
    if (!prestamo) throw new NotFoundError("Préstamo con accionista o tercero no encontrado");

    const incluirMov = {
      tipoMovimiento: { select: { id: true, nombre: true, esIngreso: true } },
      moneda: { select: { id: true, simbolo: true } },
      cuentaCorrienteDestino: { include: { banco: true } },
      cuentaCorrienteOrigen: { include: { banco: true } },
    };
    const movimientosDe = async (ref, principalId) =>
      ref && principalId
        ? prisma.movimientoCaja.findMany({
            where: { refOperacionEspecializadaMovCaja: ref, empresaId: prestamo.empresaId },
            include: incluirMov,
            orderBy: { id: "asc" },
          })
        : [];
    return {
      ...prestamo,
      movimientosDesembolso: await movimientosDe(prestamo.refOperacionEspecializadaMovCaja, prestamo.movimientoCajaDesembolsoId),
      pagos: await Promise.all(
        prestamo.pagos.map(async (p) => ({ ...p, movimientos: await movimientosDe(p.refOperacionEspecializadaMovCaja, p.movimientoCajaId) })),
      ),
    };
  } catch (err) {
    throw envolverErrores(err, "Error al obtener el préstamo con accionista o tercero");
  }
};

/** Valida los datos de un préstamo anterior al sistema (saldo inicial). */
async function validarSaldoInicial(db, data) {
  const faltantes = [];
  if (!data.empresaId) faltantes.push("Empresa");
  if (!data.entidadComercialId) faltantes.push("Accionista / tercero");
  if (!data.sentido) faltantes.push("Sentido del préstamo (recibido u otorgado)");
  if (!data.monedaId) faltantes.push("Moneda");
  if (!data.fechaDesembolso) faltantes.push("Fecha de desembolso");
  if (!(num(data.montoDesembolsado) > 0)) faltantes.push("Monto desembolsado (mayor a cero)");
  if (faltantes.length > 0) throw new ValidationError(`Faltan campos obligatorios: ${faltantes.join(", ")}.`);
  if (!Object.values(SENTIDO).includes(data.sentido)) {
    throw new ValidationError("El sentido del préstamo debe ser RECIBIDO u OTORGADO.");
  }
  const pagadoAnterior = num(data.montoPagadoAnterior);
  if (pagadoAnterior < 0 || pagadoAnterior > num(data.montoDesembolsado)) {
    throw new ValidationError("Lo pagado antes del sistema debe estar entre cero y el monto desembolsado.");
  }
  if (data.fechaVencimiento && new Date(data.fechaVencimiento) < new Date(data.fechaDesembolso)) {
    throw new ValidationError("La fecha de vencimiento no puede ser anterior a la fecha de desembolso.");
  }
  const empresa = await db.empresa.findUnique({ where: { id: BigInt(data.empresaId) }, select: { id: true } });
  if (!empresa) throw new NotFoundError("La empresa indicada no existe.");
  const entidad = await db.entidadComercial.findUnique({ where: { id: BigInt(data.entidadComercialId) }, select: { id: true } });
  if (!entidad) throw new NotFoundError("El accionista o tercero indicado no existe.");
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
        empresaId: BigInt(data.empresaId),
        entidadComercialId: BigInt(data.entidadComercialId),
        sentido: data.sentido,
        esAccionista: Boolean(data.esAccionista),
        esGerencial: false,
        esSaldoInicial: true,
        montoPagadoAnterior,
        fechaContable: aFecha(data.fechaContable) || fechaDesembolso,
        fechaDesembolso,
        fechaVencimiento: aFecha(data.fechaVencimiento),
        monedaId: BigInt(data.monedaId),
        montoDesembolsado,
        tipoCambioAplicado: num(data.tipoCambioAplicado) > 0 ? num(data.tipoCambioAplicado) : null,
        saldoCapital,
        capitalPagado: 0,
        estadoId: saldoCapital <= 0 ? ESTADO.PAGADO : ESTADO.VIGENTE,
        observaciones: data.observaciones || null,
        ...(usuarioId ? { creadoPor: BigInt(usuarioId) } : {}),
      });
      return tx.prestamoEntidad.findUnique({ where: { id: creado.id }, include: incluirBase });
    });
  } catch (err) {
    throw envolverErrores(err, "Error al crear el préstamo con accionista o tercero");
  }
};

/**
 * Actualiza un préstamo.
 *  - Generado desde Tesorería o con pagos: solo vencimiento y observaciones (el resto está respaldado por caja y asientos).
 *  - Anterior al sistema y sin pagos: también empresa, contraparte, sentido, tipo, moneda, montos y fechas.
 */
const actualizar = async (id, data, usuarioId = null) => {
  try {
    const existente = await prisma.prestamoEntidad.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { pagos: true } } },
    });
    if (!existente) throw new NotFoundError("Préstamo con accionista o tercero no encontrado");
    if (Number(existente.estadoId) === ESTADO.ANULADO) {
      throw new ValidationError(`El préstamo N° ${existente.numeroPrestamo} está anulado y no se puede modificar.`);
    }
    const soloDatosBasicos =
      !existente.esSaldoInicial ||
      vinculadoACaja(existente) ||
      existente._count.pagos > 0 ||
      (await contarAsientosApertura(prisma, existente.id)) > 0;
    const auditoria = usuarioId ? { actualizadoPor: BigInt(usuarioId) } : {};

    if (soloDatosBasicos) {
      const fechaVencimiento = aFecha(data.fechaVencimiento);
      if (fechaVencimiento && fechaVencimiento < existente.fechaDesembolso) {
        throw new ValidationError("La fecha de vencimiento no puede ser anterior a la fecha de desembolso.");
      }
      await prisma.prestamoEntidad.update({
        where: { id: existente.id },
        data: { fechaVencimiento, observaciones: data.observaciones || null, ...auditoria },
      });
    } else {
      await validarSaldoInicial(prisma, data);
      const fechaDesembolso = aFecha(data.fechaDesembolso);
      await prisma.prestamoEntidad.update({
        where: { id: existente.id },
        data: {
          empresaId: BigInt(data.empresaId),
          entidadComercialId: BigInt(data.entidadComercialId),
          sentido: data.sentido,
          esAccionista: Boolean(data.esAccionista),
          montoPagadoAnterior: r2(data.montoPagadoAnterior),
          fechaContable: aFecha(data.fechaContable) || fechaDesembolso,
          fechaDesembolso,
          fechaVencimiento: aFecha(data.fechaVencimiento),
          monedaId: BigInt(data.monedaId),
          montoDesembolsado: r2(data.montoDesembolsado),
          tipoCambioAplicado: num(data.tipoCambioAplicado) > 0 ? num(data.tipoCambioAplicado) : null,
          observaciones: data.observaciones || null,
          ...auditoria,
        },
      });
    }
    await recalcularPrestamo(prisma, existente.id);
    return await obtenerPorId(existente.id);
  } catch (err) {
    throw envolverErrores(err, "Error al actualizar el préstamo con accionista o tercero");
  }
};

/** Elimina un préstamo anterior al sistema sin pagos. Los generados desde Tesorería se revierten allí. */
const eliminar = async (id) => {
  try {
    const existente = await prisma.prestamoEntidad.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { pagos: true } } },
    });
    if (!existente) throw new NotFoundError("Préstamo con accionista o tercero no encontrado");
    if (vinculadoACaja(existente)) {
      throw new ConflictError(
        `El préstamo N° ${existente.numeroPrestamo} se generó desde Tesorería` +
          (existente.refOperacionEspecializadaMovCaja ? ` (operación #${existente.refOperacionEspecializadaMovCaja})` : "") +
          ". Para eliminarlo, revierta esa operación desde Tesorería Pendientes (Revertir Operación).",
      );
    }
    if (existente._count.pagos > 0) {
      throw new ConflictError(
        `No se puede eliminar el préstamo N° ${existente.numeroPrestamo} porque tiene ${existente._count.pagos} pago(s) o cobro(s) registrado(s). Primero revierta esas operaciones desde Tesorería Pendientes.`,
      );
    }
    const asientos = await contarAsientosApertura(prisma, existente.id);
    if (asientos > 0) {
      throw new ConflictError(
        `El préstamo N° ${existente.numeroPrestamo} tiene ${asientos} asiento(s) de apertura. Primero elimine el asiento de apertura y luego el préstamo.`,
      );
    }
    await prisma.prestamoEntidad.delete({ where: { id: existente.id } });
    return true;
  } catch (err) {
    throw envolverErrores(err, "Error al eliminar el préstamo con accionista o tercero");
  }
};

export default { recalcularPrestamo, listarVigentes, listar, obtenerPorId, crear, actualizar, eliminar };
