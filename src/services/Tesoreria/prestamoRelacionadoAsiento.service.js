import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import { ESTADO_ASIENTO_CONTABLE, ESTADO_PERIODO_CONTABLE, ESTADO_PRESTAMO_RELACIONADO } from "../../utils/estados.constants.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ASIENTOS DE APERTURA DE PRÉSTAMOS ENTRE RELACIONADAS (SALDO INICIAL)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Un préstamo anterior al sistema no tiene movimientos de caja, así que sus asientos se generan
 * desde la pantalla (mismo criterio que los saldos iniciales de préstamos bancarios, contra 591101).
 * Cada empresa registra el suyo, por el saldo pendiente a la fecha contable
 * (montoDesembolsado - montoPagadoAnterior):
 *
 *   Prestamista:  DEBE 171111/171112 Cuentas por cobrar a relacionadas (entidad: prestataria)
 *                 HABER 591101 Utilidades acumuladas
 *   Prestataria:  DEBE 591101 Utilidades acumuladas
 *                 HABER 471101/471112 Cuentas por pagar a relacionadas (entidad: prestamista)
 *
 * Los asientos se vinculan al préstamo con submoduloOrigenId (submódulo "prestamoRelacionado") y
 * procesoOrigenId (id del préstamo). Las devoluciones posteriores nacen de Tesorería con sus propios asientos.
 */

const RUTA_SUBMODULO = "prestamoRelacionado";
const CUENTA_APERTURA = "591101";
const CUENTAS_RELACIONADAS = {
  porCobrar: { 1: "171111", 2: "171112" },
  porPagar: { 1: "471101", 2: "471112" },
};
const MONEDA_SOLES_ID = 1;

const num = (valor) => Number(valor ?? 0);
const r2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

const buscarSubmodulo = (db) =>
  db.submoduloSistema.findFirst({ where: { ruta: RUTA_SUBMODULO, activo: true }, select: { id: true } });

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
    return await prisma.asientoContable.findMany({
      where: filtroAsientos(submodulo, prestamoId),
      include: incluirAsiento,
      orderBy: { id: "asc" },
    });
  } catch (err) {
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar los asientos de apertura", err.message);
    throw err;
  }
}

