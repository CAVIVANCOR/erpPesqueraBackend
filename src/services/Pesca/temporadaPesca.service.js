import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import recalcularToneladasService from "./recalcularToneladas.service.js";  // ⭐ AGREGAR ESTE IMPORT

/**
 * Servicio CRUD para TemporadaPesca
 * Valida existencia de claves foráneas, solapamiento de fechas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

/**
 * Calcula las cuotas propia y alquilada basándose en los detalles de cuota de pesca.
 * @param {BigInt} empresaId - ID de la empresa
 * @param {Decimal} limiteMaximoCapturaTn - Límite máximo de captura en toneladas
 * @returns {Promise<Object>} { cuotaPropiaTon, cuotaAlquiladaTon }
 */
async function calcularCuotasPorEmpresa(empresaId, limiteMaximoCapturaTn) {
  // Obtener detalles de cuota activos de la empresa
  const detalles = await prisma.detCuotaPesca.findMany({
    where: {
      empresaId,
      activo: true,
    },
  });

  // Sumar porcentajes de cuotas propias
  const totalPropiaPorcentaje = detalles
    .filter((d) => d.cuotaPropia)
    .reduce((sum, d) => sum + Number(d.porcentajeCuota), 0);

  // Sumar porcentajes de cuotas alquiladas
  const totalAlquiladaPorcentaje = detalles
    .filter((d) => !d.cuotaPropia)
    .reduce((sum, d) => sum + Number(d.porcentajeCuota), 0);

  // Calcular toneladas
  const limite = Number(limiteMaximoCapturaTn);
  const cuotaPropiaTon = limite * (totalPropiaPorcentaje / 100);
  const cuotaAlquiladaTon = limite * (totalAlquiladaPorcentaje / 100);

  return {
    cuotaPropiaTon,
    cuotaAlquiladaTon,
  };
}

async function validarClavesForaneas(data) {
  const [empresa, personal] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.personal.findUnique({ where: { id: data.BahiaId } }),
  ]);
  if (!empresa) throw new ValidationError("El empresaId no existe.");
  if (!personal)
    throw new ValidationError(
      "El BahiaId no existe o no corresponde a personal válido.",
    );
}

async function validarSolapamiento(data, id = null) {
  // No permitir temporadas con mismo nombre/empresa/estadoTemporadaId y fechas que se solapen
  const where = {
    nombre: data.nombre,
    empresaId: data.empresaId,
    estadoTemporadaId: data.estadoTemporadaId,
    AND: [
      { fechaInicio: { lte: data.fechaFin } },
      { fechaFin: { gte: data.fechaInicio } },
    ],
  };
  if (id) where["NOT"] = { id };
  const existe = await prisma.temporadaPesca.findFirst({ where });
  if (existe)
    throw new ConflictError(
      "Ya existe una temporada con el mismo nombre, empresa y estado en fechas que se superponen. Por favor, verifique las fechas o cambie el nombre.",
    );
}

/**
 * Lista temporadas de pesca con filtros opcionales
 * @param {Object} filtros - Filtros opcionales para la consulta
 * @param {number} [filtros.empresaId] - ID de la empresa
 * @param {number} [filtros.estadoTemporadaId] - ID del estado de temporada
 * @param {number} [filtros.bahiaId] - ID de la bahía
 * @param {string} [filtros.fechaDesde] - Fecha de inicio desde (YYYY-MM-DD)
 * @param {string} [filtros.fechaHasta] - Fecha de inicio hasta (YYYY-MM-DD)
 * @returns {Promise<Array>} Lista de temporadas con toneladas calculadas
 * @throws {DatabaseError} Si hay error en la base de datos
 */
