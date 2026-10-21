import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import {
  ESTADO_CUENTA_POR_COBRAR,
  ESTADO_CUOTA_PRESTAMO,
  ESTADO_ASIENTO_CONTABLE,
} from "../../utils/estados.constants.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { entidadDeBanco } from "../../utils/entidadBanco.js";
import cuotaPrestamoService from "./cuotaPrestamo.service.js";
import {
  num,
  r2,
  aCentimos,
  deCentimos,
  formatearFecha,
  obtenerCuentas,
  exigirCentroCosto,
  obtenerMedioPagoCanje,
  obtenerPersonalDeUsuario,
  obtenerPeriodoAbierto,
  crearAsientoLetra,
} from "./letraCambioBase.service.js";

// Tipo de movimiento de caja (egreso) del pago del descuento / interés
const TIPO_MOVIMIENTO_INTERESES = 164;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: FACTORING DE FACTURAS (préstamo bancario con TipoPrestamo.esFactoring)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * El factoring se desembolsa contra facturas de venta (CxC) que se entregan en descuento a la entidad.
 * Todo el interés / descuento se registra en 673111 (no existe 673112).
 *
 *   DESEMBOLSO (en la misma operación de Tesorería, ver operacionPrestamo.service.js):
 *     a) Canje: cada factura recibe un pago de cobro con medio FACTORING, sin caja, ligado al préstamo
 *        (PagoCuentaPorCobrar.prestamoBancarioId). La CxC queda CANJEADA.
 *        Asiento: DEBE 121401/121402 facturas por cobrar en descuento · HABER 121201/121202 cartera
 *     b) Ingreso por el BRUTO (suma de las facturas = monto desembolsado del préstamo). El descuento / interés
 *        lo ingresa el usuario y se paga con su propio movimiento de egreso (tipo INTERESES FINANCIEROS).
 *        Asiento del ingreso: DEBE banco (bruto) · HABER 454911/454912 préstamo (bruto)
 *        Asiento del interés:  DEBE 673111 (descuento) · HABER banco (descuento)
 *     Ambos asientos cuelgan del movimiento de caja: la reversión de la operación los deshace, devuelve las
 *     facturas a pendientes y el préstamo vuelve a APROBADO.
 *
 *   LIQUIDACIÓN POR COBRO DE LA FACTURA (con recurso: la entidad cobra directo al cliente; sin caja):
 *     Asiento por factura: DEBE 454911/454912 obligación · HABER 121401/121402 facturas en descuento
 *     El capital liquidado se aplica a las cuotas del préstamo (que deben ser solo capital: el interés ya
 *     se descontó al desembolsar). Con todas las cuotas pagadas el préstamo pasa a PAGADO.
 *     Se anula por factura con anularLiquidacion.
 */

const SUBMODULO_PAGO_CXC_RUTA = "pagoCuentaPorCobrar";
const MEDIO_PAGO_FACTORING = "FACTORING";
const ESTADOS_PRESTAMO_OPERABLES = [80, 81, 83]; // DESEMBOLSADO, VIGENTE, VENCIDO
const CUENTAS = {
  descuento: { soles: "121401", dolares: "121402" },
  cartera: { soles: "121201", dolares: "121202" },
  capital: { soles: "454911", dolares: "454912" },
  interes: "673111",
};
const etiquetaMoneda = (monedaId) => (Number(monedaId) === 1 ? "soles" : "dolares");
const etiquetaLiquidacion = (pagoId) => `[LIQ-FACT:${pagoId}]`;

const nombreFactura = (c) =>
  c.preFactura?.numeroDocumentoFinal || c.preFactura?.numeroDocumento || c.numeroPreFactura;

// ════════════════════════════════════════════════════════════
// DESEMBOLSO: validación y registro (se ejecutan dentro de la transacción del desembolso)
// ════════════════════════════════════════════════════════════

