import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { ESTADO_RETENCION } from "../../utils/estados.constants.js";

/**
 * Maneja errores de Prisma y los convierte en errores específicos
 */
function manejarErrorPrisma(err, contexto = "operación") {
  if (!err.code || !err.code.startsWith("P")) {
    throw err;
  }

  if (err.code === "P2002") {
    const target = err.meta?.target;
    if (target?.includes("numeroDocumento")) {
      throw new ValidationError(
        `El número de documento ya existe. Por favor, ingrese un número diferente.`
      );
    }
    throw new ValidationError("Ya existe un registro con estos datos únicos.");
  }

  if (err.code === "P2003") {
    const field = err.meta?.field_name;
    throw new ValidationError(
      `Referencia inválida en el campo ${field || "desconocido"}. El registro relacionado no existe.`
    );
  }

  if (err.code === "P2025") {
    throw new NotFoundError(
      `No se encontró el registro para ${contexto}. Es posible que haya sido eliminado.`
    );
  }

  throw new DatabaseError(
    `Error de base de datos en ${contexto}: ${err.code}`,
    err.message
  );
}

/**
 * Valida los datos de una retención
 */
async function validarRetencion(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa) {
      throw new ValidationError("La empresa referenciada no existe.");
    }
  }

  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({
      where: { id: data.proveedorId },
    });
    if (!proveedor) {
      throw new ValidationError("El proveedor referenciado no existe.");
    }
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({
      where: { id: data.monedaId },
    });
    if (!moneda) {
      throw new ValidationError("La moneda referenciada no existe.");
    }
  }

  if (data.estadoId) {
    const estado = await prisma.estadoMultiFuncion.findUnique({
      where: { id: data.estadoId },
    });
    if (!estado) {
      throw new ValidationError("El estado referenciado no existe.");
    }
  }

  if (data.tipoDocumentoId) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({
      where: { id: data.tipoDocumentoId },
    });
    if (!tipoDoc) {
      throw new ValidationError("El tipo de documento referenciado no existe.");
    }
  }

  // Validar duplicidad de número de documento
  if (data.numeroDocumento) {
    const retencionDuplicada = await prisma.retencion.findFirst({
      where: {
        numeroDocumento: data.numeroDocumento,
        empresaId: data.empresaId,
        ...(data.id && { id: { not: data.id } }),
      },
    });

    if (retencionDuplicada) {
      throw new ValidationError(
        `El número de documento "${data.numeroDocumento}" ya existe en esta empresa.`
      );
    }
  }
}

const listar = async () => {
  try {
    return await prisma.retencion.findMany({
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoDocProveedor: true,
        tipoRetencion: true,
        moneda: true,
        estado: true,
        cuentaPorPagar: true,
        movimientoCaja: true,
        detalles: {
          include: {
            tipoDocumento: true,
          },
        },
      },
      orderBy: { fechaEmision: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "listar retenciones");
  }
};

const obtenerPorId = async (id) => {
  try {
    const retencion = await prisma.retencion.findUnique({
      where: { id },
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoDocProveedor: true,
        tipoRetencion: true,
        moneda: true,
        estado: true,
        cuentaPorPagar: true,
        movimientoCaja: true,
        detalles: {
          include: {
            tipoDocumento: true,
          },
        },
      },
    });

    if (!retencion) throw new NotFoundError("Retención no encontrada");
    return retencion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    manejarErrorPrisma(err, "obtener retención");
  }
};

