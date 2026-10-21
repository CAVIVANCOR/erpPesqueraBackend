import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import { ESTADO_ASIENTO_CONTABLE, ESTADO_PERIODO_CONTABLE, ESTADO_PRESTAMO_RELACIONADO } from "../../utils/estados.constants.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { SENTIDO_PRESTAMO_ENTIDAD as SENTIDO, CUENTAS_PRESTAMO_ENTIDAD, RUTA_SUBMODULO_PRESTAMO_ENTIDAD } from "../../utils/prestamoEntidad.constants.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ASIENTO DE APERTURA DE PRÉSTAMOS CON ACCIONISTAS Y TERCEROS (SALDO INICIAL)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Un préstamo anterior al sistema no tiene movimientos de caja, así que su asiento se genera desde la
 * pantalla (mismo criterio que los saldos iniciales de relacionadas y de préstamos bancarios, contra 591101),
 * por el saldo pendiente a la fecha contable (montoDesembolsado - montoPagadoAnterior):
 *
 *   RECIBIDO : DEBE 591101 Utilidades acumuladas / HABER 441111-2 (accionista) o 461101-2 (tercero), entidad = acreedor
 *   OTORGADO : DEBE 142211-2 (accionista) o 161111-2 (tercero), entidad = deudor / HABER 591101
 *
 * El asiento se vincula al préstamo con submoduloOrigenId (submódulo 'prestamoEntidad') y procesoOrigenId
 * (id del préstamo). Los pagos y cobros posteriores nacen de Tesorería con sus propios asientos.
 */

const CUENTA_APERTURA = "591101";
const MONEDA_SOLES_ID = 1;

const num = (valor) => Number(valor ?? 0);
const r2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

const buscarSubmodulo = (db) =>
  db.submoduloSistema.findFirst({ where: { ruta: RUTA_SUBMODULO_PRESTAMO_ENTIDAD, activo: true }, select: { id: true } });

const incluirAsiento = {
  empresa: { select: { id: true, razonSocial: true } },
  periodoContable: { select: { id: true, nombrePeriodo: true } },
  estado: true,
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  detalles: {
    orderBy: { numeroLinea: "asc" },
    include: { planCuenta: { select: { id: true, codigoCuenta: true, nombreCuenta: true } } },
  },
};

const filtroAsientos = (submodulo, prestamoId) => ({
  submoduloOrigenId: submodulo.id,
  procesoOrigenId: BigInt(prestamoId),
  esSaldoInicial: true,
});

/** Cantidad de asientos de apertura del préstamo (para bloquear su edición o eliminación). */
export async function contarAsientosApertura(db, prestamoId) {
  const submodulo = await buscarSubmodulo(db);
  if (!submodulo) return 0;
  return db.asientoContable.count({ where: filtroAsientos(submodulo, prestamoId) });
}

/** Asientos de apertura del préstamo con sus líneas. */
export async function obtenerAsientos(prestamoId) {
  try {
    const submodulo = await buscarSubmodulo(prisma);
    if (!submodulo) return [];
    return await prisma.asientoContable.findMany({ where: filtroAsientos(submodulo, prestamoId), include: incluirAsiento, orderBy: { id: "asc" } });
  } catch (err) {
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar los asientos de apertura", err.message);
    throw err;
  }
}