/** Valida facturas y montos ANTES de crear movimientos. Lanza el dato concreto que hay que corregir. */
export async function prepararDesembolsoFactoring(tx, { prestamo, ctx, datos }) {
  const ids = [...new Set((datos.facturasFactoringIds || []).map((id) => BigInt(id)))];
  if (ids.length === 0) {
    throw new ValidationError(
      "Un préstamo de factoring se desembolsa contra facturas: seleccione las facturas (cuentas por cobrar) que se entregan en descuento.",
    );
  }
  const facturas = await tx.cuentaPorCobrar.findMany({
    where: { id: { in: ids } },
    include: { cliente: { select: { id: true, razonSocial: true } }, preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } },
    orderBy: { id: "asc" },
  });
  if (facturas.length !== ids.length) throw new NotFoundError("Alguna de las facturas seleccionadas no existe.");

  for (const f of facturas) {
    const etiqueta = nombreFactura(f);
    if (Number(f.empresaId) !== Number(prestamo.empresaId)) throw new ValidationError(`La factura ${etiqueta} no pertenece a la empresa del préstamo.`);
    if (f.esGerencial) throw new ValidationError(`La factura ${etiqueta} es gerencial: el factoring solo admite facturas fiscales.`);
    if ([ESTADO_CUENTA_POR_COBRAR.ANULADO, ESTADO_CUENTA_POR_COBRAR.CANJEADO].includes(Number(f.estadoId))) {
      throw new ValidationError(`La factura ${etiqueta} está anulada o ya fue canjeada.`);
    }
    if (num(f.montoPagado) > 0) throw new ValidationError(`La factura ${etiqueta} ya tiene cobros registrados: solo se entregan facturas sin cobros.`);
    if (num(f.saldoPendiente) <= 0) throw new ValidationError(`La factura ${etiqueta} no tiene saldo pendiente.`);
    if (Number(f.monedaId) !== Number(prestamo.monedaId)) {
      throw new ValidationError(`La factura ${etiqueta} está en otra moneda que el préstamo: el factoring y sus facturas deben estar en la misma moneda.`);
    }
  }

  const bruto = r2(facturas.reduce((a, f) => a + num(f.saldoPendiente), 0));
  const montoPrestamo = r2(num(prestamo.montoDesembolsado));
  if (Math.abs(bruto - montoPrestamo) > 0.01) {
    throw new ValidationError(
      `Las facturas seleccionadas suman ${bruto.toFixed(2)} y el monto desembolsado del préstamo ${prestamo.numeroPrestamo} es ${montoPrestamo.toFixed(2)}: deben ser iguales. Ajuste las facturas o edite el monto del préstamo en Préstamo Bancario.`,
    );
  }

  // El descuento / interés lo ingresa el usuario: la entidad desembolsa el bruto y el interés sale con su propio movimiento de caja
  const descuento = r2(datos.montoDescuento);
  if (descuento < 0) throw new ValidationError("El descuento / interés del factoring no puede ser negativo.");
  if (descuento >= bruto) {
    throw new ValidationError(`El descuento / interés (${descuento.toFixed(2)}) debe ser menor al total de las facturas (${bruto.toFixed(2)}).`);
  }
  const neto = r2(bruto - descuento);
  if (descuento > 0) {
    const tipoInteres = await tx.tipoMovEntregaRendir.findFirst({ where: { id: TIPO_MOVIMIENTO_INTERESES, activo: true } });
    if (!tipoInteres) {
      throw new ValidationError(
        `No existe o está inactivo el tipo de movimiento de caja INTERESES FINANCIEROS (id ${TIPO_MOVIMIENTO_INTERESES}), necesario para registrar el pago del descuento / interés.`,
      );
    }
  }

  const clave = etiquetaMoneda(prestamo.monedaId);
  const codigos = [CUENTAS.descuento[clave], CUENTAS.cartera[clave], CUENTAS.capital[clave]];
  if (descuento > 0) codigos.push(CUENTAS.interes);
  const cuenta = await obtenerCuentas(tx, codigos);
  const cuentaInteres = descuento > 0 ? cuenta(CUENTAS.interes) : null;
  const medioFactoring = await obtenerMedioPagoCanje(tx, MEDIO_PAGO_FACTORING);

  return {
    facturas,
    bruto,
    neto,
    descuento,
    cuentaDescuento: cuenta(CUENTAS.descuento[clave]),
    cuentaCartera: cuenta(CUENTAS.cartera[clave]),
    cuentaCapital: cuenta(CUENTAS.capital[clave]),
    cuentaInteres,
    centroCostoInteres: cuentaInteres ? exigirCentroCosto(cuentaInteres) : null,
    medioFactoring,
  };
}