const crear = async (data) => {
  try {
    if (
      !data.empresaId ||
      !data.tipoDocumentoId ||
      !data.fechaEmision ||
      !data.fechaPago ||
      !data.proveedorId ||
      !data.tipoRetencionId ||
      !data.monedaId
    ) {
      throw new ValidationError(
        "Los campos empresaId, tipoDocumentoId, fechaEmision, fechaPago, proveedorId, tipoRetencionId y monedaId son obligatorios."
      );
    }

       // Siempre crear en estado PENDIENTE
    const estadoPendiente = await prisma.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_RETENCION.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (129) no encontrado en el sistema.");
    }
    data.estadoId = Number(ESTADO_RETENCION.PENDIENTE);

    await validarRetencion(data);

    return await prisma.$transaction(async (tx) => {
      const retencion = await tx.retencion.create({
        data: {
          empresaId: data.empresaId,
          tipoDocumentoId: data.tipoDocumentoId,
          serieDocId: data.serieDocId || null,
          numSerieDoc: data.numSerieDoc || null,
          numCorreDoc: data.numCorreDoc || null,
          numeroDocumento: data.numeroDocumento || null,
          fechaEmision: new Date(data.fechaEmision),
          fechaPago: new Date(data.fechaPago),
          proveedorId: data.proveedorId,
          tipoDocProveedorId: data.tipoDocProveedorId,
          numeroDocProveedor: data.numeroDocProveedor || "",
          razonSocialProveedor: data.razonSocialProveedor || "",
          tipoRetencionId: data.tipoRetencionId,
          tasaRetencion: data.tasaRetencion || 0,
          monedaId: data.monedaId,
          importeTotal: data.importeTotal || 0,
          importeRetenido: data.importeRetenido || 0,
          importeNeto: data.importeNeto || 0,
          cuentaPorPagarId: data.cuentaPorPagarId || null,
          movimientoCajaId: data.movimientoCajaId || null,
          nubefactEnviado: data.nubefactEnviado || false,
          nubefactAceptado: data.nubefactAceptado || null,
          nubefactEnlacePDF: data.nubefactEnlacePDF || null,
          nubefactEnlaceXML: data.nubefactEnlaceXML || null,
          nubefactRespuesta: data.nubefactRespuesta || null,
          estadoId: data.estadoId,
          periodoDeclaracion: data.periodoDeclaracion || null,
          declarado: data.declarado || false,
          fechaDeclaracion: data.fechaDeclaracion ? new Date(data.fechaDeclaracion) : null,
          observaciones: data.observaciones || null,
          creadoPor: data.creadoPor,
        },
      });

      // Crear detalles si vienen
      if (data.detalles && data.detalles.length > 0) {
        await Promise.all(
          data.detalles.map((detalle) =>
            tx.detalleRetencion.create({
              data: {
                retencionId: retencion.id,
                tipoDocumentoId: detalle.tipoDocumentoId,
                numeroDocumento: detalle.numeroDocumento || "",
                fechaEmision: new Date(detalle.fechaEmision),
                importeTotal: detalle.importeTotal || 0,
                importeRetenido: detalle.importeRetenido || 0,
                importeNeto: detalle.importeNeto || 0,
                fechaPago: new Date(detalle.fechaPago),
                numeroPago: detalle.numeroPago || null,
              },
            })
          )
        );
      }

      return await tx.retencion.findUnique({
        where: { id: retencion.id },
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          tipoDocProveedor: true,
          tipoRetencion: true,
          moneda: true,
          estado: true,
          cuentaPorPagar: true,
          movimientoCaja: true,
          detalles: {
            include: {
              tipoDocumento: true,
            },
          },
        },
      });
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    manejarErrorPrisma(err, "crear retención");
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.retencion.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Retención no encontrada");

     // Solo se pueden modificar retenciones PENDIENTE
    const estadoId = Number(existente.estadoId);

    if (estadoId !== ESTADO_RETENCION.PENDIENTE) {
      throw new ConflictError(
        "Solo se pueden modificar retenciones en estado PENDIENTE."
      );
    }

    await validarRetencion({ ...data, id });

    return await prisma.$transaction(async (tx) => {
      await tx.retencion.update({
        where: { id },
        data: {
          tipoDocumentoId: data.tipoDocumentoId,
          serieDocId: data.serieDocId,
          numSerieDoc: data.numSerieDoc,
          numCorreDoc: data.numCorreDoc,
          numeroDocumento: data.numeroDocumento,
          fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : undefined,
          fechaPago: data.fechaPago ? new Date(data.fechaPago) : undefined,
          proveedorId: data.proveedorId,
          tipoDocProveedorId: data.tipoDocProveedorId,
          numeroDocProveedor: data.numeroDocProveedor,
          razonSocialProveedor: data.razonSocialProveedor,
          tipoRetencionId: data.tipoRetencionId,
          tasaRetencion: data.tasaRetencion,
          monedaId: data.monedaId,
          importeTotal: data.importeTotal,
          importeRetenido: data.importeRetenido,
          importeNeto: data.importeNeto,
          cuentaPorPagarId: data.cuentaPorPagarId,
          movimientoCajaId: data.movimientoCajaId,
          nubefactEnviado: data.nubefactEnviado,
          nubefactAceptado: data.nubefactAceptado,
          nubefactEnlacePDF: data.nubefactEnlacePDF,
          nubefactEnlaceXML: data.nubefactEnlaceXML,
          nubefactRespuesta: data.nubefactRespuesta,
          periodoDeclaracion: data.periodoDeclaracion,
          declarado: data.declarado,
          fechaDeclaracion: data.fechaDeclaracion ? new Date(data.fechaDeclaracion) : null,
          observaciones: data.observaciones,
        },
      });

      if (data.detalles) {
        // Eliminar detalles existentes
        await tx.detalleRetencion.deleteMany({
          where: { retencionId: id },
        });

        // Crear nuevos detalles
        if (data.detalles.length > 0) {
          await Promise.all(
            data.detalles.map((detalle) =>
              tx.detalleRetencion.create({
                data: {
                  retencionId: id,
                  tipoDocumentoId: detalle.tipoDocumentoId,
                  numeroDocumento: detalle.numeroDocumento || "",
                  fechaEmision: new Date(detalle.fechaEmision),
                  importeTotal: detalle.importeTotal || 0,
                  importeRetenido: detalle.importeRetenido || 0,
                  importeNeto: detalle.importeNeto || 0,
                  fechaPago: new Date(detalle.fechaPago),
                  numeroPago: detalle.numeroPago || null,
                },
              })
            )
          );
        }
      }

      return await tx.retencion.findUnique({
        where: { id },
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          tipoDocProveedor: true,
          tipoRetencion: true,
          moneda: true,
          estado: true,
          cuentaPorPagar: true,
          movimientoCaja: true,
          detalles: {
            include: {
              tipoDocumento: true,
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
    manejarErrorPrisma(err, "actualizar retención");
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.retencion.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!existente) throw new NotFoundError("Retención no encontrada");

     // Solo se pueden eliminar retenciones en estado PENDIENTE
    if (Number(existente.estadoId) !== ESTADO_RETENCION.PENDIENTE) {
      throw new ConflictError(
        "Solo se pueden eliminar retenciones en estado PENDIENTE."
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.detalleRetencion.deleteMany({
        where: { retencionId: id },
      });

      await tx.retencion.delete({
        where: { id },
      });
    });

    return { eliminado: true, id };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    manejarErrorPrisma(err, "eliminar retención");
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.retencion.findMany({
      where: { empresaId },
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoDocProveedor: true,
        tipoRetencion: true,
        moneda: true,
        estado: true,
        cuentaPorPagar: true,
        movimientoCaja: true,
        detalles: {
          include: {
            tipoDocumento: true,
          },
        },
      },
      orderBy: { fechaEmision: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "listar retenciones por empresa");
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
};