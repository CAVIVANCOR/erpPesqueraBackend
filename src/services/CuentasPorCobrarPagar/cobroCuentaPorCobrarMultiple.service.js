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
 * SERVICIO: COBRO MÚLTIPLE (ESPECIALIZADO) DE CUENTAS POR COBRAR
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Un cliente deposita UN solo monto para amortizar varias facturas. El usuario indica
 * manualmente cuánto se descuenta de cada documento (ítems) y el sistema procesa cada
 * documento por separado dentro de UNA transacción atómica:
 *   1. MovimientoCaja de INGRESO consolidado (una sola operación bancaria) + ITF + comisión
 *   2. Un PagoCuentaPorCobrar por documento (monto = lo indicado para ese documento)
 *   3. Actualización de montoPagado / saldoPendiente / estado de cada CxC
 *   4. Asientos contables (si uno falla se revierte toda la operación)
 *
 * Alcance: SOLO EL NETO. Detracción, retención y percepción no se cobran aquí: cada
 * documento tiene su propio comprobante y se registran con el cobro individual
 * (pagoEspecializadoCuentaPorCobrar.service.js). Por eso el monto máximo de cada documento
 * es su neto cobrable = saldoPendiente - detracción pendiente (misma regla que el cobro
 * individual). Un documento queda PAGADO únicamente cuando su saldo llega a cero
 * (incluido el impuesto); mientras tanto queda PAGO PARCIAL.
 *
 * Autónomo a propósito (mismo criterio que pagoDeudaPersonalMultiple): no toca el servicio
 * del cobro individual, que está en producción.
 *
 * Convención copiada de pagoEspecializadoCuentaPorCobrar.service.js:
 *   - Ingreso:        la cuenta bancaria va en cuentaCorrienteDestinoId.
 *   - ITF y comisión: la cuenta bancaria va en cuentaCorrienteOrigenId.
 *   - Submódulo origen de la operación: 116 (Pagos de Cuentas por Cobrar).
 *   - Tipo de cambio: siempre TC de venta (sell_price), lo envía el formulario.
 *
 * Asiento:
 *   DEBE  = CuentaCorriente.cuentaContableId (banco del ingreso)
 *   HABER = una línea POR DOCUMENTO con su referencia, para no perder el auxiliar por cliente;
 *           la cuenta depende del caso (ver MAPA DE BIFURCACIONES).
 *   Libro = CAJA_BANCOS (tipoLibroId) en ambos casos; lo gerencial se distingue solo con
 *           esGerencial (el campo deprecado tipoLibro queda siempre en FISCAL)
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MAPA DE BIFURCACIONES (buscar el código de caso, p. ej. "[CASO B]", para seguir el rastro)
 * ────────────────────────────────────────────────────────────────────────────
 * Una operación es de UN solo caso (nunca se mezclan ventas formales con gerenciales):
 *
 *   [CASO A] VENTA FORMAL       CuentaPorCobrar.esGerencial = false
 *            HABER 121201 / 121202 (Facturas por cobrar soles / dólares).
 *            Referencia contable: COBRO_FACTURA_VENTA.
 *   [CASO B] VENTA GERENCIAL    CuentaPorCobrar.esGerencial = true  ("venta negra")
 *            HABER 759901 (Otros ingresos de operación), en soles y dólares.
 *            No existe cuenta por cobrar contable porque la venta nunca se registró
 *            en el libro fiscal: el ingreso se reconoce al cobrar.
 *
 * Dónde se bifurca (en el orden en que ocurre en procesarCobroMultiple):
 *   paso 1  validación: todos los documentos del mismo tipo (formal o gerencial)
 *   paso 3  cuenta del HABER: 121201/121202 [CASO A] o 759901 [CASO B]
 *   paso 4  glosa por defecto: la misma para ambos casos
 *   paso 6  línea del HABER de cada documento (if / else por caso)
 *   paso 7  el asiento es el mismo para ambos casos; cambian la cuenta del HABER y el libro
 *
 * Glosa por defecto (referencia contable COBRO_FACTURA_VENTA):
 *   "Cobro de fact. {NumDoc} por venta de {Concepto}"
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES (mismos valores que pagoEspecializadoCuentaPorCobrar.service.js)
// ════════════════════════════════════════════════════════════
const ESTADOS_CXC = {
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
// Submódulo origen del motivo de la operación: Pagos de Cuentas por Cobrar
const SUBMODULO_ORIGEN_PAGOS_CXC_ID = 116;

const CODIGOS_CUENTAS_CONTABLES = {
  // [CASO A] venta formal
  FACTURAS_POR_COBRAR_SOLES: "121201",
  FACTURAS_POR_COBRAR_DOLARES: "121202",
  // [CASO B] venta gerencial: el cobro se reconoce directamente como otros ingresos de operación
  OTROS_INGRESOS_OPERACION: "759901",
  ITF: "641101",
  COMISIONES_BANCARIAS: "679401",
};

// ════════════════════════════════════════════════════════════
// HELPERS NUMÉRICOS
// ════════════════════════════════════════════════════════════
const aCentimos = (valor) => BigInt(Math.round(Number(valor) * 100));
const deCentimos = (centimos) => Number(centimos) / 100;
const redondear2 = (valor) => Math.round(Number(valor) * 100) / 100;

// ════════════════════════════════════════════════════════════
// HELPERS DE CAJA
// ════════════════════════════════════════════════════════════
const actualizarSaldoCuentaCorriente = async ({
  tx,
  cuentaCorrienteId,
  empresaId,
  fecha,
  ingresos = 0,
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
      ingresos: Number(ingresos),
      egresos: Number(egresos),
      saldoActual: saldoAnterior + Number(ingresos) - Number(egresos),
      movimientoCajaId: Number(movimientoCajaId),
      centroCostoId: null,
      conciliado: false,
    },
  });
};