/** Canje de las facturas + asientos del canje y del desembolso. Devuelve los asientos creados. */
/** interes: registro del movimiento de egreso por el descuento / interés (null si no hay descuento). */
export async function registrarDesembolsoFactoring(tx, { prestamo, ctx, factoring, ingreso, interes, usuarioId }) {
  const personalId = await obtenerPersonalDeUsuario(tx, usuarioId);
  const extranjera = Number(prestamo.monedaId) !== 1;
  const aSoles = (monto) => (extranjera ? r2(monto * ctx.tc) : r2(monto));
  const entidadBanco = ctx.entidadPrestamista;
  const parametrosAsiento = {
    empresaId: ctx.empresaId,
    periodo: ctx.periodoContable,
    fecha: ctx.fechaContable,
    submodulo: ctx.submoduloMovCaja,
    procesoOrigenId: ingreso.movimiento.id,
    monedaId: prestamo.monedaId,
    tipoCambio: ctx.tc,
    usuarioId,
  };

  // a) Canje de cada factura (sin caja) y baja de su cuenta por cobrar
  for (const f of factoring.facturas) {
    const saldo = num(f.saldoPendiente);
    await tx.pagoCuentaPorCobrar.create({
      data: {
        cuentaPorCobrarId: f.id,
        empresaId: f.empresaId,
        fechaPago: ctx.fechaContable,
        montoPagado: 0,
        monedaPagoId: f.monedaId,
        tipoCambio: ctx.tc,
        montoAplicadoDeuda: saldo,
        monedaDeudaId: f.monedaId,
        tieneRetencion: false,
        montoRetencion: 0,
        tienePercepcion: false,
        montoPercepcion: 0,
        medioPagoId: factoring.medioFactoring.id,
        numeroOperacion: `FACTORING ${prestamo.numeroPrestamo}`.slice(0, 50),
        movimientoCajaId: null,
        observaciones: `Canje por factoring: préstamo ${prestamo.numeroPrestamo} - factura ${nombreFactura(f)}`,
        fechaContable: ctx.fechaContable,
        periodoContableId: ctx.periodoContable.id,
        creadoPor: personalId,
        refOperacionEspecializadaMovCaja: ctx.correlativo,
        prestamoBancarioId: prestamo.id,
      },
    });
    const reclamo = await tx.cuentaPorCobrar.updateMany({
      where: { id: f.id, saldoPendiente: f.saldoPendiente },
      data: { montoPagado: saldo, saldoPendiente: 0, estadoId: ESTADO_CUENTA_POR_COBRAR.CANJEADO },
    });
    if (reclamo.count !== 1) {
      throw new ValidationError(`La factura ${nombreFactura(f)} fue modificada por otro usuario. Recargue e intente nuevamente.`);
    }
  }

  // Asiento del canje: DEBE facturas en descuento · HABER facturas en cartera (una línea por factura y lado)
  const lineasCanje = factoring.facturas.flatMap((f) => {
    const monto = num(f.saldoPendiente);
    const comun = {
      entidadComercialId: f.clienteId,
      numeroDocumentoOrigen: nombreFactura(f),
      fechaDocumentoOrigen: f.fechaEmision,
      fechaVenceDocumentoOrigen: f.fechaVencimiento,
    };
    return [
      { ...comun, planCuentaId: factoring.cuentaDescuento.id, debe: aSoles(monto), haber: 0, debeME: extranjera ? monto : null, haberME: null },
      { ...comun, planCuentaId: factoring.cuentaCartera.id, debe: 0, haber: aSoles(monto), debeME: null, haberME: extranjera ? monto : null },
    ];
  });
  lineasCanje.sort((x, y) => (num(y.debe) > 0) - (num(x.debe) > 0));
  const asientoCanje = await crearAsientoLetra(tx, {
    ...parametrosAsiento,
    tipoLibroId: TIPO_LIBRO.DIARIO,
    glosa: `CANJE DE FACTURAS POR FACTORING - PRESTAMO ${prestamo.numeroPrestamo} - ${prestamo.banco.nombre} - ${factoring.facturas.length} FACTURA(S) POR ${factoring.bruto.toFixed(2)}`,
    totalCabecera: factoring.bruto,
    lineas: lineasCanje,
  });

  // b) Asiento del ingreso: DEBE banco (bruto) · HABER préstamo (bruto)
  const asientoDesembolso = await crearAsientoLetra(tx, {
    ...parametrosAsiento,
    tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
    glosa: `POR INGRESO DE FACTORING ${prestamo.banco.nombre} - PRESTAMO ${prestamo.numeroPrestamo} - BRUTO ${factoring.bruto.toFixed(2)} - DESCUENTO ${factoring.descuento.toFixed(2)} - NETO ${factoring.neto.toFixed(2)}`,
    totalCabecera: factoring.bruto,
    lineas: [
      { planCuentaId: ctx.cuenta.cuentaContableId, debe: aSoles(factoring.bruto), haber: 0, debeME: extranjera ? factoring.bruto : null, haberME: null },
      {
        planCuentaId: factoring.cuentaCapital.id,
        debe: 0,
        haber: aSoles(factoring.bruto),
        debeME: null,
        haberME: extranjera ? factoring.bruto : null,
        entidadComercialId: entidadBanco,
        numeroDocumentoOrigen: prestamo.numeroPrestamo,
        fechaDocumentoOrigen: prestamo.fechaDesembolso,
        fechaVenceDocumentoOrigen: prestamo.fechaVencimiento,
      },
    ],
  });
  const asientos = [asientoCanje, asientoDesembolso];

  // c) Asiento del pago del descuento / interés (movimiento de egreso propio): DEBE 673111 · HABER banco
  if (interes && factoring.descuento > 0) {
    asientos.push(
      await crearAsientoLetra(tx, {
        ...parametrosAsiento,
        procesoOrigenId: interes.movimiento.id,
        tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
        glosa: `POR EL DESCUENTO / INTERES DE FACTORING ${prestamo.banco.nombre} - PRESTAMO ${prestamo.numeroPrestamo}`,
        totalCabecera: factoring.descuento,
        lineas: [
          {
            planCuentaId: factoring.cuentaInteres.id,
            debe: aSoles(factoring.descuento),
            haber: 0,
            debeME: extranjera ? factoring.descuento : null,
            haberME: null,
            centroCostoId: factoring.centroCostoInteres,
            entidadComercialId: entidadBanco,
          },
          { planCuentaId: ctx.cuenta.cuentaContableId, debe: 0, haber: aSoles(factoring.descuento), debeME: null, haberME: extranjera ? factoring.descuento : null },
        ],
      }),
    );
  }

  return asientos;
}

// ════════════════════════════════════════════════════════════
// RECOMPRA: MEGUI paga la cuota al banco y las facturas vuelven a cartera
// ════════════════════════════════════════════════════════════

/**
 * Facturas (pagos de canje) que ya volvieron a cartera. Marca: línea de un asiento de caja (el del pago de la
 * cuota) cuyo origen de línea es el pago de canje de la factura (submódulo Pagos Cuentas por Cobrar).
 */
async function pagosRecomprados(db, pagoIds) {
  if (!pagoIds.length) return new Set();
  const submodulo = await db.submoduloSistema.findFirst({ where: { ruta: SUBMODULO_PAGO_CXC_RUTA, activo: true }, select: { id: true } });
  const caja = await db.submoduloSistema.findFirst({ where: { nombreModeloOrigen: "MovimientoCaja", activo: true }, select: { id: true } });
  if (!submodulo || !caja) return new Set();
  const lineas = await db.detalleAsientoContable.findMany({
    where: {
      submoduloOrigenLineaId: submodulo.id,
      procesoOrigenLineaId: { in: pagoIds.map((id) => BigInt(id)) },
      asientoContable: { submoduloOrigenId: caja.id },
    },
    select: { procesoOrigenLineaId: true },
  });
  return new Set(lineas.map((l) => String(l.procesoOrigenLineaId)));
}

