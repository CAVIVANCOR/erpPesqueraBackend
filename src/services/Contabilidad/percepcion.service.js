import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { ESTADO_PERCEPCION } from "../../utils/estados.constants.js";

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
 * Valida los datos de una percepción
 */
async function validarPercepcion(data) {
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
    const percepcionDuplicada = await prisma.percepcion.findFirst({
      where: {
        numeroDocumento: data.numeroDocumento,
        empresaId: data.empresaId,
        ...(data.id && { id: { not: data.id } }),
      },
    });

    if (percepcionDuplicada) {
      throw new ValidationError(
        `El número de documento "${data.numeroDocumento}" ya existe en esta empresa.`
      );
    }
  }
}

const listar = async () => {
  try {
    return await prisma.percepcion.findMany({
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoDocProveedor: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true,
        ordenCompra: true,
        cuentaPorPagar: true,
        detalles: {
          include: {
            tipoDocumento: true,
          },
        },
      },
      orderBy: { fechaEmision: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "listar percepciones");
  }
};

const obtenerPorId = async (id) => {
  try {
    const percepcion = await prisma.percepcion.findUnique({
      where: { id },
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoDocProveedor: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true,
        ordenCompra: true,
        cuentaPorPagar: true,
        detalles: {
          include: {
            tipoDocumento: true,
          },
        },
      },
    });

    if (!percepcion) throw new NotFoundError("Percepción no encontrada");
    return percepcion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    manejarErrorPrisma(err, "obtener percepción");
  }
};

