import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import {
  ESTADO_CUENTA_POR_PAGAR,
  ESTADO_CUENTA_POR_COBRAR,
  ESTADO_ASIENTO_CONTABLE,
} from "../../utils/estados.constants.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import {
  TIPO_LETRA,
  DIAS_HABILES_PROTESTO,
  MEDIO_PAGO_CANJE_LETRA,
  CUENTAS_LETRA,
  MONEDA_SOLES_ID,
} from "../../utils/letrasCambio.constants.js";
import {
  num,
  r2,
  aCentimos,
  deCentimos,
  TOLERANCIA,
  sumarDiasHabiles,
  formatearFecha,
  obtenerEstadosLetra,
  obtenerTipoDocumentoLetra,
  numeroLetraDesdeId,
  obtenerPersonalDeUsuario,
  obtenerMedioPagoCanje,
  buscarSubmoduloLetra,
  obtenerCuentas,
  obtenerPeriodoAbierto,
  crearAsientoLetra,
} from "./letraCambioBase.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: CANJE DE FACTURAS POR LETRAS DE CAMBIO (compras = PAGAR, ventas = COBRAR)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Una o varias facturas fiscales de un mismo proveedor (o cliente), sin pagos, se canjean por una o varias
 * letras. Cada letra respalda a las facturas mediante LetraCambioDocumento (montoCanjeado por factura).
 *
 *   - La CxP / CxC de cada factura queda CANJEADA con un pago de medio "CANJE POR LETRA" (sin caja).
 *   - Las letras nacen VIGENTES, por el capital de la factura (sin impuestos ni intereses). Los intereses y la
 *     mora se ingresan a mano el día del pago. La detracción, retención y percepción siguen pendientes en su
 *     propio registro y se resuelven al cancelar todas las letras del documento.
 *   - La fecha límite de protesto es el vencimiento + 7 días hábiles (lunes a viernes).
 *
 * Asiento (un asiento del Libro Diario por letra, sin movimiento de caja):
 *   PAGAR : DEBE 421201/421202 facturas por pagar (entidad: proveedor, una línea por factura)
 *           HABER 423101/423102 letras por pagar (entidad: proveedor)
 *   COBRAR: DEBE 123201/123202 letras por cobrar (entidad: cliente)
 *           HABER 121201/121202 facturas por cobrar (entidad: cliente, una línea por factura)
 */

const esPagar = (tipoLetra) => tipoLetra === TIPO_LETRA.PAGAR;

const incluirLetra = {
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  estado: { select: { id: true, descripcion: true, severityColor: true } },
  girado: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  beneficiario: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  empresa: { select: { id: true, razonSocial: true } },
};

function validarTipoLetra(tipoLetra) {
  if (![TIPO_LETRA.PAGAR, TIPO_LETRA.COBRAR].includes(tipoLetra)) {
    throw new ValidationError("El tipo de letra debe ser PAGAR (compras) o COBRAR (ventas).");
  }
}

