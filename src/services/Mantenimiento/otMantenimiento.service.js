import prisma from "../../config/prismaClient.js";
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
          select: {
            id: true,
            numeroLinea: true,
            servicioDescripcion: true,
            montoPactado: true,
            montoPagado: true,
            saldo: true,
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
          },
          orderBy: { numeroLinea: "asc" },
        },
        permisosGestionados: {
          select: {
            id: true,
            permisoAutorizacionId: true,
            gestionado: true,
            fechaGestion: true,
            urlPermisoAutorizacion: true,
          },
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
            productoServicio: true,
            activo: true,
            moneda: true,
            estado: true,
            preFactura: true,
            repuestos: {
              include: {
                producto: {
                  include: {
                    unidadMedida: true,
                  },
                },
                moneda: true,
                ordenCompra: true,
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { numeroLinea: "asc" },
        },
        permisosGestionados: {
          include: {
            permisoAutorizacion: true,
          },
        },
        entregaARendir: {
          include: {
            respEntregaRendir: true,
            respLiquidacion: true,
            centroCosto: true,
            detallesMovimientos: {
              include: {
                tipoMovimiento: true,
                responsable: true,
                entidadComercial: true,
                producto: true,
                moneda: true,
                tipoDocumento: true,
              },
              orderBy: { fechaMovimiento: "asc" },
            },
          },
        },
      },
    });
    if (!ot) throw new NotFoundError("OTMantenimiento no encontrada");
    return ot;
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
      return await tx.oTMantenimiento.create({ data: datosLimpios });
    });
  } catch (err) {
    console.error("=== ERROR AL CREAR OT ===");
    console.error("Tipo de error:", err.constructor.name);
    console.error("Código:", err.code);
    console.error("Mensaje:", err.message);
    console.error("Stack:", err.stack);
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

    return await prisma.oTMantenimiento.update({
      where: { id },
      data: dataLimpia,
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
 * Elimina una OT por ID, validando existencia y que no tenga tareas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.oTMantenimiento.findUnique({
      where: { id },
      include: {
        contratistas: true,
        permisosGestionados: true,
        entregaARendir: true,
      },
    });
    if (!existente) throw new NotFoundError("OTMantenimiento no encontrada");

    // Validar que no tenga contratistas asociados (se eliminan en cascada pero validamos)
    if (existente.contratistas && existente.contratistas.length > 0) {
      throw new ConflictError(
        "No se puede eliminar la orden de trabajo porque tiene contratistas asociados.",
      );
    }

    // Validar que no tenga entrega a rendir
    if (existente.entregaARendir) {
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
};
