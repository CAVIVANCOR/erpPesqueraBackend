import prisma from "../../config/prismaClient.js";
import ordenCompraService from "../Compras/ordenCompra.service.js";
import { ESTADO_ORDEN_COMPRA } from "../../utils/estados.constants.js";
import { SUBMODULO_ORIGEN } from "../../utils/submodulos.constants.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";

/**
 * Documentos de compra generados desde un presupuesto de contratista de una OT
 * (DetContratistasOT). Cada documento es una OrdenCompra con su CxP y sus asientos,
 * enlazada al presupuesto por trazabilidad (submoduloOrigenId = 158, procesoOrigenId = presupuesto).
 *
 * Reutiliza SIN modificar las funciones de ordenCompra.service (calcularTotalesEImpuestos,
 * generarCuentaPorPagar, generarBorradorAsiento, guardarAsientoContable y eliminar),
 * de modo que las reglas contables de Compras siguen siendo una sola verdad.
 */

const TIPO_DOCUMENTO_ORDEN_COMPRA = 17;
const SERIE_ORDEN_COMPRA = "002";
const MONEDA_SOLES_ID = 1;
// Códigos SUNAT de comprobantes admitidos en un documento fiscal
const CODIGO_FACTURA = "01";
const CODIGO_BOLETA = "03";
const CODIGO_RECIBO_HONORARIOS = "02";

const redondear2 = (valor) => Math.round(Number(valor || 0) * 100) / 100;

/**
 * Convierte un monto de la moneda del documento a la moneda del presupuesto
 * usando el tipo de cambio del propio documento (TC venta SUNAT).
 */
const convertirMoneda = (monto, monedaOrigenId, monedaDestinoId, tipoCambio) => {
  const origen = Number(monedaOrigenId);
  const destino = Number(monedaDestinoId);
  const valor = Number(monto || 0);
  if (origen === destino) return valor;
  const tc = Number(tipoCambio || 0);
  if (!tc) throw new ValidationError("El documento no tiene tipo de cambio para convertir de moneda");
  if (destino === MONEDA_SOLES_ID) return valor * tc;
  if (origen === MONEDA_SOLES_ID) return valor / tc;
  throw new ValidationError("Conversión entre monedas extranjeras no soportada");
};

/**
 * ÚNICA VERDAD de los montos del presupuesto.
 *  - montoPactado = suma de los ítems (un presupuesto recién creado, sin ítems, tiene monto 0)
 *  - montoPagado  = suma de lo pagado en las CxP de sus documentos de compra (en la moneda del presupuesto)
 *  - saldo        = montoPactado - montoPagado
 * También actualiza los totales de la OT cuando todos sus presupuestos están en la moneda de la OT.
 */
const recalcularMontosPresupuesto = async (presupuestoId, tx = prisma) => {
  const presupuesto = await tx.detContratistasOT.findUnique({
    where: { id: Number(presupuestoId) },
    include: { repuestos: { select: { total: true } } },
  });
  if (!presupuesto) return null;

  // El presupuesto nace sin ítems (monto 0) y su monto es siempre la suma de sus ítems
  const montoPactado = redondear2(
    presupuesto.repuestos.reduce((suma, item) => suma + Number(item.total || 0), 0),
  );

  const documentos = await tx.ordenCompra.findMany({
    where: {
      submoduloOrigenId: SUBMODULO_ORIGEN.PRESUPUESTO_CONTRATISTA_OT,
      procesoOrigenId: Number(presupuestoId),
      estadoId: { not: ESTADO_ORDEN_COMPRA.ANULADO },
    },
    select: {
      monedaId: true,
      tipoCambio: true,
      cuentaPorPagar: { select: { montoPagado: true } },
    },
  });

  const montoPagado = redondear2(
    documentos.reduce(
      (suma, doc) =>
        suma +
        convertirMoneda(doc.cuentaPorPagar?.montoPagado || 0, doc.monedaId, presupuesto.monedaId, doc.tipoCambio),
      0,
    ),
  );
  const saldo = redondear2(montoPactado - montoPagado);

  const cambio =
    Number(presupuesto.montoPactado) !== montoPactado ||
    Number(presupuesto.montoPagado) !== montoPagado ||
    Number(presupuesto.saldo) !== saldo;

  const actualizado = cambio
    ? await tx.detContratistasOT.update({
        where: { id: presupuesto.id },
        data: { montoPactado, montoPagado, saldo },
      })
    : presupuesto;

  await recalcularTotalesOT(presupuesto.otMantenimientoId, tx);
  return actualizado;
};

