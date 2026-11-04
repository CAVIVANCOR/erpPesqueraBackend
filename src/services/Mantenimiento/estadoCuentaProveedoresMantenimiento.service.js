import prisma from "../../config/prismaClient.js";
import { ESTADO_ORDEN_COMPRA } from "../../utils/estados.constants.js";
import { SUBMODULO_ORIGEN } from "../../utils/submodulos.constants.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";

/**
 * Estado de cuenta de los proveedores (contratistas) de servicios y repuestos de Mantenimiento.
 *
 * Estructura: empresa de la OT > proveedor (contratista del presupuesto) > presupuesto de la OT > documentos de compra > pagos.
 *  - PRESUPUESTADO: monto pactado del presupuesto (DetContratistasOT.montoPactado), el mismo que muestra la OT.
 *  - FACTURADO: documentos de compra (OrdenCompra) generados desde el presupuesto
 *    (submoduloOrigenId = PRESUPUESTO_CONTRATISTA_OT, procesoOrigenId = presupuesto), no anulados.
 *  - PAGADO: pagos (PagoCuentaPorPagar) de la CxP de cada documento, con su movimiento de caja, cuenta bancaria,
 *    medio de pago y número de operación. Reduce la deuda por `montoAplicadoDeuda` (incluye la detracción/retención
 *    que la empresa paga a SUNAT en nombre del proveedor).
 *  - POR FACTURAR del presupuesto = presupuestado - facturado (lo contratado que aún no tiene documento de compra).
 *  - SALDO del presupuesto = presupuestado - pagado (misma definición que documentoCompraPresupuesto.service.js).
 *
 * Cada presupuesto se totaliza en SU moneda (los documentos en otra moneda se convierten con el tipo de cambio de la propia
 * orden de compra, como en documentoCompraPresupuesto.service.js). Los subtotales por proveedor se separan por moneda:
 * nunca se suman soles con dólares.
 */

const MONEDA_SOLES_ID = 1;
const numero = (valor) => Number(valor || 0);
const redondear2 = (valor) => Math.round(numero(valor) * 100) / 100;

/** Convierte un monto de la moneda del documento a la moneda del presupuesto (TC venta de la orden de compra). */
const convertirMoneda = (monto, monedaOrigenId, monedaDestinoId, tipoCambio, descripcionDocumento) => {
  const origen = Number(monedaOrigenId);
  const destino = Number(monedaDestinoId);
  const valor = numero(monto);
  if (origen === destino) return valor;
  const tc = numero(tipoCambio);
  if (!tc) throw new ValidationError(`El documento ${descripcionDocumento} no tiene tipo de cambio para convertirlo a la moneda de su presupuesto.`);
  if (destino === MONEDA_SOLES_ID) return valor * tc;
  if (origen === MONEDA_SOLES_ID) return valor / tc;
  throw new ValidationError(`El documento ${descripcionDocumento} no se puede convertir: solo se admite soles y una moneda extranjera.`);
};

const SELECT_MONEDA = { id: true, codigoSunat: true, simbolo: true, colorFondo: true, nombreLargo: true };

/**
 * @param {Object} [params]
 * @param {number|string} [params.empresaId] - limita a las OT de una empresa (opcional)
 * @param {number|string} [params.proveedorId] - limita a un proveedor/contratista (opcional)
 */
