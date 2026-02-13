import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";

/**
 * Servicio CRUD para PreFactura
 * Gestiona pre-facturas generadas desde cotizaciones aprobadas
 * Incluye generación automática de código y número de documento
 * Documentado en español.
 */

/**
 * Genera código único para la pre-factura
 * Formato: PF-YYYY-NNNNNN
 * Ejemplo: PF-2024-000001
 */
async function generarCodigoPreFactura(empresaId) {
  const año = new Date().getFullYear();

  // Buscar la última pre-factura del año
  const ultimaPreFactura = await prisma.preFactura.findFirst({
    where: {
      empresaId,
      codigo: {
        startsWith: `PF-${año}-`,
      },
    },
    orderBy: { id: "desc" },
  });

  let correlativo = 1;
  if (ultimaPreFactura) {
    // Extraer el correlativo del código: PF-2024-000001
    const partes = ultimaPreFactura.codigo.split("-");
    correlativo = parseInt(partes[2]) + 1;
  }

  return `PF-${año}-${String(correlativo).padStart(6, "0")}`;
}

async function validarUnicidadCodigo(codigo, id = null) {
  const where = id ? { codigo, NOT: { id } } : { codigo };
  const existe = await prisma.preFactura.findFirst({ where });
  if (existe)
    throw new ConflictError("Ya existe una PreFactura con ese código.");
}

async function validarClavesForaneas(data) {
  const checks = [
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.entidadComercial.findUnique({ where: { id: data.clienteId } }),
    prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } }),
    prisma.formaPago.findUnique({ where: { id: data.formaPagoId } }),
    prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } }),
    data.serieDocId
      ? prisma.serieDoc.findUnique({ where: { id: data.serieDocId } })
      : Promise.resolve(true),
    data.preFacturaOrigenId
      ? prisma.preFactura.findUnique({ where: { id: data.preFacturaOrigenId } })
      : Promise.resolve(true),
    data.cotizacionVentaId
      ? prisma.cotizacionVentas.findUnique({
          where: { id: data.cotizacionVentaId },
        })
      : Promise.resolve(true),
    data.movSalidaAlmacenId
      ? prisma.movimientoAlmacen.findUnique({
          where: { id: data.movSalidaAlmacenId },
        })
      : Promise.resolve(true),
    data.contratoServicioId
      ? prisma.contratoServicio.findUnique({
          where: { id: data.contratoServicioId },
        })
      : Promise.resolve(true),
    data.paisDestinoId
      ? prisma.pais.findUnique({ where: { id: data.paisDestinoId } })
      : Promise.resolve(true),
    data.puertoEmbarqueId
      ? prisma.puertoPesca.findUnique({ where: { id: data.puertoEmbarqueId } })
      : Promise.resolve(true),
    data.puertoDestinoId
      ? prisma.puertoPesca.findUnique({ where: { id: data.puertoDestinoId } })
      : Promise.resolve(true),
    data.incotermId
      ? prisma.incoterm.findUnique({ where: { id: data.incotermId } })
      : Promise.resolve(true),
    data.agenteAduanaId
      ? prisma.entidadComercial.findUnique({
          where: { id: data.agenteAduanaId },
        })
      : Promise.resolve(true),
    data.bancoId
      ? prisma.banco.findUnique({ where: { id: data.bancoId } })
      : Promise.resolve(true),
    data.monedaId
      ? prisma.moneda.findUnique({ where: { id: data.monedaId } })
      : Promise.resolve(true),
    data.centroCostoId
      ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
      : Promise.resolve(true),
  ];
  const [
    empresa,
    cliente,
    tipoDoc,
    formaPago,
    estado,
    serieDoc,
    preFacturaOrigen,
    cotizacion,
    movSalida,
    contratoServicio,
    paisDestino,
    puertoEmbarque,
    puertoDestino,
    incoterm,
    agenteAduana,
    banco,
    moneda,
    centroCosto,
  ] = await Promise.all(checks);
  if (!empresa) throw new ValidationError("El empresaId no existe.");
  if (!cliente) throw new ValidationError("El clienteId no existe.");
  if (!tipoDoc) throw new ValidationError("El tipoDocumentoId no existe.");
  if (!formaPago) throw new ValidationError("El formaPagoId no existe.");
  if (!estado) throw new ValidationError("El estadoId no existe.");
  if (data.serieDocId && !serieDoc)
    throw new ValidationError("El serieDocId no existe.");
  if (data.preFacturaOrigenId && !preFacturaOrigen)
    throw new ValidationError("La PreFactura Origen no existe.");
  if (data.cotizacionVentaId && !cotizacion)
    throw new ValidationError("El cotizacionVentaId no existe.");
  if (data.movSalidaAlmacenId && !movSalida)
    throw new ValidationError("El movSalidaAlmacenId no existe.");
  if (data.contratoServicioId && !contratoServicio)
    throw new ValidationError("El Contrato de Servicio no existe.");
  if (data.paisDestinoId && !paisDestino)
    throw new ValidationError("El paisDestinoId no existe.");
  if (data.puertoEmbarqueId && !puertoEmbarque)
    throw new ValidationError("El puertoEmbarqueId no existe.");
  if (data.puertoDestinoId && !puertoDestino)
    throw new ValidationError("El puertoDestinoId no existe.");
  if (data.incotermId && !incoterm)
    throw new ValidationError("El incotermId no existe.");
  if (data.agenteAduanaId && !agenteAduana)
    throw new ValidationError("El agenteAduanaId no existe.");
  if (data.bancoId && !banco)
    throw new ValidationError("El bancoId no existe.");
  if (data.monedaId && !moneda)
    throw new ValidationError("El monedaId no existe.");
  if (data.centroCostoId && !centroCosto)
    throw new ValidationError("El centroCostoId no existe.");
}

