import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";

/**
 * Servicio CRUD para NovedadPescaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [empresa, bahia] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.personal.findUnique({ where: { id: data.BahiaId } }),
  ]);
  if (!empresa) throw new ValidationError("El empresaId no existe.");
  if (!bahia) throw new ValidationError("El BahiaId no existe.");
}

async function tieneDependencias(id) {
  const novedad = await prisma.novedadPescaConsumo.findUnique({
    where: { id },
    include: {
      faenas: true,
      entregasARendir: true,
    },
  });
  if (!novedad) throw new NotFoundError("NovedadPescaConsumo no encontrada");
  return (
    (novedad.faenas && novedad.faenas.length > 0) ||
    (novedad.entregasARendir && novedad.entregasARendir.length > 0)
  );
}

const listar = async () => {
  try {
    return await prisma.novedadPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const novedad = await prisma.novedadPescaConsumo.findUnique({
      where: { id },
    });
    if (!novedad) throw new NotFoundError("NovedadPescaConsumo no encontrada");
    return novedad;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = [
      "empresaId",
      "BahiaId",
      "nombre",
      "fechaInicio",
      "fechaFin",
    ];
    for (const campo of obligatorios) {
      if (typeof data[campo] === "undefined" || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    // Agregar fechaActualizacion requerida por el modelo
    const dataConFecha = {
      ...data,
      fechaActualizacion: new Date(),
    };
    return await prisma.novedadPescaConsumo.create({ data: dataConFecha });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.novedadPescaConsumo.findUnique({
      where: { id },
    });
    if (!existente)
      throw new NotFoundError("NovedadPescaConsumo no encontrada");

    // Validar claves foráneas si cambian
    const claves = ["empresaId", "BahiaId"];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Filtrar solo campos válidos del modelo
    const camposValidos = [
      "empresaId",
      "BahiaId",
      "nombre",
      "fechaInicio",
      "fechaFin",
      "estadoNovedadPescaConsumoId",
      "toneladasCapturadas",
      "novedadPescaConsumoIniciada",
    ];

    const dataFiltrada = {};
    camposValidos.forEach((campo) => {
      if (data[campo] !== undefined) {
        dataFiltrada[campo] = data[campo];
      }
    });

    // Agregar fechaActualizacion
    dataFiltrada.fechaActualizacion = new Date();

    return await prisma.novedadPescaConsumo.update({
      where: { id },
      data: dataFiltrada,
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
    if (await tieneDependencias(id)) {
      throw new ConflictError(
        "No se puede eliminar porque tiene dependencias asociadas."
      );
    }
    await prisma.novedadPescaConsumo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const iniciar = async (id) => {
  try {
    // Obtener la novedad de pesca consumo
    const novedad = await prisma.novedadPescaConsumo.findUnique({
      where: { id },
    });

    if (!novedad) {
      throw new NotFoundError("NovedadPescaConsumo no encontrada");
    }

    if (novedad.novedadPescaConsumoIniciada) {
      throw new ValidationError("La novedad ya fue iniciada");
    }

    // Buscar el estado "INICIADA" para FAENA PESCA CONSUMO (tipoProvieneDeId=8)
    const estadoIniciada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDe: {
          descripcion: "FAENA PESCA CONSUMO"
        },
        descripcion: "INICIADA"
      }
    });

    if (!estadoIniciada) {
      throw new ValidationError(
        "No se encontró el estado 'INICIADA' para FAENA PESCA CONSUMO. Verifique que exista en EstadoMultiFuncion con tipoProvieneDeId=8"
      );
    }

    // Buscar datos necesarios para crear FaenaPescaConsumo
    const [motorista, patron, bahiaComercial, embarcacion] = await Promise.all([
      // Motorista: Personal.empresaId=novedad.empresaId y cargoId=14(MOTORISTA) y cesado=false
      prisma.personal.findFirst({
        where: {
          empresaId: novedad.empresaId,
          cargoId: 14, // MOTORISTA EMBARCACION
          cesado: false,
        },
      }),
      // Patrón: Personal.empresaId=novedad.empresaId y cargoId=22(PATRON) y cesado=false
      prisma.personal.findFirst({
        where: {
          empresaId: novedad.empresaId,
          cargoId: 22, // PATRON EMBARCACION
          cesado: false,
        },
      }),
      // Bahía comercial: Personal.empresaId=novedad.empresaId y cargoId=10(BAHIA COMERCIAL) y cesado=false
      prisma.personal.findFirst({
        where: {
          empresaId: novedad.empresaId,
          cargoId: 10, // BAHIA COMERCIAL
          cesado: false,
        },
      }),
      // Embarcación: tipoEmbarcacionId=2 (Pesca Consumo)
      prisma.embarcacion.findFirst({
        where: {
          tipoEmbarcacionId: 2, // Pesca Consumo
        },
      }),
    ]);

    // Validar que se encontraron los registros requeridos
    if (!motorista) {
      throw new ValidationError(
        "No se encontró un motorista activo para la empresa"
      );
    }

    if (!patron) {
      throw new ValidationError(
        "No se encontró un patrón activo para la empresa"
      );
    }

    if (!embarcacion) {
      throw new ValidationError(
        "No se encontró una embarcación de tipo Pesca Consumo"
      );
    }

    // Crear FaenaPescaConsumo (siguiendo patrón de TemporadaPesca)
    const faenaCreada = await prisma.faenaPescaConsumo.create({
      data: {
        novedadPescaConsumoId: Number(id),
        bahiaId: Number(bahiaComercial?.id || novedad.BahiaId),
        motoristaId: Number(motorista.id),
        patronId: Number(patron.id),
        descripcion: `Faena generada automáticamente para: ${novedad.nombre}`,
        fechaSalida: null,
        fechaDescarga: null,
        fechaHoraFondeo: null,
        puertoSalidaId: null,
        puertoDescargaId: null,
        puertoFondeoId: null,
        embarcacionId: Number(embarcacion.id),
        bolicheRedId: null,
        urlInformeFaena: null,
        estadoFaenaId: Number(estadoIniciada.id),
        toneladasCapturadasFaena: null,
        updatedAt: new Date(),
      },
    });

    // ✅ NUEVO: Crear TripulanteFaenaConsumo
    // Filtrar tripulantes según especificaciones
    const tripulantesPesca = await prisma.personal.findMany({
      where: {
        empresaId: Number(novedad.empresaId), // Personal.empresaId = FaenaPescaConsumo.novedadPescaConsumo.empresaId
        cesado: false, // Personal.cesado = false
        paraPescaConsumo: true, // Personal.paraPescaConsumo = true
        cargoId: {
          in: [21, 22, 14], // 21: TRIPULANTE, 22: PATRON, 14: MOTORISTA
        },
      },
    });

    // Crear registros en TripulanteFaenaConsumo
    const tripulantesData = tripulantesPesca.map((personal) => ({
      faenaPescaConsumoId: Number(faenaCreada.id),
      personalId: Number(personal.id),
      cargoId: Number(personal.cargoId),
      nombres: personal.nombres,
      apellidos: personal.apellidos,
      observaciones: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    let tripulantesCreados = 0;
    if (tripulantesData.length > 0) {
      await prisma.tripulanteFaenaConsumo.createMany({
        data: tripulantesData,
      });
      tripulantesCreados = tripulantesData.length;
    }

    // Crear EntregaARendirPescaConsumo (siguiendo patrón de TemporadaPesca)
    const entregaCreada = await prisma.entregaARendirPescaConsumo.create({
      data: {
        novedadPescaConsumoId: Number(id),
        respEntregaRendirId: Number(novedad.BahiaId),
        centroCostoId: 11, // pesca de consumo
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        entregaLiquidada: false,
      },
    });

    // Crear DetAccionesPreviasFaenaConsumo
    const accionesPrevias = await prisma.accionesPreviasFaena.findMany({
      where: {
        paraPescaConsumo: true,
        activo: true,
      },
    });

    // Buscar responsable y verificador usando ParametroAprobador
    const fechaActual = new Date();

    // Buscar responsable (moduloSistemaId=3 "PESCA DE CONSUMO")
    const responsable = await prisma.parametroAprobador.findFirst({
      where: {
        empresaId: Number(novedad.empresaId),
        embarcacionId: Number(embarcacion?.id || null),
        moduloSistemaId: 3, // PESCA DE CONSUMO
        cesado: false,
        vigenteDesde: { lte: fechaActual },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaActual } }],
      },
    });

    if (!responsable) {
      throw new ValidationError(
        "No se encontró al responsable PESCA DE CONSUMO"
      );
    }

    // Buscar verificador (moduloSistemaId=12 "VERIFICADOR PESCA DE CONSUMO")
    const verificador = await prisma.parametroAprobador.findFirst({
      where: {
        moduloSistemaId: 12, // VERIFICADOR PESCA DE CONSUMO
        cesado: false,
        vigenteDesde: { lte: fechaActual },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaActual } }],
      },
    });

    if (!verificador) {
      throw new ValidationError(
        "No se encontró al Verificador Responsable para PESCA DE CONSUMO"
      );
    }

    const detallesAccionesPrevias = accionesPrevias.map((accion) => ({
      faenaPescaConsumoId: Number(faenaCreada.id),
      accionPreviaId: Number(accion.id),
      responsableId: Number(responsable.personalRespId),
      verificadorId: Number(verificador.personalRespId),
      fechaVerificacion: null,
      cumplida: false,
      fechaCumplida: null,
      urlConfirmaAccionPdf: null,
      observaciones: null,
      verificado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (detallesAccionesPrevias.length > 0) {
      await prisma.detAccionesPreviasFaenaConsumo.createMany({
        data: detallesAccionesPrevias,
      });
    }

    // Crear DetDocTripulantesFaenaConsumo
    // 1. Filtrar tripulantes según especificaciones
    const tripulantes = await prisma.personal.findMany({
      where: {
        empresaId: Number(novedad.empresaId),
        cargoId: {
          in: [21, 22, 14], // 21: TRIPULANTE, 22: PATRON, 14: MOTORISTA
        },
        cesado: false,
      },
    });

    // 2. Obtener todos los documentos de los tripulantes
    const tripulantesIds = tripulantes.map((t) => Number(t.id));

    const documentacionPersonal = await prisma.documentacionPersonal.findMany({
      where: {
        personalId: {
          in: tripulantesIds,
        },
      },
    });

    // 3. Crear registros en DetDocTripulantesFaenaConsumo
    const detallesDocTripulantes = documentacionPersonal.map((doc) => {
      // Calcular si el documento está vencido
      let docVencido = true;

      if (doc.fechaVencimiento) {
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        const fechaVenc = new Date(doc.fechaVencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        docVencido = fechaVenc < fechaActual;
      }

      return {
        faenaPescaConsumoId: Number(faenaCreada.id),
        tripulanteId: Number(doc.personalId),
        documentoId: Number(doc.documentoPescaId),
        numeroDocumento: doc.numeroDocumento,
        fechaEmision: doc.fechaEmision,
        fechaVencimiento: doc.fechaVencimiento,
        urlDocTripulantePdf: doc.urlDocPdf,
        observaciones: doc.observaciones,
        verificado: false,
        docVencido: docVencido,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    if (detallesDocTripulantes.length > 0) {
      await prisma.detDocTripulantesFaenaConsumo.createMany({
        data: detallesDocTripulantes,
      });
    }

    // Crear DetDocEmbarcacionPescaConsumo
    const documentacionEmbarcacion =
      await prisma.documentacionEmbarcacion.findMany({
        where: {
          embarcacion: {
            tipoEmbarcacionId: 2, // Pesca Consumo
          },
        },
        include: {
          embarcacion: true,
        },
      });

      const detallesDocEmbarcacion = documentacionEmbarcacion.map((doc) => ({
        faenaPescaConsumoId: Number(faenaCreada.id),
        documentoPescaId: Number(doc.documentoPescaId), // ✅ CORREGIDO: era documentacionEmbarcacionId
        numeroDocumento: doc.numeroDocumento || null,
        fechaEmision: doc.fechaEmision || null,
        fechaVencimiento: doc.fechaVencimiento || null,
        urlDocEmbarcacion: doc.urlDocPdf || null,
        observaciones: doc.observaciones || null,
        verificado: false,
        docVencido: doc.docVencido || false,
        updatedAt: new Date(),
      }));

    if (detallesDocEmbarcacion.length > 0) {
      await prisma.detDocEmbarcacionPescaConsumo.createMany({
        data: detallesDocEmbarcacion,
      });
    }

    // Actualizar la novedad como iniciada
    await prisma.novedadPescaConsumo.update({
      where: { id },
      data: {
        novedadPescaConsumoIniciada: true,
        fechaActualizacion: new Date(),
      },
    });

    return {
      mensaje: "Novedad de pesca consumo iniciada correctamente",
      faenaCreada: Number(faenaCreada.id),
      entregaCreada: Number(entregaCreada.id),
      tripulantesCreados: tripulantesCreados, // ✅ NUEVO
      accionesPreviasCreadas: detallesAccionesPrevias.length,
      docTripulantesCreados: detallesDocTripulantes.length,
      docEmbarcacionCreados: detallesDocEmbarcacion.length,
    };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
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
  iniciar,
};