/** Crea el movimiento y su registro de saldo en cascada (ingreso o egreso). */
const registrarMovimiento = async ({
  tx,
  data,
  cuenta,
  esIngreso,
  saldoAnteriorManual = null,
}) => {
  const movimiento = await tx.movimientoCaja.create({ data });

  const registroSaldo = await actualizarSaldoCuentaCorriente({
    tx,
    cuentaCorrienteId: cuenta.id,
    empresaId: cuenta.empresaId,
    fecha: data.fechaOperacionMovCaja,
    ingresos: esIngreso ? data.monto : 0,
    egresos: esIngreso ? 0 : data.monto,
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
  clienteId,
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
  // Mismo formato de 5 dígitos que el cobro individual
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
    entidadComercialId: clienteId,
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
      // que las ventas gerenciales queden en los mismos libros que las formales. Lo gerencial
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
 * @param {Array<{cuentaPorCobrarId:number, monto:number}>} datos.items - Documentos a cobrar y
 *        monto (neto) que se descuenta de cada uno, indicado manualmente por el usuario
 * @param {string|Date} datos.fechaPago
 * @param {number} datos.cuentaCorrienteDestinoId - Cuenta bancaria donde el cliente depositó
 * @param {number} datos.medioPagoId
 * @param {number} datos.tipoMovimientoId - Tipo de movimiento del ingreso consolidado
 * @param {string} [datos.numeroOperacion]
 * @param {string} [datos.descripcion] - Glosa; si no viene se arma automáticamente
 * @param {string} [datos.observaciones]
 * @param {number} [datos.itf=0]
 * @param {number} [datos.comision=0]
 * @param {number} [datos.tipoCambio] - TC de venta; solo si la moneda de los documentos no es soles
 * @param {number} datos.usuarioId
 */
const procesarCobroMultiple = async (datos) => {
  const {
    items,
    fechaPago,
    cuentaCorrienteDestinoId,
    medioPagoId,
    tipoMovimientoId,
    numeroOperacion,
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
    const idsItems = items.map((it) => Number(it.cuentaPorCobrarId));
    if (idsItems.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new ValidationError("La lista de documentos contiene identificadores inválidos");
    }
    if (new Set(idsItems).size !== idsItems.length) {
      throw new ValidationError("Un documento no puede repetirse en el mismo cobro");
    }
    if (!fechaPago || !cuentaCorrienteDestinoId || !medioPagoId || !tipoMovimientoId) {
      throw new ValidationError(
        "La fecha, la cuenta corriente, el medio de pago y el tipo de movimiento son obligatorios",
      );
    }

    const montosCent = items.map((it) => {
      const monto = Number(it.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        throw new ValidationError("El monto a cobrar de cada documento debe ser mayor a cero");
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
        const cxcsBD = await tx.cuentaPorCobrar.findMany({
          where: { id: { in: idsItems.map((id) => BigInt(id)) } },
          include: {
            cliente: { select: { id: true, razonSocial: true, numeroDocumento: true } },
            preFactura: {
              select: {
                id: true,
                numeroDocumentoFinal: true,
                tipoDocumentoFinalId: true,
                fechaFacturacion: true,
                fechaVencimiento: true,
                aplicaDetraccion: true,
                detraccion: { select: { saldoPendiente: true } },
              },
            },
          },
        });

        if (cxcsBD.length !== idsItems.length) {
          throw new NotFoundError("Alguno de los documentos seleccionados no existe");
        }
        const cxcPorId = new Map(cxcsBD.map((c) => [Number(c.id), c]));
        // Se respeta el orden en que el usuario envió los documentos
        const cxcs = idsItems.map((id) => cxcPorId.get(id));

        for (const c of cxcs) {
          if ([ESTADOS_CXC.ANULADO, ESTADOS_CXC.CANJEADO].includes(Number(c.estadoId))) {
            throw new ValidationError(`El documento ${c.numeroPreFactura} está anulado o canjeado y no puede cobrarse`);
          }
          if (Number(c.saldoPendiente) <= 0) {
            throw new ValidationError(`El documento ${c.numeroPreFactura} ya está completamente cobrado`);
          }
        }

        const base = cxcs[0];
        const igualesA = (campo) => cxcs.every((c) => Number(c[campo]) === Number(base[campo]));
        if (!igualesA("clienteId")) {
          throw new ValidationError("Los documentos deben ser de un mismo cliente");
        }
        if (!igualesA("empresaId")) {
          throw new ValidationError("Los documentos deben ser de la misma empresa");
        }
        if (!igualesA("monedaId")) {
          throw new ValidationError("Los documentos deben estar en la misma moneda");
        }
        if (!cxcs.every((c) => Boolean(c.esGerencial) === Boolean(base.esGerencial))) {
          throw new ValidationError(
            "No se pueden mezclar documentos gerenciales con documentos formales en un mismo cobro",
          );
        }

        const empresaId = Number(base.empresaId);
        const clienteId = base.clienteId;
        const esGerencial = Boolean(base.esGerencial);
        const esMonedaNacional = Number(base.monedaId) === MONEDA_NACIONAL_ID;
        // Siempre TC de venta (sell_price): lo calcula y envía el formulario
        const tc = esMonedaNacional ? 1 : Number(datos.tipoCambio);
        if (!esMonedaNacional && !(tc > 0)) {
          throw new ValidationError(
            "Debe proporcionar el tipo de cambio para documentos en moneda extranjera",
          );
        }

        // Cada monto no puede superar el neto cobrable (saldo - detracción pendiente)
        const saldosCent = cxcs.map((c) => aCentimos(c.saldoPendiente));
        cxcs.forEach((c, i) => {
          const detraccionPendiente =
            c.preFactura?.aplicaDetraccion && c.preFactura.detraccion
              ? aCentimos(c.preFactura.detraccion.saldoPendiente)
              : 0n;
          const netoCent = saldosCent[i] > detraccionPendiente ? saldosCent[i] - detraccionPendiente : 0n;
          if (montosCent[i] > netoCent) {
            throw new ValidationError(
              `El monto del documento ${c.numeroPreFactura} (${deCentimos(montosCent[i])}) supera su neto cobrable (${deCentimos(netoCent)})`,
            );
          }
        });

        // ════════════════════════════════════════════════════════════
        // 2. VALIDAR CUENTA, MEDIO DE PAGO Y TIPO DE MOVIMIENTO
        // ════════════════════════════════════════════════════════════
        const cuenta = await tx.cuentaCorriente.findUnique({
          where: { id: Number(cuentaCorrienteDestinoId) },
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
        // CUENTA DEL HABER según el caso de la operación (todos los documentos son del mismo caso):
        //   [CASO A] venta formal    → Facturas por cobrar 121201 (soles) / 121202 (dólares)
        //   [CASO B] venta gerencial → Otros ingresos de operación 759901 (ambas monedas)
        const codigoCuentaHaber = esGerencial
          ? CODIGOS_CUENTAS_CONTABLES.OTROS_INGRESOS_OPERACION
          : esMonedaNacional
            ? CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_COBRAR_SOLES
            : CODIGOS_CUENTAS_CONTABLES.FACTURAS_POR_COBRAR_DOLARES;

        const [submoduloMovCaja, estadoAsientoPendiente, cuentaHaberDocumentos] = await Promise.all([
          tx.submoduloSistema.findFirst({
            where: { nombreModeloOrigen: "MovimientoCaja", activo: true },
          }),
          tx.estadoMultiFuncion.findFirst({
            where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
          }),
          obtenerCuentaPorCodigo(tx, codigoCuentaHaber),
        ]);
        if (!submoduloMovCaja) {
          throw new ValidationError('No se encontró el submódulo "MovimientoCaja"');
        }
        if (!estadoAsientoPendiente) {
          throw new ValidationError("No se encontró el estado PENDIENTE para asientos contables");
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
        const etiquetaDocumento = (c) => c.preFactura?.numeroDocumentoFinal || c.numeroPreFactura;
        let documentosTexto = cxcs.map(etiquetaDocumento).join(" / ");
        if (documentosTexto.length > 200) documentosTexto = `${documentosTexto.slice(0, 197)}...`;

        // Glosa por defecto de la referencia COBRO_FACTURA_VENTA (casos A y B por igual), solo si
        // el usuario no escribió una: "Cobro de fact. {NumDoc} por venta de {Concepto}".
        // {Concepto} = productos / servicios del detalle de las pre-facturas, sin repetir.
        // Debe mantenerse idéntica a la que propone el formulario (CobroMultipleEspecializadoForm).
        const idsPreFactura = cxcs.map((c) => c.preFactura?.id).filter(Boolean);
        const detallesVenta = idsPreFactura.length
          ? await tx.detallePreFactura.findMany({
              where: { preFacturaId: { in: idsPreFactura } },
              select: { producto: { select: { descripcionArmada: true } } },
              orderBy: { id: "asc" },
            })
          : [];
        let conceptoVenta = [
          ...new Set(detallesVenta.map((d) => (d.producto?.descripcionArmada || "").trim()).filter(Boolean)),
        ].join(" / ");
        if (conceptoVenta.length > 150) conceptoVenta = `${conceptoVenta.slice(0, 147)}...`;

        const glosaPorDefecto = conceptoVenta
          ? `Cobro de fact. ${documentosTexto} por venta de ${conceptoVenta}`
          : `Cobro de fact. ${documentosTexto} - CLIENTE: ${base.cliente.razonSocial}`;
        const descripcionMovimiento =
          (datos.descripcion && String(datos.descripcion).trim()) || glosaPorDefecto;

        // ════════════════════════════════════════════════════════════
        // 5. MOVIMIENTOS DE CAJA (INGRESO CONSOLIDADO + ITF + COMISIÓN) Y SALDOS EN CASCADA
        // ════════════════════════════════════════════════════════════
        const baseMovimiento = {
          refOperacionEspecializadaMovCaja: correlativo,
          empresaId,
          entidadComercialId: clienteId,
          monedaId: base.monedaId,
          medioPagoId: Number(medioPagoId),
          fechaOperacionMovCaja: fechaContable,
          estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
          esGerencial,
          tipoCambio: tc,
          usuarioId: usuarioId ? Number(usuarioId) : null,
          // Un cobro múltiple no tiene un único registro origen (hay N pagos):
          // por eso no se informa origenMotivoOperacionId; el vínculo es el correlativo.
          moduloOrigenMotivoOperacionId: SUBMODULO_ORIGEN_PAGOS_CXC_ID,
          fechaMotivoOperacion: new Date(),
          usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
        };

        const ingreso = await registrarMovimiento({
          tx,
          cuenta,
          esIngreso: true,
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
            ? await registrarMovimiento({
                tx,
                cuenta,
                esIngreso: false,
                saldoAnteriorManual: ingreso.saldoActual,
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
            ? await registrarMovimiento({
                tx,
                cuenta,
                esIngreso: false,
                // ?? y no ||: un saldo de 0 es válido y no debe retroceder al saldo anterior
                saldoAnteriorManual: itfRegistro?.saldoActual ?? ingreso.saldoActual,
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
        const lineasHaberCxC = [];

        for (let i = 0; i < cxcs.length; i++) {
          const cxc = cxcs[i];
          const montoAplicado = deCentimos(montosCent[i]);
          const nuevoSaldoCent = saldosCent[i] - montosCent[i];
          const nuevoSaldo = deCentimos(nuevoSaldoCent);
          const nuevoMontoPagado = redondear2(Number(cxc.montoPagado) + montoAplicado);
          // Queda PAGADO solo cuando se cancela la totalidad (incluido el impuesto)
          const nuevoEstadoId =
            nuevoSaldoCent === 0n ? ESTADOS_CXC.PAGADO : ESTADOS_CXC.PAGO_PARCIAL;

          // Anti doble cobro: solo actualiza si el saldo no cambió desde que se leyó
          const reclamo = await tx.cuentaPorCobrar.updateMany({
            where: { id: cxc.id, saldoPendiente: cxc.saldoPendiente },
            data: {
              montoPagado: nuevoMontoPagado,
              saldoPendiente: nuevoSaldo,
              estadoId: nuevoEstadoId,
              actualizadoPor: usuarioId ? Number(usuarioId) : null,
            },
          });
          if (reclamo.count !== 1) {
            throw new ValidationError(
              `El documento ${cxc.numeroPreFactura} fue modificado por otro usuario. Recargue e intente nuevamente.`,
            );
          }

          const pago = await tx.pagoCuentaPorCobrar.create({
            data: {
              cuentaPorCobrarId: cxc.id,
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
              movimientoCajaId: ingreso.movimiento.id,
              observaciones: observaciones || null,
              // Control de cierre contable: mismo período que usan los asientos de esta operación
              fechaContable,
              periodoContableId: periodoContable.id,
              refOperacionEspecializadaMovCaja: correlativo,
              creadoPor: usuarioId ? Number(usuarioId) : null,
            },
          });

          // Línea del HABER de este documento. La cuenta ya se resolvió según el caso de la
          // operación (ver MAPA DE BIFURCACIONES); la referencia del documento se conserva
          // en ambos casos para mantener el auxiliar por cliente.
          const documentoOrigen = {
            tipoDocumentoOrigenId: cxc.preFactura?.tipoDocumentoFinalId ?? null,
            numeroDocumentoOrigen: etiquetaDocumento(cxc),
            fechaDocumentoOrigen: cxc.preFactura?.fechaFacturacion ?? cxc.fechaEmision,
            fechaVenceDocumentoOrigen: cxc.preFactura?.fechaVencimiento ?? cxc.fechaVencimiento,
          };

          if (esGerencial) {
            // [CASO B] VENTA GERENCIAL: HABER 759901 Otros ingresos de operación
            lineasHaberCxC.push({
              cuentaId: cuentaHaberDocumentos.id,
              monto: montoAplicado,
              procesoId: pago.id,
              documento: documentoOrigen,
            });
          } else {
            // [CASO A] VENTA FORMAL: HABER 121201 / 121202 Facturas por cobrar
            lineasHaberCxC.push({
              cuentaId: cuentaHaberDocumentos.id,
              monto: montoAplicado,
              procesoId: pago.id,
              documento: documentoOrigen,
            });
          }

          distribucion.push({
            cuentaPorCobrarId: cxc.id,
            pagoId: pago.id,
            documento: etiquetaDocumento(cxc),
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
          clienteId,
          esGerencial,
          tipoCambio: tc,
          esMonedaNacional,
          creadoPor: usuarioId,
        };

        const asientos = [];

        // Ingreso consolidado: DEBE banco por el total, HABER una línea por documento
        asientos.push(
          await crearAsiento({
            ...paramsAsiento,
            movimiento: ingreso.movimiento,
            lineasDebe: [{ cuentaId: cuenta.cuentaContableId, monto: montoTotal }],
            lineasHaber: lineasHaberCxC,
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
          ingreso.movimiento,
          itfRegistro?.movimiento,
          comisionRegistro?.movimiento,
        ].filter(Boolean);

        await tx.movimientoCaja.updateMany({
          where: { id: { in: movimientos.map((m) => m.id) } },
          data: { asientosGenerados: true },
        });

        // ════════════════════════════════════════════════════════════
        // 8. RESPUESTA (misma forma que el pago múltiple de personal, para reutilizar vouchers y confirmación)
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
          [ingreso.movimiento.id]: "Ingreso",
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
          comisionRegistro?.saldoActual ?? itfRegistro?.saldoActual ?? ingreso.saldoActual;

        return {
          success: true,
          message: `Cobro de ${distribucion.length} documento(s) registrado exitosamente`,
          data: {
            correlativo: Number(correlativo),
            movimientoIngresoId: ingreso.movimiento.id,
            movimientoITFId: itfRegistro?.movimiento.id || null,
            movimientoComisionId: comisionRegistro?.movimiento.id || null,
            movimientos: {
              ingreso: movimientosMap[ingreso.movimiento.id.toString()] || null,
              itf: itfRegistro ? movimientosMap[itfRegistro.movimiento.id.toString()] : null,
              comision: comisionRegistro
                ? movimientosMap[comisionRegistro.movimiento.id.toString()]
                : null,
            },
            saldosCuentaCorriente,
            asientosContables: asientos,
            distribucion,
            resumen: {
              documentosCobrados: distribucion.length,
              montoCobrado: montoTotal,
              itf,
              comision,
              totalNeto: redondear2(montoTotal - itf - comision),
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
      throw new DatabaseError("Error de base de datos al procesar el cobro múltiple", err.message);
    }
    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// SINCRONIZACIÓN DEL VOUCHER CONSOLIDADO DE LA OPERACIÓN
// ════════════════════════════════════════════════════════════
/**
 * Una operación de cobro múltiple genera N PagoCuentaPorCobrar, pero el sistema PDF guarda
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
    const origen = await prisma.pagoCuentaPorCobrar.findUnique({
      where: { id: BigInt(pagoId) },
      select: {
        id: true,
        empresaId: true,
        refOperacionEspecializadaMovCaja: true,
        urlVoucherOperacionConsolidado: true,
      },
    });

    if (!origen) throw new NotFoundError("Pago de cuenta por cobrar no encontrado");

    // Pagos individuales (sin operación asociada): no hay hermanos que sincronizar
    if (!origen.refOperacionEspecializadaMovCaja) {
      return { success: true, actualizados: 0 };
    }

    const { count } = await prisma.pagoCuentaPorCobrar.updateMany({
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
  procesarCobroMultiple,
  sincronizarVoucherOperacion,
};
