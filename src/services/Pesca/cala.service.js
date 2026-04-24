import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import { puedeEditarDetalleFaena } from "../../utils/checkSuperUsuario.js";

/**
 * Servicio CRUD para Cala con cálculo dinámico de toneladas capturadas
 */

const listar = async () => {
  try {
    const calas = await prisma.cala.findMany({
      include: {
        faenaPesca: true,
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
    const cala = await prisma.cala.findUnique({
      where: { id },
      include: {
        faenaPesca: true,
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

    if (!cala) throw new NotFoundError("Cala no encontrada");

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

const obtenerPorFaena = async (faenaPescaId) => {
  try {
    const calas = await prisma.cala.findMany({
      where: { faenaPescaId },
      include: {
        faenaPesca: true,
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
      orderBy: { fechaHoraInicio: "desc" },
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
    // Remover toneladasCapturadas del input ya que se calcula dinámicamente
    const { toneladasCapturadas, ...calaData } = data;

    const faenaPesca = await prisma.faenaPesca.findUnique({
      where: { id: data.faenaPescaId },
    });

    if (!faenaPesca) throw new ValidationError("FaenaPesca no encontrada");

    const calaDataConFaena = {
      bahiaId: data.bahiaId || faenaPesca.bahiaId,
      motoristaId: data.motoristaId || faenaPesca.motoristaId,
      patronId: data.patronId || faenaPesca.patronId,
      embarcacionId: data.embarcacionId || faenaPesca.embarcacionId,
      faenaPescaId: data.faenaPescaId,
      temporadaPescaId: data.temporadaPescaId || faenaPesca.temporadaId,
      fechaHoraInicio: data.fechaHoraInicio || null,
      fechaHoraFin: data.fechaHoraFin || null,
      latitud: data.latitud || null,
      longitud: data.longitud || null,
      profundidadM: data.profundidadM || null,
      observaciones: data.observaciones || null,
      updatedAt: data.updatedAt || new Date(),
    };

    const dataConUpdatedAt = {
      ...calaDataConFaena,
      updatedAt: new Date(),
    };

    const nuevaCala = await prisma.cala.create({
      data: dataConUpdatedAt,
      include: {
        faenaPesca: true,
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
    const toneladasCapturadasCrear = nuevaCala.especiesPescadas.reduce(
      (total, especie) => {
        return total + (parseFloat(especie.toneladas) || 0);
      },
      0,
    );

    // Actualizar las toneladas capturadas de la cala
    await prisma.cala.update({
      where: { id: nuevaCala.id },
      data: {
        toneladasCapturadas: toneladasCapturadasCrear,
        updatedAt: new Date(),
      },
    });

    await actualizarToneladasFaena(nuevaCala.faenaPescaId);
    await actualizarCombustibleYRecorridoFaena(nuevaCala.faenaPescaId);

    return {
      ...nuevaCala,
      toneladasCapturadas: toneladasCapturadasCrear,
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data, usuarioId = null) => {
  try {
    const existente = await prisma.cala.findUnique({
      where: { id },
      include: {
        faenaPesca: {
          include: {
            temporada: {
              include: {
                estadoTemporada: true,
              },
            },
          },
        },
      },
    });
    if (!existente) throw new NotFoundError("Cala no encontrada");

    // ========================================
    // ⭐ VALIDACIÓN DE PERMISOS PARA EDITAR
    // ========================================
    const puedeEditar = await puedeEditarDetalleFaena(
      usuarioId,
      existente.faenaPescaId,
    );

    if (!puedeEditar) {
      throw new ValidationError(
        `No se puede editar la cala porque la temporada está en estado "${existente.faenaPesca?.temporada?.estadoTemporada?.descripcion}". ` +
          `Solo los superusuarios pueden editar calas de temporadas finalizadas o canceladas.`,
      );
    }

    // Remover toneladasCapturadas del input ya que se calcula dinámicamente
    const { toneladasCapturadas, ...calaData } = data;

    const calaActualizada = await prisma.cala.update({
      where: { id },
      data: {
        ...calaData,
        updatedAt: new Date(),
      },
      include: {
        faenaPesca: true,
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
    const toneladasCalculadas = calaActualizada.especiesPescadas.reduce(
      (total, detalle) => total + (parseFloat(detalle.toneladas) || 0),
      0,
    );

    await actualizarToneladasFaena(calaActualizada.faenaPescaId);
    await actualizarCombustibleYRecorridoFaena(calaActualizada.faenaPescaId);

    return {
      ...calaActualizada,
      toneladasCapturadas: toneladasCalculadas,
    };
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
    const existente = await prisma.cala.findUnique({
      where: { id },
      include: { especiesPescadas: true },
    });
    if (!existente) throw new NotFoundError("Cala no encontrada");
    if (existente.especiesPescadas?.length > 0) {
      throw new ConflictError(
        "No se puede eliminar porque tiene especies pescadas asociadas.",
      );
    }
    await prisma.cala.delete({ where: { id } });
    await actualizarToneladasFaena(existente.faenaPescaId);
    await actualizarCombustibleYRecorridoFaena(existente.faenaPescaId);
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza el campo toneladasCapturadasFaena de una FaenaPesca
 * sumando todas las toneladasCapturadas de sus Calas
 */
async function actualizarToneladasFaena(faenaPescaId) {
  try {
    const totalToneladas = await prisma.cala.aggregate({
      where: { faenaPescaId },
      _sum: { toneladasCapturadas: true },
    });

    const toneladasCalculadas = totalToneladas._sum.toneladasCapturadas || 0;

    await prisma.faenaPesca.update({
      where: { id: faenaPescaId },
      data: {
        toneladasCapturadasFaena: toneladasCalculadas,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(
      `❌ Error actualizando toneladas de faena ${faenaPescaId}:`,
      error,
    );
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Actualiza los campos de combustible y recorrido de una FaenaPesca
 * sumando los datos de todas sus Calas y DescargaFaenaPesca
 */
async function actualizarCombustibleYRecorridoFaena(faenaPescaId) {
  try {
    // Obtener todas las calas de la faena
    const calas = await prisma.cala.findMany({
      where: { faenaPescaId },
      select: {
        combustibleConsumido: true,
        recorridoMillasNauticas: true,
      },
    });

    // Obtener la descarga de la faena (relación 1:1)
    const descarga = await prisma.descargaFaenaPesca.findUnique({
      where: { faenaPescaId },
      select: {
        combustibleConsumido: true,
        recorridoMillasNauticas: true,
      },
    });

    // Calcular totales de calas
    let combustibleTotalCalas = 0;
    let recorridoTotalCalas = 0;

    calas.forEach((cala) => {
      combustibleTotalCalas += Number(cala.combustibleConsumido || 0);
      recorridoTotalCalas += Number(cala.recorridoMillasNauticas || 0);
    });

    // Sumar descarga si existe
    const combustibleDescarga = Number(descarga?.combustibleConsumido || 0);
    const recorridoDescarga = Number(descarga?.recorridoMillasNauticas || 0);

    const combustibleTotal = combustibleTotalCalas + combustibleDescarga;
    const recorridoTotal = recorridoTotalCalas + recorridoDescarga;

    // Actualizar faena
    await prisma.faenaPesca.update({
      where: { id: faenaPescaId },
      data: {
        combustibleConsumido: combustibleTotal,
        recorridoMillasNauticas: recorridoTotal,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(
      `❌ Error actualizando combustible/recorrido de faena ${faenaPescaId}:`,
      error,
    );
  }
}

export default {
  listar,
  obtenerPorId,
  obtenerPorFaena,
  crear,
  actualizar,
  eliminar,
};