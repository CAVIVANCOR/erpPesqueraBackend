import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para FlujoCajaProyectado
 * Gestiona las proyecciones de flujo de caja
 */

const incluirRelaciones = {
  empresa: {
    select: {
      id: true,
      razonSocial: true,
      ruc: true,
    },
  },
  estado: {
    select: {
      id: true,
      descripcion: true,
      severityColor: true,
    },
  },
  aprobador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
};

async function validarFlujoCajaProyectado(data) {
  if (!data.empresaId || !data.periodo || !data.estadoId) {
    throw new ValidationError("Empresa, periodo y estado son obligatorios");
  }
  const empresa = await prisma.empresa.findUnique({
    where: { id: data.empresaId },
  });
  if (!empresa) throw new ValidationError("La empresa referenciada no existe");

  const estado = await prisma.estadoMultiFuncion.findUnique({
    where: { id: data.estadoId },
  });
  if (!estado) throw new ValidationError("El estado referenciado no existe");
  if (data.aprobadoPor) {
    const personal = await prisma.personal.findUnique({
      where: { id: data.aprobadoPor },
    });
    if (!personal) throw new ValidationError("El personal aprobador no existe");
  }

  if (data.creadoPor) {
    const personal = await prisma.personal.findUnique({
      where: { id: data.creadoPor },
    });
    if (!personal) throw new ValidationError("El personal creador no existe");
  }

  const existente = await prisma.flujoCajaProyectado.findFirst({
    where: {
      empresaId: data.empresaId,
      periodo: data.periodo,
      id: data.id ? { not: data.id } : undefined,
    },
  });

  if (existente) {
    throw new ConflictError(
      "Ya existe una proyección de flujo de caja para esta empresa y periodo",
    );
  }
}

const listar = async () => {
  try {
    return await prisma.flujoCajaProyectado.findMany({
      include: incluirRelaciones,
      orderBy: [{ periodo: "desc" }, { empresa: { razonSocial: "asc" } }],
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const flujo = await prisma.flujoCajaProyectado.findUnique({
      where: { id },
      include: incluirRelaciones,
    });
    if (!flujo)
      throw new NotFoundError("Flujo de caja proyectado no encontrado");
    return flujo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarFlujoCajaProyectado(data);

    return await prisma.flujoCajaProyectado.create({
      data: {
        empresaId: data.empresaId,
        periodo: data.periodo,
        fechaProyeccion: data.fechaProyeccion
          ? new Date(data.fechaProyeccion)
          : new Date(),
        estadoId: data.estadoId,
        aprobadoPor: data.aprobadoPor || null,
        fechaAprobacion: data.fechaAprobacion
          ? new Date(data.fechaAprobacion)
          : null,
        observaciones: data.observaciones || null,
        creadoPor: data.creadoPor || null,
      },
      include: incluirRelaciones,
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError)
      throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.flujoCajaProyectado.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("Flujo de caja proyectado no encontrado");

    await validarFlujoCajaProyectado({ ...data, id });

    return await prisma.flujoCajaProyectado.update({
      where: { id },
      data: {
        empresaId: data.empresaId,
        periodo: data.periodo,
        fechaProyeccion: data.fechaProyeccion
          ? new Date(data.fechaProyeccion)
          : undefined,
        estadoId: data.estadoId,
        aprobadoPor: data.aprobadoPor,
        fechaAprobacion: data.fechaAprobacion
          ? new Date(data.fechaAprobacion)
          : undefined,
        observaciones: data.observaciones,
      },
      include: incluirRelaciones,
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

const eliminar = async (id) => {
  try {
    const existente = await prisma.flujoCajaProyectado.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("Flujo de caja proyectado no encontrado");

    await prisma.flujoCajaProyectado.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const listarPorEmpresa = async (empresaId) => {
  try {
    return await prisma.flujoCajaProyectado.findMany({
      where: { empresaId },
      include: incluirRelaciones,
      orderBy: { periodo: "desc" },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

const obtenerPorEmpresaPeriodo = async (empresaId, periodo) => {
  try {
    const flujo = await prisma.flujoCajaProyectado.findFirst({
      where: {
        empresaId,
        periodo,
      },
      include: incluirRelaciones,
    });
    if (!flujo)
      throw new NotFoundError(
        "Flujo de caja proyectado no encontrado para esta empresa y periodo",
      );
    return flujo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos", err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorEmpresa,
  obtenerPorEmpresaPeriodo,
};