/** Facturas (CxP / CxC) de un proveedor o cliente que se pueden canjear: fiscales, con saldo y sin pagos. */
export async function listarDocumentosCanjeables({ tipoLetra, empresaId, entidadId }) {
  try {
    validarTipoLetra(tipoLetra);
    if (!empresaId || !entidadId) {
      throw new ValidationError(`Indique la empresa y el ${esPagar(tipoLetra) ? "proveedor" : "cliente"} cuyas facturas se canjearán.`);
    }
    const comun = {
      empresaId: BigInt(empresaId),
      esGerencial: false,
      saldoPendiente: { gt: 0 },
      montoPagado: 0,
      estadoId: { notIn: esPagar(tipoLetra) ? [ESTADO_CUENTA_POR_PAGAR.ANULADO, ESTADO_CUENTA_POR_PAGAR.CANJEADO] : [ESTADO_CUENTA_POR_COBRAR.ANULADO, ESTADO_CUENTA_POR_COBRAR.CANJEADO] },
    };
    const incluir = { moneda: { select: { id: true, simbolo: true, codigoSunat: true } } };

    if (esPagar(tipoLetra)) {
      const lista = await prisma.cuentaPorPagar.findMany({
        where: { ...comun, proveedorId: BigInt(entidadId) },
        include: { ...incluir, ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true, fechaFacturacion: true } } },
        orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
      });
      return lista.map((c) => ({
        id: c.id,
        numeroDocumento: c.ordenCompra?.numeroDocumentoFinal || c.ordenCompra?.numeroDocumento || c.numeroOrdenCompra,
        fechaEmision: c.fechaEmision,
        fechaVencimiento: c.fechaVencimiento,
        monedaId: c.monedaId,
        simbolo: c.moneda?.simbolo || "",
        montoTotal: num(c.montoTotal),
        saldoPendiente: num(c.saldoPendiente),
        tieneDetraccion: c.tieneDetraccion,
        tieneRetencion: c.tieneRetencion,
        tienePercepcion: c.tienePercepcion,
      }));
    }
    const lista = await prisma.cuentaPorCobrar.findMany({
      where: { ...comun, clienteId: BigInt(entidadId) },
      include: { ...incluir, preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } } },
      orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
    });
    return lista.map((c) => ({
      id: c.id,
      numeroDocumento: c.preFactura?.numeroDocumentoFinal || c.preFactura?.numeroDocumento || c.numeroPreFactura,
      fechaEmision: c.fechaEmision,
      fechaVencimiento: c.fechaVencimiento,
      monedaId: c.monedaId,
      simbolo: c.moneda?.simbolo || "",
      montoTotal: num(c.montoTotal),
      saldoPendiente: num(c.saldoPendiente),
      tieneDetraccion: c.tieneDetraccion,
      tieneRetencion: c.tieneRetencion,
      tienePercepcion: c.tienePercepcion,
    }));
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar las facturas canjeables", err.message);
    throw err;
  }
}

/**
 * Reparte las facturas (en orden) entre las letras (en orden): cada letra toma de la factura en curso hasta
 * completar su monto. Una factura puede quedar repartida entre varias letras y una letra respaldar varias facturas.
 */
function asignarFacturasALetras(saldosCent, montosLetraCent) {
  const filas = [];
  let d = 0;
  let restoDoc = saldosCent[0];
  montosLetraCent.forEach((montoLetra, l) => {
    let restoLetra = montoLetra;
    while (restoLetra > 0n && d < saldosCent.length) {
      const tomar = restoLetra < restoDoc ? restoLetra : restoDoc;
      filas.push({ letraIdx: l, docIdx: d, cent: tomar });
      restoLetra -= tomar;
      restoDoc -= tomar;
      if (restoDoc === 0n) {
        d++;
        restoDoc = saldosCent[d];
      }
    }
  });
  return filas;
}

/**
 * Canjea facturas por letras.
 * datos: { tipoLetra, empresaId, entidadId, documentoIds: [CxP|CxC ids], fechaEmision, tipoCambio?, avalId?,
 *          observaciones?, letras: [{ fechaVencimiento, monto, observaciones? }], usuarioId }
 */