/** Genera los dos asientos de apertura (uno por empresa) en una sola transacción. */
export async function generarAsientoApertura(prestamoId, usuarioId = null) {
  try {
    return await prisma.$transaction(async (tx) => {
      const prestamo = await tx.prestamoRelacionado.findUnique({
        where: { id: BigInt(prestamoId) },
        include: {
          empresaPrestamista: { select: { id: true, razonSocial: true, entidadComercialId: true } },
          empresaPrestataria: { select: { id: true, razonSocial: true, entidadComercialId: true } },
          moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
        },
      });
      if (!prestamo) throw new NotFoundError("Préstamo entre relacionadas no encontrado");

      if (!prestamo.esSaldoInicial) {
        throw new ValidationError(
          `El préstamo N° ${prestamo.numeroPrestamo} no es un saldo inicial: sus asientos ya se generaron con los movimientos de caja de Tesorería.`,
        );
      }
      if (Number(prestamo.estadoId) === ESTADO_PRESTAMO_RELACIONADO.ANULADO) {
        throw new ValidationError(`El préstamo N° ${prestamo.numeroPrestamo} está anulado: no se generan asientos.`);
      }

      const submodulo = await buscarSubmodulo(tx);
      if (!submodulo) {
        throw new ValidationError(
          `No existe el submódulo con ruta '${RUTA_SUBMODULO}'. Créelo en el mantenimiento de submódulos del sistema antes de generar el asiento.`,
        );
      }

      const existentes = await tx.asientoContable.findMany({
        where: filtroAsientos(submodulo, prestamo.id),
        select: { numeroAsiento: true },
      });
      if (existentes.length > 0) {
        throw new ValidationError(
          `El préstamo N° ${prestamo.numeroPrestamo} ya tiene asiento(s) de apertura (${existentes.map((a) => a.numeroAsiento).join(", ")}). Elimínelos primero si necesita volver a generarlos.`,
        );
      }

      const monedaId = Number(prestamo.monedaId);
      const monto = r2(num(prestamo.montoDesembolsado) - num(prestamo.montoPagadoAnterior));
      if (monto <= 0) {
        throw new ValidationError(
          `El préstamo N° ${prestamo.numeroPrestamo} ya estaba totalmente devuelto antes del sistema: no hay saldo que registrar.`,
        );
      }
      const tipoCambio = num(prestamo.tipoCambioAplicado);
      if (monedaId !== MONEDA_SOLES_ID && !(tipoCambio > 0)) {
        throw new ValidationError(
          `El préstamo N° ${prestamo.numeroPrestamo} está en ${prestamo.moneda.codigoSunat}: ingrese el tipo de cambio del desembolso para convertir el asiento a soles.`,
        );
      }
      const montoSoles = monedaId === MONEDA_SOLES_ID ? monto : r2(monto * tipoCambio);
      const extranjera = monedaId !== MONEDA_SOLES_ID;

      const codigos = [CUENTA_APERTURA, CUENTAS_RELACIONADAS.porCobrar[monedaId], CUENTAS_RELACIONADAS.porPagar[monedaId]];
      if (codigos.some((c) => !c)) {
        throw new ValidationError(`No hay cuentas de relacionadas definidas para la moneda ${prestamo.moneda.codigoSunat}.`);
      }
      const cuentas = await tx.planCuentasContable.findMany({ where: { codigoCuenta: { in: codigos }, activo: true } });
      const cuenta = (codigo) => cuentas.find((c) => c.codigoCuenta === codigo);
      const faltantes = codigos.filter((c) => !cuenta(c));
      if (faltantes.length > 0) {
        throw new ValidationError(`Faltan cuentas contables activas en el plan de cuentas: ${faltantes.join(", ")}.`);
      }

      const estadoPendiente = await tx.estadoMultiFuncion.findUnique({ where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) } });
      if (!estadoPendiente) throw new ValidationError("No se encontró el estado PENDIENTE para asientos contables.");

      const fechaAsiento = new Date(prestamo.fechaContable || prestamo.fechaDesembolso);
      const lados = [
        {
          empresa: prestamo.empresaPrestamista,
          contraparte: prestamo.empresaPrestataria,
          debe: cuenta(CUENTAS_RELACIONADAS.porCobrar[monedaId]),
          haber: cuenta(CUENTA_APERTURA),
          entidadEnDebe: true,
          glosa: `SALDO INICIAL PRÉSTAMO N° ${prestamo.numeroPrestamo} OTORGADO A ${prestamo.empresaPrestataria.razonSocial}`,
        },
        {
          empresa: prestamo.empresaPrestataria,
          contraparte: prestamo.empresaPrestamista,
          debe: cuenta(CUENTA_APERTURA),
          haber: cuenta(CUENTAS_RELACIONADAS.porPagar[monedaId]),
          entidadEnDebe: false,
          glosa: `SALDO INICIAL PRÉSTAMO N° ${prestamo.numeroPrestamo} RECIBIDO DE ${prestamo.empresaPrestamista.razonSocial}`,
        },
      ];

      const creados = [];
      for (const lado of lados) {
        const empresaId = BigInt(lado.empresa.id);
        const periodo = await tx.periodoContable.findFirst({
          where: { empresaId, anio: fechaAsiento.getFullYear(), mes: fechaAsiento.getMonth() + 1 },
        });
        if (!periodo) {
          throw new ValidationError(
            `No existe el período contable ${fechaAsiento.getMonth() + 1}/${fechaAsiento.getFullYear()} de ${lado.empresa.razonSocial}. Cree el período o corrija la fecha contable del préstamo.`,
          );
        }
        if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
          throw new ValidationError(
            `El período contable ${periodo.mes}/${periodo.anio} de ${lado.empresa.razonSocial} no está abierto: no se pueden registrar asientos.`,
          );
        }

        const ultimo = await tx.asientoContable.findFirst({
          where: { empresaId, periodoContableId: periodo.id },
          orderBy: { correlativo: "desc" },
        });
        const correlativo = (ultimo?.correlativo || 0) + 1;
        const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;
        const entidadComercialId = lado.contraparte.entidadComercialId ? BigInt(lado.contraparte.entidadComercialId) : null;

        const linea = (numeroLinea, cuentaLinea, esDebe, conEntidad) => ({
          numeroLinea,
          planCuentaId: cuentaLinea.id,
          glosa: lado.glosa,
          debe: esDebe ? montoSoles : 0,
          haber: esDebe ? 0 : montoSoles,
          monedaId: MONEDA_SOLES_ID,
          tipoCambio: extranjera ? tipoCambio : 1,
          debeMonedaExtranjera: extranjera && esDebe ? monto : null,
          haberMonedaExtranjera: extranjera && !esDebe ? monto : null,
          entidadComercialId: conEntidad ? entidadComercialId : null,
          submoduloOrigenLineaId: submodulo.id,
          procesoOrigenLineaId: prestamo.id,
          creadoPor: usuarioId ? BigInt(usuarioId) : null,
        });

        const asiento = await tx.asientoContable.create({
          data: {
            empresaId,
            periodoContableId: periodo.id,
            numeroAsiento,
            correlativo,
            fechaAsiento,
            glosa: lado.glosa,
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
            detalles: {
              create: [linea(1, lado.debe, true, lado.entidadEnDebe), linea(2, lado.haber, false, !lado.entidadEnDebe)],
            },
          },
          include: incluirAsiento,
        });
        creados.push(asiento);
      }
      return creados;
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al generar los asientos de apertura", err.message);
    throw err;
  }
}

/** Elimina los asientos de apertura del préstamo (solo si siguen pendientes). */
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
        `No se pueden eliminar los asientos de apertura porque ${noPendientes.map((a) => a.numeroAsiento).join(", ")} ya no está(n) pendiente(s) (aprobado o anulado). Reviértalo desde Contabilidad.`,
      );
    }
    await prisma.asientoContable.deleteMany({ where: { id: { in: asientos.map((a) => a.id) } } });
    return { eliminados: asientos.length };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al eliminar los asientos de apertura", err.message);
    throw err;
  }
}

export default { contarAsientosApertura, obtenerAsientos, generarAsientoApertura, eliminarAsientos };