/**
 * Totales de la OT = suma de sus presupuestos. Solo se actualiza cuando todos los presupuestos
 * están en la misma moneda de la OT (no se inventan conversiones sin documento de respaldo).
 */
const recalcularTotalesOT = async (otId, tx = prisma) => {
  const ot = await tx.oTMantenimiento.findUnique({
    where: { id: otId },
    include: { contratistas: { select: { monedaId: true, montoPactado: true, montoPagado: true, saldo: true } } },
  });
  if (!ot || ot.contratistas.length === 0) return;
  if (ot.contratistas.some((c) => Number(c.monedaId) !== Number(ot.monedaId))) return;

  const sumar = (campo) => redondear2(ot.contratistas.reduce((suma, c) => suma + Number(c[campo] || 0), 0));
  await tx.oTMantenimiento.update({
    where: { id: ot.id },
    data: {
      totalMontoPactado: sumar("montoPactado"),
      totalMontoPagado: sumar("montoPagado"),
      totalSaldo: sumar("saldo"),
    },
  });
};

/** Recalcula todos los presupuestos de una OT (consulta o grabación de la OT). */
const recalcularMontosOT = async (otId) => {
  const presupuestos = await prisma.detContratistasOT.findMany({
    where: { otMantenimientoId: Number(otId) },
    select: { id: true },
  });
  for (const presupuesto of presupuestos) {
    await recalcularMontosPresupuesto(presupuesto.id);
  }
};