/** Genera el asiento de apertura del préstamo en una transacción. */
export async function generarAsientoApertura(prestamoId, usuarioId = null) {
  try {
    return await prisma.$transaction(async (tx) => {
      const prestamo = await tx.prestamoEntidad.findUnique({
        where: { id: BigInt(prestamoId) },
        include: {
          empresa: { select: { id: true, razonSocial: true } },
          entidadComercial: { select: { id: true, razonSocial: true } },
          moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
        },
      });
      if (!prestamo) throw new NotFoundError("Préstamo con accionista o tercero no encontrado");
      if (!prestamo.esSaldoInicial) {
        throw new ValidationError(`El préstamo N° ${prestamo.numeroPrestamo} no es un saldo inicial: su asiento ya se generó con el movimiento de caja de Tesorería.`);
      }
      if (Number(prestamo.estadoId) === ESTADO_PRESTAMO_RELACIONADO.ANULADO) {
        throw new ValidationError(`El préstamo N° ${prestamo.numeroPrestamo} está anulado: no se generan asientos.`);
      }
      const submodulo = await buscarSubmodulo(tx);
      if (!submodulo) {
        throw new ValidationError(`No existe el submódulo con ruta '${RUTA_SUBMODULO_PRESTAMO_ENTIDAD}'. Créelo en el mantenimiento de submódulos del sistema antes de generar el asiento.`);
      }
      const existentes = await tx.asientoContable.findMany({ where: filtroAsientos(submodulo, prestamo.id), select: { numeroAsiento: true } });
      if (existentes.length > 0) {
        throw new ValidationError(
          `El préstamo N° ${prestamo.numeroPrestamo} ya tiene asiento de apertura (${existentes.map((a) => a.numeroAsiento).join(", ")}). Elimínelo primero si necesita volver a generarlo.`,
        );
      }

      const monedaId = Number(prestamo.monedaId);
      const monto = r2(num(prestamo.montoDesembolsado) - num(prestamo.montoPagadoAnterior));
      if (monto <= 0) {
        throw new ValidationError(`El préstamo N° ${prestamo.numeroPrestamo} ya estaba totalmente pagado antes del sistema: no hay saldo que registrar.`);
      }
      const extranjera = monedaId !== MONEDA_SOLES_ID;
      const tipoCambio = num(prestamo.tipoCambioAplicado);
      if (extranjera && !(tipoCambio > 0)) {
        throw new ValidationError(`El préstamo N° ${prestamo.numeroPrestamo} está en ${prestamo.moneda.codigoSunat}: ingrese el tipo de cambio del desembolso para convertir el asiento a soles.`);
      }
      const montoSoles = extranjera ? r2(monto * tipoCambio) : monto;

      const codigoPrestamo = CUENTAS_PRESTAMO_ENTIDAD[prestamo.sentido]?.[prestamo.esAccionista ? "accionista" : "tercero"]?.[monedaId];
      if (!codigoPrestamo) throw new ValidationError(`No hay cuenta contable de préstamos definida para la moneda ${prestamo.moneda.codigoSunat}.`);
      const codigos = [CUENTA_APERTURA, codigoPrestamo];
      const cuentas = await tx.planCuentasContable.findMany({ where: { codigoCuenta: { in: codigos }, activo: true } });
      const cuenta = (codigo) => cuentas.find((c) => c.codigoCuenta === codigo);
      const faltantes = codigos.filter((c) => !cuenta(c));
      if (faltantes.length > 0) throw new ValidationError(`Faltan cuentas contables activas en el plan de cuentas: ${faltantes.join(", ")}. Créelas o actívelas para generar el asiento.`);

      const estadoPendiente = await tx.estadoMultiFuncion.findUnique({ where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) } });
      if (!estadoPendiente) throw new ValidationError("No se encontró el estado PENDIENTE para asientos contables.");

      const fechaAsiento = new Date(prestamo.fechaContable || prestamo.fechaDesembolso);
      const empresaId = BigInt(prestamo.empresaId);
      const periodo = await tx.periodoContable.findFirst({ where: { empresaId, anio: fechaAsiento.getFullYear(), mes: fechaAsiento.getMonth() + 1 } });
      if (!periodo) {
        throw new ValidationError(`No existe el período contable ${fechaAsiento.getMonth() + 1}/${fechaAsiento.getFullYear()} de ${prestamo.empresa.razonSocial}. Cree el período o corrija la fecha contable del préstamo.`);
      }
      if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
        throw new ValidationError(`El período contable ${periodo.mes}/${periodo.anio} de ${prestamo.empresa.razonSocial} no está abierto: no se pueden registrar asientos.`);
      }

      const ultimo = await tx.asientoContable.findFirst({ where: { empresaId, periodoContableId: periodo.id }, orderBy: { correlativo: "desc" } });
      const correlativo = (ultimo?.correlativo || 0) + 1;
      const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;
      const tipo = prestamo.esAccionista ? "ACCIONISTA" : "TERCERO";
      const recibido = prestamo.sentido === SENTIDO.RECIBIDO;
      const glosa = `SALDO INICIAL PRÉSTAMO N° ${prestamo.numeroPrestamo} ${recibido ? "RECIBIDO DE" : "OTORGADO A"} ${tipo} ${prestamo.entidadComercial.razonSocial}`;

      const linea = (numeroLinea, cuentaLinea, esDebe, conEntidad) => ({
        numeroLinea,
        planCuentaId: cuentaLinea.id,
        glosa,
        debe: esDebe ? montoSoles : 0,
        haber: esDebe ? 0 : montoSoles,
        monedaId: MONEDA_SOLES_ID,
        tipoCambio: extranjera ? tipoCambio : 1,
        debeMonedaExtranjera: extranjera && esDebe ? monto : null,
        haberMonedaExtranjera: extranjera && !esDebe ? monto : null,
        entidadComercialId: conEntidad ? BigInt(prestamo.entidadComercialId) : null,
        submoduloOrigenLineaId: submodulo.id,
        procesoOrigenLineaId: prestamo.id,
        creadoPor: usuarioId ? BigInt(usuarioId) : null,
      });
      // RECIBIDO: DEBE apertura / HABER pasivo. OTORGADO: DEBE activo / HABER apertura.
      const lineas = recibido
        ? [linea(1, cuenta(CUENTA_APERTURA), true, false), linea(2, cuenta(codigoPrestamo), false, true)]
        : [linea(1, cuenta(codigoPrestamo), true, true), linea(2, cuenta(CUENTA_APERTURA), false, false)];

      const asiento = await tx.asientoContable.create({
        data: {
          empresaId,
          periodoContableId: periodo.id,
          numeroAsiento,
          correlativo,
          fechaAsiento,
          glosa,
          tipoLibro: prestamo.esGerencial ? "GERENCIAL" : "FISCAL",
          tipoLibroId: TIPO_LIBRO.DIARIO,
          esGerencial: Boolean(prestamo.esGerencial),
          esSaldoInicial: true,
          origenAsiento: "AUTOMATICO",
          submoduloOrigenId: submodulo.id,
          procesoOrigenId: prestamo.id,
          estadoId: estadoPendiente.id,
          // Cabecera en la moneda original del préstamo; las líneas siempre en soles (patrón de los asientos de caja)
          totalDebe: monto,
          totalHaber: monto,
          diferencia: 0,
          estaCuadrado: true,
          monedaId,
          tipoCambio: extranjera ? tipoCambio : 1,
          creadoPor: usuarioId ? BigInt(usuarioId) : null,
          detalles: { create: lineas },
        },
        include: incluirAsiento,
      });
      return [asiento];
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al generar el asiento de apertura", err.message);
    throw err;
  }
}

/** Elimina el asiento de apertura del préstamo (solo si sigue pendiente). */
export async function eliminarAsientos(prestamoId) {
  try {
    const submodulo = await buscarSubmodulo(prisma);
    if (!submodulo) return { eliminados: 0 };
    const asientos = await prisma.asientoContable.findMany({
      where: filtroAsientos(submodulo, prestamoId),
      select: { id: true, numeroAsiento: true, estadoId: true },
    });
    if (asientos.length === 0) return { eliminados: 0 };
    const noPendientes = asientos.filter((a) => Number(a.estadoId) !== Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE));
    if (noPendientes.length > 0) {
      throw new ValidationError(
        `No se puede eliminar el asiento de apertura porque ${noPendientes.map((a) => a.numeroAsiento).join(", ")} ya no está pendiente (aprobado o anulado). Reviértalo desde Contabilidad.`,
      );
    }
    await prisma.asientoContable.deleteMany({ where: { id: { in: asientos.map((a) => a.id) } } });
    return { eliminados: asientos.length };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al eliminar el asiento de apertura", err.message);
    throw err;
  }
}

export default { contarAsientosApertura, obtenerAsientos, generarAsientoApertura, eliminarAsientos };
