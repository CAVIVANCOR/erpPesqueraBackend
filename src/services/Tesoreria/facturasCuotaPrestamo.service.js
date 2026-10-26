/**
 * Cuotas de un préstamo de factoring amarradas a su factura.
 *
 *  - Factoring de VENTAS (TipoPrestamo.esFactoring): cada cuota corresponde a una factura por cobrar (CxC) entregada al banco;
 *    el cliente la paga directamente al banco en su fecha de vencimiento.
 *  - Factoring de COMPRAS (TipoPrestamo.esFactoringCompras): cada cuota corresponde a una factura por pagar (CxP) de un
 *    proveedor que el banco paga por la empresa; la empresa paga la cuota al banco en su vencimiento.
 *
 * El usuario escribe el vencimiento de cada cuota (y, en ventas con interés diferido, el interés). El capital siempre es el saldo
 * de la factura: el banco financia el 100 % de cada una.
 */
import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError, NotFoundError } from "../../utils/errors.js";
import { ESTADO_CUENTA_POR_COBRAR, ESTADO_CUENTA_POR_PAGAR, ESTADO_CUOTA_PRESTAMO } from "../../utils/estados.constants.js";

const num = (v) => Number(v || 0);
const r2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;

export const TIPO_FACTORING = { VENTAS: "VENTAS", COMPRAS: "COMPRAS" };

/** Devuelve VENTAS, COMPRAS o null según las marcas del tipo de préstamo. */
export const tipoFactoringDe = (tipoPrestamo) => {
  if (tipoPrestamo?.esFactoring) return TIPO_FACTORING.VENTAS;
  if (tipoPrestamo?.esFactoringCompras) return TIPO_FACTORING.COMPRAS;
  return null;
};

const etiquetaCxC = (c) => c.preFactura?.numeroDocumentoFinal || c.preFactura?.numeroDocumento || c.numeroPreFactura;
const etiquetaCxP = (c) => c.numeroOrdenCompra;

/**
 * Facturas que pueden amarrarse a una cuota: fiscales, sin cobros/pagos, con saldo, de la empresa y moneda del préstamo y que
 * no estén ya en una cuota de otro préstamo. Las del propio préstamo (prestamoId) se incluyen para poder editarlo.
 */
export async function listarFacturasDisponibles({ tipo, empresaId, monedaId, prestamoId = null }) {
  try {
    if (!Object.values(TIPO_FACTORING).includes(tipo)) throw new ValidationError("Indique si el factoring es de VENTAS o de COMPRAS.");
    if (!empresaId || !monedaId) throw new ValidationError("Indique la empresa y la moneda del préstamo para listar las facturas.");
    const base = { empresaId: BigInt(empresaId), monedaId: BigInt(monedaId), esGerencial: false, saldoPendiente: { gt: 0 }, montoPagado: 0 };
    const sinOtroPrestamo = (relacion) => ({
      [relacion]: { none: prestamoId ? { prestamoBancarioId: { not: BigInt(prestamoId) } } : {} },
    });

    if (tipo === TIPO_FACTORING.VENTAS) {
      const lista = await prisma.cuentaPorCobrar.findMany({
        where: {
          ...base,
          estadoId: { notIn: [ESTADO_CUENTA_POR_COBRAR.ANULADO, ESTADO_CUENTA_POR_COBRAR.CANJEADO] },
          ...sinOtroPrestamo("cuotasPrestamoFactoring"),
        },
        include: {
          cliente: { select: { razonSocial: true } },
          moneda: { select: { simbolo: true } },
          preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } },
        },
        orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
      });
      return lista.map((c) => ({
        id: c.id,
        numeroDocumento: etiquetaCxC(c),
        entidad: c.cliente?.razonSocial || "",
        fechaEmision: c.fechaEmision,
        fechaVencimiento: c.fechaVencimiento,
        simbolo: c.moneda?.simbolo || "",
        saldoPendiente: num(c.saldoPendiente),
      }));
    }

    const lista = await prisma.cuentaPorPagar.findMany({
      where: {
        ...base,
        estadoId: { notIn: [ESTADO_CUENTA_POR_PAGAR.ANULADO, ESTADO_CUENTA_POR_PAGAR.CANJEADO] },
        ...sinOtroPrestamo("cuotasPrestamoFactoringCompras"),
      },
      include: { proveedor: { select: { razonSocial: true } }, moneda: { select: { simbolo: true } } },
      orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
    });
    return lista.map((c) => ({
      id: c.id,
      numeroDocumento: etiquetaCxP(c),
      entidad: c.proveedor?.razonSocial || "",
      fechaEmision: c.fechaEmision || null,
      fechaVencimiento: c.fechaVencimiento,
      simbolo: c.moneda?.simbolo || "",
      saldoPendiente: num(c.saldoPendiente),
    }));
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar las facturas disponibles para las cuotas", err.message);
    throw err;
  }
}

/**
 * Arma y valida las cuotas de un factoring a partir de sus facturas. Una cuota por factura, ordenadas por vencimiento.
 * @param db cliente Prisma o transacción
 * @param prestamo datos del préstamo (empresaId, monedaId, interesDescontado)
 * @param items [{ facturaId, fechaVencimiento, montoInteres? }]
 * @param tipo VENTAS | COMPRAS
 * @param prestamoIdActual préstamo que se está editando (sus propias cuotas no cuentan como "ya usadas")
 */