/** Documentos de compra (OrdenCompra) generados desde un presupuesto. */
const listarDocumentosCompra = async (presupuestoId) => {
  try {
    return await prisma.ordenCompra.findMany({
      where: {
        submoduloOrigenId: SUBMODULO_ORIGEN.PRESUPUESTO_CONTRATISTA_OT,
        procesoOrigenId: Number(presupuestoId),
      },
      include: {
        empresa: { select: { id: true, razonSocial: true } },
        moneda: { select: { id: true, codigoSunat: true, simbolo: true } },
        estado: { select: { id: true, descripcion: true } },
        tipoDocumentoFinal: { select: { id: true, descripcion: true, codigoSunat: true } },
        cuentaPorPagar: {
          select: { id: true, montoTotal: true, montoPagado: true, saldoPendiente: true },
        },
      },
      orderBy: { id: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Productos equivalentes de cada ítem del presupuesto en la empresa destino:
 * Producto.empresaId = Empresa.id, Producto.clienteId = Empresa.entidadComercialId
 * y la misma descripcionArmada.
 */
const buscarProductosEquivalentes = async (presupuestoId, empresaId) => {
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: Number(empresaId) } });
    if (!empresa) throw new NotFoundError("Empresa no encontrada");

    const presupuesto = await prisma.detContratistasOT.findUnique({
      where: { id: Number(presupuestoId) },
      include: {
        repuestos: {
          include: { producto: { select: { id: true, empresaId: true, descripcionArmada: true } } },
          orderBy: { numeroLinea: "asc" },
        },
      },
    });
    if (!presupuesto) throw new NotFoundError("Presupuesto no encontrado");

    const resultado = [];
    for (const item of presupuesto.repuestos) {
      const producto = item.producto;
      let equivalentes = [];
      if (Number(producto.empresaId) === Number(empresaId)) {
        equivalentes = [producto];
      } else if (empresa.entidadComercialId) {
        equivalentes = await prisma.producto.findMany({
          where: {
            empresaId: Number(empresaId),
            clienteId: empresa.entidadComercialId,
            descripcionArmada: producto.descripcionArmada,
            cesado: false,
          },
          select: { id: true, codigo: true, descripcionArmada: true },
        });
      }
      resultado.push({
        detRepuestoId: item.id,
        productoOrigen: { id: producto.id, descripcionArmada: producto.descripcionArmada },
        equivalentes,
      });
    }
    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Genera un documento de compra (OC + CxP + asientos) desde un presupuesto.
 *
 * datos = {
 *   esGerencial, empresaId, monedaId, fechaDocumento,
 *   tipoDocumentoFinalId, numSerieDocFinal, numCorreDocFinal,   // solo FISCAL
 *   observaciones,
 *   items: [{ productoId, descripcion, cantidad, precioUnitario }] // editados en memoria
 * }
 */
const generarDocumentoCompra = async (presupuestoId, datos, usuarioId) => {
  try {
    // ═══════════════════════════════════════════════
    // VALIDACIONES
    // ═══════════════════════════════════════════════
    const presupuesto = await prisma.detContratistasOT.findUnique({
      where: { id: Number(presupuestoId) },
      include: { otMantenimiento: true, contratista: { select: { razonSocial: true } } },
    });
    if (!presupuesto) throw new NotFoundError("Presupuesto no encontrado");

    const esGerencial = datos.esGerencial === true;
    const empresaId = Number(datos.empresaId);
    const monedaId = Number(datos.monedaId || presupuesto.monedaId);
    const items = Array.isArray(datos.items) ? datos.items : [];
    const fechaDocumento = datos.fechaDocumento ? new Date(datos.fechaDocumento) : new Date();

    if (!empresaId) throw new ValidationError("Debe seleccionar la empresa que factura");
    if (items.length === 0) throw new ValidationError("Debe incluir al menos un ítem en el documento");

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundError("Empresa no encontrada");

    // GERENCIAL: el proveedor es el contratista del presupuesto.
    // FISCAL: el proveedor que emite el comprobante puede ser otro, se identifica por su RUC.
    let proveedorId = presupuesto.contratistaId;
    if (!esGerencial) {
      const ruc = String(datos.rucProveedor || "").trim();
      if (!ruc) throw new ValidationError("Debe ingresar el RUC del proveedor");
      const proveedor = await prisma.entidadComercial.findFirst({
        where: { numeroDocumento: ruc, esProveedor: true },
      });
      if (!proveedor) throw new NotFoundError(`No existe un proveedor registrado con el RUC ${ruc}`);
      proveedorId = proveedor.id;
    }

    // Cada ítem debe ser un producto de la empresa destino
    const productos = await prisma.producto.findMany({
      where: { id: { in: items.map((i) => Number(i.productoId)) } },
    });
    for (const item of items) {
      const producto = productos.find((p) => Number(p.id) === Number(item.productoId));
      if (!producto) throw new ValidationError(`El producto ${item.productoId} no existe`);
      if (
        Number(producto.empresaId) !== empresaId ||
        Number(producto.clienteId) !== Number(empresa.entidadComercialId)
      ) {
        throw new ValidationError(
          `El producto "${producto.descripcionArmada}" no pertenece a la empresa seleccionada`,
        );
      }
      if (!(Number(item.cantidad) > 0) || Number(item.precioUnitario) < 0) {
        throw new ValidationError(`Cantidad o precio inválido en el producto "${producto.descripcionArmada}"`);
      }
    }

    // Comprobante fiscal: tipo admitido y no repetido en ninguna OC
    let tipoDocumentoFinal = null;
    let esReciboHonorarios = false;
    if (!esGerencial) {
      tipoDocumentoFinal = await prisma.tipoDocumento.findUnique({
        where: { id: Number(datos.tipoDocumentoFinalId) },
      });
      const codigo = tipoDocumentoFinal?.codigoSunat;
      if (![CODIGO_FACTURA, CODIGO_BOLETA, CODIGO_RECIBO_HONORARIOS].includes(codigo)) {
        throw new ValidationError("El tipo de documento debe ser Factura, Boleta o Recibo por Honorarios");
      }
      if (!datos.numSerieDocFinal || !datos.numCorreDocFinal) {
        throw new ValidationError("Debe ingresar serie y correlativo del comprobante");
      }
      esReciboHonorarios = codigo === CODIGO_RECIBO_HONORARIOS;

      const comprobanteExistente = await prisma.ordenCompra.findFirst({
        where: {
          empresaId,
          proveedorId,
          tipoDocumentoFinalId: tipoDocumentoFinal.id,
          numSerieDocFinal: datos.numSerieDocFinal,
          numCorreDocFinal: datos.numCorreDocFinal,
          estadoId: { not: ESTADO_ORDEN_COMPRA.ANULADO },
        },
        select: { numeroDocumento: true },
      });
      if (comprobanteExistente) {
        throw new ValidationError(
          `El comprobante ${datos.numSerieDocFinal}-${datos.numCorreDocFinal} ya está registrado en la OC ${comprobanteExistente.numeroDocumento}`,
        );
      }
    }

    // Numeración interna de la OC: tipo 17, serie 002 de la empresa que factura
    const serieDoc = await prisma.serieDoc.findFirst({
      where: { empresaId, tipoDocumentoId: TIPO_DOCUMENTO_ORDEN_COMPRA, serie: SERIE_ORDEN_COMPRA, activo: true },
    });
    if (!serieDoc) {
      throw new NotFoundError(`Serie "${SERIE_ORDEN_COMPRA}" de Orden de Compra no encontrada para la empresa seleccionada`);
    }

    const periodoContable = await prisma.periodoContable.findFirst({
      where: { empresaId, fechaInicio: { lte: fechaDocumento }, fechaFin: { gte: fechaDocumento } },
    });
    if (!periodoContable) {
      throw new ValidationError(
        `No existe un período contable para la fecha ${fechaDocumento.toLocaleDateString("es-PE", { timeZone: "UTC" })} en la empresa seleccionada. Cree el período contable e intente nuevamente.`,
      );
    }

    const tipoCambio = await validarTipoCambio(null, fechaDocumento);

    // ═══════════════════════════════════════════════
    // PASO 1: CREAR LA ORDEN DE COMPRA (transacción propia)
    // ═══════════════════════════════════════════════
    const sinIGV = esGerencial || esReciboHonorarios;
    const ordenCompra = await prisma.$transaction(async (tx) => {
      const nuevoCorrelativo = Number(serieDoc.correlativo) + 1;
      const numSerie = String(serieDoc.serie).padStart(serieDoc.numCerosIzqSerie || 0, "0");
      const numCorre = String(nuevoCorrelativo).padStart(serieDoc.numCerosIzqCorre || 6, "0");

      await tx.serieDoc.update({ where: { id: serieDoc.id }, data: { correlativo: nuevoCorrelativo } });

      const oc = await tx.ordenCompra.create({
        data: {
          empresaId,
          tipoDocumentoId: TIPO_DOCUMENTO_ORDEN_COMPRA,
          serieDocId: serieDoc.id,
          numSerieDoc: numSerie,
          numCorreDoc: numCorre,
          numeroDocumento: `${numSerie}-${numCorre}`,
          proveedorId,
          formaPagoId: 1,
          fechaDocumento,
          fechaContable: fechaDocumento,
          fechaVencimiento: fechaDocumento,
          periodoContableId: periodoContable.id,
          estadoId: ESTADO_ORDEN_COMPRA.APROBADO,
          monedaId,
          tipoCambio,
          activoAfectoId: presupuesto.activoId || presupuesto.otMantenimiento.activoId || null,
          observaciones:
            datos.observaciones ||
            `${esGerencial ? "GASTO GERENCIAL - " : ""}OT ${presupuesto.otMantenimiento.numeroCompleto} - ${presupuesto.servicioDescripcion}`,
          esGerencial,
          esExoneradoAlIGV: sinIGV,
          porcentajeIGV: sinIGV ? 0 : Number(empresa.porcentajeIgv || 18),
          aplicaImpuestoRenta: esReciboHonorarios,
          porcentajeImpuestoRenta: esReciboHonorarios ? Number(empresa.porcentajeImpuestoRenta || 8) : null,
          ...(esGerencial
            ? {}
            : {
                tipoDocumentoFinalId: tipoDocumentoFinal.id,
                numSerieDocFinal: datos.numSerieDocFinal,
                numCorreDocFinal: datos.numCorreDocFinal,
                numeroDocumentoFinal: `${datos.numSerieDocFinal}-${datos.numCorreDocFinal}`,
                comprobanteRecibido: true,
                fechaRecepcionComprobante: fechaDocumento,
                fechaFacturacion: fechaDocumento,
              }),
          submoduloOrigenId: SUBMODULO_ORIGEN.PRESUPUESTO_CONTRATISTA_OT,
          procesoOrigenId: Number(presupuestoId),
          creadoPor: usuarioId ? Number(usuarioId) : null,
          actualizadoPor: usuarioId ? Number(usuarioId) : null,
        },
      });

      for (const item of items) {
        const producto = productos.find((p) => Number(p.id) === Number(item.productoId));
        const cantidad = Number(item.cantidad);
        const precioUnitario = Number(item.precioUnitario);
        await tx.detalleOrdenCompra.create({
          data: {
            ordenCompraId: oc.id,
            productoId: producto.id,
            cantidad,
            cantidadCompra: cantidad,
            cantidadRecibida: 0,
            precioUnitario,
            precioUnitarioCompra: precioUnitario,
            subtotal: redondear2(cantidad * precioUnitario),
            tipoAfectacionIGVId: sinIGV ? null : producto.tipoAfectacionIGVId || null,
            observaciones: item.descripcion || null,
            creadoPor: usuarioId ? Number(usuarioId) : null,
          },
        });
      }

      // Totales e impuestos con la misma lógica de Compras (única fuente de verdad)
      const totales = await ordenCompraService.calcularTotalesEImpuestos(oc.id, tx);

      // El presupuesto NO crece solo: el total de todos los documentos (con sus impuestos) no puede
      // superar el monto del presupuesto. Si hay que ampliarlo, el usuario lo modifica manualmente.
      // Al lanzar el error se revierte toda la transacción (incluida la numeración de la serie).
      const [sumaItems, previos] = await Promise.all([
        tx.detRepuestosContratistaOT.aggregate({
          where: { detContratistaOTId: Number(presupuestoId) },
          _sum: { total: true },
        }),
        tx.ordenCompra.findMany({
          where: {
            submoduloOrigenId: SUBMODULO_ORIGEN.PRESUPUESTO_CONTRATISTA_OT,
            procesoOrigenId: Number(presupuestoId),
            estadoId: { not: ESTADO_ORDEN_COMPRA.ANULADO },
            id: { not: oc.id },
          },
          select: { total: true, monedaId: true, tipoCambio: true },
        }),
      ]);
      const montoPresupuesto = Number(sumaItems._sum.total || 0);
      const facturadoPrevio = previos.reduce(
        (suma, doc) => suma + convertirMoneda(doc.total, doc.monedaId, presupuesto.monedaId, doc.tipoCambio),
        0,
      );
      const totalNuevo = convertirMoneda(totales.total, monedaId, presupuesto.monedaId, tipoCambio);
      if (facturadoPrevio + totalNuevo > montoPresupuesto + 0.01) {
        throw new ValidationError(
          `El documento (${redondear2(totalNuevo).toFixed(2)}) supera lo pendiente por facturar del presupuesto ` +
            `(${redondear2(montoPresupuesto - facturadoPrevio).toFixed(2)}). Modifique el presupuesto si corresponde.`,
        );
      }

      return tx.ordenCompra.update({ where: { id: oc.id }, data: totales });
    });

    // ═══════════════════════════════════════════════
    // PASO 2 y 3: CxP Y ASIENTOS (funciones existentes de Compras, sin modificar)
    // Si algo falla se elimina la OC recién creada para no dejar documentos a medias.
    // ═══════════════════════════════════════════════
    try {
      await ordenCompraService.generarCuentaPorPagar(ordenCompra.id);
      const borrador = await ordenCompraService.generarBorradorAsiento(ordenCompra.id);
      await ordenCompraService.guardarAsientoContable(ordenCompra.id, borrador, usuarioId);
    } catch (errorGeneracion) {
      try {
        await ordenCompraService.eliminar(ordenCompra.id, usuarioId);
      } catch (errorLimpieza) {
        throw new ValidationError(
          `${errorGeneracion.message}. Además no se pudo eliminar la OC ${ordenCompra.numeroDocumento} generada a medias: elimínela manualmente.`,
        );
      }
      throw errorGeneracion;
    }

    // Trazabilidad legible en la glosa de cabecera de los asientos. El origen del asiento sigue siendo la OC
    // (como en Compras); esto es solo informativo, por lo que un fallo aquí no debe deshacer el documento.
    try {
      const fechaOT = new Date(presupuesto.otMantenimiento.fechaDocumento).toLocaleDateString("es-PE", { timeZone: "UTC" });
      const trazabilidad = `OT ID ${presupuesto.otMantenimientoId} (${fechaOT}) - PRESUPUESTO ID ${presupuesto.id} - ${presupuesto.contratista.razonSocial}`;
      const asientos = await prisma.asientoContable.findMany({
        where: { ordenesCompra: { some: { id: ordenCompra.id } } },
        select: { id: true, glosa: true },
      });
      for (const asiento of asientos) {
        await prisma.asientoContable.update({
          where: { id: asiento.id },
          data: { glosa: `${asiento.glosa} - ${trazabilidad}` },
        });
      }
    } catch (errorGlosa) {
      console.error("No se pudo agregar la trazabilidad a la glosa del asiento:", errorGlosa.message);
    }

    // ═══════════════════════════════════════════════
    // PASO 4: ACTUALIZAR MONTOS DEL PRESUPUESTO
    // ═══════════════════════════════════════════════
    await recalcularMontosPresupuesto(presupuestoId);

    return {
      success: true,
      message: `Documento de compra ${ordenCompra.numeroDocumento} generado correctamente`,
      ordenCompra: { id: ordenCompra.id, numeroDocumento: ordenCompra.numeroDocumento, total: ordenCompra.total },
    };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  recalcularMontosPresupuesto,
  recalcularMontosOT,
  listarDocumentosCompra,
  buscarProductosEquivalentes,
  generarDocumentoCompra,
};
