import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import correlativoService from "../Tesoreria/correlativoOperacionCaja.service.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { ESTADO_ASIENTO_CONTABLE } from "../../utils/estados.constants.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: PAGO MÚLTIPLE (ESPECIALIZADO) DE CUENTAS POR PAGAR
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Se paga a un proveedor con UN solo monto (una sola operación bancaria) para amortizar
 * varias facturas. El usuario indica manualmente cuánto se paga de cada documento (ítems) y
 * el sistema procesa cada documento por separado dentro de UNA transacción atómica:
 *   1. MovimientoCaja de EGRESO consolidado + ITF + comisión, con saldo en cascada
 *   2. Un PagoCuentaPorPagar por documento (monto = lo indicado para ese documento)
 *   3. Actualización de montoPagado / saldoPendiente / estado de cada CxP
 *   4. Asientos contables (si uno falla se revierte toda la operación)
 *
 * Réplica de cobroCuentaPorCobrarMultiple.service.js adaptada al pago a proveedores.
 *
 * Alcance: SOLO EL NETO. Detracción, retención y percepción no se pagan aquí: cada documento
 * tiene su propio comprobante y se registran con el pago individual
 * (pagoEspecializadoCuentaPorPagar.service.js). Por eso el monto máximo de cada documento es
 * su neto pagable = saldoPendiente - detracción pendiente (misma regla que el pago individual).
 * Un documento queda PAGADO únicamente cuando su saldo llega a cero (incluido el impuesto);
 * mientras tanto queda PAGO PARCIAL.
 *
 * Documentos GERENCIALES ("compra negra", GASTOS SIN FACTURA): no tienen cuenta por pagar
 * contable; el gasto se reconoce al pagar. El DEBE se reparte entre las cuentas de gasto del
 * detalle de la orden de compra (Producto.cuentaComprasId → 656101 SUMINISTROS por defecto)
 * de forma PROPORCIONAL a lo pagado de cada
 * documento (reparto exacto al céntimo), de modo que el asiento cuadra aunque el pago sea
 * parcial. Una operación es siempre solo formal o solo gerencial (nunca mezcladas).
 * Un Recibo por Honorarios gerencial sigue la regla de honorarios, igual que el pago individual.
 *
 * Autónomo a propósito (mismo criterio que pagoDeudaPersonalMultiple): no toca el servicio
 * del pago individual, que está en producción.
 *
 * Convención copiada de pagoEspecializadoCuentaPorPagar.service.js:
 *   - Egreso:         la cuenta bancaria va en cuentaCorrienteDestinoId.
 *   - ITF y comisión: la cuenta bancaria va en cuentaCorrienteOrigenId.
 *   - Tipo de cambio: siempre TC de venta (sell_price), lo envía el formulario.
 *   - No se bloquea por saldo insuficiente (el formulario solo advierte).
 *
 * Submódulo origen: 116, el mismo ID que registra el pago individual de CxP en todos sus
 * movimientos (decisión del propietario: se mantiene para que ambos flujos sean idénticos).
 *
 * Asiento (igual que el pago individual):
 *   DEBE  = Facturas por pagar (421201 soles / 421202 dólares), o Honorarios por pagar
 *           (424101 / 424102) si el documento es Recibo por Honorarios; una línea POR
 *           DOCUMENTO con su referencia, para no perder el auxiliar por proveedor.
 *           Gerenciales: una línea por cuenta de gasto y documento (ver arriba).
 *   HABER = CuentaCorriente.cuentaContableId (banco del egreso)
 *   Libro = CAJA_BANCOS (tipoLibroId) en ambos casos; lo gerencial se distingue solo con
 *           esGerencial (el campo deprecado tipoLibro queda siempre en FISCAL)
 *
 * Glosas por defecto (referencia contable):
 *   Honorarios:  "PAGO DE HONORARIOS N {NumDoc} - {RazonSocial}"
 *   Gerenciales: "GASTOS VARIOS - {Concepto}"
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MAPA DE BIFURCACIONES (buscar el código de caso, p. ej. "[CASO B]", para seguir el rastro)
 * ────────────────────────────────────────────────────────────────────────────
 * Cada documento cae en UNO de tres casos (mismas reglas de detección que el pago individual):
 *
 *   [CASO A] FACTURA ESTÁNDAR     formal, no honorarios
 *            DEBE 421201/421202 (Facturas por pagar), una línea por documento.
 *   [CASO B] HONORARIOS           OrdenCompra.tipoDocumentoFinalId = 3, formal o gerencial
 *            DEBE 424101/424102 (Honorarios por pagar), una línea por documento.
 *   [CASO C] GASTO SIN FACTURA    CuentaPorPagar.esGerencial y no es honorarios
 *            DEBE repartido entre las cuentas de gasto del detalle de la orden de compra.
 *
 * Dónde se bifurca (en el orden en que ocurre en procesarPagoMultiple):
 *   paso 1  validación: una operación es solo formal (casos A y B) o solo gerencial (casos B y C);
 *           nunca se mezclan documentos formales con gerenciales
 *   paso 3  detección de caso por documento, carga de cuentas y reparto de gasto del [CASO C]
 *   paso 4  glosa por defecto: B puro → honorarios | C puro → gastos varios | resto → genérica
 *   paso 6  líneas del DEBE de cada documento (if / else if / else por caso)
 *   paso 7  el asiento es el mismo para los tres casos; solo cambian las líneas del DEBE
 *           y el libro (FISCAL / GERENCIAL)
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES (mismos valores que pagoEspecializadoCuentaPorPagar.service.js)
// ════════════════════════════════════════════════════════════
const ESTADOS_CXP = {
  PENDIENTE: 100,
  PAGO_PARCIAL: 101,
  PAGADO: 102,
  VENCIDO: 103,
  ANULADO: 104,
  CANJEADO: 105,
};

