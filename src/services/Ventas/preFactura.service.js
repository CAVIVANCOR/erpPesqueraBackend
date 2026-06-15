import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { validarTipoCambio } from "../../utils/tipoCambio.util.js";
import crearMovimientoAlmacenService from "../Almacen/crearMovimientoAlmacen.service.js";

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
        periodoContable: true, // ✅ AGREGADO
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
        periodoContable: true, // ✅ AGREGADO
        movSalidaAlmacen: true,
        contratoServicio: true,
        tipoDocumentoFinal: true,
        serieDocFinal: true,
        asientosContables: {
          include: {
            detalles: {
              include: {
                planCuenta: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { fechaAsiento: "desc" },
        },
        comprobantesElectronicos: {
          include: {
            tipoComprobante: true,
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
        periodoContable: true, // ✅ AGREGADO
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
        periodoContable: true, // ✅ AGREGADO
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
        where: { id: Number(data.serieDocId) },
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
        where: { id: Number(data.serieDocId) },
        data: { correlativo: Number(nuevoCorrelativo) },
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
        fechaContable: data.fechaContable,
        periodoContableId: data.periodoContableId, // ✅ AGREGADO - Campo obligatorio para contabilidad
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
        unidadNegocioId: data.unidadNegocioId,
        contratoServicioId: data.contratoServicioId,
        movSalidaAlmacenId: data.movSalidaAlmacenId,
        fechaCreacion: data.fechaCreacion || new Date(),
        fechaActualizacion: data.fechaActualizacion || new Date(),
        creadoPor: data.creadoPor,
        actualizadoPor: data.actualizadoPor,
        nroLiquidacionFacturacion:
          data.nroLiquidacionFacturacion?.trim() || null,
      };

      // 11. Limpiar campos undefined antes de crear (Prisma strict mode)
      const datosLimpiosSinUndefined = Object.fromEntries(
        Object.entries(datosLimpios).filter(([_, v]) => v !== undefined),
      );

      // 12. Crear la pre-factura con los números generados (patrón estándar)
      const preFacturaCreada = await tx.preFactura.create({
        data: datosLimpiosSinUndefined,
        include: {
          empresa: true,
          cliente: true,
          tipoDocumento: true,
          serieDoc: true,
          moneda: true,
          formaPago: true,
          incoterm: true,
          periodoContable: true, // ✅ AGREGADO - Consistencia con obtenerPorId
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
      "unidadNegocioId",
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
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion:
        data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
      // ⭐ PRESERVAR nroLiquidacionFacturacion si no viene en data
      nroLiquidacionFacturacion: data.hasOwnProperty('nroLiquidacionFacturacion')
        ? (data.nroLiquidacionFacturacion?.trim() || null)
        : existente.nroLiquidacionFacturacion,
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

/**
 * ============================================================================
 * ELIMINAR PRE-FACTURA COMPLETO (SOLO SUPERUSUARIO)
 * ============================================================================
 * 
 * Elimina una PreFactura y TODOS sus registros relacionados en cascada:
 * - Pagos de Cuenta por Cobrar
 * - Cuenta por Cobrar
 * - Movimiento de Almacén (con kardex y regeneración de saldos)
 * - Detalles de PreFactura
 * - PreFactura
 * 
 * PATRÓN: Basado en eliminarMovimientoAlmacen.service.js y anular()
 * 
 * @param {BigInt} id - ID de la PreFactura a eliminar
 * @param {BigInt} usuarioId - ID del usuario que ejecuta
 * @param {PrismaTransaction} transaccion - Transacción opcional (para uso interno)
 * @returns {Promise<Object>} Resultado con contadores detallados
 */
const eliminar = async (id, usuarioId, transaccion = null) => {
  console.log("🔵 [SERVICE] eliminar - INICIO", { id, usuarioId, transaccion: !!transaccion });

  try {
    const ejecutarEnTransaccion = async (tx) => {
      console.log("🔵 [SERVICE] Dentro de transacción");

      // ========================================
      // PASO 1: VALIDACIONES PREVIAS
      // ========================================

      if (!id) {
        console.log("🔵 [SERVICE] ERROR: ID vacío");
        throw new ValidationError("El ID de la PreFactura es obligatorio");
      }

      if (!usuarioId) {
        console.log("🔵 [SERVICE] ERROR: usuarioId vacío");
        throw new ValidationError("El ID del usuario es obligatorio");
      }

      console.log("🔵 [SERVICE] Buscando usuario...", { usuarioId });
      // Validar que el usuario es SuperUsuario
      const usuario = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { esSuperUsuario: true },
      });

      console.log("🔵 [SERVICE] Usuario encontrado:", usuario);

      if (!usuario?.esSuperUsuario) {
        console.log("🔵 [SERVICE] ERROR: Usuario no es SuperUsuario");
        throw new ValidationError(
          "Solo SuperUsuarios pueden eliminar PreFacturas completas"
        );
      }

      console.log("🔵 [SERVICE] Buscando PreFactura...", { id });
      // Validar que la PreFactura existe
      const preFactura = await tx.preFactura.findUnique({
        where: { id },
        include: {
          detalles: true,
        },
      });

      console.log("🔵 [SERVICE] PreFactura encontrada:", preFactura ? `ID: ${preFactura.id}` : "NO ENCONTRADA");

      if (!preFactura) {
        console.log("🔵 [SERVICE] ERROR: PreFactura no encontrada");
        throw new NotFoundError("PreFactura no encontrada");
      }
      // Inicializar contadores
      const resultados = {
        preFacturas: 0,
        detallesPreFactura: 0,
        cuentasPorCobrar: 0,
        pagos: 0,
        movimientosAlmacen: 0,
        detallesMovAlmacen: 0,
        kardexEliminados: 0,
        saldosDetRegenerados: 0,
        saldosGenRegenerados: 0,
        comprobantesElectronicos: 0,
        contratistasOT: 0,
        preFacturasHijas: 0,
      };

      console.log("🔵 [SERVICE] Contadores inicializados");

      // ========================================
      // PASO 1.5: ELIMINAR PREFACTURAS HIJAS (AUTO-REFERENCIA)
      // ========================================

      console.log("🔵 [SERVICE] PASO 1.5: Buscando PreFacturas hijas (particionadas)...");

      const preFacturasHijas = await tx.preFactura.findMany({
        where: { preFacturaOrigenId: id },
        select: { id: true },
      });

      console.log("🔵 [SERVICE] PreFacturas hijas encontradas:", preFacturasHijas.length);

      if (preFacturasHijas.length > 0) {
        // Eliminar recursivamente cada PreFactura hija
        for (const hija of preFacturasHijas) {
          console.log("🔵 [SERVICE] Eliminando PreFactura hija ID:", hija.id);
          // Llamar recursivamente con la transacción actual
          const resultadoHija = await eliminar(hija.id, usuarioId, tx);
          resultados.preFacturasHijas += resultadoHija.resultados.preFacturas;
        }
      }

      // ========================================
      // PASO 2: ELIMINAR COMPROBANTES ELECTRÓNICOS
      // ========================================

      console.log("🔵 [SERVICE] PASO 2: Eliminando Comprobantes Electrónicos...");

      const comprobantesResult = await tx.comprobanteElectronico.deleteMany({
        where: { preFacturaId: id },
      });
      resultados.comprobantesElectronicos = Number(comprobantesResult.count);
      console.log("🔵 [SERVICE] Comprobantes Electrónicos eliminados:", resultados.comprobantesElectronicos);

      // ========================================
      // PASO 3: ELIMINAR CONTRATISTAS OT
      // ========================================

      console.log("🔵 [SERVICE] PASO 3: Desvinculando Contratistas OT...");

      const contratistasResult = await tx.detContratistasOT.updateMany({
        where: { preFacturaId: id },
        data: { preFacturaId: null },
      });
      resultados.contratistasOT = Number(contratistasResult.count);
      console.log("🔵 [SERVICE] Contratistas OT desvinculados:", resultados.contratistasOT);

      // ========================================
      // PASO 4: ELIMINAR CUENTA POR COBRAR Y PAGOS
      // ========================================

      console.log("🔵 [SERVICE] PASO 4: Buscando CuentaPorCobrar...");

      const cuentaPorCobrar = await tx.cuentaPorCobrar.findFirst({
        where: { preFacturaId: id },
        include: { pagos: true },
      });

      console.log("🔵 [SERVICE] CuentaPorCobrar encontrada:", cuentaPorCobrar ? `ID: ${cuentaPorCobrar.id}, Pagos: ${cuentaPorCobrar.pagos?.length || 0}` : "NO");

      if (cuentaPorCobrar) {
        // Eliminar pagos primero (patrón: deleteMany)
        if (cuentaPorCobrar.pagos?.length > 0) {
          const pagosResult = await tx.pagoCuentaPorCobrar.deleteMany({
            where: { cuentaPorCobrarId: cuentaPorCobrar.id },
          });
          resultados.pagos = Number(pagosResult.count);
        }

        // Eliminar cuenta por cobrar
        await tx.cuentaPorCobrar.delete({
          where: { id: cuentaPorCobrar.id },
        });
        resultados.cuentasPorCobrar = 1;
      }

      // ========================================
      // PASO 5: ELIMINAR MOVIMIENTO DE ALMACÉN
      // ========================================

      console.log("🔵 [SERVICE] PASO 5: MovimientoAlmacen ID:", preFactura.movSalidaAlmacenId);

      if (preFactura.movSalidaAlmacenId) {
        console.log("🔵 [SERVICE] Importando servicio eliminarMovimientoAlmacen...");
        // Usar servicio especializado (patrón existente en anular())
        const { default: eliminarMovimientoAlmacenService } =
          await import("../Almacen/eliminarMovimientoAlmacen.service.js");

        const resultadoMov = await eliminarMovimientoAlmacenService
          .eliminarMovimientoAlmacenCompleto(
            preFactura.movSalidaAlmacenId,
            tx  // Pasar la transacción para mantener atomicidad
          );

        // Acumular contadores del servicio especializado
        resultados.movimientosAlmacen = 1;
        resultados.detallesMovAlmacen = resultadoMov.resultados.detallesEliminados;
        resultados.kardexEliminados = resultadoMov.resultados.kardexEliminados;
        resultados.saldosDetRegenerados = resultadoMov.resultados.saldosDetRegenerados;
        resultados.saldosGenRegenerados = resultadoMov.resultados.saldosGenRegenerados;
        console.log("🔵 [SERVICE] MovimientoAlmacen eliminado, resultados:", resultadoMov.resultados);
      }

      // ========================================
      // PASO 6: ELIMINAR DETALLES DE PRE-FACTURA
      // ========================================

      console.log("🔵 [SERVICE] PASO 6: Eliminando detalles PreFactura...");

      const detallesResult = await tx.detallePreFactura.deleteMany({
        where: { preFacturaId: id },
      });
      resultados.detallesPreFactura = Number(detallesResult.count);

      // ========================================
      // PASO 7: ELIMINAR PRE-FACTURA
      // ========================================

      console.log("🔵 [SERVICE] PASO 7: Eliminando PreFactura...");

      await tx.preFactura.delete({
        where: { id },
      });
      resultados.preFacturas = 1;

      // ========================================
      // PASO 6: RETORNAR RESULTADOsss
      // ========================================

      console.log("🔵 [SERVICE] PASO 6: Eliminación completada, resultados finales:", resultados);

      return {
        success: true,
        mensaje: "PreFactura eliminada exitosamente con todos sus registros relacionados",
        resultados: resultados,
      };
    };

    console.log("🔵 [SERVICE] Ejecutando transacción...");

    // Ejecutar en transacción (patrón: permitir transacción externa)
    let resultado;
    if (transaccion) {
      resultado = await ejecutarEnTransaccion(transaccion);
    } else {
      resultado = await prisma.$transaction(ejecutarEnTransaccion);
    }

    console.log("🔵 [SERVICE] Transacción completada exitosamente:", resultado);
    return resultado;

  } catch (error) {
    console.error("🔵 [SERVICE] ERROR en eliminar:", error);
    console.error("🔵 [SERVICE] error.message:", error.message);
    console.error("🔵 [SERVICE] error.stack:", error.stack);

    if (
      error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof ConflictError
    ) {
      throw error;
    }
    console.error("Error al eliminar PreFactura completa:", error);
    throw new DatabaseError(
      "Error al eliminar PreFactura: " + error.message
    );
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
        where: { id: Number(datosFactura.serieDocId) },
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
        data: { correlativo: Number(nuevoCorrelativo) },
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
        where: { id: Number(datosBoleta.serieDocId) },
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
        data: { correlativo: Number(nuevoCorrelativo) },
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
        throw new ValidationError(
          "Esta PreFactura ya fue particionada anteriormente. No se puede particionar nuevamente.",
        );
      }

      // 3. Validar que esté APROBADA (estado 46)
      if (
        !preFacturaOriginal.estadoId ||
        Number(preFacturaOriginal.estadoId) !== 46
      ) {
        throw new ValidationError(
          `Solo se pueden particionar PreFacturas APROBADAS (estado 46). Estado actual: ${preFacturaOriginal.estadoId}`,
        );
      }

      // 3. Marcar la original como PARTICIONADA (estado 48)
      await prisma.preFactura.update({
        where: { id },
        data: {
          estadoId: Number(48),
          esParticionada: true,
        },
      });

      // 4. Preparar datos base para clonación (excluir solo campos UNIQUE y autogenerados)
      // UNIQUE: codigo, numeroDocumento, numSerieDoc, numCorreDoc
      // AUTOGENERADOS: id, detalles, fechaCreacion, fechaActualizacion
      const {
        id: _,
        detalles,
        codigo,
        numeroDocumento,
        numSerieDoc,
        numCorreDoc,
        fechaCreacion,
        fechaActualizacion,
        ...datosBase
      } = preFacturaOriginal;

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
      const numSerieCopia1 = String(serieCopia1.serie).padStart(
        serieCopia1.numCerosIzqSerie,
        "0",
      );
      const numCorreCopia1 = String(nuevoCorrelativoCopia1).padStart(
        serieCopia1.numCerosIzqCorre,
        "0",
      );
      const numeroDocumentoCopia1 = `${numSerieCopia1}-${numCorreCopia1}`;

      // Actualizar correlativo en SerieDoc
      await prisma.serieDoc.update({
        where: { id: preFacturaOriginal.serieDocId },
        data: { correlativo: Number(nuevoCorrelativoCopia1) },
      });

      const dataCopia1 = {
        ...datosBase,
        codigo: codigoCopia1,
        numeroDocumento: numeroDocumentoCopia1,
        numSerieDoc: numSerieCopia1,
        numCorreDoc: numCorreCopia1,
        estadoId: Number(45),
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
      const numSerieCopia2 = String(serieCopia2.serie).padStart(
        serieCopia2.numCerosIzqSerie,
        "0",
      );
      const numCorreCopia2 = String(nuevoCorrelativoCopia2).padStart(
        serieCopia2.numCerosIzqCorre,
        "0",
      );
      const numeroDocumentoCopia2 = `${numSerieCopia2}-${numCorreCopia2}`;

      // Actualizar correlativo en SerieDoc
      await prisma.serieDoc.update({
        where: { id: preFacturaOriginal.serieDocId },
        data: { correlativo: Number(nuevoCorrelativoCopia2) },
      });

      const copia2 = await prisma.preFactura.create({
        data: {
          ...datosBase,
          codigo: codigoCopia2,
          numeroDocumento: numeroDocumentoCopia2,
          numSerieDoc: numSerieCopia2,
          numCorreDoc: numCorreCopia2,
          estadoId: Number(45),
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
      if (err instanceof NotFoundError || err instanceof ValidationError)
        throw err;
      if (err.code && err.code.startsWith("P"))
        throw new DatabaseError("Error de base de datos", err.message);
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
          periodoContable: true, // ✅ AGREGADO: Necesario para heredar periodo
        },
      });

      if (!preFactura) {
        throw new NotFoundError("PreFactura no encontrada");
      }

      // Validar que esté APROBADA (estado 46) o EMITIDA (estado 96) para regenerar
      const estadoActual = Number(preFactura.estadoId);
      if (estadoActual !== 46 && estadoActual !== 96) {
        throw new ValidationError(
          "Solo se pueden facturar PreFacturas APROBADAS o EMITIDAS",
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
          tipoProvieneDeId: Number(24), // Tipo Proviene: CUENTAS POR COBRAR
          descripcion: { contains: "PENDIENTE", mode: "insensitive" },
        },
      });

      if (!estadoPendiente) {
        throw new ValidationError(
          "No se encontró el estado PENDIENTE para CuentaPorCobrar",
        );
      }

      // ⭐ REGENERACIÓN: Eliminar CXC y ComprobanteElectronico existentes si ya fueron generados
      if (estadoActual === 96) {
        // Eliminar CuentaPorCobrar existente
        await tx.cuentaPorCobrar.deleteMany({
          where: { preFacturaId: preFacturaId },
        });

        // Eliminar ComprobanteElectronico existente
        await tx.comprobanteElectronico.deleteMany({
          where: { preFacturaId: preFacturaId },
        });
      }

      // ⭐ NUEVO: Detectar si es Saldo Inicial (tipo SI-CXC)
      const esSaldoInicial = preFactura.tipoDocumento.codigo === "SI-CXC";
      // ⭐ CALCULAR MONTO NETO (restar pagos previos SI)
      const pagosPreviosSI = Number(preFactura.pagosPreviosSI) || 0;
      const subtotalNeto = Number(preFactura.subtotal) - pagosPreviosSI;
      const porcentajeIGV = Number(preFactura.porcentajeIgv) || 0;
      const igvNeto = preFactura.esExoneradoAlIGV
        ? 0
        : subtotalNeto * (porcentajeIGV / 100);
      const totalNeto = subtotalNeto + igvNeto;

      // Usar totalNeto en lugar de preFactura.total para Saldos Iniciales
      const montoFinal = esSaldoInicial ? totalNeto : Number(preFactura.total);
      // 3. Crear ComprobanteElectronico (pendiente de emisión a SUNAT)
      const ahora = new Date();
      const horaEmision = ahora.toTimeString().split(" ")[0]; // HH:MM:SS

      const comprobanteElectronico = await tx.comprobanteElectronico.create({
        data: {
          // Origen
          preFacturaId: preFactura.id,
          // Empresa y sede
          empresaId: preFactura.empresaId,
          sedeId: preFactura.empresa.sedeId || Number(1), // Usar sede de empresa o default
          // Tipo y serie SUNAT
          tipoComprobanteId: preFactura.tipoDocumentoId,
          serieDocId: preFactura.serieDocId,
          numeroSerie:
            preFactura.numSerieDoc || preFactura.serieDoc?.serie || "001",
          numeroCorrelativo: Number(preFactura.numCorreDoc) || 1,
          numeroCompleto: preFactura.numeroDocumento,
          // Fechas
          fechaEmision: ahora,
          horaEmision: horaEmision,
          fechaVencimiento: preFactura.fechaVencimiento,

          // Cliente
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoClienteId:
            preFactura.cliente.tipoDocumentoId || Number(6), // Default RUC
          numeroDocumentoCliente: preFactura.cliente.numeroDocumento || "",
          razonSocialCliente: preFactura.cliente.razonSocial || "",
          direccionCliente: preFactura.cliente.direccion || "Sin dirección",
          emailCliente: preFactura.cliente.email,
          // Moneda
          monedaId: preFactura.monedaId,
          tipoCambio: preFactura.tipoCambio || 1.0,
          // Condiciones de pago
          formaPagoId: preFactura.formaPagoId || Number(1), // Default contado
          montoPendientePago: montoFinal,
          // Estados
          estadoOSEId: Number(50), // PENDIENTE
          estadoSUNATId: Number(60), // ACTIVO

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
        if (
          detalle.producto?.sujetoDetraccion &&
          detalle.producto?.porcentajeDetraccion
        ) {
          tieneDetraccion = true;
          // Usar el porcentaje del primer producto sujeto a detracción
          if (!porcentajeDetraccion) {
            porcentajeDetraccion = Number(
              detalle.producto.porcentajeDetraccion,
            );
          }
        }
      }

      // Calcular monto de detracción si aplica Y monto >= montoMinimoDetraccion
      const montoMinimoDetraccion =
        Number(preFactura.empresa.montoMinimoDetraccion) || 700; // Default S/ 700

      if (
        tieneDetraccion &&
        porcentajeDetraccion &&
        montoFinal >= montoMinimoDetraccion
      ) {
        montoDetraccion = montoFinal * (porcentajeDetraccion / 100);
      } else if (tieneDetraccion && montoFinal < montoMinimoDetraccion) {
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
      if (
        preFactura.cliente.sujetoPercepcion &&
        preFactura.empresa.soyAgentePercepcion
      ) {
        tienePercepcion = true;
        porcentajePercepcion = 2; // Percepción estándar 2%
        montoPercepcion = montoFinal * (porcentajePercepcion / 100);
      }

      // 6. Crear o Actualizar CuentaPorCobrar BLANCA (con comprobante SUNAT)
      // Verificar si ya existe CxC para esta PreFactura (regeneración)
      const cxcExistente = await tx.cuentaPorCobrar.findUnique({
        where: { preFacturaId: preFactura.id },
        include: { pagos: true },
      });

      // Calcular montos considerando pagos existentes
      let montoPagado = 0;
      let saldoPendiente = montoFinal;

      if (cxcExistente && cxcExistente.pagos && cxcExistente.pagos.length > 0) {
        // Recalcular monto pagado desde los pagos registrados
        montoPagado = cxcExistente.pagos.reduce(
          (sum, pago) => sum + Number(pago.montoPagado),
          0,
        );
        saldoPendiente = montoFinal - montoPagado;
      }

      // Preparar datos de la CxC
      const dataCxC = {
        // ORIGEN DEL DOCUMENTO
        preFacturaId: preFactura.id,
        empresaId: preFactura.empresaId,
        clienteId: preFactura.clienteId,

        // DOCUMENTO
        numeroPreFactura: preFactura.numeroDocumento,
        fechaEmision: preFactura.fechaDocumento || new Date(),
        fechaVencimiento: preFactura.fechaVencimiento || new Date(),

        // MONTOS ALMACENADOS (recalculados si hay pagos)
        montoTotal: montoFinal,
        montoPagado: montoPagado,
        saldoPendiente: saldoPendiente,

        // DETRACCIÓN SPOT (SUNAT PERÚ) - TOTALES
        tieneDetraccion,
        montoDetraccionTotal: montoDetraccion,
        porcentajeDetraccion,

        // RETENCIÓN (SUNAT PERÚ) - TOTALES
        tieneRetencion,
        montoRetencionTotal: montoRetencion,
        porcentajeRetencion: tieneRetencion ? 3 : null,

        // PERCEPCIÓN (SUNAT PERÚ) - TOTALES
        tienePercepcion,
        montoPercepcionTotal: montoPercepcion,
        porcentajePercepcion,

        // FLAGS ESPECIALES
        esSaldoInicial: esSaldoInicial,
        esGerencial: false, // BLANCA (Formal/SUNAT)
        comprobanteElectronicoId: comprobanteElectronico.id,

        // MONEDA Y TIPO DE VENTA
        monedaId: preFactura.monedaId,
        esContado: preFactura.esContado || false,
        estadoId: estadoPendiente.id,
        observaciones: esSaldoInicial
          ? `Saldo Inicial CxC - ${preFactura.cliente.razonSocial}`
          : `CxC Blanca generada desde PreFactura ${preFactura.codigo}`,

        // ✅ INTEGRACIÓN CONTABLE - HEREDADO DE PREFACTURA
        fechaContable: preFactura.fechaContable,
        periodoContableId: preFactura.periodoContableId,
      };

      let cuentaPorCobrar;
      if (cxcExistente) {
        // REGENERAR: Actualizar CxC existente preservando pagos
        cuentaPorCobrar = await tx.cuentaPorCobrar.update({
          where: { id: cxcExistente.id },
          data: dataCxC,
        });
      } else {
        // CREAR: Nueva CxC
        cuentaPorCobrar = await tx.cuentaPorCobrar.create({
          data: dataCxC,
        });
      }

      // 7. Actualizar PreFactura a EMITIDA (estado 96)
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          facturado: true,
          fechaFacturacion: new Date(),
          estadoId: Number(96), // Estado EMITIDA
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
          periodoContable: true, // ✅ AGREGADO: Necesario para heredar periodo
          tipoDocumento: true, // ✅ AGREGADO: Necesario para detectar SI-CXC
        },
      });

      if (!preFactura) {
        throw new NotFoundError("PreFactura no encontrada");
      }

      // Validar que esté APROBADA (estado 46) o EMITIDA (estado 96) para regenerar
      const estadoActual = Number(preFactura.estadoId);
      if (estadoActual !== 46 && estadoActual !== 96) {
        throw new ValidationError(
          "Solo se pueden facturar PreFacturas APROBADAS o EMITIDAS",
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
          tipoProvieneDeId: Number(24), // Tipo Proviene: CUENTAS POR COBRAR
          descripcion: { contains: "PENDIENTE", mode: "insensitive" },
        },
      });

      if (!estadoPendiente) {
        throw new ValidationError(
          "No se encontró el estado PENDIENTE para CuentaPorCobrar",
        );
      }

      // ⭐ REGENERACIÓN: Eliminar CXC existente si ya fue generada
      if (estadoActual === 96) {
        await tx.cuentaPorCobrar.deleteMany({
          where: { preFacturaId: preFacturaId },
        });
      }

      // ⭐ NUEVO: Detectar si es Saldo Inicial (tipo SI-CXC o SI-CXP)
      const esSaldoInicial =
        preFactura.tipoDocumento?.codigo?.startsWith("SI-");

      // ⭐ CALCULAR MONTO NETO (restar pagos previos SI)
      const pagosPreviosSI = Number(preFactura.pagosPreviosSI) || 0;
      const subtotalNeto = Number(preFactura.subtotal) - pagosPreviosSI;
      const porcentajeIGV = Number(preFactura.porcentajeIgv) || 0;
      const igvNeto = preFactura.esExoneradoAlIGV
        ? 0
        : subtotalNeto * (porcentajeIGV / 100);
      const totalNeto = subtotalNeto + igvNeto;

      // Usar totalNeto en lugar de preFactura.total para Saldos Iniciales
      const montoFinal = esSaldoInicial ? totalNeto : Number(preFactura.total);

      // 3. ANALIZAR DETRACCIÓN, RETENCIÓN Y PERCEPCIÓN (REGLAS SUNAT)

      // 3.1 Analizar DETRACCIÓN (basado en productos y monto mínimo)
      let tieneDetraccion = false;
      let porcentajeDetraccion = null;
      let montoDetraccion = 0;

      // Verificar si algún producto está sujeto a detracción
      for (const detalle of preFactura.detalles) {
        if (
          detalle.producto?.sujetoDetraccion &&
          detalle.producto?.porcentajeDetraccion
        ) {
          tieneDetraccion = true;
          // Usar el porcentaje del primer producto sujeto a detracción
          if (!porcentajeDetraccion) {
            porcentajeDetraccion = Number(
              detalle.producto.porcentajeDetraccion,
            );
          }
        }
      }

      // Calcular monto de detracción si aplica Y monto >= montoMinimoDetraccion
      const montoMinimoDetraccion =
        Number(preFactura.empresa.montoMinimoDetraccion) || 700; // Default S/ 700

      if (
        tieneDetraccion &&
        porcentajeDetraccion &&
        montoFinal >= montoMinimoDetraccion
      ) {
        montoDetraccion = montoFinal * (porcentajeDetraccion / 100);
      } else if (tieneDetraccion && montoFinal < montoMinimoDetraccion) {
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
      if (
        preFactura.cliente.sujetoPercepcion &&
        preFactura.empresa.soyAgentePercepcion
      ) {
        tienePercepcion = true;
        porcentajePercepcion = 2; // Percepción estándar 2%
        montoPercepcion = montoFinal * (porcentajePercepcion / 100);
      }

      // 4. Crear o Actualizar CuentaPorCobrar NEGRA (Gerencial)
      // Verificar si ya existe CxC para esta PreFactura (regeneración)
      const cxcExistente = await tx.cuentaPorCobrar.findUnique({
        where: { preFacturaId: preFactura.id },
        include: { pagos: true },
      });

      // Calcular montos considerando pagos existentes
      let montoPagado = 0;
      let saldoPendiente = montoFinal;

      if (cxcExistente && cxcExistente.pagos && cxcExistente.pagos.length > 0) {
        // Recalcular monto pagado desde los pagos registrados
        montoPagado = cxcExistente.pagos.reduce(
          (sum, pago) => sum + Number(pago.montoPagado),
          0,
        );
        saldoPendiente = montoFinal - montoPagado;
      }

      // Preparar datos de la CxC
      const dataCxC = {
        // ORIGEN DEL DOCUMENTO
        preFacturaId: preFactura.id,
        empresaId: preFactura.empresaId,
        clienteId: preFactura.clienteId,

        // DOCUMENTO
        numeroPreFactura: preFactura.numeroDocumento,
        fechaEmision: preFactura.fechaDocumento || new Date(),
        fechaVencimiento: preFactura.fechaVencimiento || new Date(),

        // MONTOS ALMACENADOS (recalculados si hay pagos)
        montoTotal: montoFinal,
        montoPagado: montoPagado,
        saldoPendiente: saldoPendiente,

        // DETRACCIÓN SPOT (SUNAT PERÚ) - TOTALES
        tieneDetraccion,
        montoDetraccionTotal: montoDetraccion,
        porcentajeDetraccion,

        // RETENCIÓN (SUNAT PERÚ) - TOTALES
        tieneRetencion,
        montoRetencionTotal: montoRetencion,
        porcentajeRetencion: tieneRetencion ? 3 : null,

        // PERCEPCIÓN (SUNAT PERÚ) - TOTALES
        tienePercepcion,
        montoPercepcionTotal: montoPercepcion,
        porcentajePercepcion,

        // FLAGS ESPECIALES
        esSaldoInicial: esSaldoInicial,
        esGerencial: true, // NEGRA (Gerencial/No SUNAT)
        comprobanteElectronicoId: null,

        // MONEDA Y TIPO DE VENTA
        monedaId: preFactura.monedaId,
        esContado: preFactura.esContado || false,
        estadoId: estadoPendiente.id,
        observaciones: esSaldoInicial
          ? `Saldo Inicial CxC Gerencial - ${preFactura.cliente.razonSocial}`
          : `CxC Negra generada desde PreFactura ${preFactura.codigo}`,

        // ✅ INTEGRACIÓN CONTABLE - HEREDADO DE PREFACTURA
        fechaContable: preFactura.fechaContable,
        periodoContableId: preFactura.periodoContableId,
      };

      let cuentaPorCobrar;
      if (cxcExistente) {
        // REGENERAR: Actualizar CxC existente preservando pagos
        cuentaPorCobrar = await tx.cuentaPorCobrar.update({
          where: { id: cxcExistente.id },
          data: dataCxC,
        });
      } else {
        // CREAR: Nueva CxC
        cuentaPorCobrar = await tx.cuentaPorCobrar.create({
          data: dataCxC,
        });
      }

      // 5. Actualizar PreFactura a FACTURADA (estado 95)
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          facturado: true,
          fechaFacturacion: new Date(),
          estadoId: Number(95), // Estado FACTURADA
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
          estadoId: Number(40), // ANULADO
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
        where: { id: Number(46) }, // BigInt literal
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
          estadoId: Number(46),
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

/**
 * Genera un borrador de asiento contable para una PreFactura
 * NO lo guarda en BD, solo retorna la estructura para edición
 * Patrón: Igual a MovimientoActivoFijo.generarBorradorAsiento
 * 
 * @param {BigInt} preFacturaId - ID de la PreFactura
 * @returns {Promise<Object>} - Borrador del asiento contable
 */
const generarBorradorAsiento = async (preFacturaId) => {
  try {
    const preFactura = await prisma.preFactura.findUnique({
      where: { id: preFacturaId },
      include: {
        empresa: true,
        cliente: true,
        moneda: true,
        periodoContable: true,
        tipoDocumento: true,
      },
    });

    if (!preFactura) {
      throw new NotFoundError("PreFactura no encontrada");
    }

    if (!preFactura.periodoContable) {
      throw new ValidationError(
        "La PreFactura no tiene un período contable asignado.",
      );
    }

    // Validar que el período esté ABIERTO (estadoId = 73)
    if (Number(preFactura.periodoContable.estadoId) !== 73) {
      throw new ValidationError(
        "El período contable debe estar ABIERTO para generar asientos.",
      );
    }

    // Buscar cuentas contables necesarias
    const cuentaCxC = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "121" },
        activo: true,
      },
    });

    const cuentaVentas = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: { startsWith: "70" },
        activo: true,
      },
    });

    if (!cuentaCxC || !cuentaVentas) {
      throw new ValidationError(
        "No se encontraron las cuentas contables necesarias (12.1 Cuentas por Cobrar o 70 Ventas). " +
        "Configure el plan de cuentas antes de generar el asiento.",
      );
    }

    // ⭐ DETECTAR SI ES SALDO INICIAL (SI-CXC)
    const esSaldoInicial = preFactura.tipoDocumento?.codigo === "SI-CXC";

    // ⭐ Si es Saldo Inicial, usar cuenta 59 (Resultados Acumulados) en lugar de 70 (Ventas)
    let cuentaHaber = cuentaVentas; // Por defecto: 70 (Ventas)

    if (esSaldoInicial) {
      const cuentaResultadosAcumulados = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: { startsWith: "59" },
          activo: true,
        },
      });

      if (!cuentaResultadosAcumulados) {
        throw new ValidationError(
          "No se encontró la cuenta 59 (Resultados Acumulados). " +
          "Configure el plan de cuentas antes de generar el asiento para Saldos Iniciales.",
        );
      }

      cuentaHaber = cuentaResultadosAcumulados;
    }

    const subtotal = Number(preFactura.subtotal);
    const totalIGV = Number(preFactura.totalIGV);
    const total = Number(preFactura.total);
    // Determinar tipo de libro según esGerencial
    const tipoLibro = preFactura.esGerencial ? "GERENCIAL" : "FISCAL";

    const borrador = {
      empresaId: preFactura.empresaId,
      periodoContableId: preFactura.periodoContableId,
      fechaAsiento: preFactura.fechaContable,
      glosa: esSaldoInicial
        ? `Saldo Inicial CxC según PreFactura ${preFactura.codigo}`
        : `Venta según PreFactura ${preFactura.codigo}`,
      tipoLibro: tipoLibro,
      origenAsiento: "AUTOMATICO",
      monedaId: preFactura.monedaId,
      tipoCambio: preFactura.tipoCambio,
      detalles: [],
    };

    // CASO 1: GERENCIAL (sin IGV)
    if (preFactura.esGerencial) {
      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: cuentaCxC.id,
          glosa: esSaldoInicial
            ? `Saldo Inicial CxC según PreFactura ${preFactura.codigo}`
            : `Venta según PreFactura ${preFactura.codigo}`,
          debe: total,
          haber: 0,
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoOrigenId: preFactura.tipoDocumentoId,
          numeroDocumentoOrigen: preFactura.numeroDocumento,
          fechaDocumentoOrigen: preFactura.fechaDocumento,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaHaber.id,
          glosa: esSaldoInicial
            ? `Saldo Inicial CxC según PreFactura ${preFactura.codigo}`
            : `Venta según PreFactura ${preFactura.codigo}`,
          debe: 0,
          haber: total,
          centroCostoId: esSaldoInicial ? null : preFactura.centroCostoId,
        },
      ];
    }
    // CASO 2: FISCAL EXONERADA (sin IGV)
    else if (preFactura.exoneradoIgv) {
      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: cuentaCxC.id,
          glosa: esSaldoInicial
            ? `Saldo Inicial CxC según PreFactura ${preFactura.codigo}`
            : `Venta exonerada según PreFactura ${preFactura.codigo}`,
          debe: total,
          haber: 0,
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoOrigenId: preFactura.tipoDocumentoId,
          numeroDocumentoOrigen: preFactura.numeroDocumento,
          fechaDocumentoOrigen: preFactura.fechaDocumento,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaHaber.id,
          glosa: esSaldoInicial
            ? `Saldo Inicial CxC según PreFactura ${preFactura.codigo}`
            : `Venta exonerada según PreFactura ${preFactura.codigo}`,
          debe: 0,
          haber: total,
          centroCostoId: esSaldoInicial ? null : preFactura.centroCostoId,
        },
      ];
    }
    // CASO 3: FISCAL CON IGV
    else {
      const cuentaIGV = await prisma.planCuentasContable.findFirst({
        where: {
          codigoCuenta: { startsWith: "401" },
          activo: true,
        },
      });

      if (!cuentaIGV) {
        throw new ValidationError(
          "No se encontró la cuenta de IGV (40.1). Configure el plan de cuentas antes de generar el asiento.",
        );
      }

      borrador.detalles = [
        {
          numeroLinea: 1,
          planCuentaId: cuentaCxC.id,
          glosa: esSaldoInicial
            ? `Saldo Inicial CxC según PreFactura ${preFactura.codigo}`
            : `Venta según PreFactura ${preFactura.codigo}`,
          debe: total, // Con IGV
          haber: 0,
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoOrigenId: preFactura.tipoDocumentoId,
          numeroDocumentoOrigen: preFactura.numeroDocumento,
          fechaDocumentoOrigen: preFactura.fechaDocumento,
        },
        {
          numeroLinea: 2,
          planCuentaId: cuentaHaber.id,
          glosa: esSaldoInicial
            ? `Saldo Inicial CxC según PreFactura ${preFactura.codigo}`
            : `Venta según PreFactura ${preFactura.codigo}`,
          debe: 0,
          haber: subtotal, // Sin IGV
          centroCostoId: esSaldoInicial ? null : preFactura.centroCostoId,
        },
        {
          numeroLinea: 3,
          planCuentaId: cuentaIGV.id,
          glosa: `IGV 18% según PreFactura ${preFactura.codigo}`,
          debe: 0,
          haber: totalIGV,
        },
      ];
    }

    return borrador;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Guarda el asiento contable editado por el usuario y lo vincula a la PreFactura
 * Patrón: Igual a MovimientoActivoFijo.guardarAsientoContable
 * 
 * @param {BigInt} preFacturaId - ID de la PreFactura
 * @param {Object} asientoData - Datos del asiento editado por el usuario
 * @param {BigInt} creadoPor - ID del usuario que crea el asiento
 * @returns {Promise<Object>} - Asiento contable creado
 */
