/**
 * FACTORING INDIRECTO (COMPRAS): el proveedor cedió sus facturas a un banco y MEGUI las paga al banco, cuota por factura.
 *
 *   Préstamo (TipoPrestamo.esFactoringCompras): banco sin cuenta corriente; una cuota por factura de compra (CuotaPrestamo.cuentaPorPagarId).
 *
 *   DESEMBOLSO (sin caja: no entra ni sale dinero), un solo número de operación:
 *     Por cada factura: pago de la CxP con medio FACTORING (movimientoCajaId nulo, ligado al préstamo), la CxP queda CANJEADA y su asiento
 *       DEBE 421201/421202 facturas por pagar terceros (entidad: proveedor)
 *       HABER 421203/421204 facturas por pagar factoring (entidad: banco)
 *     El préstamo pasa a DESEMBOLSADO y su deuda queda en las cuotas.
 *
 *   REVERSIÓN: por operación, desde Operaciones de Tesorería (reversionOperacionCaja.service.js, que reconoce las operaciones sin caja por el
 *     número de operación de los pagos de canje). Solo si no hay pagos de cuotas.
 */
import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import { ESTADO_CUENTA_POR_PAGAR, ESTADO_PRESTAMO_BANCARIO } from "../../utils/estados.constants.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { entidadDeBanco } from "../../utils/entidadBanco.js";
import correlativoService from "./correlativoOperacionCaja.service.js";
import { num, r2, obtenerCuentas, obtenerPeriodoAbierto, obtenerPersonalDeUsuario, obtenerMedioPagoCanje, crearAsientoLetra } from "./letraCambioBase.service.js";
import { CUENTAS_FACTORING_COMPRAS } from "../../utils/factoringCompras.constants.js";

const MEDIO_PAGO_FACTORING = "FACTORING";
const MONEDA_SOLES = 1;
const etiquetaMoneda = (monedaId) => (Number(monedaId) === MONEDA_SOLES ? "soles" : "dolares");
const etiquetaFactura = (c) => c.ordenCompra?.numeroDocumentoFinal || c.ordenCompra?.numeroDocumento || c.numeroOrdenCompra;
const manejarError = (err, accion) => {
  if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
  if (err.code && String(err.code).startsWith("P")) throw new DatabaseError(`Error al ${accion}`, err.message);
  throw err;
};