const listar = async (filtros = {}) => {
  try {
    // Construir cláusula WHERE de forma profesional
    const where = {};

    // Filtro por empresa (validado)
    if (filtros.empresaId !== undefined && filtros.empresaId !== null) {
      const empresaId = Number(filtros.empresaId);
      if (!isNaN(empresaId) && empresaId > 0) {
        where.empresaId = empresaId;
      }
    }

    // Filtro por estado de temporada (validado)
    if (
      filtros.estadoTemporadaId !== undefined &&
      filtros.estadoTemporadaId !== null
    ) {
      const estadoId = Number(filtros.estadoTemporadaId);
      if (!isNaN(estadoId) && estadoId > 0) {
        where.estadoTemporadaId = estadoId;
      }
    }

    // Filtro por bahía (validado)
    if (filtros.bahiaId !== undefined && filtros.bahiaId !== null) {
      const bahiaId = Number(filtros.bahiaId);
      if (!isNaN(bahiaId) && bahiaId > 0) {
        where.BahiaId = bahiaId;
      }
    }

    // Filtro por rango de fechas (validado)
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fechaInicio = {};

      if (filtros.fechaDesde) {
        // Fecha de inicio >= fechaDesde
        where.fechaInicio.gte = new Date(filtros.fechaDesde);
      }

      if (filtros.fechaHasta) {
        // Fecha de inicio <= fechaHasta (fin del día)
        const fechaHastaFin = new Date(filtros.fechaHasta);
        fechaHastaFin.setHours(23, 59, 59, 999);
        where.fechaInicio.lte = fechaHastaFin;
      }
    }

    // Consulta con ordenamiento profesional y relaciones
    const temporadas = await prisma.temporadaPesca.findMany({
      where,
      include: {
        faenas: true,
        empresa: true,
        bahiaComercial: true,
        estadoTemporada: true,
      },
      orderBy: [{ fechaInicio: "desc" }, { id: "desc" }],
    });

    // Calcular toneladas capturadas dinámicamente
    return temporadas.map((temporada) => ({
      ...temporada,
      toneladasCapturadasTemporada: temporada.faenas.reduce(
        (total, faena) =>
          total + (parseFloat(faena.toneladasCapturadasFaena) || 0),
        0,
      ),
    }));
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar temporadas de pesca",
        err.message,
      );
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const temp = await prisma.temporadaPesca.findUnique({
      where: { id },
      include: {
        faenas: true,
        empresa: true,
        bahiaComercial: true,
        estadoTemporada: true,
        unidadNegocio: true,  // ⭐ CRÍTICO: Incluir unidadNegocio
        entidadEmpresarialAlquilada: true,
        entidadComercialComisionistaAlq: true,
      },
    });
    if (!temp) throw new NotFoundError("TemporadaPesca no encontrada");

    // ⚠️ RETORNAR EXACTAMENTE LO QUE ESTÁ EN LA BASE DE DATOS
    // NO recalcular - el valor ya está actualizado por el servicio de recálculo
    return temp;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (
      !data.empresaId ||
      !data.BahiaId ||
      !data.nombre ||
      !data.estadoTemporadaId ||
      !data.fechaInicio ||
      !data.fechaFin
    ) {
      throw new ValidationError(
        "Todos los campos obligatorios deben estar completos.",
      );
    }
    await validarClavesForaneas(data);
    await validarSolapamiento(data);

    // Calcular cuotas automáticamente si se proporciona limiteMaximoCapturaTn
    if (data.limiteMaximoCapturaTn) {
      const cuotas = await calcularCuotasPorEmpresa(
        data.empresaId,
        data.limiteMaximoCapturaTn,
      );
      data.cuotaPropiaTon = cuotas.cuotaPropiaTon;
      data.cuotaAlquiladaTon = cuotas.cuotaAlquiladaTon;
    }

    return await prisma.temporadaPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError("TemporadaPesca no encontrada");
    
    // Validar claves foráneas si cambian
    const claves = ["empresaId", "BahiaId"];
    if (claves.some((k) => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Validar solapamiento si cambian nombre, fechas, empresa o estadoTemporadaId
    if (
      data.nombre ||
      data.fechaInicio ||
      data.fechaFin ||
      data.empresaId ||
      data.estadoTemporadaId
    ) {
      await validarSolapamiento({ ...existente, ...data }, id);
    }

    // Recalcular cuotas si cambia limiteMaximoCapturaTn o empresaId
    if (data.limiteMaximoCapturaTn || data.empresaId) {
      const empresaId = data.empresaId || existente.empresaId;
      const limiteMaximo =
        data.limiteMaximoCapturaTn || existente.limiteMaximoCapturaTn;

      if (limiteMaximo) {
        const cuotas = await calcularCuotasPorEmpresa(empresaId, limiteMaximo);
        data.cuotaPropiaTon = cuotas.cuotaPropiaTon;
        data.cuotaAlquiladaTon = cuotas.cuotaAlquiladaTon;
      }
    }

       const temporadaActualizada = await prisma.temporadaPesca.update({ where: { id }, data });
    
    // ⭐ RECALCULAR TONELADAS CAPTURADAS AUTOMÁTICAMENTE DESPUÉS DE ACTUALIZAR
    try {
      await recalcularToneladasService.recalcularToneladasTemporada(BigInt(id));
    } catch (recalcError) {
      console.error(`⚠️ Error al recalcular toneladas para temporada ${id}:`, recalcError);
      // No lanzar error, solo registrar - la actualización de temporada ya se completó
    }
    
    // ⭐ RECALCULAR PORCENTAJE JUVENILES PARA TODAS LAS FAENAS DE LA TEMPORADA
    try {
      await recalcularToneladasService.actualizarPorcentajeJuvenilesTemporada(BigInt(id));
    } catch (juvenilesError) {
      console.error(`⚠️ Error al recalcular porcentaje juveniles para temporada ${id}:`, juvenilesError);
      // No lanzar error, solo registrar - la actualización de temporada ya se completó
    }
    
    return temporadaActualizada;
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

const eliminar = async (id) => {
  try {
    const existente = await prisma.temporadaPesca.findUnique({
      where: { id },
      include: { faenas: true, entregasARendir: true },
    });
    if (!existente) throw new NotFoundError("TemporadaPesca no encontrada");
    if (
      (existente.faenas && existente.faenas.length > 0) ||
      (existente.entregasARendir && existente.entregasARendir.length > 0)
    ) {
      throw new ConflictError(
        "No se puede eliminar porque tiene faenas o entregas asociadas. Por favor, elimine o desasocie estos registros antes de intentar eliminar la temporada.",
      );
    }
    await prisma.temporadaPesca.delete({ where: { id } });
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
    const temporada = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!temporada) throw new NotFoundError("TemporadaPesca no encontrada");

    // Buscar el estado "EN PROCESO" para temporadas de pesca
    const estadoEnProceso = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 4, // Temporada Pesca
        descripcion: "EN PROCESO",
        cesado: false,
      },
    });
    const estadoFaenaIniciada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 5, // Faena Pesca
        descripcion: "INICIADA",
        cesado: false,
      },
    });
    if (!estadoEnProceso) {
      throw new ValidationError(
        'No se encontró el estado "EN PROCESO" para temporadas de pesca',
      );
    }
    if (!estadoFaenaIniciada) {
      throw new ValidationError(
        'No se encontró el estado "INICIADA" para faenas de pesca',
      );
    }
    // Obtener acciones previas activas para pesca industrial
    const accionesPrevias = await prisma.accionesPreviasFaena.findMany({
      where: {
        paraPescaIndustrial: true,
        activo: true,
      },
    });
    // Implementar lógica de autocompletado según especificaciones
    const [embarcaciones, motoristas, patrones, bahias] = await Promise.all([
      // 1. Filtrar embarcaciones por tipoEmbarcacionId=1
      prisma.embarcacion.findMany({
        where: { tipoEmbarcacionId: 1 },
      }),
      // 2. Filtrar motoristas por empresaId y cargoId=14 (MOTORISTA EMBARCACION)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 14,
          cesado: false,
        },
      }),
      // 3. Filtrar patrones por empresaId y cargoId=22 (PATRON EMBARCACION)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 22,
          cesado: false,
        },
      }),
      // 4. Filtrar bahías por empresaId y cargoId=10 (BAHIA COMERCIAL)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 10,
          cesado: false,
        },
      }),
    ]);

    // Autocompletar solo si hay exactamente 1 registro
    const embarcacionId =
      embarcaciones.length === 1 ? embarcaciones[0].id : null;
    const motoristaId = motoristas.length === 1 ? motoristas[0].id : null;
    const patronId = patrones.length === 1 ? patrones[0].id : null;
    const bahiaId = bahias.length === 1 ? bahias[0].id : null;

    // Obtener datos de liquidación de la empresa para cargarlos en la temporada
    const empresa = await prisma.empresa.findUnique({
      where: { id: temporada.empresaId },
      select: {
        porcentajeBaseLiqPesca: true,
        porcentajeComisionPatron: true,
        cantPersonalCalcComisionMotorista: true,
        cantDivisoriaCalcComisionMotorista: true,
        porcentajeCalcComisionPanguero: true,
      },
    });

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el estado de la temporada a "EN PROCESO" y cargar datos de liquidación
      const temporadaActualizada = await tx.temporadaPesca.update({
        where: { id: Number(temporada.id) },
        data: {
          estadoTemporadaId: Number(estadoEnProceso.id),
          temporadaPescaIniciada: true,
          // Cargar parámetros de liquidación desde la empresa
          porcentajeBaseLiqPesca: empresa?.porcentajeBaseLiqPesca || null,
          porcentajeComisionPatron: empresa?.porcentajeComisionPatron || null,
          cantPersonalCalcComisionMotorista:
            empresa?.cantPersonalCalcComisionMotorista || null,
          cantDivisoriaCalcComisionMotorista:
            empresa?.cantDivisoriaCalcComisionMotorista || null,
          porcentajeCalcComisionPanguero:
            empresa?.porcentajeCalcComisionPanguero || null,
          fechaActualizacion: new Date(),
        },
      });

      // 2. Crear EntregaARendir
      const entregaARendir = await tx.entregaARendir.create({
        data: {
          temporadaPescaId: Number(temporada.id),
          respEntregaRendirId: Number(temporada.BahiaId),
          centroCostoId: Number(temporada.empresaId),
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          entregaLiquidada: false,
        },
      });

      // 3. Crear FaenaPesca con lógica de autocompletado específica
      const faenaPesca = await tx.faenaPesca.create({
        data: {
          temporadaId: Number(temporada.id),
          estadoFaenaId: Number(estadoFaenaIniciada.id),
          descripcion: "Temporal", // Descripción temporal que se actualizará
          // Campos autocompletados (solo si hay exactamente 1 registro)
          embarcacionId: Number(embarcacionId),
          motoristaId: Number(motoristaId),
          patronId: Number(patronId),
          bahiaId: Number(bahiaId),
          // Campos que quedan null deliberadamente
          fechaSalida: null,
          fechaDescarga: null,
          fechaHoraFondeo: null,
          puertoSalidaId: null,
          puertoDescargaId: null,
          puertoFondeoId: null,
          bolicheRedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Actualizar la descripción con el ID real de la faena
      const descripcionFaena = `Faena ${faenaPesca.id} Temporada ${temporada.numeroResolucion || "S/N"}`;
      await tx.faenaPesca.update({
        where: { id: faenaPesca.id },
        data: { descripcion: descripcionFaena },
      });

      // 3.1. Crear TripulanteFaena para cada tripulante elegible
      const tripulantesElegibles = await tx.personal.findMany({
        where: {
          empresaId: Number(temporada.empresaId),
          cesado: false,
          paraTemporadaPesca: true,
          cargoId: {
            in: [21, 22, 14], // 21: Tripulante, 22: Patrón, 14: Motorista
          },
        },
      });

      const tripulantesFaenaData = tripulantesElegibles.map((personal) => ({
        faenaPescaId: Number(faenaPesca.id),
        personalId: Number(personal.id),
        cargoId: Number(personal.cargoId),
        nombres: personal.nombres,
        apellidos: personal.apellidos,
        observaciones: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      let tripulantesFaena = [];
      if (tripulantesFaenaData.length > 0) {
        await tx.tripulanteFaena.createMany({
          data: tripulantesFaenaData,
        });

        // Obtener los registros creados para incluir en el resultado
        tripulantesFaena = await tx.tripulanteFaena.findMany({
          where: { faenaPescaId: Number(faenaPesca.id) },
        });
      }

      // 4. Crear DetAccionesPreviasFaena para cada acción previa
      const detAcciones = [];
      for (const accion of accionesPrevias) {
        // Buscar responsable para PESCA INDUSTRIAL (moduloSistemaId=2)
        const responsable = await tx.parametroAprobador.findFirst({
          where: {
            empresaId: Number(temporada.empresaId),
            embarcacionId: Number(faenaPesca.embarcacionId),
            moduloSistemaId: 2, // PESCA INDUSTRIAL
            cesado: false,
            vigenteDesde: { lte: new Date() },
            OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date() } }],
          },
        });

        if (!responsable) {
          throw new ValidationError(
            "No se encontró al responsable PESCA INDUSTRIAL",
          );
        }

        // Buscar verificador para VERIFICADOR PESCA INDUSTRIAL (moduloSistemaId=11)
        const verificador = await tx.parametroAprobador.findFirst({
          where: {
            moduloSistemaId: 11, // VERIFICADOR PESCA INDUSTRIAL
            cesado: false,
            vigenteDesde: { lte: new Date() },
            OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date() } }],
          },
        });

        if (!verificador) {
          throw new ValidationError(
            "No se encontró al Verificador Responsable para PESCA INDUSTRIAL",
          );
        }

        const detAccion = await tx.detAccionesPreviasFaena.create({
          data: {
            faenaPescaId: Number(faenaPesca.id),
            accionPreviaId: Number(accion.id),
            responsableId: Number(responsable.personalRespId),
            verificadorId: Number(verificador.personalRespId),
            cumplida: false,
            verificado: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        detAcciones.push(detAccion);
      }

      // 5. Crear DetalleDocTripulantes para cada tripulante y sus documentos requeridos
      const detalleDocTripulantes = [];

      // Filtrar tripulantes por empresaId y cargos específicos (21, 22, 14) y no cesados
      const tripulantes = await tx.personal.findMany({
        where: {
          empresaId: Number(temporada.empresaId),
          cargoId: {
            in: [21, 22, 14], // TRIPULANTE EMBARCACION, PATRON EMBARCACION, MOTORISTA EMBARCACION
          },
          cesado: false,
        },
      });

      // Para cada tripulante, obtener sus documentos requeridos
      for (const tripulante of tripulantes) {
        const documentosPersonal = await tx.documentacionPersonal.findMany({
          where: {
            personalId: Number(tripulante.id),
            cesado: false,
          },
        });

        // Crear un registro DetalleDocTripulantes por cada documento del tripulante
        for (const docPersonal of documentosPersonal) {
          // Determinar si el documento está vencido
          const fechaActual = new Date();
          const docVencido = docPersonal.fechaVencimiento
            ? new Date(docPersonal.fechaVencimiento) < fechaActual
            : false;

          const detalleDoc = await tx.detalleDocTripulantes.create({
            data: {
              faenaPescaId: Number(faenaPesca.id),
              tripulanteId: Number(docPersonal.personalId),
              documentoId: Number(docPersonal.documentoPescaId),
              numeroDocumento: docPersonal.numeroDocumento,
              fechaEmision: docPersonal.fechaEmision,
              fechaVencimiento: docPersonal.fechaVencimiento,
              urlDocTripulantePdf: docPersonal.urlDocPdf,
              docVencido: docVencido,
              verificado: false, // Por defecto no verificado
              observaciones: docPersonal.observaciones,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          detalleDocTripulantes.push(detalleDoc);
        }
      }

      // 6. Crear DetalleDocEmbarcacion para cada documento de la embarcación
      const detalleDocEmbarcacion = [];

      // Filtrar documentos de la embarcación por embarcacionId y no cesados
      const documentosEmbarcacion = await tx.documentacionEmbarcacion.findMany({
        where: {
          embarcacionId: Number(faenaPesca.embarcacionId),
          cesado: false,
        },
      });

      // Crear un registro DetalleDocEmbarcacion por cada documento de la embarcación
      for (const docEmbarcacion of documentosEmbarcacion) {
        // Determinar si el documento está vencido
        const fechaActual = new Date();
        const docVencido = docEmbarcacion.fechaVencimiento
          ? new Date(docEmbarcacion.fechaVencimiento) < fechaActual
          : false;

        const detalleDocEmb = await tx.detalleDocEmbarcacion.create({
          data: {
            faenaPescaId: Number(faenaPesca.id),
            documentoPescaId: Number(docEmbarcacion.documentoPescaId),
            numeroDocumento: docEmbarcacion.numeroDocumento,
            fechaEmision: docEmbarcacion.fechaEmision,
            fechaVencimiento: docEmbarcacion.fechaVencimiento,
            observaciones: docEmbarcacion.observaciones,
            urlDocEmbarcacion: docEmbarcacion.urlDocPdf,
            docVencido: docVencido,
            verificado: false, // Por defecto no verificado
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        detalleDocEmbarcacion.push(detalleDocEmb);
      }

      // Calcular estadísticas para el informe
      const docTripulantesVencidos = detalleDocTripulantes.filter(
        (d) => d.docVencido,
      ).length;
      const docTripulantesVigentes =
        detalleDocTripulantes.length - docTripulantesVencidos;
      const docEmbarcacionVencidos = detalleDocEmbarcacion.filter(
        (d) => d.docVencido,
      ).length;
      const docEmbarcacionVigentes =
        detalleDocEmbarcacion.length - docEmbarcacionVencidos;

      // Contar tripulantes por cargo (convertir a Number para comparación)
      const tripulantesPorCargo = {
        tripulantes: tripulantesFaena.filter((t) => Number(t.cargoId) === 21)
          .length,
        patrones: tripulantesFaena.filter((t) => Number(t.cargoId) === 22)
          .length,
        motoristas: tripulantesFaena.filter((t) => Number(t.cargoId) === 14)
          .length,
      };

      return {
        temporadaActualizada,
        entregaARendir,
        faenaPesca,
        tripulantesFaena,
        detAcciones,
        detalleDocTripulantes,
        detalleDocEmbarcacion,
        mensaje:
          "Temporada iniciada exitosamente y estado cambiado a EN PROCESO",
        // Resumen para el modal informativo
        resumen: {
          temporadaId: temporadaActualizada.id,
          numeroResolucion: temporadaActualizada.numeroResolucion,
          estadoNuevo: estadoEnProceso.descripcion,
          entregaARendirCreada: true,
          faenaId: faenaPesca.id,
          embarcacionNombre: embarcacionId ? embarcaciones[0]?.nombre : null,
          patronNombre: patronId ? patrones[0]?.nombreCompleto : null,
          motoristaNombre: motoristaId ? motoristas[0]?.nombreCompleto : null,
          bahiaNombre: bahiaId ? bahias[0]?.nombreCompleto : null,
          tripulantesRegistrados: tripulantesFaena.length,
          tripulantesPorCargo,
          accionesPreviasAsignadas: detAcciones.length,
          docTripulantesTotal: detalleDocTripulantes.length,
          docTripulantesVigentes,
          docTripulantesVencidos,
          docEmbarcacionTotal: detalleDocEmbarcacion.length,
          docEmbarcacionVigentes,
          docEmbarcacionVencidos,
          tieneAdvertencias:
            docTripulantesVencidos + docEmbarcacionVencidos > 0,
          totalDocumentosVencidos:
            docTripulantesVencidos + docEmbarcacionVencidos,
        },
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const finalizar = async (id) => {
  try {
    const temporada = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!temporada) throw new NotFoundError("TemporadaPesca no encontrada");

    // Buscar el estado "FINALIZADA" para temporadas de pesca
    const estadoFinalizada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 4, // Temporada Pesca
        descripcion: "FINALIZADA",
        cesado: false,
      },
    });

    if (!estadoFinalizada) {
      throw new ValidationError(
        'No se encontró el estado "FINALIZADA" para temporadas de pesca',
      );
    }

    // Actualizar el estado de la temporada a "FINALIZADA"
    const temporadaActualizada = await prisma.temporadaPesca.update({
      where: { id: Number(id) },
      data: {
        estadoTemporadaId: Number(estadoFinalizada.id),
        fechaActualizacion: new Date(),
      },
    });

    return temporadaActualizada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

const cancelar = async (id) => {
  try {
    const temporada = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!temporada) throw new NotFoundError("TemporadaPesca no encontrada");

    // Buscar el estado "CANCELADA" para temporadas de pesca
    const estadoCancelada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 4, // Temporada Pesca
        descripcion: "CANCELADA",
        cesado: false,
      },
    });

    if (!estadoCancelada) {
      throw new ValidationError(
        'No se encontró el estado "CANCELADA" para temporadas de pesca',
      );
    }

    // Actualizar el estado de la temporada a "CANCELADA"
    const temporadaActualizada = await prisma.temporadaPesca.update({
      where: { id: Number(id) },
      data: {
        estadoTemporadaId: Number(estadoCancelada.id),
        fechaActualizacion: new Date(),
      },
    });

    return temporadaActualizada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Calcula las liquidaciones de una temporada de pesca
 * Incluye cálculos estimados (basados en cuotas) y reales (basados en toneladas pescadas)
 * @param {number} id - ID de la temporada
 * @returns {Promise<Object>} Temporada actualizada con liquidaciones calculadas
 */
const calcularLiquidaciones = async (id) => {
  try {
    const temporada = await prisma.temporadaPesca.findUnique({
      where: { id: Number(id) },
      include: {
        empresa: {
          select: {
            monedaCalculosLiqId: true,
          },
        },
      },
    });

    if (!temporada) throw new NotFoundError("TemporadaPesca no encontrada");

    // 1. Contar tripulantes de la última faena
    const ultimaFaena = await prisma.faenaPesca.findFirst({
      where: { temporadaId: Number(id) },
      orderBy: { id: "desc" },
    });

    let totalTripulantes = 0;
    if (ultimaFaena) {
      totalTripulantes = await prisma.tripulanteFaena.count({
        where: { faenaPescaId: ultimaFaena.id },
      });
    }

    // 2. Obtener toneladas reales desde TemporadaPesca
    const toneladasReales = Number(temporada.toneladasCapturadasTemporada || 0);

    // 3. Obtener precio de cuota PROPIA (cuotaPropia = TRUE)
    const cuotaPropia = await prisma.detCuotaPesca.findFirst({
      where: {
        empresaId: temporada.empresaId,
        activo: true,
        cuotaPropia: true,
      },
    });

    const precioPorTonPropia = Number(cuotaPropia?.precioPorTonDolares || 0);

    // 4. Obtener precio de cuota ALQUILADA (cuotaPropia = FALSE)
    const cuotaAlquilada = await prisma.detCuotaPesca.findFirst({
      where: {
        empresaId: temporada.empresaId,
        activo: true,
        cuotaPropia: false,
      },
    });

    const precioPorTonAlquilada = Number(
      cuotaAlquilada?.precioPorTonDolares || 0,
    );

    // 5. Extraer parámetros de la temporada
    const cuotaPropiaTon = Number(temporada.cuotaPropiaTon || 0);
    const cuotaAlquiladaTon = Number(temporada.cuotaAlquiladaTon || 0);
    const porcentajeBaseLiqPesca =
      Number(temporada.porcentajeBaseLiqPesca || 0) / 100;
    const porcentajeComisionPatron =
      Number(temporada.porcentajeComisionPatron || 0) / 100;
    const cantPersonalCalcComisionMotorista = Number(
      temporada.cantPersonalCalcComisionMotorista || 1,
    );
    const cantDivisoriaCalcComisionMotorista = Number(
      temporada.cantDivisoriaCalcComisionMotorista || 1,
    );
    const porcentajeCalcComisionPanguero =
      Number(temporada.porcentajeCalcComisionPanguero || 0) / 100;

    // 6. CÁLCULOS ESTIMADOS (basados en cuotas asignadas)
    const totalToneladasEstimadas = cuotaPropiaTon + cuotaAlquiladaTon;
    const valorTotalEstimado = totalToneladasEstimadas * precioPorTonPropia;
    const baseLiquidacionEstimada = valorTotalEstimado * porcentajeBaseLiqPesca;

    const liqComisionPatronEstimado =
      porcentajeComisionPatron * baseLiquidacionEstimada;
    const liqComisionMotoristaEstimado =
      baseLiquidacionEstimada /
      cantPersonalCalcComisionMotorista /
      cantDivisoriaCalcComisionMotorista;
    const liqComisionPangueroEstimado =
      liqComisionMotoristaEstimado * porcentajeCalcComisionPanguero;
    const liqTotalPescaEstimada =
      liqComisionPatronEstimado +
      liqComisionMotoristaEstimado +
      liqComisionPangueroEstimado;
    const liqComisionAlquilerCuota = cuotaAlquiladaTon * precioPorTonAlquilada;

    // 6.1. CALCULAR INGRESOS POR ALQUILER DE CUOTAS DE LA OTRA ZONA
    // Buscar cuotas propias de la zona diferente que están marcadas para alquilar
    const cuotasParaAlquilar = await prisma.detCuotaPesca.findMany({
      where: {
        empresaId: temporada.empresaId,
        activo: true,
        cuotaPropia: true,
        zona: temporada.zona === 'NORTE' ? 'SUR' : 'NORTE', // Zona diferente
        esAlquiler: true,
      },
    });

    // Calcular ingresos por cada cuota y sumar
    let ingresosPorAlquilerCuotaSur = 0;
    const limiteMaximoCaptura = Number(temporada.limiteMaximoCapturaTn || 0);
    
    for (const cuota of cuotasParaAlquilar) {
      const porcentaje = Number(cuota.porcentajeCuota || 0);
      const precio = Number(cuota.precioPorTonDolares || 0);
      const toneladas = limiteMaximoCaptura * (porcentaje / 100);
      const ingresos = toneladas * precio;
      ingresosPorAlquilerCuotaSur += ingresos;
    }

    // 7. CÁLCULOS REALES (basados en toneladas capturadas)
    const valorTotalReal = toneladasReales * precioPorTonPropia;
    const baseLiquidacionReal = valorTotalReal * porcentajeBaseLiqPesca;

    const liqComisionPatronReal =
      porcentajeComisionPatron * baseLiquidacionReal;
    const liqComisionMotoristaReal =
      baseLiquidacionReal /
      cantPersonalCalcComisionMotorista /
      cantDivisoriaCalcComisionMotorista;
    const liqComisionPangueroReal =
      liqComisionMotoristaReal * porcentajeCalcComisionPanguero;
    const liqTotalPescaReal =
      liqComisionPatronReal +
      liqComisionMotoristaReal +
      liqComisionPangueroReal;

    // 8. Actualizar la temporada con todos los valores calculados
    const temporadaActualizada = await prisma.temporadaPesca.update({
      where: { id: Number(id) },
      data: {
        liqTripulantesPescaEstimado: totalTripulantes,
        liqTripulantesPescaReal: totalTripulantes,
        liqComisionPatronEstimado,
        liqComisionMotoristaEstimado,
        liqComisionPangueroEstimado,
        liqTotalPescaEstimada,
        liqComisionAlquilerCuota,
        ingresosPorAlquilerCuotaSur,
        liqComisionPatronReal,
        liqComisionMotoristaReal,
        liqComisionPangueroReal,
        liqTotalPescaReal,
        fechaActualizacion: new Date(),
      },
    });

    // 9. Obtener código de moneda desde EMPRESA
    const monedaCalculos = await prisma.moneda.findUnique({
      where: { id: temporada.empresa.monedaCalculosLiqId || BigInt(1) },
      select: { codigoSunat: true },
    });

    const codigoMoneda = monedaCalculos?.codigoSunat || "USD";

    return {
      ...temporadaActualizada,
      baseLiquidacionEstimada,
      baseLiquidacionReal,
      codigoMonedaLiquidacion: codigoMoneda,
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
  finalizar,
  cancelar,
  calcularLiquidaciones,
};