const guardarAsientoContable = async (preFacturaId, asientoData, creadoPor) => {
  try {
    // ✅ DETECTAR SI ES EDICIÓN O CREACIÓN
    const esEdicion = asientoData.id !== undefined && asientoData.id !== null;

    // Buscar submódulo "PreFactura" dinámicamente
    const submodulo = await prisma.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "PreFactura",
        activo: true,
      },
    });

    if (!submodulo) {
      throw new ValidationError(
        'No se encontró el submódulo "PreFactura" en el sistema.',
      );
    }

    // Calcular totales
    const totalDebe = asientoData.detalles.reduce(
      (sum, d) => sum + Number(d.debe),
      0,
    );
    const totalHaber = asientoData.detalles.reduce(
      (sum, d) => sum + Number(d.haber),
      0,
    );
    const diferencia = totalDebe - totalHaber;

    // Validar que esté cuadrado
    if (Math.abs(diferencia) > 0.01) {
      throw new ValidationError(
        `El asiento no está cuadrado. Diferencia: ${diferencia}`,
      );
    }

    // Buscar estado "PENDIENTE" para Asientos Contables (ID 76)
    const estadoPendiente = await prisma.estadoMultiFuncion.findFirst({
      where: { id: Number(76) },
    });

    if (!estadoPendiente) {
      throw new ValidationError(
        "No se encontró el estado 'PENDIENTE' para asientos contables.",
      );
    }

    return await prisma.$transaction(async (tx) => {
      let asiento;

      if (esEdicion) {
        // ✅ EDITAR: Actualizar asiento existente SIN eliminar registros
        // Primero, obtener IDs de detalles existentes
        const detallesExistentes = await tx.detalleAsientoContable.findMany({
          where: { asientoContableId: Number(asientoData.id) },
          select: { id: true },
        });

        // Actualizar asiento (siempre vuelve a PENDIENTE al editar)
        asiento = await tx.asientoContable.update({
          where: { id: Number(asientoData.id) },
          data: {
            fechaAsiento: asientoData.fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro,
            estadoId: estadoPendiente.id,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: Math.abs(diferencia) < 0.01,
            monedaId: asientoData.monedaId,
            tipoCambio: asientoData.tipoCambio,
          },
        });

        // Actualizar detalles uno por uno (UPDATE, no DELETE+CREATE)
        for (let i = 0; i < asientoData.detalles.length; i++) {
          const detalle = asientoData.detalles[i];
          const detalleExistente = detallesExistentes[i];

          if (detalleExistente) {
            // Actualizar detalle existente
            await tx.detalleAsientoContable.update({
              where: { id: detalleExistente.id },
              data: {
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: asientoData.monedaId,
                tipoCambio: asientoData.tipoCambio,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId || null,
                numeroDocumentoOrigen: detalle.numeroDocumentoOrigen || null,
                fechaDocumentoOrigen: detalle.fechaDocumentoOrigen || null,
              },
            });
          } else {
            // Crear nuevo detalle si hay más detalles que antes
            await tx.detalleAsientoContable.create({
              data: {
                asientoContableId: Number(asientoData.id),
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: asientoData.monedaId,
                tipoCambio: asientoData.tipoCambio,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId || null,
                numeroDocumentoOrigen: detalle.numeroDocumentoOrigen || null,
                fechaDocumentoOrigen: detalle.fechaDocumentoOrigen || null,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: preFacturaId,
                creadoPor: creadoPor,
              },
            });
          }
        }

        // Si había más detalles antes, marcarlos como inactivos (NO eliminar)
        if (detallesExistentes.length > asientoData.detalles.length) {
          const idsAMantener = detallesExistentes
            .slice(0, asientoData.detalles.length)
            .map(d => d.id);

          // Aquí podrías agregar un campo 'activo' en el schema
          // Por ahora, los dejamos (no se eliminan)
        }
      } else {
        // ✅ CREAR: Nuevo asiento
        // Obtener último asiento del período para calcular correlativo
        const ultimoAsiento = await tx.asientoContable.findFirst({
          where: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
          },
          orderBy: { correlativo: "desc" },
        });

        const nuevoCorrelativo = ultimoAsiento ? ultimoAsiento.correlativo + 1 : 1;
        const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(5, "0")}`;

        asiento = await tx.asientoContable.create({
          data: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
            numeroAsiento: numeroAsiento,
            correlativo: nuevoCorrelativo,
            fechaAsiento: asientoData.fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro,
            origenAsiento: "AUTOMATICO",
            submoduloOrigenId: submodulo.id,
            procesoOrigenId: preFacturaId,
            estadoId: estadoPendiente.id,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: Math.abs(diferencia) < 0.01,
            monedaId: asientoData.monedaId,
            tipoCambio: asientoData.tipoCambio,
            creadoPor: creadoPor,
            preFacturas: {
              connect: { id: preFacturaId }
            },
            detalles: {
              create: asientoData.detalles.map((detalle) => ({
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: asientoData.monedaId,
                tipoCambio: asientoData.tipoCambio,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                tipoDocumentoOrigenId: detalle.tipoDocumentoOrigenId || null,
                numeroDocumentoOrigen: detalle.numeroDocumentoOrigen || null,
                fechaDocumentoOrigen: detalle.fechaDocumentoOrigen || null,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: preFacturaId,
                creadoPor: creadoPor,
              })),
            },
          },
        });
      }
      // Retornar asiento con detalles y planCuenta incluidos
      return await tx.asientoContable.findUnique({
        where: { id: asiento.id },
        include: {
          detalles: {
            include: {
              planCuenta: true,
            },
            orderBy: { numeroLinea: "asc" },
          },
        },
      });
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

/**
 * Elimina un asiento contable específico
 * Patrón: Igual a MovimientoActivoFijo.eliminarAsientoContable
 * 
 * @param {BigInt} asientoId - ID del asiento a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const eliminarAsientoContable = async (asientoId) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id: asientoId },
    });

    if (!asiento) {
      throw new NotFoundError("Asiento contable no encontrado");
    }

    // Validar que NO esté aprobado (estadoId != 75)
    if (Number(asiento.estadoId) === 75) {
      throw new ValidationError(
        "No se puede eliminar un asiento contable aprobado. Debe desaprobarlo primero.",
      );
    }

    await prisma.asientoContable.delete({ where: { id: asientoId } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};


/**
 * Genera el movimiento de almacén desde una PreFactura aprobada
 * Crea un MovimientoAlmacen de tipo EGRESO (Nota de Salida) en estado PENDIENTE
 * El usuario debe cerrar el movimiento y generar kardex manualmente
 */
const generarKardex = async (id, datosKardex, usuarioId, esRegeneracion = false) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // ========================================
      // PASO 1: OBTENER Y VALIDAR PRE-FACTURA
      // ========================================
      const preFactura = await tx.preFactura.findUnique({
        where: { id: Number(id) },
        include: {
          empresa: true,
          serieDoc: true,
          detalles: {
            include: {
              producto: {
                include: {
                  unidadMedida: true,
                },
              },
            },
          },
          cliente: true,
        },
      });

      if (!preFactura) {
        throw new NotFoundError("Pre-factura no encontrada");
      }

      // Validar estados permitidos (todos excepto PENDIENTE=45 y ANULADA=47)
      const estadosPermitidos = [46, 48, 95, 96, 97, 98, 99];
      if (!estadosPermitidos.includes(Number(preFactura.estadoId))) {
        throw new ValidationError(
          "La pre-factura debe estar APROBADA para generar movimiento"
        );
      }

      // Verificar que no tenga movimiento ya generado (solo si NO es regeneración)
      if (!esRegeneracion && preFactura.movSalidaAlmacenId) {
        throw new ConflictError(
          "La pre-factura ya tiene un movimiento generado. Use regenerar-kardex para recrearlo."
        );
      }

      // Validar que tenga detalles
      if (!preFactura.detalles || preFactura.detalles.length === 0) {
        throw new ValidationError(
          "La pre-factura debe tener al menos un detalle para generar movimiento"
        );
      }

      // ========================================
      // PASO 2: VALIDAR DATOS DEL DIÁLOGO
      // ========================================
      if (!datosKardex.almacenId) {
        throw new ValidationError("Debe seleccionar un almacén");
      }

      if (!datosKardex.conceptoMovAlmacenId) {
        throw new ValidationError("Debe seleccionar un concepto de movimiento");
      }

      if (!datosKardex.dirOrigenId) {
        throw new ValidationError("Debe seleccionar una dirección de origen");
      }

      if (!datosKardex.fechaIngreso) {
        throw new ValidationError("Debe especificar la fecha de ingreso");
      }

      if (!datosKardex.estadoId) {
        throw new ValidationError("Debe seleccionar un estado de mercadería");
      }

      if (!datosKardex.estadoCalidadId) {
        throw new ValidationError("Debe seleccionar un estado de calidad");
      }

      // ========================================
      // PASO 3: OBTENER CONCEPTO Y TIPO DE DOCUMENTO
      // ========================================
      const concepto = await tx.conceptoMovAlmacen.findUnique({
        where: { id: datosKardex.conceptoMovAlmacenId },
      });

      if (!concepto) {
        throw new ValidationError("El concepto de movimiento no existe");
      }

      // Validar que se haya enviado el tipo de documento desde el frontend
      if (!datosKardex.tipoDocumentoAlmacen) {
        throw new ValidationError(
          "Debe especificar el tipo de documento de almacén"
        );
      }

      // ========================================
      // PASO 4: OBTENER RESPONSABLE DE ALMACÉN
      // ========================================
      // Buscar responsable de almacén (sin tipoAprobadorId porque no existe en el modelo)
      const parametroAprobador = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: preFactura.empresaId,
          cesado: false,
        },
        orderBy: {
          vigenteDesde: 'desc' // Obtener el más reciente
        }
      });

      if (!parametroAprobador || !parametroAprobador.personalRespId) {
        throw new ValidationError(
          "No se encontró responsable de almacén configurado en ParametroAprobador para esta empresa"
        );
      }

      // ========================================
      // PASO 5: OBTENER SERIE DE DOCUMENTO (MISMA SERIE QUE LA PRE-FACTURA)
      // ========================================
      if (!preFactura.serieDoc || !preFactura.serieDoc.serie) {
        throw new ValidationError(
          "La pre-factura no tiene serie configurada"
        );
      }

      // Buscar serie del movimiento de almacén con:
      // - tipoDocumentoId = 14 (Nota de Salida, desde kardexConfig)
      // - serie = "F001" (misma serie que la PreFactura)
      const serieMovAlmacen = await tx.serieDoc.findFirst({
        where: {
          empresaId: preFactura.empresaId,
          tipoDocumentoId: datosKardex.tipoDocumentoAlmacen, // ⭐ ID 14 (Nota de Salida)
          serie: preFactura.numSerieDoc, // ⭐ Serie de la PreFactura (ej: "F001")
          activo: true,
        },
      });

      if (!serieMovAlmacen) {
        throw new ValidationError(
          `No se encontró una serie activa para el tipo de documento ${datosKardex.tipoDocumentoAlmacen} (Nota de Salida) con la serie "${preFactura.numSerieDoc}". Debe crear una serie en SerieDoc con tipoDocumentoId=${datosKardex.tipoDocumentoAlmacen} y serie="${preFactura.numSerieDoc}"`
        );
      }

      // ========================================
      // PASO 6: PREPARAR CABECERA DEL MOVIMIENTO
      // ========================================
      const cabecera = {
        empresaId: preFactura.empresaId,
        almacenId: datosKardex.almacenId,
        tipoDocumentoId: datosKardex.tipoDocumentoAlmacen, // ⭐ ID 14 (Nota de Salida)
        conceptoMovAlmacenId: datosKardex.conceptoMovAlmacenId,
        serieDocId: serieMovAlmacen.id, // ⭐ ID de la serie encontrada
        fechaDocumento: datosKardex.fechaDocumento || new Date(),
        entidadComercialId: preFactura.clienteId,
        estadoDocAlmacenId: Number(30), // PENDIENTE
        esCustodia: false,
        personalRespAlmacen: parametroAprobador.personalRespId,
        preFacturaId: preFactura.id,
        dirOrigenId: datosKardex.dirOrigenId,
        dirDestinoId: datosKardex.dirDestinoId,
        observaciones: datosKardex.observaciones || `Salida por Pre-Factura ${preFactura.numeroDocumento}`,
      };

      // ========================================
      // PASO 7: PREPARAR DETALLES DEL MOVIMIENTO
      // ========================================
      const detalles = preFactura.detalles.map((det) => ({
        productoId: det.productoId,
        cantidad: det.cantidad,
        peso: det.peso || 0,
        lote: datosKardex.lote || "",
        fechaProduccion: datosKardex.fechaIngreso, // ⭐ Para ventas, usar fecha de ingreso como producción
        fechaVencimiento: datosKardex.fechaVencimiento || null,
        fechaIngreso: datosKardex.fechaIngreso,
        nroSerie: "",
        nroContenedor: "",
        estadoMercaderiaId: Number(datosKardex.estadoId),
        estadoCalidadId: Number(datosKardex.estadoCalidadId),
        entidadComercialId: preFactura.clienteId,
        esCustodia: false,
        empresaId: preFactura.empresaId,
        costoUnitario: det.precioUnitario || 0,
        observaciones: null,
      }));

      // ========================================
      // PASO 8: CREAR MOVIMIENTO DE ALMACÉN (SIN KARDEX - PENDIENTE)
      // ========================================
      const resultado =
        await crearMovimientoAlmacenService.crearMovimientoAlmacenCompleto(
          cabecera,
          detalles,
          usuarioId,
          tx, // Pasar la transacción actual
        );

      // ========================================
      // PASO 9: ACTUALIZAR PRE-FACTURA
      // ========================================
      const preFacturaActualizada = await tx.preFactura.update({
        where: { id: Number(id) },
        data: {
          movSalidaAlmacenId: resultado.movimiento.id,
          fechaActualizacion: new Date(),
        },
        include: {
          empresa: true,
          tipoDocumento: true,
          cliente: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      return {
        preFactura: preFacturaActualizada,
        movimientoId: resultado.movimiento.id, // ⭐ RETORNAR ID PARA REDIRECCIÓN
        movimiento: resultado.movimiento,
      };
    }, {
      timeout: 120000, // ⭐ 120 segundos de timeout (2 minutos)
      maxWait: 125000, // ⭐ 125 segundos de espera máxima
    });
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};


/**
 * Regenera el kardex de una pre-factura
 * Elimina el movimiento existente y crea uno nuevo
 */
const regenerarKardex = async (id, usuarioId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // ========================================
      // 1. OBTENER Y VALIDAR PRE-FACTURA
      // ========================================
      const preFactura = await tx.preFactura.findUnique({
        where: { id },
        include: {
          movSalidaAlmacen: {
            include: {
              detalles: true,
              conceptoMovAlmacen: true,
            },
          },
          serieDoc: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (!preFactura) {
        throw new NotFoundError("Pre-factura no encontrada");
      }

      // Validar estados permitidos
      const estadosPermitidos = [46, 48, 95, 96, 97, 98, 99];
      if (!estadosPermitidos.includes(Number(preFactura.estadoId))) {
        throw new ValidationError(
          "La pre-factura debe estar APROBADA para regenerar kardex"
        );
      }

      // Verificar que tenga movimiento generado
      if (!preFactura.movSalidaAlmacenId) {
        throw new ValidationError(
          "La pre-factura no tiene un kardex generado. Use generar-movimiento en su lugar."
        );
      }

      // ========================================
      // 2. OBTENER DATOS DEL MOVIMIENTO ANTERIOR
      // ========================================
      const movimientoAnterior = preFactura.movSalidaAlmacen;
      const concepto = movimientoAnterior.conceptoMovAlmacen;
      const primerDetalle = movimientoAnterior?.detalles?.[0];

      // ========================================
      // 3. CONSTRUIR CABECERA Y DETALLES ACTUALIZADOS
      // ========================================
      const cabecera = {
        fechaDocumento: preFactura.fechaDocumento,
        dirOrigenId: movimientoAnterior.dirOrigenId,
        dirDestinoId: movimientoAnterior.dirDestinoId,
        observaciones: `Regeneración de kardex por ${preFactura.numeroDocumento}`,
      };

      const detalles = preFactura.detalles.map((det) => ({
        productoId: det.productoId,
        cantidad: det.cantidad,
        peso: det.peso || det.cantidad,
        lote: primerDetalle?.lote || null,
        fechaProduccion: primerDetalle?.fechaProduccion || preFactura.fechaDocumento,
        fechaVencimiento: primerDetalle?.fechaVencimiento || null,
        fechaIngreso: primerDetalle?.fechaIngreso || new Date(),
        nroSerie: "",
        nroContenedor: "",
        estadoMercaderiaId: primerDetalle?.estadoMercaderiaId || BigInt(6),
        estadoCalidadId: primerDetalle?.estadoCalidadId || BigInt(10),
        entidadComercialId: preFactura.clienteId,
        esCustodia: false,
        empresaId: preFactura.empresaId,
        costoUnitario: det.precioUnitario || 0,
        observaciones: null,
      }));

      // ========================================
      // 4. ACTUALIZAR MOVIMIENTO Y REGENERAR KARDEX
      // ========================================
      const { default: actualizarMovimientoService } = await import(
        "../Almacen/actualizarMovimientoAlmacen.service.js"
      );

      const resultado = await actualizarMovimientoService.actualizarMovimientoAlmacenCompleto(
        preFactura.movSalidaAlmacenId,
        cabecera,
        detalles,
        usuarioId,
        tx
      );

      return {
        preFactura: preFactura,
        movimientoId: resultado.movimiento.id,
        movimiento: resultado.movimiento,
        mensaje: "Kardex regenerado correctamente",
      };
    }, {
      timeout: 120000,
      maxWait: 125000,
    });
  } catch (err) {
    console.error("❌ Error en regenerarKardex:", {
      message: err.message,
      code: err.code,
      meta: err.meta,
    });

    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ConflictError
    )
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al regenerar kardex", err.message);
    }
    throw err;
  }
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
  generarBorradorAsiento,
  guardarAsientoContable,
  eliminarAsientoContable,
  generarKardex,
  regenerarKardex,
};