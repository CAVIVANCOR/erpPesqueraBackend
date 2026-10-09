import prisma from "../../config/prismaClient.js";
import documentoCompraPresupuestoService from "./documentoCompraPresupuesto.service.js";
import { SUBMODULO_ORIGEN } from "../../utils/submodulos.constants.js";
import { ESTADO_ORDEN_COMPRA } from "../../utils/estados.constants.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para OTMantenimiento
 * Aplica validaciones de unicidad y existencia de claves foráneas.
 * Documentado en español.
 */

// Estados automáticos y manuales de OT de Mantenimiento
const ESTADOS_OT = {
  PENDIENTE: 51n,
  EN_PROCESO: 52n,
  PAUSADA: 53n,
  COMPLETADA: 54n,
  CANCELADA: 55n,
  CERRADA: 56n,
};

const ESTADOS_OT_MANUALES = [
  ESTADOS_OT.COMPLETADA,
  ESTADOS_OT.CANCELADA,
  ESTADOS_OT.CERRADA,
];

/**
 * Determina automáticamente el estado de una OT según sus contratistas y documentos de compra.
 * - Sin contratistas -> PENDIENTE
 * - Con contratistas y al menos un documento de compra no anulado -> EN PROCESO
 * - Con contratistas pero sin documentos de compra -> PAUSADA
 * - Completada/Cancelada/Cerrada se respetan (estados manuales de cierre).
 */
async function determinarEstadoOT(otId, estadoActualId = null, tx = prisma) {
  if (ESTADOS_OT_MANUALES.includes(BigInt(estadoActualId || 0))) {
    return BigInt(estadoActualId);
  }

  const contratistasCount = await tx.detContratistasOT.count({
    where: { otMantenimientoId: otId },
  });
  if (contratistasCount === 0) return ESTADOS_OT.PENDIENTE;

  const documentosCount = await tx.ordenCompra.count({
    where: {
      submoduloOrigenId: BigInt(SUBMODULO_ORIGEN.PRESUPUESTO_CONTRATISTA_OT),
      procesoOrigenId: otId,
      estadoId: { not: ESTADO_ORDEN_COMPRA.ANULADO },
    },
  });

  return documentosCount > 0 ? ESTADOS_OT.EN_PROCESO : ESTADOS_OT.PAUSADA;
}

/**
 * Actualiza el estado de la OT solo si cambió y no está en un estado manual de cierre.
 */
async function actualizarEstadoOT(otId, estadoActualId = null, tx = prisma) {
  const nuevoEstado = await determinarEstadoOT(otId, estadoActualId, tx);
  if (BigInt(estadoActualId || 0) !== nuevoEstado) {
    await tx.oTMantenimiento.update({
      where: { id: otId },
      data: { estadoId: nuevoEstado },
    });
  }
  return nuevoEstado;
}

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la OT
 */
async function validarForaneas(data) {
  // tipoMantenimientoId
  if (
    data.tipoMantenimientoId !== undefined &&
    data.tipoMantenimientoId !== null
  ) {
    const tipoMant = await prisma.tipoMantenimiento.findUnique({
      where: { id: data.tipoMantenimientoId },
    });
    if (!tipoMant)
      throw new ValidationError(
        "El tipo de mantenimiento referenciado no existe.",
      );
  }
  // motivoOriginoId
  if (data.motivoOriginoId !== undefined && data.motivoOriginoId !== null) {
    const motivo = await prisma.motivoOriginoOT.findUnique({
      where: { id: data.motivoOriginoId },
    });
    if (!motivo)
      throw new ValidationError("El motivo de origen referenciado no existe.");
  }
}

/**
 * Lista todas las órdenes de trabajo de mantenimiento con relaciones completas.
 */