const crear = async (data) => {
  try {
    if (
      !data.empresaId ||
      !data.tipoDocumentoId ||
      !data.fechaEmision ||
      !data.fechaCobro ||
      !data.proveedorId ||
      !data.tipoPercepcionId ||
      !data.monedaId
    ) {
      throw new ValidationError(
        "Los campos empresaId, tipoDocumentoId, fechaEmision, fechaCobro, proveedorId, tipoPercepcionId y monedaId son obligatorios."
      );
    }

    // Siempre crear en estado PENDIENTE
    const estadoPendiente = await prisma.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_PERCEPCION.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (132) no encontrado en el sistema.");
    }
    data.estadoId = Number(ESTADO_PERCEPCION.PENDIENTE);

    await validarPercepcion(data);

    return await prisma.$transaction(async (tx) => {
      const percepcion = await tx.percepcion.create({
        data: {
          empresaId: data.empresaId,
          tipoDocumentoId: data.tipoDocumentoId,
          serieDocId: data.serieDocId || null,
          numSerieDoc: data.numSerieDoc || null,
          numCorreDoc: data.numCorreDoc || null,
          numeroDocumento: data.numeroDocumento || null,
          fechaEmision: new Date(data.fechaEmision),
          fechaCobro: new Date(data.fechaCobro),
          proveedorId: data.proveedorId,
          tipoDocProveedorId: data.tipoDocProveedorId,
          numeroDocProveedor: data.numeroDocProveedor || "",
          razonSocialProveedor: data.razonSocialProveedor || "",
          tipoPercepcionId: data.tipoPercepcionId,
          tasaPercepcion: data.tasaPercepcion || 0,
          monedaId: data.monedaId,
          importeTotal: data.importeTotal || 0,
          importePercibido: data.importePercibido || 0,
          importePagado: data.importePagado || 0,
          ordenCompraId: data.ordenCompraId || null,
          cuentaPorPagarId: data.cuentaPorPagarId || null,
          estadoId: data.estadoId,
          aplicadaCredito: data.aplicadaCredito || false,
          fechaAplicacion: data.fechaAplicacion ? new Date(data.fechaAplicacion) : null,
          periodoAplicacion: data.periodoAplicacion || null,
          observaciones: data.observaciones || null,
          creadoPor: data.creadoPor,
        },
      });

      // Crear detalles si vienen
      if (data.detalles && data.detalles.length > 0) {
        await Promise.all(
          data.detalles.map((detalle) =>
            tx.detallePercepcion.create({
              data: {
                percepcionId: percepcion.id,
                tipoDocumentoId: detalle.tipoDocumentoId,
                numeroDocumento: detalle.numeroDocumento || "",
                fechaEmision: new Date(detalle.fechaEmision),
                importeTotal: detalle.importeTotal || 0,
                importePercibido: detalle.importePercibido || 0,
              },
            })
          )
        );
      }

      return await tx.percepcion.findUnique({
        where: { id: percepcion.id },
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          tipoDocProveedor: true,
          tipoPercepcion: true,
          moneda: true,
          estado: true,
          ordenCompra: true,
          cuentaPorPagar: true,
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
    manejarErrorPrisma(err, "crear percepción");
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.percepcion.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Percepción no encontrada");

    // Solo se pueden modificar percepciones PENDIENTE
    const estadoId = Number(existente.estadoId);

    if (estadoId !== ESTADO_PERCEPCION.PENDIENTE) {
      throw new ConflictError(
        "Solo se pueden modificar percepciones en estado PENDIENTE."
      );
    }

    await validarPercepcion({ ...data, id });

    return await prisma.$transaction(async (tx) => {
      await tx.percepcion.update({
        where: { id },
        data: {
          tipoDocumentoId: data.tipoDocumentoId,
          serieDocId: data.serieDocId,
          numSerieDoc: data.numSerieDoc,
          numCorreDoc: data.numCorreDoc,
          numeroDocumento: data.numeroDocumento,
          fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : undefined,
          fechaCobro: data.fechaCobro ? new Date(data.fechaCobro) : undefined,
          proveedorId: data.proveedorId,
          tipoDocProveedorId: data.tipoDocProveedorId,
          numeroDocProveedor: data.numeroDocProveedor,
          razonSocialProveedor: data.razonSocialProveedor,
          tipoPercepcionId: data.tipoPercepcionId,
          tasaPercepcion: data.tasaPercepcion,
          monedaId: data.monedaId,
          importeTotal: data.importeTotal,
          importePercibido: data.importePercibido,
          importePagado: data.importePagado,
          ordenCompraId: data.ordenCompraId,
          cuentaPorPagarId: data.cuentaPorPagarId,
          aplicadaCredito: data.aplicadaCredito,
          fechaAplicacion: data.fechaAplicacion ? new Date(data.fechaAplicacion) : null,
          periodoAplicacion: data.periodoAplicacion,
          observaciones: data.observaciones,
        },
      });

      if (data.detalles) {
        // Eliminar detalles existentes
        await tx.detallePercepcion.deleteMany({
          where: { percepcionId: id },
        });

        // Crear nuevos detalles
        if (data.detalles.length > 0) {
          await Promise.all(
            data.detalles.map((detalle) =>
              tx.detallePercepcion.create({
                data: {
                  percepcionId: id,
                  tipoDocumentoId: detalle.tipoDocumentoId,
                  numeroDocumento: detalle.numeroDocumento || "",
                  fechaEmision: new Date(detalle.fechaEmision),
                  importeTotal: detalle.importeTotal || 0,
                  importePercibido: detalle.importePercibido || 0,
                },
              })
            )
          );
        }
      }

      return await tx.percepcion.findUnique({
        where: { id },
        include: {
          empresa: true,
          tipoDocumento: true,
          serieDoc: true,
          proveedor: true,
          tipoDocProveedor: true,
          tipoPercepcion: true,
          moneda: true,
          estado: true,
          ordenCompra: true,
          cuentaPorPagar: true,
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
    manejarErrorPrisma(err, "actualizar percepción");
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.percepcion.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!existente) throw new NotFoundError("Percepción no encontrada");

    // Solo se pueden eliminar percepciones en estado PENDIENTE
    if (Number(existente.estadoId) !== ESTADO_PERCEPCION.PENDIENTE) {
      throw new ConflictError(
        "Solo se pueden eliminar percepciones en estado PENDIENTE."
      );
    }
    
    await prisma.$transaction(async (tx) => {
      await tx.detallePercepcion.deleteMany({
        where: { percepcionId: id },
      });

      await tx.percepcion.delete({
        where: { id },
      });
    });

    return { eliminado: true, id };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    manejarErrorPrisma(err, "eliminar percepción");
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.percepcion.findMany({
      where: { empresaId },
      include: {
        empresa: true,
        tipoDocumento: true,
        serieDoc: true,
        proveedor: true,
        tipoDocProveedor: true,
        tipoPercepcion: true,
        moneda: true,
        estado: true,
        ordenCompra: true,
        cuentaPorPagar: true,
        detalles: {
          include: {
            tipoDocumento: true,
          },
        },
      },
      orderBy: { fechaEmision: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "listar percepciones por empresa");
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