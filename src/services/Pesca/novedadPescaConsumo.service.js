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

/**
 * Lista novedades de pesca consumo con filtros opcionales
 * @param {Object} filtros - Filtros opcionales para la consulta
 * @param {number} [filtros.empresaId] - ID de la empresa
 * @param {number} [filtros.estadoNovedadPescaConsumoId] - ID del estado de novedad
 * @param {number} [filtros.bahiaId] - ID de la bahía
 * @param {string} [filtros.fechaDesde] - Fecha de inicio desde (YYYY-MM-DD)
 * @param {string} [filtros.fechaHasta] - Fecha de inicio hasta (YYYY-MM-DD)
 * @returns {Promise<Array>} Lista de novedades
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

    // Filtro por estado de novedad (validado)
    if (
      filtros.estadoNovedadPescaConsumoId !== undefined &&
      filtros.estadoNovedadPescaConsumoId !== null
    ) {
      const estadoId = Number(filtros.estadoNovedadPescaConsumoId);
      if (!isNaN(estadoId) && estadoId > 0) {
        where.estadoNovedadPescaConsumoId = estadoId;
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
    return await prisma.novedadPescaConsumo.findMany({
      where,
      include: {
        empresa: true,
        bahiaComercial: true,
        estadoNovedad: true,
      },
      orderBy: [{ fechaInicio: "desc" }, { id: "desc" }],
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al listar novedades de pesca consumo",
        err.message,
      );
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const novedad = await prisma.novedadPescaConsumo.findUnique({
      where: { id },
      include: {
        faenas: true,
        empresa: true,
        bahiaComercial: true,
        estadoNovedad: true,
      },
    });
    if (!novedad) throw new NotFoundError("NovedadPescaConsumo no encontrada");

    // Calcular toneladas capturadas dinámicamente
    return {
      ...novedad,
      toneladasCapturadas: novedad.faenas.reduce(
        (total, faena) => total + (parseFloat(faena.toneladasDescargadas) || 0),
        0,
      ),
    };
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

    // Calcular cuotas automáticamente si se proporciona limiteMaximoCapturaTn
    if (data.limiteMaximoCapturaTn) {
      const cuotas = await calcularCuotasPorEmpresa(
        data.empresaId,
        data.limiteMaximoCapturaTn,
      );
      data.cuotaPropiaTon = cuotas.cuotaPropiaTon;
      data.cuotaAlquiladaTon = cuotas.cuotaAlquiladaTon;
    }

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

    // Filtrar solo campos válidos del modelo
    const camposValidos = [
      "empresaId",
      "BahiaId",
      "nombre",
      "fechaInicio",
      "fechaFin",
      "estadoNovedadPescaConsumoId",
      "unidadNegocioId",
      "toneladasCapturadas",
      "novedadPescaConsumoIniciada",
      "urlResolucionPdf",
      "cuotaAlquiladaTon",
      "cuotaPropiaTon",
      "limiteMaximoCapturaTn",
      "numeroResolucion",
      "referenciaExtra",
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
        "No se puede eliminar porque tiene dependencias asociadas.",
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

    const estadoEnProceso = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 7, // Novedad Pesca Consumo
        descripcion: "EN PROCESO",
        cesado: false,
      },
    });
    const estadoFaenaIniciada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 8, // Faena Pesca Consumo
        descripcion: "INICIADA",
        cesado: false,
      },
    });

    if (!estadoEnProceso) {
      throw new ValidationError(
        "No se encontró el estado 'EN PROCESO' para NOVEDAD PESCA CONSUMO. Verifique que exista en EstadoMultiFuncion con tipoProvieneDeId=7",
      );
    }
    if (!estadoFaenaIniciada) {
      throw new ValidationError(
        "No se encontró el estado 'INICIADA' para FAENA PESCA CONSUMO. Verifique que exista en EstadoMultiFuncion con tipoProvieneDeId=8",
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
        "No se encontró un motorista activo para la empresa",
      );
    }

    if (!patron) {
      throw new ValidationError(
        "No se encontró un patrón activo para la empresa",
      );
    }

    if (!embarcacion) {
      throw new ValidationError(
        "No se encontró una embarcación de tipo Pesca Consumo",
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
        estadoFaenaId: Number(estadoFaenaIniciada.id),
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
        "No se encontró al responsable PESCA DE CONSUMO",
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
        "No se encontró al Verificador Responsable para PESCA DE CONSUMO",
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
        estadoNovedadPescaConsumoId: Number(estadoEnProceso.id), // ← AGREGAR
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

const finalizar = async (id, usuarioId = null) => {
  try {
    const novedad = await prisma.novedadPescaConsumo.findUnique({
      where: { id },
      include: {
        faenas: {
          include: {
            descarga: true
          }
        }
      }
    });
    
    if (!novedad) throw new NotFoundError("NovedadPescaConsumo no encontrada");

    // Buscar el estado "FINALIZADA" para Novedad Pesca Consumo
    const estadoFinalizada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 7, // Novedad Pesca Consumo
        descripcion: "FINALIZADA",
        cesado: false,
      },
    });

    if (!estadoFinalizada) {
      throw new ValidationError(
        'No se encontró el estado "FINALIZADA" para Novedad Pesca Consumo',
      );
    }

    // ============================================
    // NUEVO: Generar movimientos y PreFactura para cada descarga
    // ============================================
    const resultadosDescargas = [];
    
    if (novedad.faenas && novedad.faenas.length > 0 && usuarioId) {
      // Importar servicio de finalización de descargas
      const { default: finalizarDescargaConsumoService } = 
        await import('./finalizarDescargaConsumoConMovimientos.service.js');
      
      // Procesar cada faena que tenga descarga
      for (const faena of novedad.faenas) {
        if (faena.descarga) {
          try {
            console.log(`📦 Procesando descarga ID: ${faena.descarga.id} de faena ID: ${faena.id}`);
            
            const resultadoDescarga = await finalizarDescargaConsumoService.finalizarDescargaConsumoConMovimientos(
              faena.descarga.id,
              id,
              usuarioId
            );
            
            resultadosDescargas.push({
              descargaId: faena.descarga.id,
              faenaId: faena.id,
              exito: true,
              resultado: resultadoDescarga
            });
            
            console.log(`✅ Descarga ${faena.descarga.id} procesada exitosamente`);
          } catch (errorDescarga) {
            console.error(`❌ Error procesando descarga ${faena.descarga.id}:`, errorDescarga.message);
            
            // Registrar error pero continuar con otras descargas
            resultadosDescargas.push({
              descargaId: faena.descarga.id,
              faenaId: faena.id,
              exito: false,
              error: errorDescarga.message
            });
          }
        }
      }
    }

    // Actualizar el estado de la novedad a "FINALIZADA"
    const novedadActualizada = await prisma.novedadPescaConsumo.update({
      where: { id: Number(id) },
      data: {
        estadoNovedadPescaConsumoId: Number(estadoFinalizada.id),
        updatedAt: new Date(),
      },
    });

    // Retornar resultado completo
    const resultado = {
      novedad: novedadActualizada,
      descargasProcesadas: resultadosDescargas.length,
      descargasExitosas: resultadosDescargas.filter(d => d.exito).length,
      descargasConError: resultadosDescargas.filter(d => !d.exito).length,
    };

    // Incluir detalles si se procesaron descargas
    if (resultadosDescargas.length > 0) {
      resultado.detallesDescargas = resultadosDescargas;
    }

    return resultado;
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
    const novedad = await prisma.novedadPescaConsumo.findUnique({
      where: { id },
    });
    if (!novedad) throw new NotFoundError("NovedadPescaConsumo no encontrada");

    // Buscar el estado "CANCELADA" para Novedad Pesca Consumo
    const estadoCancelada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 7, // Novedad Pesca Consumo
        descripcion: "CANCELADA",
        cesado: false,
      },
    });

    if (!estadoCancelada) {
      throw new ValidationError(
        'No se encontró el estado "CANCELADA" para Novedad Pesca Consumo',
      );
    }

    // Actualizar el estado de la novedad a "CANCELADA"
    const novedadActualizada = await prisma.novedadPescaConsumo.update({
      where: { id: Number(id) },
      data: {
        estadoNovedadPescaConsumoId: Number(estadoCancelada.id),
        updatedAt: new Date(),
      },
    });

    return novedadActualizada;
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
  finalizar,
  cancelar,
};
