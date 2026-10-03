import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import {
  ESTADO_PREFACTURA,
  ESTADO_PERIODO_CONTABLE,
} from "../../utils/estados.constants.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import preFacturaService from "./preFactura.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: BOLETEO AUTOMÁTICO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Crea PreFactura + DetallePreFactura a partir de boletas ya emitidas
 * (cargadas desde un JSON en el frontend).
 *
 * Por qué NO se llama a preFacturaService.crear():
 *   - crear() abre su propia transacción: si luego fallara el detalle quedaría una
 *     PreFactura sin detalle.
 *   - crear() calcula los totales antes de que exista el detalle (quedan en 0).
 * Por eso la lógica de crear() (numeración interna, código = id) se replica aquí
 * dentro de UNA transacción por boleta, y se reutiliza calcularTotalesEImpuestos
 * (exportado y compatible con transacciones) sin modificar preFactura.service.js.
 *
 * Numeración (igual que una PreFactura de boleta registrada por el sistema):
 *   - numeroDocumento (interno): lo genera el sistema con la SerieDoc indicada.
 *   - numeroDocumentoFinal: la boleta ya emitida (ej: EB01-2673), tal como viene.
 *
 * Idempotente: si ya existe una PreFactura con ese documento final EN LA MISMA EMPRESA
 * (la empresa sale de la serie), se omite. Otra empresa puede tener el mismo número.
 */

// Tope por llamada: el frontend envía lotes pequeños para mostrar el avance
const MAX_BOLETAS_POR_LLAMADA = 50;

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
const redondear = (valor, decimales) => {
  const factor = 10 ** decimales;
  return Math.round((Number(valor) + Number.EPSILON) * factor) / factor;
};

/**
 * Copiado de detallePreFactura.service.js: convierte cantidad/precio comercial
 * a unidad de almacén. Se replica porque ese servicio usa el cliente global y no
 * puede participar en nuestra transacción.
 */
const calcularDatosAlmacen = (producto, cantidadVenta, precioUnitarioVenta) => {
  if (!producto.unidadMedidaComercial || !producto.unidadMedidaComercialId) {
    return { cantidad: cantidadVenta, precioUnitario: precioUnitarioVenta };
  }

  const factorComercial = Number(producto.unidadMedidaComercial.factorConversion) || 1;
  const factorAlmacen = Number(producto.unidadMedida.factorConversion) || 1;

  return {
    cantidad: Number(((Number(cantidadVenta) * factorComercial) / factorAlmacen).toFixed(3)),
    precioUnitario: Number((Number(precioUnitarioVenta) * (factorAlmacen / factorComercial)).toFixed(6)),
  };
};

const exigir = (registro, nombre) => {
  if (!registro) throw new ValidationError(`${nombre} no existente.`);
  return registro;
};

const CAMPOS_OBLIGATORIOS = [
  "fechaDocumento",
  "tipoDocumentoId",
  "serieDocId",
  "tipoDocumentoFinalId",
  "numeroDocumentoFinal",
  "numSerieDocFinal",
  "numCorreDocFinal",
  "clienteId",
  "respVentasId",
  "formaPagoId",
  "tipoProductoId",
  "monedaId",
  "productoId",
  "cantidad",
  "totalConIGV",
  "tipoCambio",
];