/**
 * Al pagar MEGUI una cuota del factoring: el capital pagado en efectivo se aplica a las facturas que siguen en
 * descuento (en orden de vencimiento). Cada factura que queda cubierta por completo vuelve a cartera:
 *   Asiento (ligado al movimiento del pago, por eso la reversión lo deshace): DEBE 121201/121202 · HABER 121401/121402
 *   Su cuenta por cobrar se reabre (pendiente o vencida) para cobrarla al cliente.
 * El capital pagado que no alcanza a cubrir una factura queda acumulado para los pagos siguientes.
 */
export async function recomprarFacturasPorPagoCuota(tx, { prestamo, ctx, egreso, usuarioId }) {
  const vacio = { asientos: [], facturas: [] };
  const pagos = await tx.pagoCuentaPorCobrar.findMany({
    where: { prestamoBancarioId: prestamo.id, movimientoCajaId: null },
    include: { cuentaPorCobrar: { include: { preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } } } },
  });
  if (pagos.length === 0) return vacio; // factoring anterior al flujo con facturas: no hay nada que devolver

  const submodulo116 = await tx.submoduloSistema.findFirst({ where: { ruta: SUBMODULO_PAGO_CXC_RUTA, activo: true } });
  if (!submodulo116) throw new ValidationError(`No existe el submódulo con ruta '${SUBMODULO_PAGO_CXC_RUTA}'.`);
  const ids = pagos.map((p) => p.id);
  const liquidadas = new Set(
    (await tx.asientoContable.findMany({ where: { submoduloOrigenId: submodulo116.id, procesoOrigenId: { in: ids }, esSaldoInicial: false }, select: { procesoOrigenId: true } })).map((a) => String(a.procesoOrigenId)),
  );
  const recompradas = await pagosRecomprados(tx, ids);

  // Capital pagado en efectivo (incluye este pago) menos lo que ya devolvió facturas a cartera
  const efectivo = await tx.pagoCuotaPrestamo.aggregate({
    where: { cuotaPrestamo: { prestamoBancarioId: prestamo.id }, movimientoCajaId: { not: null } },
    _sum: { montoCapital: true },
  });
  const yaDevuelto = pagos.filter((p) => recompradas.has(String(p.id))).reduce((a, p) => a + aCentimos(p.montoAplicadoDeuda), 0n);
  let disponible = aCentimos(efectivo._sum.montoCapital || 0) - yaDevuelto;

  const candidatas = pagos
    .filter((p) => !liquidadas.has(String(p.id)) && !recompradas.has(String(p.id)))
    .sort((a, b) => new Date(a.cuentaPorCobrar.fechaVencimiento) - new Date(b.cuentaPorCobrar.fechaVencimiento) || Number(a.id) - Number(b.id));

  const clave = etiquetaMoneda(prestamo.monedaId);
  const extranjera = Number(prestamo.monedaId) !== 1;
  const aSoles = (monto) => (extranjera ? r2(monto * ctx.tc) : r2(monto));
  const hoy = new Date();
  const devueltas = [];
  let cuenta = null;

  for (const pago of candidatas) {
    const monto = aCentimos(pago.montoAplicadoDeuda);
    if (disponible < monto) break;
    disponible -= monto;
    if (!cuenta) cuenta = await obtenerCuentas(tx, [CUENTAS.descuento[clave], CUENTAS.cartera[clave]]);
    const factura = pago.cuentaPorCobrar;
    const importe = num(pago.montoAplicadoDeuda);
    const etiqueta = nombreFactura(factura);

    // Se reabre la cuenta por cobrar de la factura
    const reabierta = await tx.cuentaPorCobrar.updateMany({
      where: { id: factura.id, saldoPendiente: 0 },
      data: {
        montoPagado: r2(num(factura.montoPagado) - importe),
        saldoPendiente: importe,
        estadoId: new Date(factura.fechaVencimiento) < hoy ? ESTADO_CUENTA_POR_COBRAR.VENCIDO : ESTADO_CUENTA_POR_COBRAR.PENDIENTE,
      },
    });
    if (reabierta.count !== 1) {
      throw new ValidationError(`La factura ${etiqueta} fue modificada por otro usuario o ya no está canjeada. Recargue e intente nuevamente.`);
    }

    // El origen de las líneas apunta al pago de canje de la factura: es la marca de que volvió a cartera
    const comun = {
      entidadComercialId: factura.clienteId,
      numeroDocumentoOrigen: etiqueta,
      fechaDocumentoOrigen: factura.fechaEmision,
      fechaVenceDocumentoOrigen: factura.fechaVencimiento,
      submoduloOrigenLineaId: submodulo116.id,
      procesoOrigenLineaId: pago.id,
    };
    const asiento = await crearAsientoLetra(tx, {
      empresaId: ctx.empresaId,
      periodo: ctx.periodoContable,
      fecha: ctx.fechaContable,
      glosa: `RECOMPRA DE FACTURA ${etiqueta} POR PAGO DE LA CUOTA DEL FACTORING ${prestamo.numeroPrestamo} - ${prestamo.banco.nombre}`,
      tipoLibroId: TIPO_LIBRO.DIARIO,
      submodulo: ctx.submoduloMovCaja,
      procesoOrigenId: egreso.movimiento.id,
      monedaId: prestamo.monedaId,
      tipoCambio: ctx.tc,
      totalCabecera: importe,
      usuarioId,
      lineas: [
        { ...comun, planCuentaId: cuenta(CUENTAS.cartera[clave]).id, debe: aSoles(importe), haber: 0, debeME: extranjera ? importe : null, haberME: null },
        { ...comun, planCuentaId: cuenta(CUENTAS.descuento[clave]).id, debe: 0, haber: aSoles(importe), debeME: null, haberME: extranjera ? importe : null },
      ],
    });
    devueltas.push({ asiento, factura: { pagoId: pago.id, numeroDocumento: etiqueta, monto: importe } });
  }

  return { asientos: devueltas.map((d) => d.asiento), facturas: devueltas.map((d) => d.factura) };
}

