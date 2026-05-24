import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import novedadPescaConsumoService from "./novedadPescaConsumo.service.js";
/**
 * Servicio CRUD para FaenaPescaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene detalles asociados.
 * Documentado en español.
 * Sigue el patrón de faenaPesca.service.js
 */

async function validarClavesForaneas(data) {
  const [
    novedad,
    bahia,
    motorista,
    patron,
    puertoSalida,
    puertoDescarga,
    puertoFondeo,
    embarcacion,
    boliche,
  ] = await Promise.all([
    data.novedadPescaConsumoId
      ? prisma.novedadPescaConsumo.findUnique({
          where: { id: data.novedadPescaConsumoId },
        })
      : Promise.resolve(true),
    data.bahiaId
      ? prisma.personal.findUnique({ where: { id: data.bahiaId } })
      : Promise.resolve(true),
    data.motoristaId
      ? prisma.personal.findUnique({ where: { id: data.motoristaId } })
      : Promise.resolve(true),
    data.patronId
      ? prisma.personal.findUnique({ where: { id: data.patronId } })
      : Promise.resolve(true),
    data.puertoSalidaId
      ? prisma.puertoPesca.findUnique({ where: { id: data.puertoSalidaId } })
      : Promise.resolve(true),
    data.puertoDescargaId
      ? prisma.puertoPesca.findUnique({ where: { id: data.puertoDescargaId } })
      : Promise.resolve(true),
    data.puertoFondeoId
      ? prisma.puertoPesca.findUnique({ where: { id: data.puertoFondeoId } })
      : Promise.resolve(true),
    data.embarcacionId
      ? prisma.embarcacion.findUnique({ where: { id: data.embarcacionId } })
      : Promise.resolve(true),
    data.bolicheRedId
      ? prisma.bolicheRed.findUnique({ where: { id: data.bolicheRedId } })
      : Promise.resolve(true),
  ]);

  if (data.novedadPescaConsumoId && !novedad)
    throw new ValidationError("El novedadPescaConsumoId no existe.");
  if (data.bahiaId && !bahia)
    throw new ValidationError("El bahiaId no existe en la tabla personal.");
  if (data.motoristaId && !motorista)
    throw new ValidationError("El motoristaId no existe.");
  if (data.patronId && !patron)
    throw new ValidationError("El patronId no existe.");
  if (data.puertoSalidaId && !puertoSalida)
    throw new ValidationError("El puertoSalidaId no existe.");
  if (data.puertoDescargaId && !puertoDescarga)
    throw new ValidationError("El puertoDescargaId no existe.");
  if (data.puertoFondeoId && !puertoFondeo)
    throw new ValidationError("El puertoFondeoId no existe.");
  if (data.embarcacionId && !embarcacion)
    throw new ValidationError("El embarcacionId no existe.");
  if (data.bolicheRedId && !boliche)
    throw new ValidationError("El bolicheRedId no existe.");
}
/**
 * Actualiza el campo toneladasCapturadasFaena de una FaenaPescaConsumo
 * PRIMERO recalcula las toneladas de TODAS sus calas desde las especies
 * LUEGO suma las toneladas de todas las calas
 */