/** Registra el desembolso sin caja: canjea cada factura de compra por su cuota del factoring. */
export async function desembolsarFactoringIndirecto({ prestamoBancarioId, fechaDesembolso, tipoCambio, usuarioId }) {
  try {
    if (!prestamoBancarioId) throw new ValidationError("Seleccione el préstamo de factoring indirecto.");
    if (!fechaDesembolso || Number.isNaN(new Date(fechaDesembolso).getTime())) throw new ValidationError("Indique la fecha del desembolso (canje de las facturas).");
    const fecha = new Date(fechaDesembolso);

    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "PrestamoBancario" WHERE id = ${BigInt(prestamoBancarioId)} FOR UPDATE`;
        const prestamo = await tx.prestamoBancario.findUnique({
          where: { id: BigInt(prestamoBancarioId) },
          include: {
            banco: { select: { id: true, nombre: true, enlaceEntidadComercialId: true } },
            tipoPrestamo: { select: { esFactoringCompras: true } },
            empresa: { select: { razonSocial: true } },
            cuotas: { orderBy: { numeroCuota: "asc" } },
          },
        });
        if (!prestamo) throw new NotFoundError("Préstamo bancario no encontrado.");
        if (!prestamo.tipoPrestamo?.esFactoringCompras) throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no es de factoring indirecto (compras).`);
        if (prestamo.esSaldoInicial) throw new ValidationError("Un préstamo de saldo inicial no tiene desembolso que registrar.");
        if (Number(prestamo.estadoId) !== ESTADO_PRESTAMO_BANCARIO.APROBADO) {
          throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no admite desembolso en su estado actual (debe estar APROBADO): ya fue desembolsado o está anulado.`);
        }
        const entidadBanco = entidadDeBanco(prestamo.banco);
        if (!entidadBanco) {
          throw new ValidationError(`El banco ${prestamo.banco.nombre} no tiene entidad comercial enlazada: enlácela en Bancos para registrar el desembolso.`);
        }
        const cuotas = prestamo.cuotas.filter((c) => c.cuentaPorPagarId);
        if (cuotas.length === 0 || cuotas.length !== prestamo.cuotas.length) {
          throw new ValidationError(`Las cuotas del préstamo ${prestamo.numeroPrestamo} deben corresponder cada una a una factura de compra: edite el préstamo y agregue sus facturas.`);
        }

        const facturas = await tx.cuentaPorPagar.findMany({
          where: { id: { in: cuotas.map((c) => c.cuentaPorPagarId) } },
          include: { proveedor: { select: { id: true, razonSocial: true } }, ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } },
        });
        const extranjera = Number(prestamo.monedaId) !== MONEDA_SOLES;
        const tc = extranjera ? num(tipoCambio) : 1;
        if (extranjera && !(tc > 0)) throw new ValidationError("Ingrese el tipo de cambio de la fecha del desembolso para convertir el asiento a soles.");
        const aSoles = (monto) => (extranjera ? r2(monto * tc) : r2(monto));

        // Revalidación: las facturas pudieron cambiar desde que se creó el préstamo
        for (const cuota of cuotas) {
          const f = facturas.find((x) => String(x.id) === String(cuota.cuentaPorPagarId));
          if (!f) throw new NotFoundError(`La factura de la cuota ${cuota.numeroCuota} ya no existe.`);
          const etiqueta = etiquetaFactura(f);
          if ([ESTADO_CUENTA_POR_PAGAR.ANULADO, ESTADO_CUENTA_POR_PAGAR.CANJEADO].includes(Number(f.estadoId))) {
            throw new ValidationError(`La factura ${etiqueta} (cuota ${cuota.numeroCuota}) está anulada o ya fue canjeada.`);
          }
          if (num(f.montoPagado) > 0) throw new ValidationError(`La factura ${etiqueta} (cuota ${cuota.numeroCuota}) ya tiene pagos registrados: no puede canjearse.`);
          if (Number(f.monedaId) !== Number(prestamo.monedaId)) throw new ValidationError(`La factura ${etiqueta} está en otra moneda que el préstamo.`);
          if (Math.abs(num(f.saldoPendiente) - num(cuota.montoCapital)) > 0.009) {
            throw new ValidationError(
              `La factura ${etiqueta} cambió de saldo (cuota ${num(cuota.montoCapital).toFixed(2)} / factura ${num(f.saldoPendiente).toFixed(2)}): edite las cuotas del préstamo antes de desembolsar.`,
            );
          }
        }

        const k = etiquetaMoneda(prestamo.monedaId);
        const cuenta = await obtenerCuentas(tx, [CUENTAS_FACTORING_COMPRAS.facturasPorPagar[k], CUENTAS_FACTORING_COMPRAS.facturasFactoring[k]]);
        const periodo = await obtenerPeriodoAbierto(tx, prestamo.empresaId, fecha, prestamo.empresa.razonSocial);
        const submodulo = await tx.submoduloSistema.findFirst({ where: { nombreModeloOrigen: "PagoCuentaPorPagar", activo: true } });
        if (!submodulo) throw new ValidationError('No existe el submódulo "PagoCuentaPorPagar" para registrar el asiento del canje.');
        const medio = await obtenerMedioPagoCanje(tx, MEDIO_PAGO_FACTORING);
        const personalId = await obtenerPersonalDeUsuario(tx, usuarioId);
        const correlativo = await correlativoService.generarCorrelativo(prestamo.empresaId, tx);

        const detalle = [];
        const asientos = [];
        let total = 0;
        for (const cuota of cuotas) {
          const f = facturas.find((x) => String(x.id) === String(cuota.cuentaPorPagarId));
          const etiqueta = etiquetaFactura(f);
          const saldo = num(f.saldoPendiente);

          const pago = await tx.pagoCuentaPorPagar.create({
            data: {
              cuentaPorPagarId: f.id,
              empresaId: f.empresaId,
              fechaPago: fecha,
              montoPagado: 0,
              monedaPagoId: f.monedaId,
              tipoCambio: tc,
              montoAplicadoDeuda: saldo,
              monedaDeudaId: f.monedaId,
              medioPagoId: medio.id,
              numeroOperacion: `FACTORING ${prestamo.numeroPrestamo}`.slice(0, 50),
              movimientoCajaId: null,
              observaciones: `Canje a factoring indirecto: préstamo ${prestamo.numeroPrestamo} - ${prestamo.banco.nombre} - factura ${etiqueta}`,
              fechaContable: fecha,
              periodoContableId: periodo.id,
              creadoPor: personalId,
              refOperacionEspecializadaMovCaja: correlativo,
              prestamoBancarioId: prestamo.id,
            },
          });
          const reclamo = await tx.cuentaPorPagar.updateMany({
            where: { id: f.id, saldoPendiente: f.saldoPendiente },
            data: { montoPagado: saldo, saldoPendiente: 0, estadoId: ESTADO_CUENTA_POR_PAGAR.CANJEADO },
          });
          if (reclamo.count !== 1) throw new ValidationError(`La factura ${etiqueta} fue modificada por otro usuario. Recargue e intente nuevamente.`);

          const comun = { numeroDocumentoOrigen: etiqueta, fechaDocumentoOrigen: f.fechaEmision, fechaVenceDocumentoOrigen: cuota.fechaVencimiento };
          const asiento = await crearAsientoLetra(tx, {
            empresaId: prestamo.empresaId,
            periodo,
            fecha,
            glosa: `CANJE A FACTORING INDIRECTO DE LA FACTURA ${etiqueta} - ${f.proveedor.razonSocial} - PRESTAMO ${prestamo.numeroPrestamo} - ${prestamo.banco.nombre}`,
            tipoLibroId: TIPO_LIBRO.DIARIO,
            submodulo,
            procesoOrigenId: pago.id,
            monedaId: prestamo.monedaId,
            tipoCambio: tc,
            totalCabecera: aSoles(saldo),
            usuarioId,
            lineas: [
              { ...comun, planCuentaId: cuenta(CUENTAS_FACTORING_COMPRAS.facturasPorPagar[k]).id, debe: aSoles(saldo), haber: 0, debeME: extranjera ? saldo : null, haberME: null, entidadComercialId: f.proveedorId },
              { ...comun, planCuentaId: cuenta(CUENTAS_FACTORING_COMPRAS.facturasFactoring[k]).id, debe: 0, haber: aSoles(saldo), debeME: null, haberME: extranjera ? saldo : null, entidadComercialId: entidadBanco },
            ],
          });
          asientos.push(asiento);
          total = r2(total + saldo);
          detalle.push({ cuota: cuota.numeroCuota, factura: etiqueta, proveedor: f.proveedor.razonSocial, monto: saldo, pagoId: pago.id });
        }

        // El préstamo financia exactamente las facturas canjeadas
        await tx.prestamoBancario.update({
          where: { id: prestamo.id },
          data: { estadoId: ESTADO_PRESTAMO_BANCARIO.DESEMBOLSADO, fechaDesembolso: fecha, montoDesembolsado: total, saldoCapital: total },
        });
        return {
          prestamo: { id: prestamo.id, numeroPrestamo: prestamo.numeroPrestamo },
          operacion: correlativo,
          total,
          facturas: detalle,
          asientos: asientos.map((a) => ({ id: a.id, numeroAsiento: a.numeroAsiento, glosa: a.glosa, totalDebe: Number(a.totalDebe), totalHaber: Number(a.totalHaber) })),
        };
      },
      { timeout: 60000 },
    );
  } catch (err) {
    manejarError(err, "desembolsar el factoring indirecto");
  }
}

// ════════════════════════════════════════════════════════════
// FACTURA DE INTERESES DEL PROVEEDOR (se enlaza con la cuota / compra origen)
// ════════════════════════════════════════════════════════════

/**
 * Cuotas del factoring con la factura de intereses enlazada y las facturas que se pueden enlazar: compras del mismo proveedor y
 * empresa, que no sean las facturas financiadas por un factoring ni estén anuladas.
 */
export async function listarInteresesCuotas(prestamoBancarioId) {
  try {
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id: BigInt(prestamoBancarioId) },
      include: {
        tipoPrestamo: { select: { esFactoringCompras: true } },
        cuotas: {
          where: { cuentaPorPagarId: { not: null } },
          orderBy: { numeroCuota: "asc" },
          include: {
            cuentaPorPagar: { include: { proveedor: { select: { id: true, razonSocial: true } }, ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } } },
            cuentaPorPagarInteres: { include: { ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } } },
          },
        },
      },
    });
    if (!prestamo) throw new NotFoundError("Préstamo bancario no encontrado.");
    if (!prestamo.tipoPrestamo?.esFactoringCompras) throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no es de factoring indirecto (compras).`);
    const proveedorIds = [...new Set(prestamo.cuotas.map((c) => String(c.cuentaPorPagar.proveedorId)))].map(BigInt);
    const candidatas = await prisma.cuentaPorPagar.findMany({
      where: {
        empresaId: prestamo.empresaId,
        proveedorId: { in: proveedorIds },
        esGerencial: false,
        estadoId: { notIn: [ESTADO_CUENTA_POR_PAGAR.ANULADO, ESTADO_CUENTA_POR_PAGAR.CANJEADO] },
        cuotasPrestamoFactoringCompras: { none: {} },
      },
      include: { ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } },
      orderBy: { id: "desc" },
      take: 300,
    });
    const nombre = (c) => etiquetaFactura(c);
    return {
      cuotas: prestamo.cuotas.map((c) => ({
        cuotaId: c.id,
        numeroCuota: c.numeroCuota,
        fechaVencimiento: c.fechaVencimiento,
        capital: num(c.montoCapital),
        factura: nombre(c.cuentaPorPagar),
        proveedorId: c.cuentaPorPagar.proveedorId,
        proveedor: c.cuentaPorPagar.proveedor?.razonSocial || "",
        facturaIntereses: c.cuentaPorPagarInteres
          ? { id: c.cuentaPorPagarInteres.id, numeroDocumento: nombre(c.cuentaPorPagarInteres), saldoPendiente: num(c.cuentaPorPagarInteres.saldoPendiente), montoTotal: num(c.cuentaPorPagarInteres.montoTotal) }
          : null,
      })),
      facturasIntereses: candidatas.map((c) => ({ id: c.id, proveedorId: c.proveedorId, numeroDocumento: nombre(c), montoTotal: num(c.montoTotal), saldoPendiente: num(c.saldoPendiente) })),
    };
  } catch (err) {
    manejarError(err, "consultar las facturas de intereses del factoring");
  }
}