const obtenerEstadoCuenta = async ({ empresaId = null, proveedorId = null } = {}) => {
  try {
    const presupuestos = await prisma.detContratistasOT.findMany({
      where: {
        ...(proveedorId ? { contratistaId: BigInt(proveedorId) } : {}),
        otMantenimiento: empresaId ? { empresaId: BigInt(empresaId) } : undefined,
      },
      select: {
        id: true,
        numeroLinea: true,
        servicioDescripcion: true,
        contratista: { select: { id: true, razonSocial: true, numeroDocumento: true } },
        moneda: { select: SELECT_MONEDA },
        // Activo específico del trabajo; si el presupuesto no lo define, el de la OT
        activo: { select: { nombre: true } },
        otMantenimiento: {
          select: { id: true, numeroCompleto: true, activo: { select: { nombre: true } }, empresa: { select: { id: true, razonSocial: true, ruc: true, logo: true } } },
        },
        montoPactado: true,
        fechaPresupuesto: true,
      },
    });

    const documentos = await prisma.ordenCompra.findMany({
      where: {
        submoduloOrigenId: SUBMODULO_ORIGEN.PRESUPUESTO_CONTRATISTA_OT,
        procesoOrigenId: { in: presupuestos.map((p) => p.id) },
        estadoId: { not: ESTADO_ORDEN_COMPRA.ANULADO },
      },
      select: {
        id: true,
        procesoOrigenId: true,
        numeroDocumento: true,
        numeroDocumentoFinal: true,
        fechaDocumento: true,
        monedaId: true,
        tipoCambio: true,
        total: true,
        moneda: { select: SELECT_MONEDA },
        tipoDocumentoFinal: { select: { codigo: true } },
        proveedor: { select: { razonSocial: true, numeroDocumento: true } },
        cuentaPorPagar: {
          select: {
            fechaEmision: true,
            montoTotal: true,
            pagos: {
              select: {
                id: true,
                fechaPago: true,
                montoPagado: true,
                montoAplicadoDeuda: true,
                numeroOperacion: true,
                movimientoCajaId: true,
                notaCreditoOrdenCompraId: true,
                medioPago: { select: { nombre: true } },
                banco: { select: { nombre: true } },
                cuentaBancaria: { select: { id: true, numeroCuenta: true, banco: { select: { nombre: true } } } },
                monedaPago: { select: { codigoSunat: true } },
              },
              orderBy: [{ fechaPago: "asc" }, { id: "asc" }],
            },
          },
        },
      },
    });

    const documentosPorPresupuesto = new Map();
    for (const documento of documentos) {
      const clave = String(documento.procesoOrigenId);
      if (!documentosPorPresupuesto.has(clave)) documentosPorPresupuesto.set(clave, []);
      documentosPorPresupuesto.get(clave).push(documento);
    }

    const empresas = new Map();
    for (const presupuesto of presupuestos) {
      const pactado = redondear2(presupuesto.montoPactado);
      const docs = (documentosPorPresupuesto.get(String(presupuesto.id)) || []).sort(
        (a, b) =>
          new Date(a.cuentaPorPagar?.fechaEmision || a.fechaDocumento) - new Date(b.cuentaPorPagar?.fechaEmision || b.fechaDocumento) ||
          Number(a.id) - Number(b.id),
      );
      // Un presupuesto sin monto ni documentos no aporta información
      if (pactado === 0 && docs.length === 0) continue;

      let facturado = 0;
      let pagado = 0;
      const filasDocumentos = docs.map((documento) => {
        const etiqueta = documento.numeroDocumentoFinal || documento.numeroDocumento || `OC ${documento.id}`;
        const cuentaPorPagar = documento.cuentaPorPagar;
        const total = numero(documento.total ?? cuentaPorPagar?.montoTotal);
        const pagos = (cuentaPorPagar?.pagos || []).map((pago) => {
          const cuenta = pago.cuentaBancaria;
          const banco = cuenta?.banco?.nombre || pago.banco?.nombre || null;
          return {
            id: pago.id,
            fecha: pago.fechaPago,
            medio: pago.notaCreditoOrdenCompraId ? "NOTA DE CREDITO" : pago.medioPago?.nombre || null,
            numeroOperacion: pago.numeroOperacion || null,
            cuenta: cuenta ? `${cuenta.numeroCuenta || cuenta.id}${banco ? ` - ${banco}` : ""}` : banco,
            movimientoCajaId: pago.movimientoCajaId,
            desdeCaja: Boolean(pago.movimientoCajaId),
            monedaPago: pago.monedaPago?.codigoSunat || null,
            montoPagadoCaja: numero(pago.montoPagado),
            pagado: numero(pago.montoAplicadoDeuda),
          };
        });
        const pagadoDocumento = redondear2(pagos.reduce((suma, pago) => suma + pago.pagado, 0));

        facturado += convertirMoneda(total, documento.monedaId, presupuesto.moneda?.id, documento.tipoCambio, etiqueta);
        pagado += convertirMoneda(pagadoDocumento, documento.monedaId, presupuesto.moneda?.id, documento.tipoCambio, etiqueta);

        return {
          id: documento.id,
          fecha: cuentaPorPagar?.fechaEmision || documento.fechaDocumento,
          documento: `${documento.tipoDocumentoFinal?.codigo ? `${documento.tipoDocumentoFinal.codigo} ` : ""}${etiqueta}`.trim(),
          // Proveedor que emitió el comprobante (puede diferir del contratista del presupuesto)
          proveedorDocumento: documento.proveedor?.razonSocial || null,
          moneda: documento.moneda,
          total,
          pagado: pagadoDocumento,
          saldo: redondear2(total - pagadoDocumento),
          pagos,
        };
      });

      facturado = redondear2(facturado);
      pagado = redondear2(pagado);

      const empresa = presupuesto.otMantenimiento.empresa;
      if (!empresas.has(String(empresa.id))) empresas.set(String(empresa.id), { empresa, proveedores: new Map() });
      const proveedores = empresas.get(String(empresa.id)).proveedores;
      const contratista = presupuesto.contratista;
      if (!proveedores.has(String(contratista.id))) proveedores.set(String(contratista.id), { proveedor: contratista, presupuestos: [] });

      proveedores.get(String(contratista.id)).presupuestos.push({
        id: presupuesto.id,
        ot: presupuesto.otMantenimiento.numeroCompleto,
        numeroLinea: presupuesto.numeroLinea,
        fecha: presupuesto.fechaPresupuesto,
        activo: presupuesto.activo?.nombre || presupuesto.otMantenimiento.activo?.nombre || null,
        descripcion: presupuesto.servicioDescripcion,
        moneda: presupuesto.moneda,
        presupuestado: pactado,
        facturado,
        pagado,
        porFacturar: redondear2(pactado - facturado),
        saldo: redondear2(pactado - pagado),
        documentos: filasDocumentos,
      });
    }

    // Subtotales por proveedor y moneda (soles y dólares por separado)
    const resultado = [...empresas.values()]
      .map(({ empresa, proveedores }) => ({
        empresa,
        proveedores: [...proveedores.values()]
          .map(({ proveedor, presupuestos: lista }) => {
            const totales = new Map();
            for (const p of lista) {
              const clave = String(p.moneda?.id ?? "0");
              const t = totales.get(clave) || { moneda: p.moneda, presupuestos: 0, presupuestado: 0, facturado: 0, porFacturar: 0, pagado: 0, saldo: 0 };
              t.presupuestos += 1;
              t.presupuestado = redondear2(t.presupuestado + p.presupuestado);
              t.facturado = redondear2(t.facturado + p.facturado);
              t.porFacturar = redondear2(t.porFacturar + p.porFacturar);
              t.pagado = redondear2(t.pagado + p.pagado);
              t.saldo = redondear2(t.saldo + p.saldo);
              totales.set(clave, t);
            }
            lista.sort((a, b) => String(a.ot).localeCompare(String(b.ot)) || a.numeroLinea - b.numeroLinea);
            return { proveedor, presupuestos: lista, totales: [...totales.values()].sort((a, b) => Number(a.moneda?.id) - Number(b.moneda?.id)) };
          })
          .sort((a, b) => String(a.proveedor?.razonSocial).localeCompare(String(b.proveedor?.razonSocial))),
      }))
      .sort((a, b) => String(a.empresa?.razonSocial).localeCompare(String(b.empresa?.razonSocial)));

    return { empresas: resultado };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

export default { obtenerEstadoCuenta };