// ════════════════════════════════════════════════════════════
// PROCESAR UNA BOLETA (una transacción)
// ════════════════════════════════════════════════════════════
const procesarBoleta = async (boleta, parametros, usuarioId) => {
  const faltantes = CAMPOS_OBLIGATORIOS.filter(
    (campo) => boleta[campo] === undefined || boleta[campo] === null || boleta[campo] === "",
  );
  if (faltantes.length > 0) {
    throw new ValidationError(`Faltan datos: ${faltantes.join(", ")}`);
  }

  const cantidad = Number(boleta.cantidad);
  const totalConIGV = Number(boleta.totalConIGV);
  const tipoCambio = Number(boleta.tipoCambio);
  if (!(cantidad > 0)) throw new ValidationError("La cantidad debe ser mayor a cero.");
  if (!(totalConIGV > 0)) throw new ValidationError("El total debe ser mayor a cero.");
  if (!(tipoCambio > 0)) throw new ValidationError("El tipo de cambio no es válido.");

  const numeroDocumentoFinal = String(boleta.numeroDocumentoFinal).trim();
  const fechaDocumento = new Date(boleta.fechaDocumento);
  const fechaVencimiento = new Date(boleta.fechaVencimiento || boleta.fechaDocumento);
  if (Number.isNaN(fechaDocumento.getTime()) || Number.isNaN(fechaVencimiento.getTime())) {
    throw new ValidationError("Fecha de documento o de vencimiento inválida.");
  }

  return await prisma.$transaction(
    async (tx) => {
      // ════════════════════════════════════════════════════════════
      // 1. SERIE Y EMPRESA (nada hardcodeado: la empresa sale de la serie)
      // ════════════════════════════════════════════════════════════
      const serie = exigir(
        await tx.serieDoc.findUnique({ where: { id: Number(boleta.serieDocId) } }),
        "Serie de documento",
      );
      if (Number(serie.tipoDocumentoId) !== Number(boleta.tipoDocumentoId)) {
        throw new ValidationError("La serie no corresponde al tipo de documento indicado.");
      }
      if (!serie.empresaId) {
        throw new ValidationError("La serie de documento no tiene empresa asociada.");
      }
      const empresaId = Number(serie.empresaId);

      // ════════════════════════════════════════════════════════════
      // 2. IDEMPOTENCIA: omitir si el documento final ya fue registrado EN ESTA EMPRESA
      // ════════════════════════════════════════════════════════════
      // Dos empresas pueden emitir el mismo número (ej: EB01-2673): son documentos distintos,
      // por eso la clave incluye la empresa. Por eso se carga la serie antes de este control.
      const existente = await tx.preFactura.findFirst({
        where: {
          empresaId,
          numeroDocumentoFinal,
          tipoDocumentoFinalId: Number(boleta.tipoDocumentoFinalId),
        },
        select: { id: true, numeroDocumento: true },
      });
      if (existente) {
        return {
          estado: "OMITIDA",
          numeroDocumentoFinal,
          preFacturaId: existente.id,
          numeroDocumento: existente.numeroDocumento,
          mensaje: "Ya registrada en esta empresa",
        };
      }

      const [empresa, cliente, vendedor, formaPago, tipoProducto, moneda, producto] =
        await Promise.all([
          tx.empresa.findUnique({ where: { id: empresaId } }),
          tx.entidadComercial.findUnique({ where: { id: Number(boleta.clienteId) } }),
          tx.personal.findUnique({ where: { id: Number(boleta.respVentasId) } }),
          tx.formaPago.findUnique({ where: { id: Number(boleta.formaPagoId) } }),
          tx.tipoProducto.findUnique({ where: { id: Number(boleta.tipoProductoId) } }),
          tx.moneda.findUnique({ where: { id: Number(boleta.monedaId) } }),
          tx.producto.findUnique({
            where: { id: Number(boleta.productoId) },
            include: {
              unidadMedida: true,
              unidadMedidaComercial: true,
              tipoAfectacionIGV: true,
            },
          }),
        ]);
      exigir(empresa, "Empresa");
      exigir(cliente, "Cliente");
      exigir(vendedor, "Responsable de ventas");
      exigir(formaPago, "Forma de pago");
      exigir(tipoProducto, "Tipo de producto");
      exigir(moneda, "Moneda");
      exigir(producto, "Producto");

      // El tratamiento del IGV lo define el producto (catálogo 07 SUNAT), no un valor fijo.
      // Sin tipo de afectación no se puede saber si la boleta lleva IGV: se rechaza.
      const tipoAfectacion = producto.tipoAfectacionIGV;
      if (!tipoAfectacion) {
        throw new ValidationError(
          `El producto ${producto.descripcionBase || producto.id} no tiene Tipo de Afectación IGV asignado.`,
        );
      }
      const calculaIGV = Boolean(tipoAfectacion.calculaIGV);

      if (boleta.unidadNegocioId) {
        exigir(
          await tx.unidadNegocio.findUnique({ where: { id: Number(boleta.unidadNegocioId) } }),
          "Unidad de negocio",
        );
      }

      // El período debe existir y estar abierto
      const periodo = await periodoContableService.obtenerPeriodoPorFecha(empresaId, fechaDocumento);
      if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
        throw new ValidationError(`El período ${periodo.nombrePeriodo} no está abierto.`);
      }

      // ════════════════════════════════════════════════════════════
      // 3. NUMERACIÓN INTERNA (incremento atómico: sin duplicados aunque haya concurrencia)
      // ════════════════════════════════════════════════════════════
      const serieActualizada = await tx.serieDoc.update({
        where: { id: serie.id },
        data: { correlativo: { increment: 1 } },
      });
      const nuevoCorrelativo = Number(serieActualizada.correlativo);
      const numSerieDoc = String(serie.serie).padStart(serie.numCerosIzqSerie, "0");
      const numCorreDoc = String(nuevoCorrelativo).padStart(serie.numCerosIzqCorre, "0");
      const numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;

      // ════════════════════════════════════════════════════════════
      // 4. VALOR UNITARIO derivado del TOTAL de la boleta
      // ════════════════════════════════════════════════════════════
      // El detalle guarda siempre el valor unitario (sin IGV):
      //   - Producto afecto al IGV: el total de la boleta incluye IGV, se desagrega.
      //   - Producto exonerado/inafecto: no hay IGV, el valor unitario es total ÷ cantidad.
      // Derivarlo del total (y no del precio de lista) garantiza que el sistema
      // recomponga exactamente el total de la boleta al centavo.
      const porcentajeIgv = calculaIGV ? Number(empresa.porcentajeIgv || 18) : 0;
      const valorUnitario = redondear(totalConIGV / (1 + porcentajeIgv / 100) / cantidad, 6);

      // ════════════════════════════════════════════════════════════
      // 5. CREAR PREFACTURA (código temporal único; el definitivo es el id)
      // ════════════════════════════════════════════════════════════
      const codigoTemporal = `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const preFactura = await tx.preFactura.create({
        data: {
          codigo: codigoTemporal,
          empresaId,
          tipoDocumentoId: Number(boleta.tipoDocumentoId),
          serieDocId: Number(boleta.serieDocId),
          numeroDocumento,
          numSerieDoc,
          numCorreDoc,
          fechaDocumento,
          fechaVencimiento,
          fechaContable: fechaDocumento,
          periodoContableId: periodo.id,
          nroLiquidacionFacturacion: numeroDocumentoFinal,
          tipoDocumentoFinalId: Number(boleta.tipoDocumentoFinalId),
          numeroDocumentoFinal,
          numSerieDocFinal: String(boleta.numSerieDocFinal).trim(),
          numCorreDocFinal: String(boleta.numCorreDocFinal).trim(),
          facturado: true,
          fechaFacturacion: fechaDocumento,
          esGerencial: false,
          esParticionada: false,
          clienteId: Number(boleta.clienteId),
          respVentasId: Number(boleta.respVentasId),
          tipoProductoId: Number(boleta.tipoProductoId),
          formaPagoId: Number(boleta.formaPagoId),
          monedaId: Number(boleta.monedaId),
          tipoCambio,
          estadoId: parametros.estadoId,
          // exoneradoIgv es el interruptor que usa el cálculo de totales y el asiento;
          // tipoAfectacionIGVId es el que usa el Registro de Ventas SUNAT (inafecto, exonerado, etc.)
          exoneradoIgv: !calculaIGV,
          porcentajeIgv,
          tipoAfectacionIGVId: tipoAfectacion.id,
          ...(parametros.tipoOperacionSunatId && {
            tipoOperacionSunatId: parametros.tipoOperacionSunatId,
          }),
          ...(boleta.unidadNegocioId && { unidadNegocioId: Number(boleta.unidadNegocioId) }),
          creadoPor: usuarioId ? Number(usuarioId) : null,
          actualizadoPor: usuarioId ? Number(usuarioId) : null,
          subtotal: 0,
          totalIGV: 0,
          total: 0,
        },
      });

      // ════════════════════════════════════════════════════════════
      // 6. DETALLE
      // ════════════════════════════════════════════════════════════
      const datosAlmacen = calcularDatosAlmacen(producto, cantidad, valorUnitario);
      await tx.detallePreFactura.create({
        data: {
          preFacturaId: preFactura.id,
          productoId: producto.id,
          cantidadVenta: cantidad,
          precioUnitarioVenta: valorUnitario,
          cantidad: datosAlmacen.cantidad,
          precioUnitario: datosAlmacen.precioUnitario,
          tipoAfectacionIGVId: tipoAfectacion.id,
          creadoPor: usuarioId ? Number(usuarioId) : null,
        },
      });

      // ════════════════════════════════════════════════════════════
      // 7. TOTALES (misma función que usa el sistema) + código definitivo = id
      // ════════════════════════════════════════════════════════════
      const totales = await preFacturaService.calcularTotalesEImpuestos(preFactura.id, tx);

      // Seguridad: si el total recompuesto no coincide con la boleta, se revierte esta boleta
      if (Math.abs(Number(totales.total) - redondear(totalConIGV, 2)) > 0.005) {
        throw new ValidationError(
          `El total calculado (${redondear(totales.total, 2)}) no coincide con la boleta (${redondear(totalConIGV, 2)}).`,
        );
      }

      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: { codigo: String(preFactura.id), ...totales },
      });

      return {
        estado: "CREADA",
        numeroDocumentoFinal,
        preFacturaId: preFactura.id,
        numeroDocumento,
        total: redondear(totales.total, 2),
      };
    },
    { timeout: 20000 },
  );
};

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: procesa un lote de boletas EN ORDEN
// ════════════════════════════════════════════════════════════
/**
 * @param {Object} datos
 * @param {Array}  datos.boletas - Boletas normalizadas (ver CAMPOS_OBLIGATORIOS)
 * @param {Object} [datos.parametros] - { estadoId?, tipoOperacionSunatId? }
 *        (el tipo de afectación del IGV NO es parámetro: se toma de cada producto)
 * @param {number} datos.usuarioId
 * @returns {Promise<{resultados: Array}>} Un resultado por boleta: CREADA | OMITIDA | ERROR
 */
const importarBoletas = async ({ boletas, parametros = {}, usuarioId }) => {
  if (!Array.isArray(boletas) || boletas.length === 0) {
    throw new ValidationError("Debe enviar al menos una boleta.");
  }
  if (boletas.length > MAX_BOLETAS_POR_LLAMADA) {
    throw new ValidationError(
      `Máximo ${MAX_BOLETAS_POR_LLAMADA} boletas por llamada.`,
    );
  }

  const parametrosNormalizados = {
    estadoId: Number(parametros.estadoId || ESTADO_PREFACTURA.PENDIENTE),
    tipoOperacionSunatId: parametros.tipoOperacionSunatId
      ? Number(parametros.tipoOperacionSunatId)
      : null,
  };

  const resultados = [];

  // En orden y de a una: la numeración interna debe seguir el orden de las boletas
  for (const boleta of boletas) {
    try {
      resultados.push(await procesarBoleta(boleta, parametrosNormalizados, usuarioId));
    } catch (err) {
      let mensaje = err.message;
      if (err.code && String(err.code).startsWith("P")) {
        console.error("[BoleteoAutomatico] Prisma error:", err);
        mensaje = `Error de base de datos: ${err.message}`;
      } else if (!(err instanceof ValidationError || err instanceof NotFoundError)) {
        console.error("[BoleteoAutomatico] Error inesperado:", err);
      }
      resultados.push({
        estado: "ERROR",
        numeroDocumentoFinal: boleta?.numeroDocumentoFinal || null,
        mensaje,
      });
    }
  }

  return { resultados };
};

export default {
  importarBoletas,
};