/** Enlaza (o suelta, con null) la factura de intereses del proveedor con una cuota del factoring. */
export async function enlazarInteresCuota({ cuotaId, cuentaPorPagarInteresId }) {
  try {
    const cuota = await prisma.cuotaPrestamo.findUnique({
      where: { id: BigInt(cuotaId) },
      include: {
        prestamo: { select: { id: true, numeroPrestamo: true, empresaId: true, tipoPrestamo: { select: { esFactoringCompras: true } } } },
        cuentaPorPagar: { select: { proveedorId: true } },
      },
    });
    if (!cuota) throw new NotFoundError("Cuota no encontrada.");
    if (!cuota.prestamo.tipoPrestamo?.esFactoringCompras || !cuota.cuentaPorPagarId) {
      throw new ValidationError(`La cuota ${cuota.numeroCuota} no pertenece a un factoring indirecto con factura de compra.`);
    }
    if (cuentaPorPagarInteresId) {
      const factura = await prisma.cuentaPorPagar.findUnique({
        where: { id: BigInt(cuentaPorPagarInteresId) },
        include: { ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true } }, cuotasPrestamoFactoringCompras: { select: { id: true } } },
      });
      if (!factura) throw new NotFoundError("La factura de intereses indicada no existe.");
      const etiqueta = etiquetaFactura(factura);
      if (String(factura.empresaId) !== String(cuota.prestamo.empresaId) || String(factura.proveedorId) !== String(cuota.cuentaPorPagar.proveedorId)) {
        throw new ValidationError(`La factura ${etiqueta} debe ser de la misma empresa y del mismo proveedor que la factura financiada por la cuota ${cuota.numeroCuota}.`);
      }
      if (factura.cuotasPrestamoFactoringCompras.length > 0) throw new ValidationError(`La factura ${etiqueta} está financiada por un factoring: no puede ser a la vez una factura de intereses.`);
      if ([ESTADO_CUENTA_POR_PAGAR.ANULADO, ESTADO_CUENTA_POR_PAGAR.CANJEADO].includes(Number(factura.estadoId))) {
        throw new ValidationError(`La factura ${etiqueta} está anulada o canjeada.`);
      }
    }
    await prisma.cuotaPrestamo.update({ where: { id: cuota.id }, data: { cuentaPorPagarInteresId: cuentaPorPagarInteresId ? BigInt(cuentaPorPagarInteresId) : null } });
    return { cuotaId: cuota.id, numeroCuota: cuota.numeroCuota, enlazada: Boolean(cuentaPorPagarInteresId) };
  } catch (err) {
    manejarError(err, "enlazar la factura de intereses con la cuota");
  }
}

export default { desembolsarFactoringIndirecto, listarInteresesCuotas, enlazarInteresCuota };