async function actualizarToneladasFaenaDesdeCalas(faenaPescaConsumoId) {
  try {
    // 1️⃣ OBTENER TODAS LAS CALAS DE LA FAENA
    const calas = await prisma.calaFaenaConsumo.findMany({
      where: { faenaPescaConsumoId },
      select: { id: true },
    });

    // 2️⃣ RECALCULAR TONELADAS DE CADA CALA DESDE SUS ESPECIES
    for (const cala of calas) {
      const totalEspecies = await prisma.detCalaPescaConsumo.aggregate({
        where: { calaFaenaConsumoId: cala.id },
        _sum: { toneladas: true },
      });

      const toneladasCala = totalEspecies._sum.toneladas || 0;

      await prisma.calaFaenaConsumo.update({
        where: { id: cala.id },
        data: {
          toneladasCapturadas: toneladasCala,
          updatedAt: new Date(),
        },
      });
    }

    // 3️⃣ SUMAR TODAS LAS TONELADAS DE LAS CALAS ACTUALIZADAS
    const totalToneladas = await prisma.calaFaenaConsumo.aggregate({
      where: { faenaPescaConsumoId },
      _sum: { toneladasCapturadas: true },
    });

    // 4️⃣ ACTUALIZAR LA FAENA
    const resultado = await prisma.faenaPescaConsumo.update({
      where: { id: faenaPescaConsumoId },
      data: {
        toneladasCapturadasFaena: totalToneladas._sum.toneladasCapturadas || 0,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ [ACTUALIZAR TONELADAS] Error:", error);
    // No lanzar error para no interrumpir la operación principal
  }
}

async function tieneDependencias(id) {
  const faena = await prisma.faenaPescaConsumo.findUnique({
    where: { id },
    include: {
      detallesDocEmbarcacion: true,
      tripulantes: true,
      detalleDocsTripulantes: true,
      accionesPrevias: true,
      calas: true,
      descargaFaenaConsumo: true,
    },
  });
  if (!faena) throw new NotFoundError("FaenaPescaConsumo no encontrada");
  return (
    (faena.detallesDocEmbarcacion && faena.detallesDocEmbarcacion.length > 0) ||
    (faena.tripulantes && faena.tripulantes.length > 0) ||
    (faena.detalleDocsTripulantes && faena.detalleDocsTripulantes.length > 0) ||
    (faena.accionesPrevias && faena.accionesPrevias.length > 0) ||
    (faena.calas && faena.calas.length > 0) ||
    !!faena.descargaFaenaConsumo
  );
}

const listar = async () => {
  try {
    return await prisma.faenaPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const faena = await prisma.faenaPescaConsumo.findUnique({
      where: { id },
      include: {
        embarcacion: {
          include: {
            activo: true,
          },
        },
        novedadPescaConsumo: true,
        puertoSalida: true,
        puertoDescarga: true,
        puertoFondeo: true,
        bahia: true,
        motorista: true,
        patron: true,
        calas: {
          include: {
            especiesPescadas: {
              include: {
                especie: true,
              },
            },
          },
        },
      },
    });
    if (!faena) throw new NotFoundError("FaenaPescaConsumo no encontrada");
    return faena;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

// Eliminado - usar novedadPescaConsumoService.actualizarToneladasNovedad

const crear = async (data) => {
  try {
    // Solo novedadPescaConsumoId es realmente obligatorio (siguiendo patrón de faenaPesca)
    const obligatorios = ["novedadPescaConsumoId"];
    for (const campo of obligatorios) {
      if (typeof data[campo] === "undefined" || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }

    await validarClavesForaneas(data);

    // Agregar updatedAt requerido por el modelo
    const dataConFecha = {
      ...data,
      updatedAt: new Date(),
    };

    const faena = await prisma.faenaPescaConsumo.create({ data: dataConFecha });
    await novedadPescaConsumoService.actualizarToneladasNovedad(
      data.novedadPescaConsumoId,
    );
    return faena;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.faenaPescaConsumo.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundError("FaenaPescaConsumo no encontrada");

    // Validar claves foráneas si cambian
    const claves = [
      "novedadPescaConsumoId",
      "bolicheRedId",
      "embarcacionId",
      "puertoDescargaId",
      "puertoSalidaId",
      "bahiaId",
      "motoristaId",
      "patronId",
      "estadoFaenaId",
      "puertoFondeoId",
    ];

    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Filtrar campos no permitidos
    const camposNoPermitidos = ["id", "createdAt"];
    const dataFiltrada = Object.keys(data)
      .filter((key) => !camposNoPermitidos.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});
    dataFiltrada.updatedAt = new Date();
    await prisma.faenaPescaConsumo.update({
      where: { id },
      data: dataFiltrada,
    });

    // ⭐ RECALCULAR TONELADAS DE LA FAENA DESDE SUS CALAS
    await actualizarToneladasFaenaDesdeCalas(id);
    await novedadPescaConsumoService.actualizarToneladasNovedad(
      existente.novedadPescaConsumoId,
    );

    // ⭐ VOLVER A LEER LA FAENA ACTUALIZADA PARA RETORNAR LOS VALORES CORRECTOS
    const faenaActualizada = await prisma.faenaPescaConsumo.findUnique({
      where: { id },
    });
    return faenaActualizada;
  } catch (err) {
    console.error("❌ [ACTUALIZAR FAENA] Error:", err);
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDependencias(id)) {
      throw new ConflictError(
        "No se puede eliminar porque tiene detalles asociados.",
      );
    }
    const novedadId = (
      await prisma.faenaPescaConsumo.findUnique({
        where: { id },
        select: { novedadPescaConsumoId: true },
      })
    )?.novedadPescaConsumoId;

    await prisma.faenaPescaConsumo.delete({ where: { id } });

    if (novedadId) {
      await novedadPescaConsumoService.actualizarToneladasNovedad(novedadId);
    }

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