const ESTADO_MOVIMIENTO_CAJA_VALIDADO = 21;
// ITF y comisión comparten el mismo tipo de movimiento
const TIPO_MOVIMIENTO_ITF_COMISION = 163;
const MONEDA_NACIONAL_ID = 1;
// Submódulo origen del motivo de la operación: el mismo que usa el pago individual de CxP
const SUBMODULO_ORIGEN_PAGOS_CXP_ID = 116;
// OrdenCompra.tipoDocumentoFinalId = 3 → Recibo por Honorarios
const TIPO_DOCUMENTO_HONORARIOS_ID = 3;

const CODIGOS_CUENTAS_CONTABLES = {
  FACTURAS_POR_PAGAR_SOLES: "421201",
  FACTURAS_POR_PAGAR_DOLARES: "421202",
  HONORARIOS_POR_PAGAR_SOLES: "424101",
  HONORARIOS_POR_PAGAR_DOLARES: "424102",
  // Cuenta de gasto por defecto de las compras gerenciales sin cuenta en el detalle ni en el producto
  GASTOS_SUMINISTROS: "656101",
  ITF: "641101",
  COMISIONES_BANCARIAS: "679401",
};

// ════════════════════════════════════════════════════════════
// HELPERS NUMÉRICOS
// ════════════════════════════════════════════════════════════
const aCentimos = (valor) => BigInt(Math.round(Number(valor) * 100));
const deCentimos = (centimos) => Number(centimos) / 100;
const redondear2 = (valor) => Math.round(Number(valor) * 100) / 100;

/**
 * Reparte `totalCent` entre los pesos de forma proporcional (método del mayor resto).
 * Los céntimos sobrantes van a los pesos con mayor resto, así la suma de las partes es
 * exactamente `totalCent`. Los pesos deben sumar más que cero.
 */
const repartirProporcional = (pesosCent, totalCent) => {
  const sumaPesos = pesosCent.reduce((acc, s) => acc + s, 0n);
  const partes = pesosCent.map((s) => (totalCent * s) / sumaPesos);
  const restos = pesosCent.map((s) => (totalCent * s) % sumaPesos);

  let faltante = totalCent - partes.reduce((acc, p) => acc + p, 0n);
  const orden = restos
    .map((resto, indice) => ({ resto, indice }))
    .sort((a, b) => (a.resto === b.resto ? a.indice - b.indice : a.resto > b.resto ? -1 : 1));

  for (const { indice } of orden) {
    if (faltante <= 0n) break;
    partes[indice] += 1n;
    faltante -= 1n;
  }
  return partes;
};

// ════════════════════════════════════════════════════════════
// HELPERS DE CAJA
// ════════════════════════════════════════════════════════════
const actualizarSaldoCuentaCorriente = async ({
  tx,
  cuentaCorrienteId,
  empresaId,
  fecha,
  egresos = 0,
  movimientoCajaId,
  saldoAnteriorManual = null,
}) => {
  let saldoAnterior;

  if (saldoAnteriorManual !== null) {
    saldoAnterior = Number(saldoAnteriorManual);
  } else {
    const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
      where: { cuentaCorrienteId: Number(cuentaCorrienteId) },
      orderBy: { fecha: "desc" },
    });
    saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;
  }

  return await tx.saldoCuentaCorriente.create({
    data: {
      cuentaCorrienteId: Number(cuentaCorrienteId),
      empresaId: Number(empresaId),
      fecha,
      saldoAnterior,
      ingresos: 0,
      egresos: Number(egresos),
      saldoActual: saldoAnterior - Number(egresos),
      movimientoCajaId: Number(movimientoCajaId),
      centroCostoId: null,
      conciliado: false,
    },
  });
};

/** Crea el movimiento de egreso y su registro de saldo en cascada. */
const registrarMovimientoEgreso = async ({
  tx,
  data,
  cuenta,
  saldoAnteriorManual = null,
}) => {
  const movimiento = await tx.movimientoCaja.create({ data });

  const registroSaldo = await actualizarSaldoCuentaCorriente({
    tx,
    cuentaCorrienteId: cuenta.id,
    empresaId: cuenta.empresaId,
    fecha: data.fechaOperacionMovCaja,
    egresos: data.monto,
    movimientoCajaId: movimiento.id,
    saldoAnteriorManual,
  });

  return { movimiento, saldoActual: Number(registroSaldo.saldoActual) };
};

const obtenerCuentaPorCodigo = async (tx, codigoCuenta, { exigirCentroCosto = false } = {}) => {
  const cuenta = await tx.planCuentasContable.findFirst({
    where: { codigoCuenta },
  });
  if (!cuenta) {
    throw new NotFoundError(`No se encontró la cuenta contable ${codigoCuenta}`);
  }
  if (exigirCentroCosto && !cuenta.centroCostoId) {
    throw new ValidationError(
      `La cuenta contable ${codigoCuenta} no tiene centro de costo asignado`,
    );
  }
  return cuenta;
};

// ════════════════════════════════════════════════════════════
// HELPER: ASIENTO CONTABLE (N líneas al DEBE y N líneas al HABER)
// ════════════════════════════════════════════════════════════
/**
 * Los asientos siempre se registran en soles. Cada lado se convierte línea por línea y la
 * diferencia de redondeo se absorbe en la última línea, de modo que ambos lados sumen
 * exactamente el monto del movimiento.
 *
 * @param {Array<{cuentaId, monto, centroCostoId?, documento?, procesoId?}>} lineasDebe
 * @param {Array<{cuentaId, monto, centroCostoId?, documento?, procesoId?}>} lineasHaber
 *        montos en la moneda del movimiento; `documento` = referencia del documento origen
 */