const listar = async () => {
  try {
    return await prisma.preFactura.findMany({
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        formaPago: true,
        incoterm: true,
        tipoContenedor: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fechaDocumento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const pf = await prisma.preFactura.findUnique({
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        formaPago: true,
        incoterm: true,
        tipoContenedor: true,
        movSalidaAlmacen: true,
        contratoServicio: true,
        tipoDocumentoFinal: true,
        serieDocFinal: true,
        comprobantesElectronicos: {
          include: {
            tipoComprobante: true,
            estadoOSE: true,
            estadoSUNAT: true,
          },
        },
        detalles: {
          include: {
            producto: {
              include: {
                familia: true,
                unidadMedida: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!pf) throw new NotFoundError("PreFactura no encontrada");
    return pf;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorCliente = async (clienteId) => {
  try {
    return await prisma.preFactura.findMany({
      where: { clienteId },
      include: {
        empresa: true,
        tipoDocumento: true,
        moneda: true,
        incoterm: true,
      },
      orderBy: { fechaDocumento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorCotizacion = async (cotizacionVentaId) => {
  try {
    return await prisma.preFactura.findMany({
      where: { cotizacionVentaId },
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        moneda: true,
        incoterm: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fechaDocumento: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (
      !data.empresaId ||
      !data.clienteId ||
      !data.tipoDocumentoId ||
      !data.monedaId ||
      !data.formaPagoId ||
      !data.estadoId
    ) {
      throw new ValidationError(
        "Faltan campos obligatorios: empresaId, clienteId, tipoDocumentoId, monedaId, formaPagoId, estadoId",
      );
    }

    if (!data.serieDocId) {
      throw new ValidationError("El campo serieDocId es obligatorio.");
    }

    // ✅ Validar y obtener tipo de cambio si es necesario
    const tipoCambioFinal = await validarTipoCambio(
      data.tipoCambio,
      data.fechaDocumento || new Date(),
    );

    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Generar código único
      let codigo = data.codigo;
      if (!codigo) {
        codigo = await generarCodigoPreFactura(data.empresaId);
      }

      // 2. Validar existencia de empresa
      const empresa = await tx.empresa.findUnique({
        where: { id: data.empresaId },
      });
      if (!empresa) throw new ValidationError("Empresa no existente.");

      // 3. Validar existencia de cliente
      const cliente = await tx.entidadComercial.findUnique({
        where: { id: data.clienteId },
      });
      if (!cliente) throw new ValidationError("Cliente no existente.");

      // 4. Validar Incoterm si se proporciona
      if (data.incotermId) {
        const incoterm = await tx.incoterm.findUnique({
          where: { id: data.incotermId },
        });
        if (!incoterm) throw new ValidationError("Incoterm no existente.");
      }

      // 5. Obtener la serie seleccionada
      const serie = await tx.serieDoc.findUnique({
        where: { id: BigInt(data.serieDocId) },
      });

      if (!serie) {
        throw new ValidationError("Serie de documento no encontrada.");
      }

      // 6. Calcular nuevo correlativo
      const nuevoCorrelativo = Number(serie.correlativo) + 1;

      // 7. Generar números con formato
      const numSerie = String(serie.serie).padStart(
        serie.numCerosIzqSerie,
        "0",
      );
      const numCorre = String(nuevoCorrelativo).padStart(
        serie.numCerosIzqCorre,
        "0",
      );
      const numeroDocumento = `${numSerie}-${numCorre}`;

      // 8. Actualizar el correlativo en SerieDoc
      await tx.serieDoc.update({
        where: { id: BigInt(data.serieDocId) },
        data: { correlativo: BigInt(nuevoCorrelativo) },
      });

      // 9. Calcular fechaVencimiento si no viene (30 días después de fechaDocumento)
      let fechaVencimiento = data.fechaVencimiento;
      if (!fechaVencimiento) {
        const fechaDoc = data.fechaDocumento
          ? new Date(data.fechaDocumento)
          : new Date();
        fechaVencimiento = new Date(fechaDoc);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
      }

      // 10. Crear objeto limpio solo con campos del modelo (patrón estándar)
      const datosLimpios = {
        codigo,
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numeroDocumento,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        fechaDocumento: data.fechaDocumento,
        fechaVencimiento,
        tipoDocumentoFinalId: data.tipoDocumentoFinalId,
        serieDocFinalId: data.serieDocFinalId,
        numeroDocumentoFinal: data.numeroDocumentoFinal,
        numSerieDocFinal: data.numSerieDocFinal,
        numCorreDocFinal: data.numCorreDocFinal,
        facturado: data.facturado,
        fechaFacturacion: data.fechaFacturacion,
        esGerencial: data.esGerencial,
        preFacturaOrigenId: data.preFacturaOrigenId,
        esParticionada:
          data.esParticionada !== undefined ? data.esParticionada : false,
        clienteId: data.clienteId,
        contactoClienteId: data.contactoClienteId,
        dirEntregaId: data.dirEntregaId,
        dirFiscalId: data.dirFiscalId,
        respVentasId: data.respVentasId,
        autorizaVentaId: data.autorizaVentaId,
        supervisorVentaCampoId: data.supervisorVentaCampoId,
        respEmbarqueId: data.respEmbarqueId,
        respProduccionId: data.respProduccionId,
        respAlmacenId: data.respAlmacenId,
        tipoProductoId: data.tipoProductoId,
        formaPagoId: data.formaPagoId,
        bancoId: data.bancoId,
        monedaId: data.monedaId,
        tipoCambio: tipoCambioFinal, // ✅ Usar valor validado
        subtotal: data.subtotal,
        totalDescuentos: data.totalDescuentos,
        totalIGV: data.totalIGV,
        total: data.total,
        montoAdelantadoCliente: data.montoAdelantadoCliente,
        porcentajeAdelanto: data.porcentajeAdelanto,
        estadoId: data.estadoId,
        motivoRechazo: data.motivoRechazo,
        fechaAprobacion: data.fechaAprobacion,
        aprobadoPorId: data.aprobadoPorId,
        preFacturaOrigenId: data.preFacturaOrigenId,
        cotizacionVentaId: data.cotizacionVentaId,
        incotermId: data.incotermId,
        puertoEmbarqueId: data.puertoEmbarqueId,
        puertoDestinoId: data.puertoDestinoId,
        paisDestinoId: data.paisDestinoId,
        agenteAduanaId: data.agenteAduanaId,
        numeroBuque: data.numeroBuque,
        numeroBL: data.numeroBL,
        numContenedor: data.numContenedor,
        tipoContenedorId: data.tipoContenedorId,
        exoneradoIgv:
          data.exoneradoIgv !== undefined ? data.exoneradoIgv : false,
        porcentajeIgv: data.porcentajeIgv,
        factorExportacion: data.factorExportacion,
        factorExportacionReal: data.factorExportacionReal,
        observaciones: data.observaciones,
        urlPreFacturaPdf: data.urlPreFacturaPdf,
        centroCostoId: data.centroCostoId,
        contratoServicioId: data.contratoServicioId,
        movSalidaAlmacenId: data.movSalidaAlmacenId,
        fechaCreacion: data.fechaCreacion || new Date(),
        fechaActualizacion: data.fechaActualizacion || new Date(),
        creadoPor: data.creadoPor,
        actualizadoPor: data.actualizadoPor,
      };

      // 11. Crear la pre-factura con los números generados (patrón estándar)
      const preFacturaCreada = await tx.preFactura.create({
        data: datosLimpios,
        include: {
          empresa: true,
          cliente: true,
          tipoDocumento: true,
          serieDoc: true,
          moneda: true,
          formaPago: true,
          incoterm: true,
        },
      });

      return preFacturaCreada;
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.preFactura.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("PreFactura no encontrada");
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    // Validar claves foráneas si cambian
    const claves = [
      "empresaId",
      "clienteId",
      "tipoDocumentoId",
      "formaPagoId",
      "estadoId",
      "serieDocId",
      "preFacturaOrigenId",
      "cotizacionVentaId",
      "contratoServicioId",
      "movSalidaAlmacenId",
      "paisDestinoId",
      "puertoEmbarqueId",
      "puertoDestinoId",
      "incotermId",
      "agenteAduanaId",
      "bancoId",
      "monedaId",
      "centroCostoId",
    ];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // ✅ Validar y obtener tipo de cambio si es necesario
    if (data.hasOwnProperty("tipoCambio")) {
      data.tipoCambio = await validarTipoCambio(
        data.tipoCambio,
        data.fechaDocumento || existente.fechaDocumento,
      );
    }

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion:
        data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };

    return await prisma.preFactura.update({
      where: { id },
      data: datosConAuditoria,
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        moneda: true,
        incoterm: true,
      },
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.preFactura.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!existente) throw new NotFoundError("PreFactura no encontrada");
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError(
        "No se puede eliminar porque tiene detalles asociados.",
      );
    }
    await prisma.preFactura.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * ========================================
 * FUNCIONES DE GENERACIÓN DE COMPROBANTES
 * ========================================
 */

/**
 * Genera una Factura Electrónica desde una PreFactura
 */
const generarFacturaDesdePreFactura = async (
  preFacturaId,
  datosFactura = {},
) => {
  try {
    // 1. Obtener PreFactura con detalles
    const preFactura = await prisma.preFactura.findUnique({
      where: { id: preFacturaId },
      include: {
        empresa: true,
        cliente: true,
        moneda: true,
        formaPago: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!preFactura) {
      throw new NotFoundError("PreFactura no encontrada");
    }

    if (preFactura.facturado) {
      throw new ConflictError("Esta PreFactura ya fue facturada");
    }

    if (!preFactura.detalles || preFactura.detalles.length === 0) {
      throw new ValidationError(
        "La PreFactura debe tener detalles para generar factura",
      );
    }

    // 2. Obtener tipo documento Factura (código 01)
    const tipoFactura = await prisma.tipoDocumento.findFirst({
      where: { codigo: "01" },
    });

    if (!tipoFactura) {
      throw new ValidationError(
        "No se encontró el tipo de documento Factura (código 01)",
      );
    }

    // 3. Obtener serie para facturas
    const serieFactura = datosFactura.serieDocId
      ? await prisma.serieDoc.findUnique({
          where: { id: BigInt(datosFactura.serieDocId) },
        })
      : await prisma.serieDoc.findFirst({
          where: {
            empresaId: preFactura.empresaId,
            tipoDocumentoId: tipoFactura.id,
            activo: true,
          },
        });

    if (!serieFactura) {
      throw new ValidationError(
        "No se encontró una serie activa para Facturas",
      );
    }

    // 4. Obtener sede (usar la primera activa)
    const sede = await prisma.sedesEmpresa.findFirst({
      where: {
        empresaId: preFactura.empresaId,
        activo: true,
      },
    });

    if (!sede) {
      throw new ValidationError(
        "No se encontró una sede activa para la empresa",
      );
    }

    // 5. Obtener estados
    const estadoOSE = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: "OSE_PENDIENTE", modulo: "COMPROBANTES_ELECTRONICOS" },
    });

    const estadoSUNAT = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: "SUNAT_ACTIVO", modulo: "COMPROBANTES_ELECTRONICOS" },
    });

    if (!estadoOSE || !estadoSUNAT) {
      throw new ValidationError(
        "No se encontraron los estados necesarios para comprobantes",
      );
    }

    // 6. Crear comprobante en transacción
    return await prisma.$transaction(async (tx) => {
      // 6.1. Calcular correlativo
      const nuevoCorrelativo = Number(serieFactura.correlativo) + 1;
      const numSerie = String(serieFactura.serie).padStart(
        serieFactura.numCerosIzqSerie,
        "0",
      );
      const numCorre = String(nuevoCorrelativo).padStart(
        serieFactura.numCerosIzqCorre,
        "0",
      );
      const numeroCompleto = `${numSerie}-${numCorre}`;

      // 6.2. Actualizar correlativo
      await tx.serieDoc.update({
        where: { id: serieFactura.id },
        data: { correlativo: BigInt(nuevoCorrelativo) },
      });

      // 6.3. Crear comprobante electrónico
      const comprobante = await tx.comprobanteElectronico.create({
        data: {
          preFacturaId: preFactura.id,
          empresaId: preFactura.empresaId,
          sedeId: sede.id,
          tipoComprobanteId: tipoFactura.id,
          serieDocId: serieFactura.id,
          numeroSerie: numSerie,
          numeroCorrelativo: nuevoCorrelativo,
          numeroCompleto: numeroCompleto,
          fechaEmision: datosFactura.fechaEmision
            ? new Date(datosFactura.fechaEmision)
            : new Date(),
          horaEmision: new Date().toTimeString().split(" ")[0],
          fechaVencimiento: preFactura.fechaVencimiento,
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoClienteId: preFactura.cliente.tipoDocumentoId,
          numeroDocumentoCliente: preFactura.cliente.numeroDocumento,
          razonSocialCliente: preFactura.cliente.razonSocial,
          direccionCliente: preFactura.cliente.direccion || "",
          emailCliente: preFactura.cliente.email,
          monedaId: preFactura.monedaId,
          tipoCambio: preFactura.tipoCambio,
          formaPagoId: preFactura.formaPagoId,
          estadoOSEId: estadoOSE.id,
          estadoSUNATId: estadoSUNAT.id,
          observaciones: datosFactura.observaciones || preFactura.observaciones,
          creadoPor: datosFactura.creadoPor,
        },
      });

      // 6.4. Crear detalles del comprobante
      for (const detalle of preFactura.detalles) {
        await tx.detalleComprobante.create({
          data: {
            comprobanteElectronicoId: comprobante.id,
            productoId: detalle.productoId,
            descripcion: detalle.producto?.nombre || "",
            cantidad: detalle.cantidad,
            unidadMedida: detalle.producto?.unidadMedida?.codigo || "NIU",
            precioUnitario: detalle.precioUnitario || 0,
            valorVenta:
              Number(detalle.cantidad) * Number(detalle.precioUnitario || 0),
          },
        });
      }

      // 6.5. Actualizar PreFactura
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          tipoDocumentoFinalId: tipoFactura.id,
          serieDocFinalId: serieFactura.id,
          numeroDocumentoFinal: numeroCompleto,
          numSerieDocFinal: numSerie,
          numCorreDocFinal: numCorre,
          facturado: true,
          fechaFacturacion: new Date(),
        },
      });

      // 6.6. Retornar comprobante creado
      return await tx.comprobanteElectronico.findUnique({
        where: { id: comprobante.id },
        include: {
          preFactura: true,
          empresa: true,
          entidadComercial: true,
          moneda: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Genera una Boleta Electrónica desde una PreFactura
 */
const generarBoletaDesdePreFactura = async (preFacturaId, datosBoleta = {}) => {
  try {
    // 1. Obtener PreFactura con detalles
    const preFactura = await prisma.preFactura.findUnique({
      where: { id: preFacturaId },
      include: {
        empresa: true,
        cliente: true,
        moneda: true,
        formaPago: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!preFactura) {
      throw new NotFoundError("PreFactura no encontrada");
    }

    if (preFactura.facturado) {
      throw new ConflictError("Esta PreFactura ya fue facturada");
    }

    if (!preFactura.detalles || preFactura.detalles.length === 0) {
      throw new ValidationError(
        "La PreFactura debe tener detalles para generar boleta",
      );
    }

    // 2. Obtener tipo documento Boleta (código 03)
    const tipoBoleta = await prisma.tipoDocumento.findFirst({
      where: { codigo: "03" },
    });

    if (!tipoBoleta) {
      throw new ValidationError(
        "No se encontró el tipo de documento Boleta (código 03)",
      );
    }

    // 3. Obtener serie para boletas
    const serieBoleta = datosBoleta.serieDocId
      ? await prisma.serieDoc.findUnique({
          where: { id: BigInt(datosBoleta.serieDocId) },
        })
      : await prisma.serieDoc.findFirst({
          where: {
            empresaId: preFactura.empresaId,
            tipoDocumentoId: tipoBoleta.id,
            activo: true,
          },
        });

    if (!serieBoleta) {
      throw new ValidationError("No se encontró una serie activa para Boletas");
    }

    // 4. Obtener sede
    const sede = await prisma.sedesEmpresa.findFirst({
      where: {
        empresaId: preFactura.empresaId,
        activo: true,
      },
    });

    if (!sede) {
      throw new ValidationError(
        "No se encontró una sede activa para la empresa",
      );
    }

    // 5. Obtener estados
    const estadoOSE = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: "OSE_PENDIENTE", modulo: "COMPROBANTES_ELECTRONICOS" },
    });

    const estadoSUNAT = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: "SUNAT_ACTIVO", modulo: "COMPROBANTES_ELECTRONICOS" },
    });

    if (!estadoOSE || !estadoSUNAT) {
      throw new ValidationError(
        "No se encontraron los estados necesarios para comprobantes",
      );
    }

    // 6. Crear comprobante en transacción
    return await prisma.$transaction(async (tx) => {
      // 6.1. Calcular correlativo
      const nuevoCorrelativo = Number(serieBoleta.correlativo) + 1;
      const numSerie = String(serieBoleta.serie).padStart(
        serieBoleta.numCerosIzqSerie,
        "0",
      );
      const numCorre = String(nuevoCorrelativo).padStart(
        serieBoleta.numCerosIzqCorre,
        "0",
      );
      const numeroCompleto = `${numSerie}-${numCorre}`;

      // 6.2. Actualizar correlativo
      await tx.serieDoc.update({
        where: { id: serieBoleta.id },
        data: { correlativo: BigInt(nuevoCorrelativo) },
      });

      // 6.3. Crear comprobante electrónico
      const comprobante = await tx.comprobanteElectronico.create({
        data: {
          preFacturaId: preFactura.id,
          empresaId: preFactura.empresaId,
          sedeId: sede.id,
          tipoComprobanteId: tipoBoleta.id,
          serieDocId: serieBoleta.id,
          numeroSerie: numSerie,
          numeroCorrelativo: nuevoCorrelativo,
          numeroCompleto: numeroCompleto,
          fechaEmision: datosBoleta.fechaEmision
            ? new Date(datosBoleta.fechaEmision)
            : new Date(),
          horaEmision: new Date().toTimeString().split(" ")[0],
          fechaVencimiento: preFactura.fechaVencimiento,
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoClienteId: preFactura.cliente.tipoDocumentoId,
          numeroDocumentoCliente: preFactura.cliente.numeroDocumento,
          razonSocialCliente: preFactura.cliente.razonSocial,
          direccionCliente: preFactura.cliente.direccion || "",
          emailCliente: preFactura.cliente.email,
          monedaId: preFactura.monedaId,
          tipoCambio: preFactura.tipoCambio,
          formaPagoId: preFactura.formaPagoId,
          estadoOSEId: estadoOSE.id,
          estadoSUNATId: estadoSUNAT.id,
          observaciones: datosBoleta.observaciones || preFactura.observaciones,
          creadoPor: datosBoleta.creadoPor,
        },
      });

      // 6.4. Crear detalles del comprobante
      for (const detalle of preFactura.detalles) {
        await tx.detalleComprobante.create({
          data: {
            comprobanteElectronicoId: comprobante.id,
            productoId: detalle.productoId,
            descripcion: detalle.producto?.nombre || "",
            cantidad: detalle.cantidad,
            unidadMedida: detalle.producto?.unidadMedida?.codigo || "NIU",
            precioUnitario: detalle.precioUnitario || 0,
            valorVenta:
              Number(detalle.cantidad) * Number(detalle.precioUnitario || 0),
          },
        });
      }

      // 6.5. Actualizar PreFactura
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          tipoDocumentoFinalId: tipoBoleta.id,
          serieDocFinalId: serieBoleta.id,
          numeroDocumentoFinal: numeroCompleto,
          numSerieDocFinal: numSerie,
          numCorreDocFinal: numCorre,
          facturado: true,
          fechaFacturacion: new Date(),
        },
      });

      // 6.6. Retornar comprobante creado
      return await tx.comprobanteElectronico.findUnique({
        where: { id: comprobante.id },
        include: {
          preFactura: true,
          empresa: true,
          entidadComercial: true,
          moneda: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Particionar PreFactura: Clona una PreFactura APROBADA en DOS copias idénticas
 * Ambas copias tendrán estado PENDIENTE (45) para poder ser editadas
 * Conserva todos los IDs de referencia y clona cabecera + detalles
 */
const partirPreFactura = async (id) => {
  return await prisma.$transaction(async (prisma) => {
    try {
      // 1. Obtener PreFactura original con todos sus detalles
      const preFacturaOriginal = await prisma.preFactura.findUnique({
        where: { id },
        include: {
          detalles: true,
        },
      });

      if (!preFacturaOriginal) {
        throw new NotFoundError("PreFactura no encontrada.");
      }

      // 2. Validar que NO haya sido particionada previamente
      if (preFacturaOriginal.esParticionada) {
        throw new ValidationError("Esta PreFactura ya fue particionada anteriormente. No se puede particionar nuevamente.");
      }

      // 3. Validar que esté APROBADA (estado 46)
      if (!preFacturaOriginal.estadoId || Number(preFacturaOriginal.estadoId) !== 46) {
        throw new ValidationError(`Solo se pueden particionar PreFacturas APROBADAS (estado 46). Estado actual: ${preFacturaOriginal.estadoId}`);
      }

      // 3. Marcar la original como PARTICIONADA (estado 48)
      await prisma.preFactura.update({
        where: { id },
        data: {
          estadoId: BigInt(48),
          esParticionada: true,
        },
      });

      // 4. Preparar datos base para clonación (excluir solo campos UNIQUE y autogenerados)
      // UNIQUE: codigo, numeroDocumento, numSerieDoc, numCorreDoc
      // AUTOGENERADOS: id, detalles, fechaCreacion, fechaActualizacion
      const { id: _, detalles, codigo, numeroDocumento, numSerieDoc, numCorreDoc, 
              fechaCreacion, fechaActualizacion, ...datosBase } = preFacturaOriginal;

      // 5. Generar códigos únicos para ambas copias ANTES de crearlas
      const año = new Date().getFullYear();
      const ultimaPreFactura = await prisma.preFactura.findFirst({
        where: {
          empresaId: preFacturaOriginal.empresaId,
          codigo: {
            startsWith: `PF-${año}-`,
          },
        },
        orderBy: { id: "desc" },
      });

      let correlativoBase = 1;
      if (ultimaPreFactura) {
        const partes = ultimaPreFactura.codigo.split("-");
        correlativoBase = parseInt(partes[2]) + 1;
      }

      const codigoCopia1 = `PF-${año}-${String(correlativoBase).padStart(6, "0")}`;
      const codigoCopia2 = `PF-${año}-${String(correlativoBase + 1).padStart(6, "0")}`;

      // 6. Crear COPIA 1 - Idéntica a la original, solo cambia codigo y numeración
      
      // Obtener serie y generar nuevo correlativo para COPIA 1
      const serieCopia1 = await prisma.serieDoc.findUnique({
        where: { id: preFacturaOriginal.serieDocId },
      });
      
      const nuevoCorrelativoCopia1 = Number(serieCopia1.correlativo) + 1;
      const numSerieCopia1 = String(serieCopia1.serie).padStart(serieCopia1.numCerosIzqSerie, "0");
      const numCorreCopia1 = String(nuevoCorrelativoCopia1).padStart(serieCopia1.numCerosIzqCorre, "0");
      const numeroDocumentoCopia1 = `${numSerieCopia1}-${numCorreCopia1}`;
      
      // Actualizar correlativo en SerieDoc
      await prisma.serieDoc.update({
        where: { id: preFacturaOriginal.serieDocId },
        data: { correlativo: BigInt(nuevoCorrelativoCopia1) },
      });
      
      const dataCopia1 = {
        ...datosBase,
        codigo: codigoCopia1,
        numeroDocumento: numeroDocumentoCopia1,
        numSerieDoc: numSerieCopia1,
        numCorreDoc: numCorreCopia1,
        estadoId: BigInt(45),
        esParticionada: false,
        preFacturaOrigenId: preFacturaOriginal.id,
      };
      
      const copia1 = await prisma.preFactura.create({
        data: dataCopia1,
      });

      // 7. Crear COPIA 2 - Idéntica a la original, solo cambia codigo y numeración
      
      // Obtener serie actualizada y generar nuevo correlativo para COPIA 2
      const serieCopia2 = await prisma.serieDoc.findUnique({
        where: { id: preFacturaOriginal.serieDocId },
      });
      
      const nuevoCorrelativoCopia2 = Number(serieCopia2.correlativo) + 1;
      const numSerieCopia2 = String(serieCopia2.serie).padStart(serieCopia2.numCerosIzqSerie, "0");
      const numCorreCopia2 = String(nuevoCorrelativoCopia2).padStart(serieCopia2.numCerosIzqCorre, "0");
      const numeroDocumentoCopia2 = `${numSerieCopia2}-${numCorreCopia2}`;
      
      // Actualizar correlativo en SerieDoc
      await prisma.serieDoc.update({
        where: { id: preFacturaOriginal.serieDocId },
        data: { correlativo: BigInt(nuevoCorrelativoCopia2) },
      });
      
      const copia2 = await prisma.preFactura.create({
        data: {
          ...datosBase,
          codigo: codigoCopia2,
          numeroDocumento: numeroDocumentoCopia2,
          numSerieDoc: numSerieCopia2,
          numCorreDoc: numCorreCopia2,
          estadoId: BigInt(45),
          esParticionada: false,
          preFacturaOrigenId: preFacturaOriginal.id,
        },
      });

      // 7. Clonar detalles para COPIA 1
      for (const detalle of detalles) {
        const { id: _, preFacturaId, ...datosDetalle } = detalle;
        await prisma.detallePreFactura.create({
          data: {
            ...datosDetalle,
            preFacturaId: copia1.id,
          },
        });
      }

      // 8. Clonar detalles para COPIA 2
      for (const detalle of detalles) {
        const { id: _, preFacturaId, ...datosDetalle } = detalle;
        await prisma.detallePreFactura.create({
          data: {
            ...datosDetalle,
            preFacturaId: copia2.id,
          },
        });
      }

      return {
        original: preFacturaOriginal,
        copia1,
        copia2,
        mensaje: `PreFactura ${preFacturaOriginal.codigo} particionada exitosamente. Copias creadas: ${codigoCopia1} y ${codigoCopia2} (Estado: PENDIENTE)`,
      };
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
      if (err.code && err.code.startsWith("P")) throw new DatabaseError("Error de base de datos", err.message);
      throw err;
    }
  });
};

/**
 * Facturar PreFactura Blanca (SUNAT) - Caso 2: Comprobante Electrónico
 * Genera CuentaPorCobrar CON comprobante electrónico SUNAT
 */
const facturarPreFacturaBlanca = async (preFacturaId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener PreFactura con todas las relaciones necesarias
      const preFactura = await tx.preFactura.findUnique({
        where: { id: preFacturaId },
        include: {
          cliente: true,
          moneda: true,
          detalles: {
            include: {
              producto: true, // Necesario para analizar detracción
            },
          },
          empresa: true,
          serieDoc: true,
          tipoDocumento: true,
        },
      });

      if (!preFactura) {
        throw new NotFoundError("PreFactura no encontrada");
      }

      // Validar que esté APROBADA (estado 46)
      if (Number(preFactura.estadoId) !== 46) {
        throw new ValidationError(
          "Solo se pueden facturar PreFacturas APROBADAS",
        );
      }

      // Validar que NO sea GERENCIAL
      if (preFactura.esGerencial) {
        throw new ValidationError(
          "Las PreFacturas GERENCIALES deben usar 'Generar Venta' (CxC Negra)",
        );
      }

      // 2. Buscar estado PENDIENTE DE PAGO para CxC (ID 100)
      const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
        where: {
          tipoProvieneDeId: BigInt(24), // Tipo Proviene: CUENTAS POR COBRAR
          descripcion: { contains: "PENDIENTE", mode: "insensitive" },
        },
      });

      if (!estadoPendiente) {
        throw new ValidationError(
          "No se encontró el estado PENDIENTE para CuentaPorCobrar",
        );
      }

      // 3. Crear ComprobanteElectronico (pendiente de emisión a SUNAT)
      const ahora = new Date();
      const horaEmision = ahora.toTimeString().split(' ')[0]; // HH:MM:SS
      
      const comprobanteElectronico = await tx.comprobanteElectronico.create({
        data: {
          // Origen
          preFacturaId: preFactura.id,
          
          // Empresa y sede
          empresaId: preFactura.empresaId,
          sedeId: preFactura.empresa.sedeId || BigInt(1), // Usar sede de empresa o default
          
          // Tipo y serie SUNAT
          tipoComprobanteId: preFactura.tipoDocumentoId,
          serieDocId: preFactura.serieDocId,
          numeroSerie: preFactura.numSerieDoc || preFactura.serieDoc?.serie || '001',
          numeroCorrelativo: Number(preFactura.numCorreDoc) || 1,
          numeroCompleto: preFactura.numeroDocumento,
          
          // Fechas
          fechaEmision: ahora,
          horaEmision: horaEmision,
          fechaVencimiento: preFactura.fechaVencimiento,
          
          // Cliente
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoClienteId: preFactura.cliente.tipoDocumentoId || BigInt(6), // Default RUC
          numeroDocumentoCliente: preFactura.cliente.numeroDocumento || '',
          razonSocialCliente: preFactura.cliente.razonSocial || '',
          direccionCliente: preFactura.cliente.direccion || 'Sin dirección',
          emailCliente: preFactura.cliente.email,
          
          // Moneda
          monedaId: preFactura.monedaId,
          tipoCambio: preFactura.tipoCambio || 1.0,
          
          // Condiciones de pago
          formaPagoId: preFactura.formaPagoId || BigInt(1), // Default contado
          montoPendientePago: preFactura.total,
          
          // Estados
          estadoOSEId: BigInt(50), // PENDIENTE
          estadoSUNATId: BigInt(60), // ACTIVO
          
          // Observaciones
          observaciones: `Comprobante generado desde PreFactura ${preFactura.codigo}`,
        },
      });

      // 5. ANALIZAR DETRACCIÓN, RETENCIÓN Y PERCEPCIÓN (REGLAS SUNAT)
      
      // 5.1 Analizar DETRACCIÓN (basado en productos y monto mínimo)
      let tieneDetraccion = false;
      let porcentajeDetraccion = null;
      let montoDetraccion = 0;
      
      // Verificar si algún producto está sujeto a detracción
      for (const detalle of preFactura.detalles) {
        if (detalle.producto?.sujetoDetraccion && detalle.producto?.porcentajeDetraccion) {
          tieneDetraccion = true;
          // Usar el porcentaje del primer producto sujeto a detracción
          if (!porcentajeDetraccion) {
            porcentajeDetraccion = Number(detalle.producto.porcentajeDetraccion);
          }
        }
      }
      
      // Calcular monto de detracción si aplica Y monto >= montoMinimoDetraccion
      const montoMinimoDetraccion = Number(preFactura.empresa.montoMinimoDetraccion) || 700; // Default S/ 700
      
      if (tieneDetraccion && porcentajeDetraccion && Number(preFactura.total) >= montoMinimoDetraccion) {
        montoDetraccion = Number(preFactura.total) * (porcentajeDetraccion / 100);
      } else if (tieneDetraccion && Number(preFactura.total) < montoMinimoDetraccion) {
        // Si el monto es menor al mínimo configurado, no aplica detracción
        tieneDetraccion = false;
        porcentajeDetraccion = null;
      }
      
      // 5.2 Analizar RETENCIÓN (basado en cliente) - SOLO SI NO HAY DETRACCIÓN
      // REGLA: Detracción + Retención = Solo Detracción (prioridad)
      let tieneRetencion = false;
      let montoRetencion = 0;
      
      if (!tieneDetraccion) {
        // Solo aplica retención si NO hay detracción
        if (preFactura.cliente.esAgenteRetencion) {
          tieneRetencion = true;
          const porcentajeRetencion = 3; // Retención estándar 3% del IGV
          // Calcular sobre el IGV (no sobre el total)
          const montoIGV = Number(preFactura.totalIGV) || 0;
          montoRetencion = montoIGV * (porcentajeRetencion / 100);
        }
      }
      
      // 5.3 Analizar PERCEPCIÓN (basado en cliente y empresa) - INDEPENDIENTE
      // REGLA: Percepción puede coexistir con Detracción o Retención
      let tienePercepcion = false;
      let porcentajePercepcion = null;
      let montoPercepcion = 0;
      
      // Si el cliente está sujeto a percepción y la empresa es agente de percepción
      if (preFactura.cliente.sujetoPercepcion && preFactura.empresa.soyAgentePercepcion) {
        tienePercepcion = true;
        porcentajePercepcion = 2; // Percepción estándar 2%
        montoPercepcion = Number(preFactura.total) * (porcentajePercepcion / 100);
      }
      
      // 6. Crear CuentaPorCobrar BLANCA (con comprobante SUNAT)
      const cuentaPorCobrar = await tx.cuentaPorCobrar.create({
        data: {
          // ORIGEN DEL DOCUMENTO
          preFacturaId: preFactura.id,
          empresaId: preFactura.empresaId,
          clienteId: preFactura.clienteId,
          
          // DOCUMENTO
          numeroPreFactura: preFactura.codigo,
          fechaEmision: new Date(),
          fechaVencimiento: preFactura.fechaVencimiento || new Date(),
          
          // MONTOS ALMACENADOS
          montoTotal: preFactura.total,
          montoPagado: 0,
          saldoPendiente: preFactura.total,
          
          // DETRACCIÓN SPOT (SUNAT PERÚ) - CALCULADO
          tieneDetraccion,
          montoDetraccion,
          porcentajeDetraccion,
          numeroConstanciaDetraccion: null,
          fechaDetraccion: null,
          
          // RETENCIÓN (SUNAT PERÚ) - CALCULADO
          tieneRetencion,
          montoRetencion,
          numeroComprobanteRetencion: null,
          fechaRetencion: null,
          
          // PERCEPCIÓN (SUNAT PERÚ) - CALCULADO
          tienePercepcion,
          montoPercepcion,
          porcentajePercepcion,
          numeroComprobantePercepcion: null,
          fechaPercepcion: null,
          
          // FLAGS ESPECIALES
          esSaldoInicial: false,
          esGerencial: false, // BLANCA (Formal/SUNAT)
          comprobanteElectronicoId: comprobanteElectronico.id, // Tiene comprobante SUNAT
          
          // MONEDA Y TIPO DE VENTA
          monedaId: preFactura.monedaId,
          esContado: preFactura.esContado || false,
          estadoId: estadoPendiente.id,
          observaciones: `CxC Blanca generada desde PreFactura ${preFactura.codigo}`,
          
          // INTEGRACIÓN CONTABLE
          asientoContableId: null,
        },
      });

      // 7. Actualizar PreFactura a EMITIDA (estado 96)
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          facturado: true,
          fechaFacturacion: new Date(),
          estadoId: BigInt(96), // Estado EMITIDA
        },
      });

      return {
        preFactura,
        cuentaPorCobrar,
        comprobanteElectronico,
      };
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Facturar PreFactura Negra (Gerencial) - Caso 1: 100% Negro
 * Genera CuentaPorCobrar sin comprobante electrónico
 */
const facturarPreFacturaNegra = async (preFacturaId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener PreFactura con todas las relaciones necesarias
      const preFactura = await tx.preFactura.findUnique({
        where: { id: preFacturaId },
        include: {
          cliente: true,
          moneda: true,
          detalles: {
            include: {
              producto: true, // Necesario para analizar detracción
            },
          },
          empresa: true,
        },
      });

      if (!preFactura) {
        throw new NotFoundError("PreFactura no encontrada");
      }

      // Validar que esté APROBADA (estado 46)
      if (Number(preFactura.estadoId) !== 46) {
        throw new ValidationError(
          "Solo se pueden facturar PreFacturas APROBADAS",
        );
      }

      // Validar que sea GERENCIAL
      if (!preFactura.esGerencial) {
        throw new ValidationError(
          "Solo se pueden facturar como NEGRA las PreFacturas GERENCIALES",
        );
      }

      // 2. Buscar estado PENDIENTE DE PAGO para CxC (ID 100)
      const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
        where: {
          tipoProvieneDeId: BigInt(24), // Tipo Proviene: CUENTAS POR COBRAR
          descripcion: { contains: "PENDIENTE", mode: "insensitive" },
        },
      });

      if (!estadoPendiente) {
        throw new ValidationError(
          "No se encontró el estado PENDIENTE para CuentaPorCobrar",
        );
      }

      // 3. ANALIZAR DETRACCIÓN, RETENCIÓN Y PERCEPCIÓN (REGLAS SUNAT)
      
      // 3.1 Analizar DETRACCIÓN (basado en productos y monto mínimo)
      let tieneDetraccion = false;
      let porcentajeDetraccion = null;
      let montoDetraccion = 0;
      
      // Verificar si algún producto está sujeto a detracción
      for (const detalle of preFactura.detalles) {
        if (detalle.producto?.sujetoDetraccion && detalle.producto?.porcentajeDetraccion) {
          tieneDetraccion = true;
          // Usar el porcentaje del primer producto sujeto a detracción
          if (!porcentajeDetraccion) {
            porcentajeDetraccion = Number(detalle.producto.porcentajeDetraccion);
          }
        }
      }
      
      // Calcular monto de detracción si aplica Y monto >= montoMinimoDetraccion
      const montoMinimoDetraccion = Number(preFactura.empresa.montoMinimoDetraccion) || 700; // Default S/ 700
      
      if (tieneDetraccion && porcentajeDetraccion && Number(preFactura.total) >= montoMinimoDetraccion) {
        montoDetraccion = Number(preFactura.total) * (porcentajeDetraccion / 100);
      } else if (tieneDetraccion && Number(preFactura.total) < montoMinimoDetraccion) {
        // Si el monto es menor al mínimo configurado, no aplica detracción
        tieneDetraccion = false;
        porcentajeDetraccion = null;
      }
      
      // 3.2 Analizar RETENCIÓN (basado en cliente) - SOLO SI NO HAY DETRACCIÓN
      // REGLA: Detracción + Retención = Solo Detracción (prioridad)
      let tieneRetencion = false;
      let montoRetencion = 0;
      
      if (!tieneDetraccion) {
        // Solo aplica retención si NO hay detracción
        if (preFactura.cliente.esAgenteRetencion) {
          tieneRetencion = true;
          const porcentajeRetencion = 3; // Retención estándar 3% del IGV
          // Calcular sobre el IGV (no sobre el total)
          const montoIGV = Number(preFactura.totalIGV) || 0;
          montoRetencion = montoIGV * (porcentajeRetencion / 100);
        }
      }
      
      // 3.3 Analizar PERCEPCIÓN (basado en cliente y empresa) - INDEPENDIENTE
      // REGLA: Percepción puede coexistir con Detracción o Retención
      let tienePercepcion = false;
      let porcentajePercepcion = null;
      let montoPercepcion = 0;
      
      // Si el cliente está sujeto a percepción y la empresa es agente de percepción
      if (preFactura.cliente.sujetoPercepcion && preFactura.empresa.soyAgentePercepcion) {
        tienePercepcion = true;
        porcentajePercepcion = 2; // Percepción estándar 2%
        montoPercepcion = Number(preFactura.total) * (porcentajePercepcion / 100);
      }
      
      // 4. Crear CuentaPorCobrar NEGRA (Gerencial)
      const cuentaPorCobrar = await tx.cuentaPorCobrar.create({
        data: {
          // ORIGEN DEL DOCUMENTO
          preFacturaId: preFactura.id,
          empresaId: preFactura.empresaId,
          clienteId: preFactura.clienteId,
          
          // DOCUMENTO
          numeroPreFactura: preFactura.codigo,
          fechaEmision: new Date(),
          fechaVencimiento: preFactura.fechaVencimiento || new Date(),
          
          // MONTOS ALMACENADOS
          montoTotal: preFactura.total,
          montoPagado: 0,
          saldoPendiente: preFactura.total,
          
          // DETRACCIÓN SPOT (SUNAT PERÚ) - CALCULADO
          tieneDetraccion,
          montoDetraccion,
          porcentajeDetraccion,
          numeroConstanciaDetraccion: null,
          fechaDetraccion: null,
          
          // RETENCIÓN (SUNAT PERÚ) - CALCULADO
          tieneRetencion,
          montoRetencion,
          numeroComprobanteRetencion: null,
          fechaRetencion: null,
          
          // PERCEPCIÓN (SUNAT PERÚ) - CALCULADO
          tienePercepcion,
          montoPercepcion,
          porcentajePercepcion,
          numeroComprobantePercepcion: null,
          fechaPercepcion: null,
          
          // FLAGS ESPECIALES
          esSaldoInicial: false,
          esGerencial: true, // NEGRA (Gerencial/No SUNAT)
          comprobanteElectronicoId: null, // No tiene comprobante electrónico
          
          // MONEDA Y TIPO DE VENTA
          monedaId: preFactura.monedaId,
          esContado: preFactura.esContado || false,
          estadoId: estadoPendiente.id,
          observaciones: `CxC Negra generada desde PreFactura ${preFactura.codigo}`,
          
          // INTEGRACIÓN CONTABLE
          asientoContableId: null,
        },
      });

      // 5. Actualizar PreFactura a FACTURADA (estado 95)
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          facturado: true,
          fechaFacturacion: new Date(),
          estadoId: BigInt(95), // Estado FACTURADA
        },
      });

      return {
        preFactura,
        cuentaPorCobrar,
      };
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};
/**
 * Anular una PreFactura
 * Si tiene movimiento de almacén asociado, lo elimina
 */
const anular = async (id) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // 1. Obtener la PreFactura
      const preFactura = await tx.preFactura.findUnique({
        where: { id },
        include: { detalles: true },
      });

      if (!preFactura) throw new NotFoundError("PreFactura no encontrada");

      // Verificar si ya está anulada (estadoId 40 = ANULADO)
      if (Number(preFactura.estadoId) === 40) {
        throw new ValidationError("La PreFactura ya está anulada");
      }

      // 2. Si tiene movimiento de almacén, eliminarlo
      if (preFactura.movSalidaAlmacenId) {
        const { default: eliminarMovimientoAlmacenService } =
          await import("../Almacen/eliminarMovimientoAlmacen.service.js");

        await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
          preFactura.movSalidaAlmacenId,
          tx,
        );
      }

      // 3. Actualizar PreFactura a estado ANULADO
      const anulada = await tx.preFactura.update({
        where: { id },
        data: {
          estadoId: BigInt(40), // ANULADO
          movSalidaAlmacenId: null,
          fechaActualizacion: new Date(),
        },
        include: {
          empresa: true,
          cliente: true,
          tipoDocumento: true,
          moneda: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      return anulada;
    } catch (err) {
      if (
        err instanceof NotFoundError ||
        err instanceof ValidationError ||
        err instanceof ConflictError
      )
        throw err;
      if (err.code && err.code.startsWith("P"))
        throw new DatabaseError("Error de base de datos", err.message);
      throw err;
    }
  });
};

/**
 * Aprobar PreFactura
 * Cambia el estado de PENDIENTE a APROBADA
 * Registra fecha de aprobación
 */
const aprobar = async (id) => {
  return await prisma.$transaction(async (prisma) => {
    try {
      // Verificar que la PreFactura existe
      const preFactura = await prisma.preFactura.findUnique({
        where: { id },
        include: {
          detalles: true,
        },
      });

      if (!preFactura) {
        throw new NotFoundError("PreFactura no encontrada.");
      }

      // Verificar que tiene al menos un detalle
      if (!preFactura.detalles || preFactura.detalles.length === 0) {
        throw new ValidationError(
          "La PreFactura debe tener al menos un detalle para ser aprobada.",
        );
      }

      // Verificar que el estado actual es PENDIENTE (tipoProvieneDeId = 9, estado <= 45)
      // Según tu filtro, estados > 45 son aprobados
      if (!preFactura.estadoId || Number(preFactura.estadoId) !== 45) {
        throw new ValidationError(
          "La PreFactura solo puede ser aprobada si está en estado PENDIENTE (id=45).",
        );
      }
      // Buscar el estado APROBADO (tipoProvieneDeId = 9, y estado > 45)
      // Asumiendo que el primer estado > 45 es APROBADO
      // Buscar el estado APROBADO (id = 46)
      const estadoAprobado = await prisma.estadoMultiFuncion.findUnique({
        where: { id: 46n }, // BigInt literal
      });

      if (!estadoAprobado) {
        throw new ValidationError(
          "No se encontró el estado APROBADO (id=46) para PreFacturas.",
        );
      }

      // Actualizar PreFactura a estado APROBADO
      const aprobada = await prisma.preFactura.update({
        where: { id },
        data: {
          estadoId: BigInt(46),
          fechaAprobacion: new Date(),
          fechaActualizacion: new Date(),
        },
        include: {
          empresa: true,
          cliente: true,
          tipoDocumento: true,
          moneda: true,
          incoterm: true,
        },
      });

      return aprobada;
    } catch (err) {
      if (
        err instanceof NotFoundError ||
        err instanceof ValidationError ||
        err instanceof ConflictError
      )
        throw err;
      if (err.code && err.code.startsWith("P"))
        throw new DatabaseError("Error de base de datos", err.message);
      throw err;
    }
  });
};

export default {
  listar,
  obtenerPorId,
  obtenerPorCliente,
  obtenerPorCotizacion,
  crear,
  actualizar,
  eliminar,
  generarFacturaDesdePreFactura,
  generarBoletaDesdePreFactura,
  partirPreFactura,
  facturarPreFacturaNegra,
  facturarPreFacturaBlanca,
  anular,
  aprobar,
};