const listar = async () => {
  try {
    const result = await prisma.oTMantenimiento.findMany({
      include: {
        empresa: { select: { id: true, razonSocial: true, ruc: true } },
        sede: { select: { id: true, nombre: true } },
        activo: { select: { id: true, nombre: true, descripcion: true } },
        tipoMantenimiento: { select: { id: true, nombre: true } },
        motivoOrigino: { select: { id: true, nombre: true } },
        estado: {
          select: { id: true, descripcion: true, severityColor: true },
        },
        moneda: { select: { id: true, codigoSunat: true, simbolo: true } },
        solicitante: { select: { id: true, nombres: true, apellidos: true } },
        responsable: { select: { id: true, nombres: true, apellidos: true } },
        tipoDocumento: {
          select: { id: true, codigo: true, descripcion: true },
        },
        serieDoc: { select: { id: true, serie: true } },
        contratistas: {
          include: {
            contratista: {
              select: {
                id: true,
                razonSocial: true,
              },
            },
            estado: {
              select: {
                id: true,
                descripcion: true,
                severityColor: true,
              },
            },
            repuestos: {
              select: {
                id: true,
                productoId: true,
                descripcion: true,
                producto: {
                  select: {
                    id: true,
                    descripcionArmada: true,
                  },
                },
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
      orderBy: { fechaDocumento: "desc" },
    });
    return result;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Obtiene una OT por ID con todas sus relaciones.
 */
const obtenerPorId = async (id) => {
  try {
    const ot = await prisma.oTMantenimiento.findUnique({
      where: { id },
      include: {
        empresa: true,
        sede: true,
        activo: true,
        tipoMantenimiento: true,
        motivoOrigino: true,
        estado: true,
        moneda: true,
        solicitante: true,
        responsable: true,
        tipoDocumento: true,
        serieDoc: true,
        contratistas: {
          include: {
            contratista: true,
            activo: true,
            moneda: true,
            estado: true,
            repuestos: {
              include: {
                producto: {
                  include: {
                    unidadMedida: true,
                  },
                },
                moneda: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
    });
    if (!ot) throw new NotFoundError("OTMantenimiento no encontrada");

    // Recalcular montos de los presupuestos y totales de la OT (una sola verdad).
    // No se propaga el error: la OT se muestra igualmente.
    try {
      await documentoCompraPresupuestoService.recalcularMontosOT(ot.id);
      await actualizarEstadoOT(ot.id, ot.estadoId);
    } catch (e) {
      console.error("No se pudieron recalcular los montos/estado de la OT:", e.message);
    }

    // Volver a consultar para devolver el estado actualizado
    return await prisma.oTMantenimiento.findUnique({
      where: { id },
      include: {
        empresa: true,
        sede: true,
        activo: true,
        tipoMantenimiento: true,
        motivoOrigino: true,
        estado: true,
        moneda: true,
        solicitante: true,
        responsable: true,
        tipoDocumento: true,
        serieDoc: true,
        contratistas: {
          include: {
            contratista: true,
            activo: true,
            moneda: true,
            estado: true,
            repuestos: {
              include: {
                producto: { include: { unidadMedida: true } },
                moneda: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { numeroLinea: "asc" },
        },
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Crea una OT validando campos obligatorios y existencia de claves foráneas.
 */
const crear = async (data) => {
  try {    
    if (
      !data.empresaId ||
      !data.tipoDocumentoId ||
      !data.serieDocId ||
      !data.activoId ||
      !data.tipoMantenimientoId ||
      !data.motivoOriginoId ||
      !data.estadoId ||
      !data.monedaId
    ) {
      throw new ValidationError(
        "Los campos empresaId, tipoDocumentoId, serieDocId, activoId, tipoMantenimientoId, motivoOriginoId, estadoId y monedaId son obligatorios.",
      );
    }
    await validarForaneas(data);

    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener la serie seleccionada
      const serie = await tx.serieDoc.findUnique({
        where: { id: Number(data.serieDocId) },
      });

      if (!serie) {
        throw new ValidationError("Serie de documento no encontrada.");
      }

      // 2. Calcular nuevo correlativo
      const nuevoCorrelativo = Number(serie.correlativo) + 1;

      // 3. Generar números con formato
      const numSerie = String(serie.serie).padStart(
        serie.numCerosIzqSerie,
        "0",
      );
      const numCorre = String(nuevoCorrelativo).padStart(
        serie.numCerosIzqCorre,
        "0",
      );
      const numeroCompleto = `${numSerie}-${numCorre}`;

      // 4. Actualizar el correlativo en SerieDoc
      await tx.serieDoc.update({
        where: { id: Number(data.serieDocId) },
        data: { correlativo: Number(nuevoCorrelativo) },
      });

      // 5. Crear objeto limpio solo con campos del modelo (patrón estándar)
      const datosLimpios = {
        empresaId: data.empresaId,
        fechaDocumento: data.fechaDocumento || new Date(),
        sedeId: data.sedeId,
        activoId: data.activoId,
        tipoMantenimientoId: data.tipoMantenimientoId,
        motivoOriginoId: data.motivoOriginoId,
        prioridadAlta:
          data.prioridadAlta !== undefined ? data.prioridadAlta : false,
        estadoId: data.estadoId,
        fechaProgramada: data.fechaProgramada,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        porcentajeAvance: data.porcentajeAvance,
        totalMontoPactado: data.totalMontoPactado,
        totalMontoPagado: data.totalMontoPagado,
        totalSaldo: data.totalSaldo,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numeroSerie: numSerie,
        numeroCorrelativo: nuevoCorrelativo,
        numeroCompleto,
        monedaId: data.monedaId,
        solicitanteId: data.solicitanteId,
        responsableId: data.responsableId,
        descripcionProblema: data.descripcionProblema,
        solucionAplicada: data.solucionAplicada,
        observaciones: data.observaciones,
        urlFotosAntesPdf: data.urlFotosAntesPdf,
        urlFotosDespuesPdf: data.urlFotosDespuesPdf,
        urlOrdenTrabajoPdf: data.urlOrdenTrabajoPdf,
        planMantenimientoId: data.planMantenimientoId,
        creadoEn: data.creadoEn || new Date(),
        actualizadoEn: data.actualizadoEn || new Date(),
        creadoPor: data.creadoPor,
        actualizadoPor: data.actualizadoPor,
      };
            
      // 6. Crear la OT con los números generados (patrón estándar)
      const creada = await tx.oTMantenimiento.create({ data: datosLimpios });

      // 7. Estado automático: al crear sin contratistas será PENDIENTE,
      //    salvo que el usuario haya elegido un estado de cierre manual.
      creada.estadoId = await actualizarEstadoOT(creada.id, data.estadoId, tx);

      return creada;
    });
  } catch (err) {
    // console.error("=== ERROR AL CREAR OT ===");
    // console.error("Tipo de error:", err.constructor.name);
    // console.error("Código:", err.code);
    // console.error("Mensaje:", err.message);
    // console.error("Stack:", err.stack);
    if (err.meta) console.error("Meta:", err.meta);
    
    if (err instanceof ValidationError || err instanceof ConflictError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza una OT existente, validando existencia, unicidad y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.oTMantenimiento.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("OTMantenimiento no encontrada");
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });

    // Validar campos obligatorios
    if (data.tipoDocumentoId === undefined || data.tipoDocumentoId === null) {
      throw new ValidationError("El campo tipoDocumentoId es obligatorio.");
    }
    if (data.serieDocId === undefined || data.serieDocId === null) {
      throw new ValidationError("El campo serieDocId es obligatorio.");
    }
    if (data.numeroSerie === undefined || data.numeroSerie === null) {
      throw new ValidationError("El campo numeroSerie es obligatorio.");
    }
    if (
      data.numeroCorrelativo === undefined ||
      data.numeroCorrelativo === null
    ) {
      throw new ValidationError("El campo numeroCorrelativo es obligatorio.");
    }
    if (data.numeroCompleto === undefined || data.numeroCompleto === null) {
      throw new ValidationError("El campo numeroCompleto es obligatorio.");
    }
    if (data.monedaId === undefined || data.monedaId === null) {
      throw new ValidationError("El campo monedaId es obligatorio.");
    }

    // Limpiar data: eliminar campos null y strings vacíos opcionales
    const dataLimpia = { ...data };
    Object.keys(dataLimpia).forEach((key) => {
      if (dataLimpia[key] === null || dataLimpia[key] === "") {
        delete dataLimpia[key];
      }
    });

    // Estado automático: si NO es un estado manual de cierre, se recalcula.
    const estadoSolicitado = data.estadoId ?? existente.estadoId;
    if (!ESTADOS_OT_MANUALES.includes(BigInt(estadoSolicitado || 0))) {
      dataLimpia.estadoId = await determinarEstadoOT(id, estadoSolicitado);
    }

    const ot = await prisma.oTMantenimiento.update({
      where: { id },
      data: dataLimpia,
    });

    // Recalcular montos de los presupuestos y totales de la OT al grabarla
    try {
      await documentoCompraPresupuestoService.recalcularMontosOT(ot.id);
    } catch (e) {
      console.error("No se pudieron recalcular los montos de la OT:", e.message);
    }
    return ot;
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
 * Elimina una OT por ID, validando existencia y que no tenga tareas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.oTMantenimiento.findUnique({
      where: { id },
      include: {
        contratistas: true,
      },
    });
    if (!existente) throw new NotFoundError("OTMantenimiento no encontrada");

    // Validar que no tenga contratistas asociados (se eliminan en cascada pero validamos)
    if (existente.contratistas && existente.contratistas.length > 0) {
      throw new ConflictError(
        "No se puede eliminar la orden de trabajo porque tiene contratistas asociados.",
      );
    }

    // Validar que no tenga entrega a rendir (la relación ya no existe; se consulta por la columna)
    const entrega = await prisma.entregaARendirOTMantenimiento.findUnique({
      where: { otMantenimientoId: id },
    });
    if (entrega) {
      throw new ConflictError(
        "No se puede eliminar la orden de trabajo porque tiene una entrega a rendir asociada.",
      );
    }

    await prisma.oTMantenimiento.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  actualizarEstadoOT,
};