// ════════════════════════════════════════════════════════════
// CONSULTAS (frontend)
// ════════════════════════════════════════════════════════════

/** Facturas (CxC) que se pueden entregar al factoring: fiscales, con saldo, sin cobros y de la moneda del préstamo. */
export async function listarFacturasDisponibles({ empresaId, monedaId }) {
  try {
    if (!empresaId || !monedaId) throw new ValidationError("Indique la empresa y la moneda del préstamo para listar las facturas.");
    const lista = await prisma.cuentaPorCobrar.findMany({
      where: {
        empresaId: BigInt(empresaId),
        monedaId: BigInt(monedaId),
        esGerencial: false,
        saldoPendiente: { gt: 0 },
        montoPagado: 0,
        estadoId: { notIn: [ESTADO_CUENTA_POR_COBRAR.ANULADO, ESTADO_CUENTA_POR_COBRAR.CANJEADO] },
      },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        moneda: { select: { simbolo: true } },
        preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } },
      },
      orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
    });
    return lista.map((c) => ({
      id: c.id,
      numeroDocumento: nombreFactura(c),
      cliente: c.cliente?.razonSocial || "",
      fechaEmision: c.fechaEmision,
      fechaVencimiento: c.fechaVencimiento,
      simbolo: c.moneda?.simbolo || "",
      saldoPendiente: num(c.saldoPendiente),
    }));
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar las facturas disponibles", err.message);
    throw err;
  }
}

async function facturasDelPrestamo(db, prestamoId) {
  const pagos = await db.pagoCuentaPorCobrar.findMany({
    where: { prestamoBancarioId: BigInt(prestamoId), movimientoCajaId: null },
    include: {
      cuentaPorCobrar: {
        include: { cliente: { select: { razonSocial: true } }, preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } },
      },
      moneda: { select: { simbolo: true } },
    },
    orderBy: { id: "asc" },
  });
  const submodulo = await db.submoduloSistema.findFirst({ where: { ruta: SUBMODULO_PAGO_CXC_RUTA, activo: true }, select: { id: true } });
  const asientos = submodulo && pagos.length
    ? await db.asientoContable.findMany({
        where: { submoduloOrigenId: submodulo.id, procesoOrigenId: { in: pagos.map((p) => p.id) }, esSaldoInicial: false },
        select: { procesoOrigenId: true, numeroAsiento: true, fechaAsiento: true },
      })
    : [];
  const recompradas = await pagosRecomprados(db, pagos.map((p) => p.id));
  return pagos.map((p) => {
    const liquidacion = asientos.find((a) => Number(a.procesoOrigenId) === Number(p.id));
    return {
      pagoId: p.id,
      cuentaPorCobrarId: p.cuentaPorCobrarId,
      numeroDocumento: nombreFactura(p.cuentaPorCobrar),
      cliente: p.cuentaPorCobrar?.cliente?.razonSocial || "",
      simbolo: p.moneda?.simbolo || "",
      monto: num(p.montoAplicadoDeuda),
      fechaVencimiento: p.cuentaPorCobrar?.fechaVencimiento,
      liquidada: Boolean(liquidacion),
      recomprada: recompradas.has(String(p.id)),
      fechaLiquidacion: liquidacion?.fechaAsiento || null,
      asientoLiquidacion: liquidacion?.numeroAsiento || null,
    };
  });
}

/** Préstamos de factoring con facturas entregadas, para liquidar por cobro de la factura. */
export async function listarPrestamosFactoring({ empresaId } = {}) {
  try {
    const prestamos = await prisma.prestamoBancario.findMany({
      where: {
        ...(empresaId ? { empresaId: BigInt(empresaId) } : {}),
        tipoPrestamo: { esFactoring: true },
        estadoId: { in: ESTADOS_PRESTAMO_OPERABLES },
        pagosCuentaPorCobrar: { some: { movimientoCajaId: null } },
      },
      include: { banco: { select: { nombre: true } }, moneda: { select: { id: true, simbolo: true, codigoSunat: true } }, empresa: { select: { id: true, razonSocial: true } } },
      orderBy: { id: "desc" },
    });
    const resultado = [];
    for (const p of prestamos) {
      const facturas = await facturasDelPrestamo(prisma, p.id);
      resultado.push({
        id: p.id,
        numeroPrestamo: p.numeroPrestamo,
        banco: p.banco?.nombre || "",
        empresa: p.empresa,
        moneda: p.moneda,
        saldoCapital: num(p.saldoCapital),
        facturas: facturas.length,
        pendientesDeLiquidar: facturas.filter((f) => !f.liquidada).length,
      });
    }
    return resultado;
  } catch (err) {
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar los préstamos de factoring", err.message);
    throw err;
  }
}

