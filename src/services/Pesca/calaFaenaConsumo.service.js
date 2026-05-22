import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para CalaFaenaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene especies asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const validaciones = [];

  if (data.bahiaId) {
    validaciones.push(
      prisma.personal
        .findUnique({ where: { id: data.bahiaId } })
        .then((result) => ({ campo: "bahiaId", existe: !!result })),
    );
  }

  if (data.motoristaId) {
    validaciones.push(
      prisma.personal
        .findUnique({ where: { id: data.motoristaId } })
        .then((result) => ({ campo: "motoristaId", existe: !!result })),
    );
  }

  if (data.patronId) {
    validaciones.push(
      prisma.personal
        .findUnique({ where: { id: data.patronId } })
        .then((result) => ({ campo: "patronId", existe: !!result })),
    );
  }

  if (data.embarcacionId) {
    validaciones.push(
      prisma.embarcacion
        .findUnique({ where: { id: data.embarcacionId } })
        .then((result) => ({ campo: "embarcacionId", existe: !!result })),
    );
  }

  if (data.faenaPescaConsumoId) {
    validaciones.push(
      prisma.faenaPescaConsumo
        .findUnique({ where: { id: data.faenaPescaConsumoId } })
        .then((result) => ({ campo: "faenaPescaConsumoId", existe: !!result })),
    );
  }

  if (data.novedadPescaConsumoId) {
    validaciones.push(
      prisma.novedadPescaConsumo
        .findUnique({ where: { id: data.novedadPescaConsumoId } })
        .then((result) => ({
          campo: "novedadPescaConsumoId",
          existe: !!result,
        })),
    );
  }

  const resultados = await Promise.all(validaciones);

  for (const resultado of resultados) {
    if (!resultado.existe) {
      throw new ValidationError(`El ${resultado.campo} no existe.`);
    }
  }
}

/**
 * Actualiza el campo toneladasCapturadas de una CalaFaenaConsumo
 * sumando todas las toneladas de sus DetCalaPescaConsumo
 */
async function actualizarToneladasCala(calaId) {
  try {
    const totalToneladas = await prisma.detCalaPescaConsumo.aggregate({
      where: { calaFaenaConsumoId: calaId },
      _sum: { toneladas: true },
    });

    const calaActualizada = await prisma.calaFaenaConsumo.update({
      where: { id: calaId },
      data: {
        toneladasCapturadas: totalToneladas._sum.toneladas || 0,
        updatedAt: new Date(),
      },
    });

    // Actualizar también las toneladas de la faena
    await actualizarToneladasFaena(calaActualizada.faenaPescaConsumoId);
  } catch (error) {
    console.error("Error actualizando toneladas de cala:", error);
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Actualiza el campo toneladasCapturadasFaena de una FaenaPescaConsumo
 * sumando todas las toneladasCapturadas de sus CalaFaenaConsumo
 */
async function actualizarToneladasFaena(faenaPescaConsumoId) {
  try {
    const totalToneladas = await prisma.calaFaenaConsumo.aggregate({
      where: { faenaPescaConsumoId },
      _sum: { toneladasCapturadas: true },
    });

    await prisma.faenaPescaConsumo.update({
      where: { id: faenaPescaConsumoId },
      data: {
        toneladasCapturadasFaena: totalToneladas._sum.toneladasCapturadas || 0,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error actualizando toneladas de faena:", error);
    // No lanzar error para no interrumpir la operación principal
  }
}

async function tieneEspecies(id) {
  const cala = await prisma.calaFaenaConsumo.findUnique({
    where: { id },
    include: { especiesPescadas: true },
  });
  if (!cala) throw new NotFoundError("CalaFaenaConsumo no encontrada");
  return cala.especiesPescadas && cala.especiesPescadas.length > 0;
}

const listar = async () => {
  try {
    const calas = await prisma.calaFaenaConsumo.findMany({
      include: {
        faenaPescaConsumo: true,
        bahia: true,
        motorista: true,
        patron: true,
        embarcacion: true,
        especiesPescadas: {
          include: {
            especie: true,
          },
        },
      },
    });

    // Calcular toneladas capturadas dinámicamente
    return calas.map((cala) => ({
      ...cala,
      toneladasCapturadas: cala.especiesPescadas.reduce(
        (total, detalle) => total + (parseFloat(detalle.toneladas) || 0),
        0,
      ),
    }));
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const cala = await prisma.calaFaenaConsumo.findUnique({
      where: { id },
      include: {
        faenaPescaConsumo: true,
        bahia: true,
        motorista: true,
        patron: true,
        embarcacion: true,
        especiesPescadas: {
          include: {
            especie: true,
          },
        },
      },
    });
    if (!cala) throw new NotFoundError("CalaFaenaConsumo no encontrada");

    // Calcular toneladas capturadas dinámicamente
    return {
      ...cala,
      toneladasCapturadas: cala.especiesPescadas.reduce(
        (total, detalle) => total + (parseFloat(detalle.toneladas) || 0),
        0,
      ),
    };
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorFaena = async (faenaId) => {
  try {
    const calas = await prisma.calaFaenaConsumo.findMany({
      where: { faenaPescaConsumoId: Number(faenaId) },
      include: {
        faenaPescaConsumo: true,
        bahia: true,
        motorista: true,
        patron: true,
        embarcacion: true,
        especiesPescadas: {
          include: {
            especie: true,
          },
        },
      },
      orderBy: { fechaHoraInicio: "asc" },
    });

    // Calcular toneladas capturadas dinámicamente para cada cala
    return calas.map((cala) => ({
      ...cala,
      toneladasCapturadas: cala.especiesPescadas.reduce(
        (total, detalle) => total + (parseFloat(detalle.toneladas) || 0),
        0,
      ),
    }));
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};
const crear = async (data) => {
  try {
    // Validar solo campos obligatorios según el modelo Prisma
    const obligatorios = [
      "bahiaId",
      "motoristaId",
      "patronId",
      "embarcacionId",
      "faenaPescaConsumoId",
      "novedadPescaConsumoId",
    ];

    for (const campo of obligatorios) {
      if (typeof data[campo] === "undefined" || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }

    await validarClavesForaneas(data);

    // Asegurar que updatedAt se establezca
    const dataConFechas = {
      ...data,
      updatedAt: new Date(),
    };

    return await prisma.calaFaenaConsumo.create({ data: dataConFechas });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.calaFaenaConsumo.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("CalaFaenaConsumo no encontrada");

    // Validar claves foráneas si cambian
    const claves = [
      "bahiaId",
      "motoristaId",
      "patronId",
      "embarcacionId",
      "faenaPescaConsumoId",
      "novedadPescaConsumoId",
    ];

    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Asegurar que updatedAt se actualice
    const dataConFechas = {
      ...data,
      updatedAt: new Date(),
    };

    return await prisma.calaFaenaConsumo.update({
      where: { id },
      data: dataConFechas,
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneEspecies(id)) {
      throw new ConflictError(
        "No se puede eliminar porque tiene especies asociadas.",
      );
    }
    await prisma.calaFaenaConsumo.delete({ where: { id } });
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
  obtenerPorFaena,
  crear,
  actualizar,
  eliminar,
  actualizarToneladasCala, // ⭐ AGREGADO
};
