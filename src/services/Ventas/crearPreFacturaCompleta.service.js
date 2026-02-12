import prisma from "../../config/prismaClient.js";
import { ValidationError, DatabaseError } from "../../utils/errors.js";

/**
 * Crea una PreFactura completa con sus detalles de forma genérica y reutilizable.
 * Función reutilizable para crear PreFacturas desde cualquier módulo.
 *
 * @param {Object} cabecera - Objeto con los campos de PreFactura
 * @param {Array} detalles - Array de objetos con los campos de DetallePreFactura
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la operación
 * @param {PrismaTransaction} transaccion - Transacción de Prisma (opcional)
 * @returns {Promise<Object>} Resultado con PreFactura creada
 */
const crearPreFacturaCompleta = async (
  cabecera,
  detalles,
  usuarioId,
  transaccion = null,
) => {
  try {
    const ejecutarEnTransaccion = async (tx) => {
      // ========================================
      // PASO 1: VALIDACIONES DE ENTRADA
      // ========================================

      if (!cabecera || typeof cabecera !== "object") {
        throw new ValidationError(
          "La cabecera es obligatoria y debe ser un objeto",
        );
      }

      // Validaciones de campos obligatorios de cabecera
      if (!cabecera.empresaId) {
        throw new ValidationError("empresaId es obligatorio en la cabecera");
      }
      if (!cabecera.tipoDocumentoId) {
        throw new ValidationError(
          "tipoDocumentoId es obligatorio en la cabecera",
        );
      }
      if (!cabecera.serieDocId) {
        throw new ValidationError("serieDocId es obligatorio en la cabecera");
      }
      if (!cabecera.fechaDocumento) {
        throw new ValidationError(
          "fechaDocumento es obligatorio en la cabecera",
        );
      }
      if (!cabecera.clienteId) {
        throw new ValidationError("clienteId es obligatorio en la cabecera");
      }
      if (!cabecera.respVentasId) {
        throw new ValidationError("respVentasId es obligatorio en la cabecera");
      }
      if (!cabecera.tipoProductoId) {
        throw new ValidationError(
          "tipoProductoId es obligatorio en la cabecera",
        );
      }
      if (!cabecera.formaPagoId) {
        throw new ValidationError("formaPagoId es obligatorio en la cabecera");
      }
      if (!cabecera.monedaId) {
        throw new ValidationError("monedaId es obligatorio en la cabecera");
      }
      if (cabecera.tipoCambio === undefined || cabecera.tipoCambio === null) {
        throw new ValidationError("tipoCambio es obligatorio en la cabecera");
      }
      if (cabecera.subtotal === undefined || cabecera.subtotal === null) {
        throw new ValidationError("subtotal es obligatorio en la cabecera");
      }
      if (cabecera.totalIGV === undefined || cabecera.totalIGV === null) {
        throw new ValidationError("totalIGV es obligatorio en la cabecera");
      }
      if (cabecera.total === undefined || cabecera.total === null) {
        throw new ValidationError("total es obligatorio en la cabecera");
      }
      if (!cabecera.estadoId) {
        throw new ValidationError("estadoId es obligatorio en la cabecera");
      }

      // Validaciones de detalles
      if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
        throw new ValidationError("Debe proporcionar al menos un detalle");
      }

      detalles.forEach((det, index) => {
        if (!det.productoId) {
          throw new ValidationError(
            `Detalle ${index + 1}: productoId es obligatorio`,
          );
        }
        if (det.cantidad === undefined || det.cantidad === null) {
          throw new ValidationError(
            `Detalle ${index + 1}: cantidad es obligatorio`,
          );
        }
        if (det.precioUnitario === undefined || det.precioUnitario === null) {
          throw new ValidationError(
            `Detalle ${index + 1}: precioUnitario es obligatorio`,
          );
        }
      });

      if (!usuarioId) {
        throw new ValidationError("usuarioId es obligatorio");
      }

      // ========================================
      // PASO 2: OBTENER Y VALIDAR SERIE
      // ========================================

      const serie = await tx.serieDoc.findUnique({
        where: { id: cabecera.serieDocId },
      });

      if (!serie) {
        throw new ValidationError("Serie de documento no encontrada");
      }

      if (!serie.activo) {
        throw new ValidationError("La serie de documento está inactiva");
      }

      // ========================================
      // PASO 3: GENERAR CÓDIGO Y NÚMERO DE DOCUMENTO
      // ========================================

      let codigo = cabecera.codigo;
      let numSerieDoc = cabecera.numSerieDoc;
      let numCorreDoc = cabecera.numCorreDoc;
      let numeroDocumento = cabecera.numeroDocumento;

      if (!numeroDocumento) {
        const nuevoCorrelativo = Number(serie.correlativo) + 1;
        numSerieDoc = String(serie.serie).padStart(
          Number(serie.numCerosIzqSerie),
          "0",
        );
        numCorreDoc = String(nuevoCorrelativo).padStart(
          Number(serie.numCerosIzqCorre),
          "0",
        );
        numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;

        await tx.serieDoc.update({
          where: { id: cabecera.serieDocId },
          data: { correlativo: BigInt(nuevoCorrelativo) },
        });
      }

      // ========================================
      // PASO 4: CREAR PREFACTURA CON DETALLES
      // ========================================

      const preFactura = await tx.preFactura.create({
        data: {
          // Documento PreFactura
          codigo: "TEMP-" + Date.now(),
          empresaId: cabecera.empresaId,
          tipoDocumentoId: cabecera.tipoDocumentoId,
          serieDocId: cabecera.serieDocId,
          numeroDocumento: numeroDocumento,
          numSerieDoc: numSerieDoc,
          numCorreDoc: numCorreDoc,
          fechaDocumento: cabecera.fechaDocumento,
          fechaVencimiento: cabecera.fechaVencimiento || null,

          // Campos de documento final
          tipoDocumentoFinalId: cabecera.tipoDocumentoFinalId || null,
          serieDocFinalId: cabecera.serieDocFinalId || null,
          numeroDocumentoFinal: cabecera.numeroDocumentoFinal || null,
          numSerieDocFinal: cabecera.numSerieDocFinal || null,
          numCorreDocFinal: cabecera.numCorreDocFinal || null,
          facturado: cabecera.facturado || false,
          fechaFacturacion: cabecera.fechaFacturacion || null,

          // Tipo de facturación
          esGerencial: cabecera.esGerencial || false,
          preFacturaOrigenId: cabecera.preFacturaOrigenId || null,
          esParticionada: cabecera.esParticionada || false,

          // Cliente
          clienteId: cabecera.clienteId,
          contactoClienteId: cabecera.contactoClienteId || null,
          dirEntregaId: cabecera.dirEntregaId || null,
          dirFiscalId: cabecera.dirFiscalId || null,

          // Responsables
          respVentasId: cabecera.respVentasId,
          autorizaVentaId: cabecera.autorizaVentaId || null,
          supervisorVentaCampoId: cabecera.supervisorVentaCampoId || null,
          respEmbarqueId: cabecera.respEmbarqueId || null,
          respProduccionId: cabecera.respProduccionId || null,
          respAlmacenId: cabecera.respAlmacenId || null,

          // Datos comerciales
          tipoProductoId: cabecera.tipoProductoId,
          formaPagoId: cabecera.formaPagoId,
          bancoId: cabecera.bancoId || null,
          monedaId: cabecera.monedaId,
          tipoCambio: cabecera.tipoCambio,

          // Montos
          subtotal: cabecera.subtotal,
          totalDescuentos: cabecera.totalDescuentos || 0,
          totalIGV: cabecera.totalIGV,
          total: cabecera.total,

          // Adelantos
          montoAdelantadoCliente: cabecera.montoAdelantadoCliente || null,
          porcentajeAdelanto: cabecera.porcentajeAdelanto || null,

          // Estado y aprobación
          estadoId: cabecera.estadoId,
          motivoRechazo: cabecera.motivoRechazo || null,
          fechaAprobacion: cabecera.fechaAprobacion || null,
          aprobadoPorId: cabecera.aprobadoPorId || null,

          // Origen
          cotizacionVentaId: cabecera.cotizacionVentaId || null,

          // Exportación
          incotermId: cabecera.incotermId || null,
          puertoEmbarqueId: cabecera.puertoEmbarqueId || null,
          puertoDestinoId: cabecera.puertoDestinoId || null,
          paisDestinoId: cabecera.paisDestinoId || null,
          agenteAduanaId: cabecera.agenteAduanaId || null,
          numeroBuque: cabecera.numeroBuque || null,
          numeroBL: cabecera.numeroBL || null,
          numContenedor: cabecera.numContenedor || null,
          tipoContenedorId: cabecera.tipoContenedorId || null,

          // Impuestos
          exoneradoIgv: cabecera.exoneradoIgv || false,
          porcentajeIgv: cabecera.porcentajeIgv || null,

          // Factores exportación
          factorExportacion: cabecera.factorExportacion || null,
          factorExportacionReal: cabecera.factorExportacionReal || null,

          // Otros
          observaciones: cabecera.observaciones || null,
          urlPreFacturaPdf: cabecera.urlPreFacturaPdf || null,
          centroCostoId: cabecera.centroCostoId || null,
          contratoServicioId: cabecera.contratoServicioId || null,
          movSalidaAlmacenId: cabecera.movSalidaAlmacenId || null,
          unidadNegocioId: cabecera.unidadNegocioId || null,

          // Auditoría
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          creadoPor: usuarioId,
          actualizadoPor: usuarioId,

          // Detalles
          detalles: {
            create: detalles.map((det) => ({
              productoId: det.productoId,
              cantidad: det.cantidad,
              precioUnitario: det.precioUnitario,
              centroCostoId: det.centroCostoId || null,
              fechaCreacion: new Date(),
              fechaActualizacion: new Date(),
              creadoPor: usuarioId,
              actualizadoPor: usuarioId,
            })),
          },
        },
        include: {
          detalles: true,
          cliente: true,
          moneda: true,
          tipoProducto: true,
        },
      });

      // Actualizar código con el ID
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: { codigo: String(preFactura.id) },
      });
      // ========================================
      // PASO 5: RETORNAR RESULTADO
      // ========================================

      return {
        success: true,
        preFactura: {
          id: preFactura.id,
          codigo: String(preFactura.id),
          numeroDocumento: preFactura.numeroDocumento,
          fechaDocumento: preFactura.fechaDocumento,
          total: preFactura.total,
          cantidadDetalles: preFactura.detalles.length,
        },
        mensaje: "PreFactura creada exitosamente",
      };
    };

    if (transaccion) {
      return await ejecutarEnTransaccion(transaccion);
    } else {
      return await prisma.$transaction(ejecutarEnTransaccion);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error("Error al crear PreFactura:", error);
    throw new DatabaseError("Error al crear PreFactura: " + error.message);
  }
};

export default {
  crearPreFacturaCompleta,
};
