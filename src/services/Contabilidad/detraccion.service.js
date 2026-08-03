import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { ESTADO_DETRACCION } from "../../utils/estados.constants.js";

/**
 * Maneja errores de Prisma y los convierte en errores específicos
 */
function manejarErrorPrisma(err, contexto = "operación") {
  if (!err.code || !err.code.startsWith("P")) {
    throw err;
  }

  if (err.code === "P2002") {
    const target = err.meta?.target;
    if (target?.includes("numeroConstancia")) {
      throw new ValidationError(
        `El número de constancia ya existe. Por favor, ingrese un número diferente.`
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
 * Valida los datos de una detracción
 */
async function validarDetraccion(data) {
  if (data.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });
    if (!empresa) {
      throw new ValidationError("La empresa referenciada no existe.");
    }
  }

  if (data.clienteId) {
    const cliente = await prisma.entidadComercial.findUnique({
      where: { id: data.clienteId },
    });
    if (!cliente) {
      throw new ValidationError("El cliente referenciado no existe.");
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

  // Validar duplicidad de número de constancia
  if (data.numeroConstancia) {
    const detraccionDuplicada = await prisma.detraccion.findFirst({
      where: {
        numeroConstancia: data.numeroConstancia,
        empresaId: data.empresaId,
        ...(data.id && { id: { not: data.id } }),
      },
    });

    if (detraccionDuplicada) {
      throw new ValidationError(
        `El número de constancia "${data.numeroConstancia}" ya existe en esta empresa.`
      );
    }
  }
}

const listar = async () => {
  try {
    return await prisma.detraccion.findMany({
      include: {
        empresa: true,
        cliente: true,
        tipoDetraccion: true,
        moneda: true,
        estado: true,
        cuentaSunat: true,
        periodoContable: true,
        detalles: {
          include: {
            preFacturaOrigen: true,
          },
        },
      },
      orderBy: { fechaDeposito: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "listar detracciones");
  }
};

const obtenerPorId = async (id) => {
  try {
    const detraccion = await prisma.detraccion.findUnique({
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        tipoDetraccion: true,
        moneda: true,
        estado: true,
        cuentaSunat: true,
        periodoContable: true,
        detalles: {
          include: {
            preFacturaOrigen: true,
          },
        },
      },
    });

    if (!detraccion) throw new NotFoundError("Detracción no encontrada");
    return detraccion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    manejarErrorPrisma(err, "obtener detracción");
  }
};

const crear = async (data) => {
  try {
    if (
      !data.empresaId ||
      !data.numeroConstancia ||
      !data.fechaDeposito ||
      !data.clienteId ||
      !data.monedaId
    ) {
      throw new ValidationError(
        "Los campos empresaId, numeroConstancia, fechaDeposito, clienteId y monedaId son obligatorios."
      );
    }

    // Siempre crear en estado PENDIENTE
    const estadoPendiente = await prisma.estadoMultiFuncion.findUnique({
      where: { id: Number(ESTADO_DETRACCION.PENDIENTE) },
    });
    if (!estadoPendiente) {
      throw new ValidationError("Estado PENDIENTE (126) no encontrado en el sistema.");
    }
    data.estadoId = Number(ESTADO_DETRACCION.PENDIENTE);

    await validarDetraccion(data);

    return await prisma.$transaction(async (tx) => {
      const detraccion = await tx.detraccion.create({
        data: {
          empresaId: data.empresaId,
          numeroConstancia: data.numeroConstancia,
          fechaDeposito: new Date(data.fechaDeposito),
          clienteId: data.clienteId,
          tipoDetraccionId: data.tipoDetraccionId || null,
          tasaDetraccion: data.tasaDetraccion || 0,
          monedaId: data.monedaId,
          importeTotal: data.importeTotal || 0,
          importeDetraido: data.importeDetraido || 0,
          cuentaSunatId: data.cuentaSunatId || null,
          estadoId: data.estadoId,
          aplicado: data.aplicado || false,
          fechaAplicacion: data.fechaAplicacion ? new Date(data.fechaAplicacion) : null,
          observaciones: data.observaciones || null,
          fechaContable: data.fechaContable ? new Date(data.fechaContable) : new Date(),
          periodoContableId: data.periodoContableId || null,
          refOperacionEspecializadaMovCaja: data.refOperacionEspecializadaMovCaja || null,
          creadoPor: data.creadoPor,
          actualizadoPor: data.creadoPor,
        },
      });

      // Crear detalles si vienen
      if (data.detalles && data.detalles.length > 0) {
        await Promise.all(
          data.detalles.map((detalle) =>
            tx.detalleDetraccion.create({
              data: {
                detraccionId: detraccion.id,
                preFacturaOrigenId: detalle.preFacturaOrigenId,
                importeTotal: detalle.importeTotal || 0,
                importeDetraido: detalle.importeDetraido || 0,
              },
            })
          )
        );
      }

      return await tx.detraccion.findUnique({
        where: { id: detraccion.id },
        include: {
          empresa: true,
          cliente: true,
          tipoDetraccion: true,
          moneda: true,
          estado: true,
          cuentaSunat: true,
          periodoContable: true,
          detalles: {
            include: {
              preFacturaOrigen: true,
            },
          },
        },
      });
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    manejarErrorPrisma(err, "crear detracción");
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detraccion.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("Detracción no encontrada");

    // Solo se pueden modificar detracciones PENDIENTE
    const estadoId = Number(existente.estadoId);

    if (estadoId !== ESTADO_DETRACCION.PENDIENTE) {
      throw new ConflictError(
        "Solo se pueden modificar detracciones en estado PENDIENTE."
      );
    }

    await validarDetraccion({ ...data, id });

    return await prisma.$transaction(async (tx) => {
      await tx.detraccion.update({
        where: { id },
        data: {
          numeroConstancia: data.numeroConstancia,
          fechaDeposito: data.fechaDeposito ? new Date(data.fechaDeposito) : undefined,
          clienteId: data.clienteId,
          tipoDetraccionId: data.tipoDetraccionId,
          tasaDetraccion: data.tasaDetraccion,
          monedaId: data.monedaId,
          importeTotal: data.importeTotal,
          importeDetraido: data.importeDetraido,
          cuentaSunatId: data.cuentaSunatId,
          aplicado: data.aplicado,
          fechaAplicacion: data.fechaAplicacion ? new Date(data.fechaAplicacion) : null,
          observaciones: data.observaciones,
          fechaContable: data.fechaContable ? new Date(data.fechaContable) : undefined,
          periodoContableId: data.periodoContableId,
          actualizadoPor: data.actualizadoPor,
        },
      });

      if (data.detalles) {
        // Eliminar detalles existentes
        await tx.detalleDetraccion.deleteMany({
          where: { detraccionId: id },
        });

        // Crear nuevos detalles
        if (data.detalles.length > 0) {
          await Promise.all(
            data.detalles.map((detalle) =>
              tx.detalleDetraccion.create({
                data: {
                  detraccionId: id,
                  preFacturaOrigenId: detalle.preFacturaOrigenId,
                  importeTotal: detalle.importeTotal || 0,
                  importeDetraido: detalle.importeDetraido || 0,
                },
              })
            )
          );
        }
      }

      return await tx.detraccion.findUnique({
        where: { id },
        include: {
          empresa: true,
          cliente: true,
          tipoDetraccion: true,
          moneda: true,
          estado: true,
          cuentaSunat: true,
          periodoContable: true,
          detalles: {
            include: {
              preFacturaOrigen: true,
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
    manejarErrorPrisma(err, "actualizar detracción");
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detraccion.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!existente) throw new NotFoundError("Detracción no encontrada");

    // Solo se pueden eliminar detracciones en estado PENDIENTE
    if (Number(existente.estadoId) !== ESTADO_DETRACCION.PENDIENTE) {
      throw new ConflictError(
        "Solo se pueden eliminar detracciones en estado PENDIENTE."
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.detalleDetraccion.deleteMany({
        where: { detraccionId: id },
      });

      await tx.detraccion.delete({
        where: { id },
      });
    });

    return { eliminado: true, id };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    manejarErrorPrisma(err, "eliminar detracción");
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.detraccion.findMany({
      where: { empresaId },
      include: {
        empresa: true,
        cliente: true,
        tipoDetraccion: true,
        moneda: true,
        estado: true,
        cuentaSunat: true,
        periodoContable: true,
        detalles: {
          include: {
            preFacturaOrigen: true,
          },
        },
      },
      orderBy: { fechaDeposito: "desc" },
    });
  } catch (err) {
    manejarErrorPrisma(err, "listar detracciones por empresa");
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