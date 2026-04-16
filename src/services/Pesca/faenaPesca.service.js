import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import recalcularToneladasService from "./recalcularToneladas.service.js"; // ⭐ AGREGAR ESTE IMPORT
import { puedeEditarRegistroCerrado } from "../../utils/checkSuperUsuario.js";

/**
 * Servicio CRUD para FaenaPesca con cálculo dinámico de toneladas capturadas
 * Valida existencia de claves foráneas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [
    bahia,
    motorista,
    patron,
    panguero, // ⭐ AGREGAR ESTA LÍNEA
    puertoSalida,
    puertoDescarga,
    puertoFondeo,
    embarcacion,
    boliche,
  ] = await Promise.all([
    data.bahiaId
      ? prisma.personal.findUnique({ where: { id: data.bahiaId } })
      : Promise.resolve(true),
    data.motoristaId
      ? prisma.personal.findUnique({ where: { id: data.motoristaId } })
      : Promise.resolve(true),
    data.patronId
      ? prisma.personal.findUnique({ where: { id: data.patronId } })
      : Promise.resolve(true),
    data.pangueroId // ⭐ AGREGAR ESTAS 3 LÍNEAS
      ? prisma.personal.findUnique({ where: { id: data.pangueroId } })
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

  if (data.bahiaId && !bahia)
    throw new ValidationError("El bahiaId no existe en la tabla personal.");
  if (data.motoristaId && !motorista)
    throw new ValidationError("El motoristaId no existe.");
  if (data.patronId && !patron)
    throw new ValidationError("El patronId no existe.");
  if (data.pangueroId && !panguero)
    // ⭐ AGREGAR ESTAS 2 LÍNEAS
    throw new ValidationError("El pangueroId no existe.");
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

const listar = async () => {
  try {
    return await prisma.faenaPesca.findMany({
      include: {
        patron: true,
        motorista: true,
        panguero: true,
        embarcacion: {
          include: {
            activo: true,
          },
        },
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const faena = await prisma.faenaPesca.findUnique({
      where: { id },
      include: {
        embarcacion: true,
        puertoSalida: true,
        bahia: true,
        motorista: true,
        patron: true,
      },
    });
    if (!faena) throw new NotFoundError("FaenaPesca no encontrada");
    return faena;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Solo temporadaId es realmente obligatorio
    const obligatorios = ["temporadaId"];
    for (const campo of obligatorios) {
      if (typeof data[campo] === "undefined" || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);

    if (!data.descripcion) {
      // Obtener datos de la temporada
      const temporada = await prisma.temporadaPesca.findUnique({
        where: { id: data.temporadaId },
      });

      // Crear la faena primero para obtener el ID real
      const faena = await prisma.faenaPesca.create({ data });

      // Generar la descripción con el ID real de la faena
      const descripcionFaena = `Faena ${faena.id} Temporada ${temporada.numeroResolucion}`;

      // Actualizar la faena con la descripción correcta
      const faenaActualizada = await prisma.faenaPesca.update({
        where: { id: faena.id },
        data: { descripcion: descripcionFaena },
      });

      await actualizarToneladasTemporada(data.temporadaId);
      return faenaActualizada;
    }

    const faena = await prisma.faenaPesca.create({ data });
    await actualizarToneladasTemporada(data.temporadaId);
    return faena;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data, usuarioId = null) => {
  try {
    const existente = await prisma.faenaPesca.findUnique({
      where: { id },
      include: {
        temporada: {
          include: {
            estadoTemporada: true,
          },
        },
        estadoFaena: true,
      },
    });
    if (!existente) throw new NotFoundError("FaenaPesca no encontrada");

    // ========================================
    // ⭐ VALIDACIÓN DE PERMISOS PARA EDITAR
    // ========================================
    // Verificar si la temporada está cerrada
    const estadosCerradosTemporada = await prisma.estadoMultiFuncion.findMany({
      where: {
        tipoProvieneDeId: 4, // Temporada Pesca
        descripcion: { in: ["FINALIZADA", "CANCELADA"] },
        cesado: false,
      },
      select: { id: true },
    });

    const idsEstadosCerradosTemporada = estadosCerradosTemporada.map(
      (e) => e.id,
    );

    // Verificar si puede editar (superusuario O temporada no cerrada)
    const puedeEditar = await puedeEditarRegistroCerrado(
      usuarioId,
      existente.temporada.estadoTemporadaId,
      idsEstadosCerradosTemporada,
    );

    if (!puedeEditar) {
      throw new ValidationError(
        `No se puede editar la faena porque la temporada está en estado "${existente.temporada.estadoTemporada?.descripcion}". ` +
          `Solo los superusuarios pueden editar faenas de temporadas finalizadas o canceladas.`,
      );
    }

    // Filtrar solo los campos que se pueden actualizar directamente
    const camposPermitidos = [
      "descripcion",
      "fechaSalida",
      "fechaRetorno",
      "fechaDescarga",
      "bahiaId",
      "motoristaId",
      "patronId",
      "pangueroId", // ⭐ AGREGAR ESTA LÍNEA
      "puertoSalidaId",
      "puertoRetornoId",
      "puertoDescargaId",
      "puertoFondeoId",
      "embarcacionId",
      "bolicheRedId",
      "urlInformeFaena",
      "urlReporteFaenaCalas",
      "urlDeclaracionDesembarqueArmador",
      "estadoFaenaId",
      "toneladasCapturadasFaena",
    ];

    const dataFiltrada = {};
    for (const campo of camposPermitidos) {
      if (data.hasOwnProperty(campo)) {
        dataFiltrada[campo] = data[campo];
      }
    }

    // Regenerar descripción automáticamente
    if (existente.temporada) {
      dataFiltrada.descripcion = `Faena ${id} Temporada ${existente.temporada.numeroResolucion || "S/N"}`;
    }

    // Validar claves foráneas si cambian
    const claves = [
      "bahiaId",
      "motoristaId",
      "patronId",
      "pangueroId", // ⭐ AGREGAR ESTA LÍNEA
      "puertoSalidaId",
      "puertoDescargaId",
      "puertoFondeoId",
      "embarcacionId",
      "bolicheRedId",
    ];
    if (
      claves.some((k) => dataFiltrada[k] && dataFiltrada[k] !== existente[k])
    ) {
      await validarClavesForaneas({ ...existente, ...dataFiltrada });
    }

    const faena = await prisma.faenaPesca.update({
      where: { id },
      data: dataFiltrada,
    });
    await actualizarToneladasTemporada(existente.temporadaId);

    // ⭐ RECALCULAR PORCENTAJE JUVENILES AUTOMÁTICAMENTE DESPUÉS DE ACTUALIZAR
    try {
      await recalcularToneladasService.actualizarPorcentajeJuvenilesFaena(
        BigInt(id),
      );
    } catch (juvenilesError) {
      console.error(
        `⚠️ Error al recalcular porcentaje juveniles para faena ${id}:`,
        juvenilesError,
      );
      // No lanzar error, solo registrar - la actualización de faena ya se completó
    }

    return faena;
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
    const existente = await prisma.faenaPesca.findUnique({
      where: { id },
      include: {
        detallesDoc: true,
        tripulantes: true,
        detalleDocsTripulantes: true,
        calas: true,
        accionesPrevias: true,
        descargaFaena: true,
      },
    });
    if (!existente) throw new NotFoundError("FaenaPesca no encontrada");
    if (
      (existente.detallesDoc && existente.detallesDoc.length > 0) ||
      (existente.tripulantes && existente.tripulantes.length > 0) ||
      (existente.detalleDocsTripulantes &&
        existente.detalleDocsTripulantes.length > 0) ||
      (existente.calas && existente.calas.length > 0) ||
      (existente.accionesPrevias && existente.accionesPrevias.length > 0) ||
      existente.descargaFaena
    ) {
      throw new ConflictError(
        "No se puede eliminar porque tiene dependencias asociadas.",
      );
    }
    await prisma.faenaPesca.delete({ where: { id } });
    await actualizarToneladasTemporada(existente.temporadaId);
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Actualiza el campo toneladasCapturadasTemporada de una TemporadaPesca
 * sumando todas las toneladasCapturadasFaena de sus FaenasPesca
 */
async function actualizarToneladasTemporada(temporadaId) {
  try {
    const totalToneladas = await prisma.faenaPesca.aggregate({
      where: { temporadaId },
      _sum: { toneladasCapturadasFaena: true },
    });

    const toneladasCalculadas =
      totalToneladas._sum.toneladasCapturadasFaena || 0;

    await prisma.temporadaPesca.update({
      where: { id: temporadaId },
      data: {
        toneladasCapturadasTemporada: toneladasCalculadas,
        fechaActualizacion: new Date(),
      },
    });
  } catch (error) {
    console.error(
      `❌ Error actualizando toneladas de temporada ${temporadaId}:`,
      error,
    );
    // No lanzar error para no interrumpir la operación principal
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