export async function canjear(datos) {
  const { tipoLetra, empresaId, entidadId, documentoIds, letras, usuarioId } = datos;
  try {
    validarTipoLetra(tipoLetra);
    if (!empresaId) throw new ValidationError("Seleccione la empresa.");
    if (!entidadId) throw new ValidationError(`Seleccione el ${esPagar(tipoLetra) ? "proveedor" : "cliente"}.`);
    if (!Array.isArray(documentoIds) || documentoIds.length === 0) {
      throw new ValidationError("Seleccione al menos una factura para canjear.");
    }
    if (!Array.isArray(letras) || letras.length === 0) {
      throw new ValidationError("Indique al menos una letra (fecha de vencimiento y monto).");
    }
    if (!datos.fechaEmision) throw new ValidationError("La fecha de emisión de las letras es obligatoria.");
    const idsUnicos = [...new Set(documentoIds.map((id) => BigInt(id)))];
    const fechaEmision = new Date(datos.fechaEmision);

    return await prisma.$transaction(async (tx) => {
      const pagar = esPagar(tipoLetra);

      // ── Facturas ───────────────────────────────────────────
      const documentos = pagar
        ? await tx.cuentaPorPagar.findMany({
            where: { id: { in: idsUnicos } },
            include: { ordenCompra: { select: { numeroDocumento: true, numeroDocumentoFinal: true } }, moneda: true },
            orderBy: { id: "asc" },
          })
        : await tx.cuentaPorCobrar.findMany({
            where: { id: { in: idsUnicos } },
            include: { preFactura: { select: { numeroDocumento: true, numeroDocumentoFinal: true } }, moneda: true },
            orderBy: { id: "asc" },
          });
      if (documentos.length !== idsUnicos.length) throw new NotFoundError("Alguna de las facturas seleccionadas no existe.");

      const nombreDoc = (d) =>
        pagar
          ? d.ordenCompra?.numeroDocumentoFinal || d.ordenCompra?.numeroDocumento || d.numeroOrdenCompra
          : d.preFactura?.numeroDocumentoFinal || d.preFactura?.numeroDocumento || d.numeroPreFactura;
      const estadosInvalidos = pagar
        ? [ESTADO_CUENTA_POR_PAGAR.ANULADO, ESTADO_CUENTA_POR_PAGAR.CANJEADO]
        : [ESTADO_CUENTA_POR_COBRAR.ANULADO, ESTADO_CUENTA_POR_COBRAR.CANJEADO];

      for (const d of documentos) {
        const etiqueta = nombreDoc(d);
        if (Number(d.empresaId) !== Number(empresaId)) throw new ValidationError(`La factura ${etiqueta} no pertenece a la empresa seleccionada.`);
        if (Number(pagar ? d.proveedorId : d.clienteId) !== Number(entidadId)) {
          throw new ValidationError(`La factura ${etiqueta} es de otro ${pagar ? "proveedor" : "cliente"}: solo se canjean facturas de un mismo ${pagar ? "proveedor" : "cliente"}.`);
        }
        if (d.esGerencial) throw new ValidationError(`La factura ${etiqueta} es gerencial: las letras de cambio solo respaldan documentos fiscales.`);
        if (estadosInvalidos.includes(Number(d.estadoId))) throw new ValidationError(`La factura ${etiqueta} está anulada o ya fue canjeada.`);
        if (num(d.montoPagado) > 0) {
          throw new ValidationError(`La factura ${etiqueta} ya tiene pagos registrados: solo se canjean facturas sin ningún pago.`);
        }
        if (num(d.saldoPendiente) <= 0) throw new ValidationError(`La factura ${etiqueta} no tiene saldo pendiente.`);
      }
      const monedaId = Number(documentos[0].monedaId);
      if (documentos.some((d) => Number(d.monedaId) !== monedaId)) {
        throw new ValidationError("Las facturas a canjear deben estar todas en la misma moneda.");
      }
      const extranjera = monedaId !== MONEDA_SOLES_ID;
      const tipoCambio = extranjera ? num(datos.tipoCambio) : 1;
      if (extranjera && !(tipoCambio > 0)) {
        throw new ValidationError("Ingrese el tipo de cambio de la fecha de emisión para convertir el asiento a soles.");
      }

      // ── Letras ─────────────────────────────────────────────
      const saldosCent = documentos.map((d) => aCentimos(d.saldoPendiente));
      const montosCent = letras.map((l, i) => {
        const monto = num(l.monto);
        if (!(monto > 0)) throw new ValidationError(`El monto de la letra ${i + 1} debe ser mayor a cero.`);
        if (!l.fechaVencimiento) throw new ValidationError(`La fecha de vencimiento de la letra ${i + 1} es obligatoria.`);
        if (new Date(l.fechaVencimiento) < fechaEmision) {
          throw new ValidationError(`La letra ${i + 1} vence antes de su fecha de emisión.`);
        }
        return aCentimos(monto);
      });
      const totalFacturas = saldosCent.reduce((a, b) => a + b, 0n);
      const totalLetras = montosCent.reduce((a, b) => a + b, 0n);
      if (totalFacturas !== totalLetras) {
        throw new ValidationError(
          `El total de las letras (${deCentimos(totalLetras).toFixed(2)}) debe ser igual al total de las facturas canjeadas (${deCentimos(totalFacturas).toFixed(2)}).`,
        );
      }

      // ── Empresa, partes y datos base ───────────────────────
      const empresa = await tx.empresa.findUnique({ where: { id: BigInt(empresaId) }, select: { id: true, razonSocial: true, entidadComercialId: true } });
      if (!empresa) throw new NotFoundError("Empresa no encontrada.");
      if (!empresa.entidadComercialId) {
        throw new ValidationError(`La empresa ${empresa.razonSocial} no tiene una entidad comercial asociada: es necesaria para figurar como parte de la letra. Asóciela en el mantenimiento de empresas.`);
      }
      const entidad = await tx.entidadComercial.findUnique({ where: { id: BigInt(entidadId) }, select: { id: true, razonSocial: true } });
      if (!entidad) throw new NotFoundError(`${pagar ? "Proveedor" : "Cliente"} no encontrado.`);
      if (datos.avalId) {
        const aval = await tx.entidadComercial.findUnique({ where: { id: BigInt(datos.avalId) } });
        if (!aval) throw new NotFoundError("El aval seleccionado no existe.");
      }

      // Secuencial: los datos base pueden crearse la primera vez y no deben competir dentro de la transacción
      const estados = await obtenerEstadosLetra(tx);
      const tipoDocumento = await obtenerTipoDocumentoLetra(tx);
      const medioCanje = await obtenerMedioPagoCanje(tx, MEDIO_PAGO_CANJE_LETRA);
      const submodulo = await buscarSubmoduloLetra(tx);
      const periodo = await obtenerPeriodoAbierto(tx, empresaId, fechaEmision, empresa.razonSocial);
      const personalId = await obtenerPersonalDeUsuario(tx, usuarioId);
      const cuentasDef = CUENTAS_LETRA[tipoLetra];
      const cuenta = await obtenerCuentas(tx, [cuentasDef.documento[monedaId], cuentasDef.letra[monedaId]]);
      const cuentaDocumento = cuenta(cuentasDef.documento[monedaId]);
      const cuentaLetra = cuenta(cuentasDef.letra[monedaId]);
      const auditoria = usuarioId ? BigInt(usuarioId) : null;

      // ── Crear letras con su número ─────────────────────────
      const letrasCreadas = [];
      for (const [i, l] of letras.entries()) {
        const vencimiento = new Date(l.fechaVencimiento);
        const creada = await tx.letraCambio.create({
          data: {
            tipoLetra,
            empresaId: BigInt(empresaId),
            tipoDocumentoId: tipoDocumento.id,
            fechaEmision,
            fechaVencimiento: vencimiento,
            giradoId: pagar ? empresa.entidadComercialId : BigInt(entidadId),
            beneficiarioId: pagar ? BigInt(entidadId) : empresa.entidadComercialId,
            avalId: datos.avalId ? BigInt(datos.avalId) : null,
            monedaId: BigInt(monedaId),
            montoOriginal: deCentimos(montosCent[i]),
            saldoCapital: deCentimos(montosCent[i]),
            estadoId: estados.VIGENTE,
            fechaLimiteProtesto: sumarDiasHabiles(vencimiento, DIAS_HABILES_PROTESTO),
            observaciones: l.observaciones || datos.observaciones || null,
            creadoPor: auditoria,
          },
        });
        const numero = numeroLetraDesdeId(tipoLetra, creada.id);
        letrasCreadas.push(
          await tx.letraCambio.update({
            where: { id: creada.id },
            data: { numeroDocumento: numero, numSerieDoc: numero.split("-")[0], numCorreDoc: numero.split("-")[1] },
          }),
        );
      }

      // ── Respaldo de cada letra y cancelación de las facturas por canje ──
      const asignaciones = asignarFacturasALetras(saldosCent, montosCent);
      const totalPorDocumento = new Map();
      for (const a of asignaciones) {
        const documento = documentos[a.docIdx];
        const letra = letrasCreadas[a.letraIdx];
        const monto = deCentimos(a.cent);
        totalPorDocumento.set(documento.id, (totalPorDocumento.get(documento.id) || 0n) + a.cent);

        const pagoData = {
          empresaId: documento.empresaId,
          fechaPago: fechaEmision,
          montoPagado: 0,
          monedaPagoId: documento.monedaId,
          tipoCambio,
          montoAplicadoDeuda: monto,
          monedaDeudaId: documento.monedaId,
          tieneRetencion: false,
          montoRetencion: 0,
          tienePercepcion: false,
          montoPercepcion: 0,
          medioPagoId: medioCanje.id,
          numeroOperacion: `LETRA ${letra.numeroDocumento}`.slice(0, 50),
          movimientoCajaId: null,
          observaciones: `Canje por Letra de Cambio ${letra.numeroDocumento} de la factura ${nombreDoc(documento)}`,
          fechaContable: fechaEmision,
          periodoContableId: periodo.id,
          creadoPor: personalId,
        };
        const pago = pagar
          ? await tx.pagoCuentaPorPagar.create({ data: { ...pagoData, cuentaPorPagarId: documento.id } })
          : await tx.pagoCuentaPorCobrar.create({ data: { ...pagoData, cuentaPorCobrarId: documento.id } });

        await tx.letraCambioDocumento.create({
          data: {
            letraCambioId: letra.id,
            cuentaPorPagarId: pagar ? documento.id : null,
            cuentaPorCobrarId: pagar ? null : documento.id,
            montoCanjeado: monto,
            capitalPagado: 0,
            pagoCanjeCxPId: pagar ? pago.id : null,
            pagoCanjeCxCId: pagar ? null : pago.id,
            creadoPor: auditoria,
          },
        });
      }

      for (const documento of documentos) {
        const canjeado = deCentimos(totalPorDocumento.get(documento.id) || 0n);
        const modelo = pagar ? tx.cuentaPorPagar : tx.cuentaPorCobrar;
        const reclamo = await modelo.updateMany({
          where: { id: documento.id, saldoPendiente: documento.saldoPendiente },
          data: {
            montoPagado: r2(num(documento.montoPagado) + canjeado),
            saldoPendiente: r2(num(documento.saldoPendiente) - canjeado),
            estadoId: pagar ? ESTADO_CUENTA_POR_PAGAR.CANJEADO : ESTADO_CUENTA_POR_COBRAR.CANJEADO,
          },
        });
        if (reclamo.count !== 1) {
          throw new ValidationError(`La factura ${nombreDoc(documento)} fue modificada por otro usuario. Recargue e intente nuevamente.`);
        }
      }

      // ── Asientos del canje (uno por letra) ─────────────────
      const aSoles = (monto) => (extranjera ? r2(monto * tipoCambio) : r2(monto));
      const asientos = [];
      for (const [i, letra] of letrasCreadas.entries()) {
        const filasLetra = asignaciones.filter((a) => a.letraIdx === i);
        const montoLetra = deCentimos(montosCent[i]);
        const lineaLetra = {
          planCuentaId: cuentaLetra.id,
          entidadComercialId: entidadId,
          numeroDocumentoOrigen: letra.numeroDocumento,
          fechaDocumentoOrigen: fechaEmision,
          fechaVenceDocumentoOrigen: letra.fechaVencimiento,
        };
        const lineasFacturas = filasLetra.map((a) => {
          const documento = documentos[a.docIdx];
          const monto = deCentimos(a.cent);
          return {
            planCuentaId: cuentaDocumento.id,
            entidadComercialId: entidadId,
            numeroDocumentoOrigen: nombreDoc(documento),
            fechaDocumentoOrigen: documento.fechaEmision,
            fechaVenceDocumentoOrigen: documento.fechaVencimiento,
            monto,
          };
        });
        // PAGAR: facturas al DEBE y letra al HABER. COBRAR: letra al DEBE y facturas al HABER.
        const lineas = [
          ...lineasFacturas.map((f) => ({
            ...f,
            debe: pagar ? aSoles(f.monto) : 0,
            haber: pagar ? 0 : aSoles(f.monto),
            debeME: extranjera && pagar ? f.monto : null,
            haberME: extranjera && !pagar ? f.monto : null,
          })),
          {
            ...lineaLetra,
            debe: pagar ? 0 : aSoles(montoLetra),
            haber: pagar ? aSoles(montoLetra) : 0,
            debeME: extranjera && !pagar ? montoLetra : null,
            haberME: extranjera && pagar ? montoLetra : null,
          },
        ];
        // Orden de líneas: el DEBE primero
        lineas.sort((x, y) => (num(y.debe) > 0) - (num(x.debe) > 0));
        asientos.push(
          await crearAsientoLetra(tx, {
            empresaId,
            periodo,
            fecha: fechaEmision,
            glosa: `CANJE DE FACTURAS POR LETRA DE CAMBIO N° ${letra.numeroDocumento} - ${entidad.razonSocial} - POR ${montoLetra.toFixed(2)} - VENCE ${formatearFecha(letra.fechaVencimiento)}`,
            tipoLibroId: TIPO_LIBRO.DIARIO,
            submodulo,
            procesoOrigenId: letra.id,
            monedaId,
            tipoCambio,
            totalCabecera: montoLetra,
            lineas,
            usuarioId,
          }),
        );
      }

      return {
        letras: letrasCreadas.map((l) => ({ id: l.id, numeroDocumento: l.numeroDocumento, fechaVencimiento: l.fechaVencimiento, montoOriginal: num(l.montoOriginal) })),
        asientos: asientos.map((a) => ({ id: a.id, numeroAsiento: a.numeroAsiento })),
        documentosCanjeados: documentos.map((d) => ({ id: d.id, numeroDocumento: nombreDoc(d), monto: deCentimos(totalPorDocumento.get(d.id) || 0n) })),
      };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al registrar el canje de facturas por letras", err.message);
    throw err;
  }
}

/**
 * Anula un canje completo: elimina asientos, pagos de canje y respaldos, y devuelve las facturas a su estado
 * pendiente. Solo si ninguna letra del canje tiene pagos, ni fue refinanciada o protestada.
 * Letras del mismo canje = letras conectadas por las facturas que respaldan.
 */
export async function anularCanje({ letraId, usuarioId }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const inicial = await tx.letraCambio.findUnique({ where: { id: BigInt(letraId) }, include: { documentos: true } });
      if (!inicial) throw new NotFoundError("Letra de cambio no encontrada.");

      // Letras conectadas por las facturas
      const letrasIds = new Set([inicial.id]);
      let cambio = true;
      while (cambio) {
        cambio = false;
        const docs = await tx.letraCambioDocumento.findMany({ where: { letraCambioId: { in: [...letrasIds] } } });
        const porPagar = docs.map((d) => d.cuentaPorPagarId).filter(Boolean);
        const porCobrar = docs.map((d) => d.cuentaPorCobrarId).filter(Boolean);
        const relacionados = await tx.letraCambioDocumento.findMany({
          where: { OR: [{ cuentaPorPagarId: { in: porPagar } }, { cuentaPorCobrarId: { in: porCobrar } }] },
        });
        relacionados.forEach((r) => {
          if (!letrasIds.has(r.letraCambioId)) {
            letrasIds.add(r.letraCambioId);
            cambio = true;
          }
        });
      }

      const letras = await tx.letraCambio.findMany({
        where: { id: { in: [...letrasIds] } },
        include: { documentos: true, pagos: true, renovaciones: true, estado: true },
      });
      const estados = await obtenerEstadosLetra(tx);
      for (const l of letras) {
        if (Number(l.estadoId) === Number(estados.ANULADA)) throw new ValidationError(`La letra ${l.numeroDocumento} ya está anulada.`);
        if (l.pagos.length > 0) throw new ValidationError(`La letra ${l.numeroDocumento} tiene pagos registrados: revierta primero sus pagos en Tesorería.`);
        if (l.renovada || l.renovaciones.length > 0 || l.letraRenovadaId) {
          throw new ValidationError(`La letra ${l.numeroDocumento} participa en una refinanciación: no se puede anular el canje.`);
        }
        if (l.protestada) throw new ValidationError(`La letra ${l.numeroDocumento} está protestada: no se puede anular el canje.`);
      }

      const pagar = letras[0].tipoLetra === TIPO_LETRA.PAGAR;
      const submodulo = await buscarSubmoduloLetra(tx);

      // Asientos: solo si siguen pendientes
      const asientos = await tx.asientoContable.findMany({
        where: { submoduloOrigenId: submodulo.id, procesoOrigenId: { in: letras.map((l) => l.id) }, esSaldoInicial: false },
        select: { id: true, numeroAsiento: true, estadoId: true },
      });
      const noPendientes = asientos.filter((a) => Number(a.estadoId) !== Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE));
      if (noPendientes.length > 0) {
        throw new ValidationError(`No se puede anular el canje porque el asiento ${noPendientes.map((a) => a.numeroAsiento).join(", ")} ya no está pendiente (aprobado o anulado). Reviértalo desde Contabilidad.`);
      }
      await tx.asientoContable.deleteMany({ where: { id: { in: asientos.map((a) => a.id) } } });

      // Pagos de canje, respaldos y facturas
      const documentos = letras.flatMap((l) => l.documentos);
      const canjeadoPorFactura = new Map();
      for (const d of documentos) {
        const clave = String(d.cuentaPorPagarId || d.cuentaPorCobrarId);
        canjeadoPorFactura.set(clave, (canjeadoPorFactura.get(clave) || 0) + num(d.montoCanjeado));
      }
      await tx.letraCambioDocumento.deleteMany({ where: { id: { in: documentos.map((d) => d.id) } } });
      const pagosCanje = documentos.map((d) => d.pagoCanjeCxPId || d.pagoCanjeCxCId).filter(Boolean);
      if (pagar) await tx.pagoCuentaPorPagar.deleteMany({ where: { id: { in: pagosCanje } } });
      else await tx.pagoCuentaPorCobrar.deleteMany({ where: { id: { in: pagosCanje } } });

      for (const [clave, canjeado] of canjeadoPorFactura) {
        const modelo = pagar ? tx.cuentaPorPagar : tx.cuentaPorCobrar;
        const factura = await modelo.findUnique({ where: { id: BigInt(clave) } });
        const pagado = r2(Math.max(0, num(factura.montoPagado) - canjeado));
        await modelo.update({
          where: { id: factura.id },
          data: {
            montoPagado: pagado,
            saldoPendiente: r2(num(factura.montoTotal) - pagado),
            estadoId: pagado > 0 ? (pagar ? ESTADO_CUENTA_POR_PAGAR.PAGO_PARCIAL : ESTADO_CUENTA_POR_COBRAR.PAGO_PARCIAL) : pagar ? ESTADO_CUENTA_POR_PAGAR.PENDIENTE : ESTADO_CUENTA_POR_COBRAR.PENDIENTE,
          },
        });
      }

      await tx.letraCambio.updateMany({
        where: { id: { in: letras.map((l) => l.id) } },
        data: {
          estadoId: estados.ANULADA,
          saldoCapital: 0,
          actualizadoPor: usuarioId ? BigInt(usuarioId) : null,
          observaciones: "ANULADA: se anuló el canje de facturas por letras.",
        },
      });

      return { letrasAnuladas: letras.map((l) => ({ id: l.id, numeroDocumento: l.numeroDocumento })), asientosEliminados: asientos.length };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al anular el canje", err.message);
    throw err;
  }
}

export default { listarDocumentosCanjeables, canjear, anularCanje };