export async function obtenerDetalleFactoring(prestamoId) {
  try {
    const prestamo = await prisma.prestamoBancario.findUnique({
      where: { id: BigInt(prestamoId) },
      include: { banco: { select: { nombre: true } }, moneda: { select: { id: true, simbolo: true, codigoSunat: true } }, tipoPrestamo: { select: { esFactoring: true } } },
    });
    if (!prestamo) throw new NotFoundError("Préstamo no encontrado.");
    if (!prestamo.tipoPrestamo?.esFactoring) throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no es de factoring.`);
    return {
      prestamo: { id: prestamo.id, numeroPrestamo: prestamo.numeroPrestamo, banco: prestamo.banco?.nombre, moneda: prestamo.moneda, saldoCapital: num(prestamo.saldoCapital), estadoId: prestamo.estadoId },
      facturas: await facturasDelPrestamo(prisma, prestamo.id),
    };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar el factoring", err.message);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════
// LIQUIDACIÓN POR COBRO DE LA FACTURA (sin caja)
// ════════════════════════════════════════════════════════════

/**
 * datos: { prestamoBancarioId, pagoIds: [PagoCuentaPorCobrar de canje], fecha, tipoCambio?, usuarioId }
 */
export async function liquidarPorCobro(datos) {
  const { prestamoBancarioId, pagoIds, usuarioId } = datos;
  try {
    if (!prestamoBancarioId) throw new ValidationError("Seleccione el préstamo de factoring.");
    if (!Array.isArray(pagoIds) || pagoIds.length === 0) throw new ValidationError("Seleccione al menos una factura cobrada por la entidad.");
    if (!datos.fecha) throw new ValidationError("Indique la fecha en que la entidad cobró las facturas.");
    const fecha = new Date(datos.fecha);

    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PrestamoBancario" WHERE id = ${BigInt(prestamoBancarioId)} FOR UPDATE`;
      const prestamo = await tx.prestamoBancario.findUnique({
        where: { id: BigInt(prestamoBancarioId) },
        include: { banco: { select: { id: true, nombre: true, enlaceEntidadComercialId: true } }, tipoPrestamo: { select: { esFactoring: true } }, empresa: { select: { razonSocial: true } } },
      });
      if (!prestamo) throw new NotFoundError("Préstamo no encontrado.");
      if (!prestamo.tipoPrestamo?.esFactoring) throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no es de factoring.`);
      if (!ESTADOS_PRESTAMO_OPERABLES.includes(Number(prestamo.estadoId))) {
        throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no admite liquidaciones en su estado actual (debe estar desembolsado, vigente o vencido).`);
      }
      const extranjera = Number(prestamo.monedaId) !== 1;
      const tc = extranjera ? num(datos.tipoCambio) : 1;
      if (extranjera && !(tc > 0)) throw new ValidationError("Ingrese el tipo de cambio de la fecha de cobro para convertir el asiento a soles.");

      const submodulo = await tx.submoduloSistema.findFirst({ where: { ruta: SUBMODULO_PAGO_CXC_RUTA, activo: true } });
      if (!submodulo) throw new ValidationError(`No existe el submódulo con ruta '${SUBMODULO_PAGO_CXC_RUTA}'.`);

      const ids = [...new Set(pagoIds.map((id) => BigInt(id)))];
      const pagos = await tx.pagoCuentaPorCobrar.findMany({
        where: { id: { in: ids }, prestamoBancarioId: prestamo.id, movimientoCajaId: null },
        include: { cuentaPorCobrar: { include: { preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } } } },
        orderBy: { id: "asc" },
      });
      if (pagos.length !== ids.length) {
        throw new ValidationError(`Alguna de las facturas no fue entregada al préstamo ${prestamo.numeroPrestamo}.`);
      }
      const yaLiquidadas = await tx.asientoContable.findMany({
        where: { submoduloOrigenId: submodulo.id, procesoOrigenId: { in: ids }, esSaldoInicial: false },
        select: { procesoOrigenId: true },
      });
      if (yaLiquidadas.length > 0) {
        const etiquetas = pagos.filter((p) => yaLiquidadas.some((a) => Number(a.procesoOrigenId) === Number(p.id))).map((p) => nombreFactura(p.cuentaPorCobrar));
        throw new ValidationError(`La(s) factura(s) ${etiquetas.join(", ")} ya fueron liquidadas.`);
      }

      const recompradas = await pagosRecomprados(tx, ids);
      if (recompradas.size > 0) {
        const etiquetas = pagos.filter((p) => recompradas.has(String(p.id))).map((p) => nombreFactura(p.cuentaPorCobrar));
        throw new ValidationError(`La(s) factura(s) ${etiquetas.join(", ")} ya volvieron a cartera porque MEGUI pagó la cuota al banco: se cobran al cliente, no se liquidan.`);
      }
      const periodo = await obtenerPeriodoAbierto(tx, prestamo.empresaId, fecha, prestamo.empresa.razonSocial);
      const clave = etiquetaMoneda(prestamo.monedaId);
      const cuenta = await obtenerCuentas(tx, [CUENTAS.capital[clave], CUENTAS.descuento[clave]]);
      const cuentaCapital = cuenta(CUENTAS.capital[clave]);
      const cuentaDescuento = cuenta(CUENTAS.descuento[clave]);
      const entidadBanco = entidadDeBanco(prestamo.banco);
      const totalCent = pagos.reduce((a, p) => a + aCentimos(p.montoAplicadoDeuda), 0n);

      // ── Cuotas del préstamo: solo capital, se aplican en orden de vencimiento ──
      const cuotas = await tx.cuotaPrestamo.findMany({
        where: { prestamoBancarioId: prestamo.id, estadoCuotaId: { notIn: [ESTADO_CUOTA_PRESTAMO.PAGADO] } },
        orderBy: [{ fechaVencimiento: "asc" }, { numeroCuota: "asc" }],
      });
      if (cuotas.length === 0) {
        throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no tiene cuotas por pagar: genere su cronograma en Préstamo Bancario.`);
      }
      for (const c of cuotas) {
        if (num(c.montoInteres) > 0 || num(c.montoSeguro) > 0 || num(c.montoComision) > 0) {
          throw new ValidationError(
            `La cuota ${c.numeroCuota} del préstamo ${prestamo.numeroPrestamo} tiene intereses, seguro o comisión: en factoring el descuento se cobra al desembolsar y las cuotas deben ser solo capital. Corrija el cronograma en Préstamo Bancario.`,
          );
        }
      }
      const pendienteTotal = cuotas.reduce((a, c) => a + (aCentimos(c.montoTotal) - aCentimos(c.montoPagado)), 0n);
      if (totalCent > pendienteTotal) {
        throw new ValidationError(
          `Las facturas a liquidar suman ${deCentimos(totalCent).toFixed(2)} y las cuotas del préstamo solo tienen ${deCentimos(pendienteTotal).toFixed(2)} pendiente.`,
        );
      }

      const asientos = [];
      const cuotasAfectadas = new Map();
      let restoCuotas = pagos.map((p) => ({ pago: p, cent: aCentimos(p.montoAplicadoDeuda) }));
      let indiceCuota = 0;

      for (const item of restoCuotas) {
        const etiqueta = nombreFactura(item.pago.cuentaPorCobrar);
        let porAplicar = item.cent;
        while (porAplicar > 0n && indiceCuota < cuotas.length) {
          const cuota = cuotas[indiceCuota];
          const pagadoActual = cuotasAfectadas.get(String(cuota.id))?.pagadoCent ?? aCentimos(cuota.montoPagado);
          const pendiente = aCentimos(cuota.montoTotal) - pagadoActual;
          if (pendiente <= 0n) {
            indiceCuota++;
            continue;
          }
          const aplicar = porAplicar < pendiente ? porAplicar : pendiente;
          await tx.pagoCuotaPrestamo.create({
            data: {
              cuotaPrestamoId: cuota.id,
              movimientoCajaId: null,
              refOperacionEspecializadaMovCaja: null,
              fechaPago: fecha,
              montoCapital: deCentimos(aplicar),
              montoTotal: deCentimos(aplicar),
              observaciones: `LIQUIDACIÓN POR COBRO DE LA FACTURA ${etiqueta} ${etiquetaLiquidacion(item.pago.id)}`,
              creadoPor: usuarioId ? BigInt(usuarioId) : null,
            },
          });
          cuotasAfectadas.set(String(cuota.id), { cuota, pagadoCent: pagadoActual + aplicar });
          porAplicar -= aplicar;
          if (pagadoActual + aplicar >= aCentimos(cuota.montoTotal)) indiceCuota++;
        }

        // Asiento: DEBE obligación financiera · HABER facturas en descuento
        const monto = num(item.pago.montoAplicadoDeuda);
        const soles = extranjera ? r2(monto * tc) : r2(monto);
        asientos.push(
          await crearAsientoLetra(tx, {
            empresaId: prestamo.empresaId,
            periodo,
            fecha,
            glosa: `LIQUIDACIÓN DE FACTORING POR COBRO DE LA FACTURA ${etiqueta} - PRESTAMO ${prestamo.numeroPrestamo} - ${prestamo.banco.nombre}`,
            tipoLibroId: TIPO_LIBRO.DIARIO,
            submodulo,
            procesoOrigenId: item.pago.id,
            monedaId: prestamo.monedaId,
            tipoCambio: tc,
            totalCabecera: monto,
            usuarioId,
            lineas: [
              {
                planCuentaId: cuentaCapital.id,
                debe: soles,
                haber: 0,
                debeME: extranjera ? monto : null,
                entidadComercialId: entidadBanco,
                numeroDocumentoOrigen: prestamo.numeroPrestamo,
                fechaDocumentoOrigen: prestamo.fechaDesembolso,
                fechaVenceDocumentoOrigen: prestamo.fechaVencimiento,
              },
              {
                planCuentaId: cuentaDescuento.id,
                debe: 0,
                haber: soles,
                haberME: extranjera ? monto : null,
                entidadComercialId: item.pago.cuentaPorCobrar.clienteId,
                numeroDocumentoOrigen: etiqueta,
                fechaDocumentoOrigen: item.pago.cuentaPorCobrar.fechaEmision,
                fechaVenceDocumentoOrigen: item.pago.cuentaPorCobrar.fechaVencimiento,
              },
            ],
          }),
        );
      }

      // Cuotas: monto pagado, estado y fecha
      for (const { cuota, pagadoCent } of cuotasAfectadas.values()) {
        const saldado = pagadoCent >= aCentimos(cuota.montoTotal);
        await tx.cuotaPrestamo.update({
          where: { id: cuota.id },
          data: {
            fechaPago: fecha,
            montoPagado: deCentimos(pagadoCent),
            estadoCuotaId: saldado ? ESTADO_CUOTA_PRESTAMO.PAGADO : ESTADO_CUOTA_PRESTAMO.PAGO_PARCIAL,
          },
        });
      }
      await cuotaPrestamoService.actualizarSaldosPrestamo(prestamo.id, tx);
      await cuotaPrestamoService.recalcularEstadoPrestamo(prestamo.id, tx);
      const actualizado = await tx.prestamoBancario.findUnique({ where: { id: prestamo.id }, select: { estadoId: true, saldoCapital: true } });

      return {
        prestamo: { id: prestamo.id, numeroPrestamo: prestamo.numeroPrestamo, estadoId: actualizado.estadoId, saldoCapital: num(actualizado.saldoCapital) },
        facturasLiquidadas: pagos.map((p) => ({ pagoId: p.id, numeroDocumento: nombreFactura(p.cuentaPorCobrar), monto: num(p.montoAplicadoDeuda) })),
        asientos: asientos.map((a) => ({ id: a.id, numeroAsiento: a.numeroAsiento })),
        total: deCentimos(totalCent),
      };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al liquidar el factoring", err.message);
    throw err;
  }
}

/** Anula la liquidación de UNA factura: elimina su asiento y los pagos de cuota, y recalcula cuotas y préstamo. */
export async function anularLiquidacion({ pagoId, usuarioId }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const pago = await tx.pagoCuentaPorCobrar.findUnique({
        where: { id: BigInt(pagoId) },
        include: { cuentaPorCobrar: { include: { preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } } } },
      });
      if (!pago || !pago.prestamoBancarioId || pago.movimientoCajaId) throw new NotFoundError("La factura no está entregada a un préstamo de factoring.");
      const prestamo = await tx.prestamoBancario.findUnique({ where: { id: pago.prestamoBancarioId }, select: { id: true, numeroPrestamo: true } });
      const etiqueta = nombreFactura(pago.cuentaPorCobrar);

      const submodulo = await tx.submoduloSistema.findFirst({ where: { ruta: SUBMODULO_PAGO_CXC_RUTA, activo: true } });
      const asientos = submodulo
        ? await tx.asientoContable.findMany({ where: { submoduloOrigenId: submodulo.id, procesoOrigenId: pago.id, esSaldoInicial: false }, select: { id: true, numeroAsiento: true, estadoId: true } })
        : [];
      if (asientos.length === 0) throw new ValidationError(`La factura ${etiqueta} no está liquidada: no hay nada que anular.`);
      const noPendientes = asientos.filter((a) => Number(a.estadoId) !== Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE));
      if (noPendientes.length > 0) {
        throw new ValidationError(`No se puede anular: el asiento ${noPendientes.map((a) => a.numeroAsiento).join(", ")} ya no está pendiente (aprobado o anulado). Reviértalo desde Contabilidad.`);
      }

      const pagosCuota = await tx.pagoCuotaPrestamo.findMany({
        where: { cuotaPrestamo: { prestamoBancarioId: prestamo.id }, observaciones: { contains: etiquetaLiquidacion(pago.id) } },
        include: { cuotaPrestamo: true },
      });
      const aRestar = new Map();
      for (const p of pagosCuota) aRestar.set(String(p.cuotaPrestamoId), (aRestar.get(String(p.cuotaPrestamoId)) || 0n) + aCentimos(p.montoTotal));
      await tx.pagoCuotaPrestamo.deleteMany({ where: { id: { in: pagosCuota.map((p) => p.id) } } });
      const hoy = new Date();
      for (const p of pagosCuota) {
        const resta = aRestar.get(String(p.cuotaPrestamoId));
        if (resta === undefined) continue;
        aRestar.delete(String(p.cuotaPrestamoId));
        const cuota = await tx.cuotaPrestamo.findUnique({ where: { id: p.cuotaPrestamoId } });
        const pagadoCent = aCentimos(cuota.montoPagado) - resta;
        const pagado = pagadoCent > 0n ? deCentimos(pagadoCent) : 0;
        await tx.cuotaPrestamo.update({
          where: { id: cuota.id },
          data: {
            montoPagado: pagado,
            fechaPago: pagado > 0 ? cuota.fechaPago : null,
            estadoCuotaId: pagado > 0 ? ESTADO_CUOTA_PRESTAMO.PAGO_PARCIAL : new Date(cuota.fechaVencimiento) < hoy ? ESTADO_CUOTA_PRESTAMO.VENCIDO : ESTADO_CUOTA_PRESTAMO.PENDIENTE,
          },
        });
      }
      await tx.asientoContable.deleteMany({ where: { id: { in: asientos.map((a) => a.id) } } });
      await cuotaPrestamoService.actualizarSaldosPrestamo(prestamo.id, tx);
      await cuotaPrestamoService.recalcularEstadoPrestamo(prestamo.id, tx);

      return { prestamo: prestamo.numeroPrestamo, factura: etiqueta, asientosEliminados: asientos.length, pagosCuotaEliminados: pagosCuota.length };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al anular la liquidación", err.message);
    throw err;
  }
}

export default {
  prepararDesembolsoFactoring,
  registrarDesembolsoFactoring,
  listarFacturasDisponibles,
  listarPrestamosFactoring,
  obtenerDetalleFactoring,
  liquidarPorCobro,
  anularLiquidacion,
};