export async function construirCuotasDeFacturas(db, { prestamo, items, tipo, prestamoIdActual = null }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError(
      "Un préstamo de factoring se registra con sus facturas: agregue en la pestaña Cuotas una cuota por cada factura, con su fecha de vencimiento.",
    );
  }
  const esVentas = tipo === TIPO_FACTORING.VENTAS;
  const ids = items.map((i) => BigInt(i.facturaId || 0));
  if (ids.some((id) => id === 0n)) throw new ValidationError("Cada cuota del factoring necesita su factura: hay cuotas sin factura seleccionada.");
  if (new Set(ids.map(String)).size !== ids.length) throw new ValidationError("Una misma factura no puede estar en dos cuotas del factoring.");

  const facturas = esVentas
    ? await db.cuentaPorCobrar.findMany({
        where: { id: { in: ids } },
        include: { cliente: { select: { razonSocial: true } }, preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } },
      })
    : await db.cuentaPorPagar.findMany({ where: { id: { in: ids } }, include: { proveedor: { select: { razonSocial: true } } } });
  if (facturas.length !== ids.length) throw new NotFoundError("Alguna de las facturas indicadas en las cuotas no existe.");

  const yaUsadas = await db.cuotaPrestamo.findMany({
    where: {
      ...(esVentas ? { cuentaPorCobrarId: { in: ids } } : { cuentaPorPagarId: { in: ids } }),
      ...(prestamoIdActual ? { prestamoBancarioId: { not: BigInt(prestamoIdActual) } } : {}),
    },
    include: { prestamo: { select: { numeroPrestamo: true } } },
  });
  const estadosInvalidos = esVentas
    ? [ESTADO_CUENTA_POR_COBRAR.ANULADO, ESTADO_CUENTA_POR_COBRAR.CANJEADO]
    : [ESTADO_CUENTA_POR_PAGAR.ANULADO, ESTADO_CUENTA_POR_PAGAR.CANJEADO];

  const lineas = items.map((item) => {
    const factura = facturas.find((f) => String(f.id) === String(item.facturaId));
    const etiqueta = esVentas ? etiquetaCxC(factura) : etiquetaCxP(factura);
    if (Number(factura.empresaId) !== Number(prestamo.empresaId)) throw new ValidationError(`La factura ${etiqueta} no pertenece a la empresa del préstamo.`);
    if (Number(factura.monedaId) !== Number(prestamo.monedaId)) throw new ValidationError(`La factura ${etiqueta} está en otra moneda que el préstamo: deben ser la misma.`);
    if (factura.esGerencial) throw new ValidationError(`La factura ${etiqueta} es gerencial: el factoring solo admite facturas fiscales.`);
    if (estadosInvalidos.includes(Number(factura.estadoId))) throw new ValidationError(`La factura ${etiqueta} está anulada o ya fue canjeada.`);
    if (num(factura.montoPagado) > 0) throw new ValidationError(`La factura ${etiqueta} ya tiene ${esVentas ? "cobros" : "pagos"} registrados: solo se financian facturas sin ${esVentas ? "cobros" : "pagos"}.`);
    if (num(factura.saldoPendiente) <= 0) throw new ValidationError(`La factura ${etiqueta} no tiene saldo pendiente.`);
    const otra = yaUsadas.find((c) => String(esVentas ? c.cuentaPorCobrarId : c.cuentaPorPagarId) === String(factura.id));
    if (otra) throw new ValidationError(`La factura ${etiqueta} ya está en la cuota ${otra.numeroCuota} del préstamo ${otra.prestamo?.numeroPrestamo}.`);
    if (!item.fechaVencimiento || Number.isNaN(new Date(item.fechaVencimiento).getTime())) {
      throw new ValidationError(`Indique la fecha de vencimiento de la cuota de la factura ${etiqueta}.`);
    }
    // Interés en la cuota solo en ventas con interés diferido (el banco lo cobra en la cuota y se refactura al cliente).
    // Con interés descontado la cuota es solo capital; en compras el interés llega aparte como factura del banco.
    const interes = esVentas && !prestamo.interesDescontado ? r2(item.montoInteres) : 0;
    if (interes < 0) throw new ValidationError(`El interés de la cuota de la factura ${etiqueta} no puede ser negativo.`);
    return { factura, item, interes, capital: r2(factura.saldoPendiente) };
  });

  lineas.sort((a, b) => new Date(a.item.fechaVencimiento) - new Date(b.item.fechaVencimiento) || Number(a.factura.id) - Number(b.factura.id));

  let saldo = r2(lineas.reduce((a, l) => a + l.capital, 0));
  const total = saldo;
  const cuotas = lineas.map((l, i) => {
    const antes = saldo;
    saldo = r2(saldo - l.capital);
    return {
      numeroCuota: i + 1,
      fechaVencimiento: new Date(l.item.fechaVencimiento),
      montoCapital: l.capital,
      montoInteres: l.interes,
      montoComision: 0,
      montoSeguro: 0,
      montoTotal: r2(l.capital + l.interes),
      saldoCapitalAntes: antes,
      saldoCapitalDespues: Math.max(0, saldo),
      estadoCuotaId: ESTADO_CUOTA_PRESTAMO.PENDIENTE,
      diasMora: null,
      fechaPago: null,
      montoPagado: null,
      montoMora: null,
      observaciones: null,
      ...(esVentas ? { cuentaPorCobrarId: l.factura.id } : { cuentaPorPagarId: l.factura.id }),
    };
  });
  return { cuotas, totalCapital: total };
}

export default { TIPO_FACTORING, tipoFactoringDe, listarFacturasDisponibles, construirCuotasDeFacturas };