const crearAsiento = async ({
  tx,
  movimiento,
  periodoContable,
  submodulo,
  estadoPendiente,
  lineasDebe,
  lineasHaber,
  glosa,
  proveedorId,
  esGerencial,
  tipoCambio,
  esMonedaNacional,
  creadoPor,
}) => {
  const empresaId = Number(movimiento.empresaId);
  const montoOriginal = Number(movimiento.monto);
  const aSoles = (monto) =>
    esMonedaNacional ? redondear2(monto) : redondear2(monto * tipoCambio);
  const totalSoles = aSoles(montoOriginal);

  const convertirLado = (lineas) => {
    const soles = lineas.map((l) => aSoles(l.monto));
    const diferencia = redondear2(totalSoles - soles.reduce((a, b) => a + b, 0));
    soles[soles.length - 1] = redondear2(soles[soles.length - 1] + diferencia);
    return soles;
  };
  const debesSoles = convertirLado(lineasDebe);
  const habersSoles = convertirLado(lineasHaber);

  const ultimoAsiento = await tx.asientoContable.findFirst({
    where: { empresaId, periodoContableId: Number(periodoContable.id) },
    orderBy: { correlativo: "desc" },
  });
  const correlativo = ultimoAsiento ? Number(ultimoAsiento.correlativo) + 1 : 1;
  // Mismo formato de 5 dígitos que el pago individual
  const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(5, "0")}`;

  const construirLinea = (linea, indice, desplazamiento, esDebe, solesLinea) => ({
    numeroLinea: desplazamiento + indice + 1,
    planCuentaId: linea.cuentaId,
    glosa,
    debe: esDebe ? solesLinea : 0,
    haber: esDebe ? 0 : solesLinea,
    monedaId: MONEDA_NACIONAL_ID,
    tipoCambio,
    debeMonedaExtranjera: esDebe && !esMonedaNacional ? redondear2(linea.monto) : null,
    haberMonedaExtranjera: !esDebe && !esMonedaNacional ? redondear2(linea.monto) : null,
    centroCostoId: linea.centroCostoId ?? null,
    entidadComercialId: proveedorId,
    tipoDocumentoOrigenId: linea.documento?.tipoDocumentoOrigenId ?? null,
    numeroDocumentoOrigen: linea.documento?.numeroDocumentoOrigen ?? null,
    fechaDocumentoOrigen: linea.documento?.fechaDocumentoOrigen ?? movimiento.fechaOperacionMovCaja,
    fechaVenceDocumentoOrigen: linea.documento?.fechaVenceDocumentoOrigen ?? null,
    submoduloOrigenLineaId: submodulo.id,
    procesoOrigenLineaId: linea.procesoId ?? movimiento.id,
    creadoPor,
  });

  return await tx.asientoContable.create({
    data: {
      empresaId,
      periodoContableId: Number(periodoContable.id),
      numeroAsiento,
      correlativo,
      fechaAsiento: movimiento.fechaOperacionMovCaja,
      glosa,
      // `tipoLibro` está DEPRECADO (el libro real es `tipoLibroId`): se deja siempre en FISCAL para
      // que las compras gerenciales queden en los mismos libros que las formales. Lo gerencial
      // se distingue solo con `esGerencial`, que permite excluirlas (contabilidad fiscal) o
      // incluirlas (panorama completo) filtrando por ese campo.
      tipoLibro: "FISCAL",
      tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
      esGerencial: Boolean(esGerencial),
      esSaldoInicial: false,
      origenAsiento: "AUTOMATICO",
      submoduloOrigenId: submodulo.id,
      procesoOrigenId: movimiento.id,
      estadoId: estadoPendiente.id,
      totalDebe: montoOriginal,
      totalHaber: montoOriginal,
      diferencia: 0,
      estaCuadrado: true,
      monedaId: movimiento.monedaId,
      tipoCambio,
      creadoPor,
      detalles: {
        create: [
          ...lineasDebe.map((l, i) => construirLinea(l, i, 0, true, debesSoles[i])),
          ...lineasHaber.map((l, i) =>
            construirLinea(l, i, lineasDebe.length, false, habersSoles[i]),
          ),
        ],
      },
    },
    include: { moneda: true, empresa: true },
  });
};

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════
/**
 * @param {Object} datos
 * @param {Array<{cuentaPorPagarId:number, monto:number}>} datos.items - Documentos a pagar y
 *        monto (neto) que se paga de cada uno, indicado manualmente por el usuario
 * @param {string|Date} datos.fechaPago
 * @param {number} datos.cuentaCorrienteOrigenId - Cuenta bancaria de donde sale el dinero
 * @param {number} datos.medioPagoId
 * @param {number} datos.tipoMovimientoId - Tipo de movimiento del egreso consolidado
 * @param {string} [datos.numeroOperacion]
 * @param {string} [datos.numeroCheque]
 * @param {string} [datos.descripcion] - Glosa; si no viene se arma automáticamente
 * @param {string} [datos.observaciones]
 * @param {number} [datos.itf=0]
 * @param {number} [datos.comision=0]
 * @param {number} [datos.tipoCambio] - TC de venta; solo si la moneda de los documentos no es soles
 * @param {number} datos.usuarioId
 */
const procesarPagoMultiple = async (datos) => {
  const {
    items,
    fechaPago,
    cuentaCorrienteOrigenId,
    medioPagoId,
    tipoMovimientoId,
    numeroOperacion,
    numeroCheque,
    observaciones,
    usuarioId,
  } = datos;

  try {
    // ════════════════════════════════════════════════════════════
    // 0. VALIDACIONES DE ENTRADA
    // ════════════════════════════════════════════════════════════
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError("Debe seleccionar al menos un documento");
    }
    const idsItems = items.map((it) => Number(it.cuentaPorPagarId));
    if (idsItems.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new ValidationError("La lista de documentos contiene identificadores inválidos");
    }
    if (new Set(idsItems).size !== idsItems.length) {
      throw new ValidationError("Un documento no puede repetirse en el mismo pago");
    }
    if (!fechaPago || !cuentaCorrienteOrigenId || !medioPagoId || !tipoMovimientoId) {
      throw new ValidationError(
        "La fecha, la cuenta corriente, el medio de pago y el tipo de movimiento son obligatorios",
      );
    }

    const montosCent = items.map((it) => {
      const monto = Number(it.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        throw new ValidationError("El monto a pagar de cada documento debe ser mayor a cero");
      }
      return aCentimos(monto);
    });
    const totalCent = montosCent.reduce((acc, m) => acc + m, 0n);
    const montoTotal = deCentimos(totalCent);

    const itf = Number(datos.itf || 0);
    const comision = Number(datos.comision || 0);
    if (itf < 0) throw new ValidationError("El ITF no puede ser negativo.");
    if (comision < 0) throw new ValidationError("La comisión no puede ser negativa.");

    const resultado = await prisma.$transaction(
      async (tx) => {
        // ════════════════════════════════════════════════════════════
        // 1. VALIDAR DOCUMENTOS
        // ════════════════════════════════════════════════════════════
        const cxpsBD = await tx.cuentaPorPagar.findMany({
          where: { id: { in: idsItems.map((id) => BigInt(id)) } },
          include: {
            proveedor: { select: { id: true, razonSocial: true, numeroDocumento: true } },
            ordenCompra: {
              select: {
                id: true,
                numeroDocumento: true,
                numeroDocumentoFinal: true,
                tipoDocumentoId: true,
                tipoDocumentoFinalId: true,
                fechaFacturacion: true,
                fechaVencimiento: true,
                aplicaDetraccion: true,
                detraccion: { select: { saldoPendiente: true } },
              },
            },
          },
        });

        if (cxpsBD.length !== idsItems.length) {
          throw new NotFoundError("Alguno de los documentos seleccionados no existe");
        }
        const cxpPorId = new Map(cxpsBD.map((c) => [Number(c.id), c]));
        // Se respeta el orden en que el usuario envió los documentos
        const cxps = idsItems.map((id) => cxpPorId.get(id));

        for (const c of cxps) {
          if ([ESTADOS_CXP.ANULADO, ESTADOS_CXP.CANJEADO].includes(Number(c.estadoId))) {
            throw new ValidationError(`El documento ${c.numeroOrdenCompra} está anulado o canjeado y no puede pagarse`);
          }
          if (Number(c.saldoPendiente) <= 0) {
            throw new ValidationError(`El documento ${c.numeroOrdenCompra} ya está completamente pagado`);
          }
        }

        const base = cxps[0];
        const igualesA = (campo) => cxps.every((c) => Number(c[campo]) === Number(base[campo]));
        if (!cxps.every((c) => Boolean(c.esGerencial) === Boolean(base.esGerencial))) {
          throw new ValidationError(
            "No se pueden mezclar documentos gerenciales con documentos formales en un mismo pago",
          );
        }
        if (!igualesA("proveedorId")) {
          throw new ValidationError("Los documentos deben ser de un mismo proveedor");
        }
        if (!igualesA("empresaId")) {
          throw new ValidationError("Los documentos deben ser de la misma empresa");
        }
        if (!igualesA("monedaId")) {
          throw new ValidationError("Los documentos deben estar en la misma moneda");
        }

        const empresaId = Number(base.empresaId);
        const proveedorId = base.proveedorId;
        // Toda la operación es del mismo tipo (se validó arriba): fiscal o gerencial
        const esGerencial = Boolean(base.esGerencial);
        const esMonedaNacional = Number(base.monedaId) === MONEDA_NACIONAL_ID;
        // Siempre TC de venta (sell_price): lo calcula y envía el formulario
        const tc = esMonedaNacional ? 1 : Number(datos.tipoCambio);
        if (!esMonedaNacional && !(tc > 0)) {
          throw new ValidationError(
            "Debe proporcionar el tipo de cambio para documentos en moneda extranjera",
          );
        }

        // Cada monto no puede superar el neto pagable (saldo - detracción pendiente)
        const saldosCent = cxps.map((c) => aCentimos(c.saldoPendiente));
        cxps.forEach((c, i) => {
          const detraccionPendiente =
            c.ordenCompra?.aplicaDetraccion && c.ordenCompra.detraccion
              ? aCentimos(c.ordenCompra.detraccion.saldoPendiente)
              : 0n;
          const netoCent = saldosCent[i] > detraccionPendiente ? saldosCent[i] - detraccionPendiente : 0n;
          if (montosCent[i] > netoCent) {
            throw new ValidationError(
              `El monto del documento ${c.numeroOrdenCompra} (${deCentimos(montosCent[i])}) supera su neto pagable (${deCentimos(netoCent)})`,
            );
          }
        });

        // ════════════════════════════════════════════════════════════
        // 2. VALIDAR CUENTA, MEDIO DE PAGO Y TIPO DE MOVIMIENTO
        // ════════════════════════════════════════════════════════════
        const cuenta = await tx.cuentaCorriente.findUnique({
          where: { id: Number(cuentaCorrienteOrigenId) },
        });
        if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada.");
        if (Number(cuenta.empresaId) !== empresaId) {
          throw new ValidationError("La cuenta corriente no pertenece a la empresa de los documentos");
        }
        if (Number(cuenta.monedaId) !== Number(base.monedaId)) {
          throw new ValidationError("La moneda de la cuenta corriente no coincide con la de los documentos");
        }
        if (!cuenta.cuentaContableId) {
          throw new ValidationError("La cuenta corriente no tiene cuenta contable asociada");
        }
        // No se valida saldo a propósito: solo se advierte en el formulario.

        const [medioPago, tipoMovimiento] = await Promise.all([
          tx.medioPago.findUnique({ where: { id: Number(medioPagoId) } }),
          tx.tipoMovEntregaRendir.findFirst({
            where: { id: Number(tipoMovimientoId), activo: true },
          }),
        ]);
        if (!medioPago) throw new NotFoundError("Medio de pago no encontrado.");
        if (!tipoMovimiento) throw new NotFoundError("Tipo de movimiento no encontrado o inactivo.");

        // ════════════════════════════════════════════════════════════
        // 3. DATOS CONTABLES
        // ════════════════════════════════════════════════════════════
        // DETECCIÓN DE CASO por documento (mismas reglas que el pago individual).
        // La precedencia importa: honorarios se evalúa primero, por eso un Recibo por Honorarios
        // gerencial es [CASO B] y no [CASO C].
        //  - [CASO B] Honorarios:        OrdenCompra.tipoDocumentoFinalId = 3 (Recibo por Honorarios)
        //  - [CASO C] Gasto sin factura: CxP gerencial que no es honorarios
        //  - [CASO A] Factura estándar:  todo lo demás
        const esHonorarios = (c) =>
          Number(c.ordenCompra?.tipoDocumentoFinalId) === TIPO_DOCUMENTO_HONORARIOS_ID;
        const esGastoSinFactura = (c) => Boolean(c.esGerencial) && !esHonorarios(c);
        const esFacturaEstandar = (c) => !esHonorarios(c) && !esGastoSinFactura(c);

        // Cada cuenta solo se exige si algún documento de la operación la usa:
        //   cuentaCxP → [CASO A] | cuentaHonorarios → [CASO B] | cuentaSuministros → [CASO C]
        const [
          submoduloMovCaja,
          estadoAsientoPendiente,
          cuentaCxP,
          cuentaHonorarios,
          cuentaSuministros,
        ] = await Promise.all([
          tx.submoduloSistema.findFirst({
            where: { nombreModeloOrigen: "MovimientoCaja", activo: true },
          }),
          tx.estadoMultiFuncion.findFirst({
            where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
          }),
          cxps.some(esFacturaEstandar)
            ? obtenerCuentaPorCodigo(
                tx,
                esMonedaNacional
                  ? CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_SOLES
                  : CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_PAGAR_DOLARES,
              )
            : Promise.resolve(null),
          cxps.some(esHonorarios)
            ? obtenerCuentaPorCodigo(
                tx,
                esMonedaNacional
                  ? CODIGOS_CUENTAS_CONTABLES.HONORARIOS_POR_PAGAR_SOLES
                  : CODIGOS_CUENTAS_CONTABLES.HONORARIOS_POR_PAGAR_DOLARES,
              )
            : Promise.resolve(null),
          cxps.some(esGastoSinFactura)
            ? obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.GASTOS_SUMINISTROS)
            : Promise.resolve(null),
        ]);
        if (!submoduloMovCaja) {
          throw new ValidationError('No se encontró el submódulo "MovimientoCaja"');
        }
        if (!estadoAsientoPendiente) {
          throw new ValidationError("No se encontró el estado PENDIENTE para asientos contables");
        }

        // [CASO C] Compras gerenciales (gastos sin factura): cuentas de gasto del detalle de la orden de
        // compra, agrupadas por cuenta. La referencia contable "GASTOS SIN FACTURA" define la
        // prioridad 1) DetalleOrdenCompra.cuentaContableId 2) Producto.cuentaComprasId 3) 656101;
        // el nivel 1 no existe hoy en el schema de DetalleOrdenCompra, por lo que se aplican los
        // niveles 2 y 3 (igual que el pago individual, cuyo nivel 1 siempre llega vacío).
        // Se resuelve antes de crear cualquier movimiento para fallar sin escribir nada.
        const gruposGastoPorCxp = new Map(); // id CxP -> [{ cuentaId, pesoCent }]
        const conceptosGasto = new Set();
        for (const c of cxps.filter(esGastoSinFactura)) {
          if (!c.ordenCompraId) {
            throw new ValidationError(
              `El documento ${c.numeroOrdenCompra} es gerencial y no tiene orden de compra: pague de forma individual`,
            );
          }
          const detalles = await tx.detalleOrdenCompra.findMany({
            where: { ordenCompraId: c.ordenCompraId },
            include: { producto: { select: { cuentaComprasId: true, descripcionArmada: true } } },
            orderBy: { id: "asc" },
          });

          const porCuenta = new Map();
          for (const d of detalles) {
            const cuentaId = d.producto?.cuentaComprasId ?? cuentaSuministros.id;
            const clave = String(cuentaId);
            const pesoCent = aCentimos(d.subtotal || 0);
            porCuenta.set(clave, {
              cuentaId,
              pesoCent: (porCuenta.get(clave)?.pesoCent ?? 0n) + pesoCent,
            });
            const concepto = (d.producto?.descripcionArmada || "").trim();
            if (concepto) conceptosGasto.add(concepto);
          }

          const grupos = [...porCuenta.values()];
          if (grupos.reduce((acc, g) => acc + g.pesoCent, 0n) <= 0n) {
            throw new ValidationError(
              `El documento ${c.numeroOrdenCompra} no tiene detalle con importe para distribuir el gasto: pague de forma individual`,
            );
          }
          gruposGastoPorCxp.set(Number(c.id), grupos);
        }

        // Las cuentas de gasto solo se exigen si hay ITF / comisión
        const cuentaGastoITF =
          itf > 0
            ? await obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.ITF, { exigirCentroCosto: true })
            : null;
        const cuentaGastoComision =
          comision > 0
            ? await obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS, {
                exigirCentroCosto: true,
              })
            : null;

        const fechaContable = new Date(fechaPago);
        const correlativo = await correlativoService.generarCorrelativo(empresaId, tx);
        const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(
          empresaId,
          fechaContable,
        );

        // ════════════════════════════════════════════════════════════
        // 4. GLOSA
        // ════════════════════════════════════════════════════════════
        const etiquetaDocumento = (c) => c.ordenCompra?.numeroDocumentoFinal || c.numeroOrdenCompra;
        let documentosTexto = cxps.map(etiquetaDocumento).join(" / ");
        if (documentosTexto.length > 200) documentosTexto = `${documentosTexto.slice(0, 197)}...`;
        // Glosa por defecto según el caso de la operación (solo si el usuario no escribió una).
        // Debe mantenerse idéntica a la que propone el formulario (PagoMultipleEspecializadoForm).
        let conceptoGasto = [...conceptosGasto].join(" / ");
        if (conceptoGasto.length > 150) conceptoGasto = `${conceptoGasto.slice(0, 147)}...`;

        let glosaPorDefecto;
        if (cxps.every(esHonorarios)) {
          // [CASO B] todos honorarios: "PAGO DE HONORARIOS N {NumDoc} - {RazonSocial}"
          glosaPorDefecto = `PAGO DE HONORARIOS N ${documentosTexto} - ${base.proveedor.razonSocial}`;
        } else if (cxps.every(esGastoSinFactura)) {
          // [CASO C] todos gastos sin factura: "GASTOS VARIOS - {Concepto}"
          glosaPorDefecto = `GASTOS VARIOS - ${conceptoGasto || documentosTexto}`;
        } else {
          // [CASO A] o mezcla de casos: glosa genérica
          glosaPorDefecto = `PAGO DE ${documentosTexto} - PROVEEDOR: ${base.proveedor.razonSocial}`;
        }
        let descripcionMovimiento =
          (datos.descripcion && String(datos.descripcion).trim()) || glosaPorDefecto;
        if (numeroCheque) descripcionMovimiento += ` N° CHEQUE: ${numeroCheque}`;

        // ════════════════════════════════════════════════════════════
        // 5. MOVIMIENTOS DE CAJA (EGRESO CONSOLIDADO + ITF + COMISIÓN) Y SALDOS EN CASCADA
        // ════════════════════════════════════════════════════════════
        const baseMovimiento = {
          refOperacionEspecializadaMovCaja: correlativo,
          empresaId,
          entidadComercialId: proveedorId,
          monedaId: base.monedaId,
          medioPagoId: Number(medioPagoId),
          fechaOperacionMovCaja: fechaContable,
          estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
          esGerencial,
          tipoCambio: tc,
          usuarioId: usuarioId ? Number(usuarioId) : null,
          // Un pago múltiple no tiene un único registro origen (hay N pagos):
          // por eso no se informa origenMotivoOperacionId; el vínculo es el correlativo.
          moduloOrigenMotivoOperacionId: SUBMODULO_ORIGEN_PAGOS_CXP_ID,
          fechaMotivoOperacion: new Date(),
          usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
        };

        const egreso = await registrarMovimientoEgreso({
          tx,
          cuenta,
          data: {
            ...baseMovimiento,
            tipoMovimientoId: tipoMovimiento.id,
            monto: montoTotal,
            cuentaCorrienteDestinoId: cuenta.id,
            descripcion: descripcionMovimiento,
            numeroOperacionPagoBanco: numeroOperacion || null,
            fechaOperacionPagoBanco: fechaContable,
          },
        });

        const itfRegistro =
          itf > 0
            ? await registrarMovimientoEgreso({
                tx,
                cuenta,
                saldoAnteriorManual: egreso.saldoActual,
                data: {
                  ...baseMovimiento,
                  tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
                  monto: itf,
                  cuentaCorrienteOrigenId: cuenta.id,
                  descripcion: `ITF - ${descripcionMovimiento}`,
                },
              })
            : null;

        const comisionRegistro =
          comision > 0
            ? await registrarMovimientoEgreso({
                tx,
                cuenta,
                // ?? y no ||: un saldo de 0 es válido y no debe retroceder al saldo anterior
                saldoAnteriorManual: itfRegistro?.saldoActual ?? egreso.saldoActual,
                data: {
                  ...baseMovimiento,
                  tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
                  monto: comision,
                  cuentaCorrienteOrigenId: cuenta.id,
                  descripcion: `Comisión - ${descripcionMovimiento}`,
                },
              })
            : null;

        // ════════════════════════════════════════════════════════════
        // 6. PAGO POR DOCUMENTO + ACTUALIZACIÓN DE SALDO Y ESTADO
        // ════════════════════════════════════════════════════════════
        const distribucion = [];
        const lineasDebeCxP = [];

        for (let i = 0; i < cxps.length; i++) {
          const cxp = cxps[i];
          const montoAplicado = deCentimos(montosCent[i]);
          const nuevoSaldoCent = saldosCent[i] - montosCent[i];
          const nuevoSaldo = deCentimos(nuevoSaldoCent);
          const nuevoMontoPagado = redondear2(Number(cxp.montoPagado) + montoAplicado);
          // Queda PAGADO solo cuando se cancela la totalidad (incluido el impuesto)
          const nuevoEstadoId =
            nuevoSaldoCent === 0n ? ESTADOS_CXP.PAGADO : ESTADOS_CXP.PAGO_PARCIAL;

          // Anti doble pago: solo actualiza si el saldo no cambió desde que se leyó
          const reclamo = await tx.cuentaPorPagar.updateMany({
            where: { id: cxp.id, saldoPendiente: cxp.saldoPendiente },
            data: {
              montoPagado: nuevoMontoPagado,
              saldoPendiente: nuevoSaldo,
              estadoId: nuevoEstadoId,
              actualizadoPor: usuarioId ? Number(usuarioId) : null,
            },
          });
          if (reclamo.count !== 1) {
            throw new ValidationError(
              `El documento ${cxp.numeroOrdenCompra} fue modificado por otro usuario. Recargue e intente nuevamente.`,
            );
          }

          const pago = await tx.pagoCuentaPorPagar.create({
            data: {
              cuentaPorPagarId: cxp.id,
              empresaId,
              fechaPago: fechaContable,
              montoPagado: montoAplicado,
              monedaPagoId: base.monedaId,
              tipoCambio: tc,
              montoAplicadoDeuda: montoAplicado,
              monedaDeudaId: base.monedaId,
              medioPagoId: Number(medioPagoId),
              numeroOperacion: numeroOperacion || null,
              bancoId: cuenta.bancoId ?? null,
              cuentaBancariaId: cuenta.id,
              movimientoCajaId: egreso.movimiento.id,
              observaciones: observaciones || null,
              // Control de cierre contable: mismo período que usan los asientos de esta operación
              fechaContable,
              periodoContableId: periodoContable.id,
              refOperacionEspecializadaMovCaja: correlativo,
              creadoPor: usuarioId ? Number(usuarioId) : null,
            },
          });

          // Referencia del documento igual que el pago individual (numeroDocumento de la OC)
          const documentoOrigen = {
            tipoDocumentoOrigenId: cxp.ordenCompra?.tipoDocumentoId ?? null,
            numeroDocumentoOrigen: cxp.ordenCompra?.numeroDocumento ?? cxp.numeroOrdenCompra,
            fechaDocumentoOrigen: cxp.ordenCompra?.fechaFacturacion ?? cxp.fechaEmision,
            fechaVenceDocumentoOrigen: cxp.ordenCompra?.fechaVencimiento ?? cxp.fechaVencimiento,
          };

          // Líneas del DEBE de este documento: una bifurcación por caso (ver MAPA DE BIFURCACIONES)
          if (esGastoSinFactura(cxp)) {
            // [CASO C] GASTO SIN FACTURA: el pago se reparte entre las cuentas de gasto del
            // detalle de la orden de compra, proporcional a su importe (exacto al céntimo).
            // Una línea por cuenta de gasto; la suma de las líneas es exactamente lo pagado.
            const grupos = gruposGastoPorCxp.get(Number(cxp.id));
            const partes = repartirProporcional(
              grupos.map((g) => g.pesoCent),
              montosCent[i],
            );
            grupos.forEach((g, k) => {
              if (partes[k] <= 0n) return;
              lineasDebeCxP.push({
                cuentaId: g.cuentaId,
                monto: deCentimos(partes[k]),
                procesoId: pago.id,
                documento: documentoOrigen,
              });
            });
          } else if (esHonorarios(cxp)) {
            // [CASO B] HONORARIOS: una línea al DEBE de Honorarios por pagar (424101 / 424102)
            lineasDebeCxP.push({
              cuentaId: cuentaHonorarios.id,
              monto: montoAplicado,
              procesoId: pago.id,
              documento: documentoOrigen,
            });
          } else {
            // [CASO A] FACTURA ESTÁNDAR: una línea al DEBE de Facturas por pagar (421201 / 421202)
            lineasDebeCxP.push({
              cuentaId: cuentaCxP.id,
              monto: montoAplicado,
              procesoId: pago.id,
              documento: documentoOrigen,
            });
          }

          distribucion.push({
            cuentaPorPagarId: cxp.id,
            pagoId: pago.id,
            documento: etiquetaDocumento(cxp),
            saldoAnterior: deCentimos(saldosCent[i]),
            montoAplicado,
            nuevoSaldo,
            nuevoEstadoId,
          });
        }

        // ════════════════════════════════════════════════════════════
        // 7. ASIENTOS CONTABLES (si uno falla, se revierte toda la operación)
        // ════════════════════════════════════════════════════════════
        const paramsAsiento = {
          tx,
          periodoContable,
          submodulo: submoduloMovCaja,
          estadoPendiente: estadoAsientoPendiente,
          proveedorId,
          esGerencial,
          tipoCambio: tc,
          esMonedaNacional,
          creadoPor: usuarioId,
        };

        const asientos = [];

        // Egreso consolidado: DEBE una línea por documento, HABER banco por el total
        asientos.push(
          await crearAsiento({
            ...paramsAsiento,
            movimiento: egreso.movimiento,
            lineasDebe: lineasDebeCxP,
            lineasHaber: [{ cuentaId: cuenta.cuentaContableId, monto: montoTotal }],
            glosa: descripcionMovimiento,
          }),
        );

        if (itfRegistro) {
          asientos.push(
            await crearAsiento({
              ...paramsAsiento,
              movimiento: itfRegistro.movimiento,
              lineasDebe: [
                { cuentaId: cuentaGastoITF.id, monto: itf, centroCostoId: cuentaGastoITF.centroCostoId },
              ],
              lineasHaber: [{ cuentaId: cuenta.cuentaContableId, monto: itf }],
              glosa: `POR EL ITF - ${descripcionMovimiento}`,
            }),
          );
        }

        if (comisionRegistro) {
          asientos.push(
            await crearAsiento({
              ...paramsAsiento,
              movimiento: comisionRegistro.movimiento,
              lineasDebe: [
                {
                  cuentaId: cuentaGastoComision.id,
                  monto: comision,
                  centroCostoId: cuentaGastoComision.centroCostoId,
                },
              ],
              lineasHaber: [{ cuentaId: cuenta.cuentaContableId, monto: comision }],
              glosa: `POR LA COMISION - ${descripcionMovimiento}`,
            }),
          );
        }

        const movimientos = [
          egreso.movimiento,
          itfRegistro?.movimiento,
          comisionRegistro?.movimiento,
        ].filter(Boolean);

        await tx.movimientoCaja.updateMany({
          where: { id: { in: movimientos.map((m) => m.id) } },
          data: { asientosGenerados: true },
        });

        // ════════════════════════════════════════════════════════════
        // 8. RESPUESTA (misma forma que el cobro múltiple, para reutilizar vouchers y confirmación)
        // ════════════════════════════════════════════════════════════
        const movimientosCompletos = await tx.movimientoCaja.findMany({
          where: { id: { in: movimientos.map((m) => m.id) } },
          include: {
            tipoMovimiento: true,
            moneda: true,
            medioPago: true,
            empresa: true,
            entidadComercial: { select: { id: true, razonSocial: true, numeroDocumento: true } },
            cuentaCorrienteOrigen: { include: { banco: true, moneda: true, empresa: true } },
            cuentaCorrienteDestino: { include: { banco: true, moneda: true, empresa: true } },
          },
        });
        const movimientosMap = {};
        movimientosCompletos.forEach((m) => {
          movimientosMap[m.id.toString()] = m;
        });

        const etiquetasSaldo = {
          [egreso.movimiento.id]: "Egreso",
          ...(itfRegistro && { [itfRegistro.movimiento.id]: "ITF" }),
          ...(comisionRegistro && { [comisionRegistro.movimiento.id]: "Comisión" }),
        };
        const saldos = await tx.saldoCuentaCorriente.findMany({
          where: { movimientoCajaId: { in: movimientos.map((m) => m.id) } },
          orderBy: { fecha: "asc" },
        });
        const saldosCuentaCorriente = saldos
          .filter((s) => etiquetasSaldo[s.movimientoCajaId.toString()])
          .map((s) => ({
            tipo: etiquetasSaldo[s.movimientoCajaId.toString()],
            movimientoCajaId: s.movimientoCajaId,
            saldoAnterior: Number(s.saldoAnterior),
            ingresos: Number(s.ingresos),
            egresos: Number(s.egresos),
            saldoActual: Number(s.saldoActual),
          }));

        const saldoFinalCuenta =
          comisionRegistro?.saldoActual ?? itfRegistro?.saldoActual ?? egreso.saldoActual;

        return {
          success: true,
          message: `Pago de ${distribucion.length} documento(s) registrado exitosamente`,
          data: {
            correlativo: Number(correlativo),
            movimientoEgresoId: egreso.movimiento.id,
            movimientoITFId: itfRegistro?.movimiento.id || null,
            movimientoComisionId: comisionRegistro?.movimiento.id || null,
            movimientos: {
              egreso: movimientosMap[egreso.movimiento.id.toString()] || null,
              itf: itfRegistro ? movimientosMap[itfRegistro.movimiento.id.toString()] : null,
              comision: comisionRegistro
                ? movimientosMap[comisionRegistro.movimiento.id.toString()]
                : null,
            },
            saldosCuentaCorriente,
            asientosContables: asientos,
            distribucion,
            resumen: {
              documentosPagados: distribucion.length,
              montoPagado: montoTotal,
              itf,
              comision,
              totalDebitado: redondear2(montoTotal + itf + comision),
              saldoFinalCuenta,
              movimientosCreados: 1 + (itfRegistro ? 1 : 0) + (comisionRegistro ? 1 : 0),
            },
          },
        };
      },
      { maxWait: 10000, timeout: 60000 },
    );

    return resultado;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al procesar el pago múltiple", err.message);
    }
    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// SINCRONIZACIÓN DEL VOUCHER CONSOLIDADO DE LA OPERACIÓN
// ════════════════════════════════════════════════════════════
/**
 * Una operación de pago múltiple genera N PagoCuentaPorPagar, pero el sistema PDF guarda
 * el archivo solo en el registro del entityId (el primer pago). Esta función copia la URL
 * del voucher consolidado a los demás pagos de la misma operación.
 *
 * Solo se copia el voucher: el comprobante de impuesto (urlPagoImpuesto) es propio de cada
 * documento y nunca se comparte.
 *
 * Los pagos se agrupan por refOperacionEspecializadaMovCaja (correlativo de la empresa),
 * por eso también se filtra por empresa: el mismo número puede repetirse entre empresas.
 *
 * @param {number|bigint} pagoId - Pago que recibió el archivo (origen de la copia)
 */
const sincronizarVoucherOperacion = async (pagoId) => {
  try {
    const origen = await prisma.pagoCuentaPorPagar.findUnique({
      where: { id: BigInt(pagoId) },
      select: {
        id: true,
        empresaId: true,
        refOperacionEspecializadaMovCaja: true,
        urlVoucherOperacionConsolidado: true,
      },
    });

    if (!origen) throw new NotFoundError("Pago de cuenta por pagar no encontrado");

    // Pagos individuales (sin operación asociada): no hay hermanos que sincronizar
    if (!origen.refOperacionEspecializadaMovCaja) {
      return { success: true, actualizados: 0 };
    }

    const { count } = await prisma.pagoCuentaPorPagar.updateMany({
      where: {
        id: { not: origen.id },
        empresaId: origen.empresaId,
        refOperacionEspecializadaMovCaja: origen.refOperacionEspecializadaMovCaja,
      },
      data: { urlVoucherOperacionConsolidado: origen.urlVoucherOperacionConsolidado },
    });

    return { success: true, actualizados: count };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al sincronizar el voucher", err.message);
    }
    throw err;
  }
};

export default {
  procesarPagoMultiple,
  sincronizarVoucherOperacion,
};
