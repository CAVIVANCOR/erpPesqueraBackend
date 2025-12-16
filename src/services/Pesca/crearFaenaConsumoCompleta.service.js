import prisma from '../../config/prismaClient.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para crear una faena de pesca consumo completa con todos sus registros asociados
 * Replica la lógica de creación de faena del proceso "Iniciar Novedad Pesca Consumo"
 * 
 * Crea:
 * - 1 FaenaPescaConsumo (con autocompletado inteligente)
 * - N TripulanteFaenaConsumo (todos los elegibles)
 * - M DetAccionesPreviasFaenaConsumo (todas las acciones activas)
 * - X DetDocTripulantesFaenaConsumo (todos los docs de todos los tripulantes)
 * - Y DetDocEmbarcacionPescaConsumo (todos los docs de la embarcación)
 * 
 * @author ERP Megui
 * @version 1.0.0
 */

/**
 * Crear una faena de pesca consumo completa con todos sus registros asociados
 * @param {BigInt} novedadPescaConsumoId - ID de la novedad de pesca consumo
 * @returns {Promise<Object>} Resultado con faena y todos los registros creados
 */
const crearFaenaConsumoCompleta = async (novedadPescaConsumoId) => {
  try {
    // Validar que la novedad existe
    const novedad = await prisma.novedadPescaConsumo.findUnique({ 
      where: { id: BigInt(novedadPescaConsumoId) },
      include: {
        empresa: true
      }
    });
    
    if (!novedad) {
      throw new NotFoundError('Novedad de pesca consumo no encontrada');
    }

    // Validar que la novedad está iniciada
    if (!novedad.novedadPescaConsumoIniciada) {
      throw new ValidationError('La novedad debe estar iniciada para crear faenas');
    }

    // Buscar el estado "INICIADA" para faenas de pesca consumo
    const estadoFaenaIniciada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 8, // Faena Pesca Consumo
        descripcion: "INICIADA",
        cesado: false
      }
    });

    if (!estadoFaenaIniciada) {
      throw new ValidationError('No se encontró el estado "INICIADA" para faenas de pesca consumo');
    }

    // Buscar datos necesarios para autocompletar (solo si hay exactamente 1)
    const [motorista, patron, bahiaComercial, embarcacion] = await Promise.all([
      // Motorista: Personal.empresaId=novedad.empresaId y cargoId=14(MOTORISTA) y cesado=false
      prisma.personal.findMany({
        where: {
          empresaId: novedad.empresaId,
          cargoId: 14, // MOTORISTA EMBARCACION
          cesado: false,
        },
      }),
      // Patrón: Personal.empresaId=novedad.empresaId y cargoId=22(PATRON) y cesado=false
      prisma.personal.findMany({
        where: {
          empresaId: novedad.empresaId,
          cargoId: 22, // PATRON EMBARCACION
          cesado: false,
        },
      }),
      // Bahía comercial: Personal.empresaId=novedad.empresaId y cargoId=10(BAHIA COMERCIAL) y cesado=false
      prisma.personal.findMany({
        where: {
          empresaId: novedad.empresaId,
          cargoId: 10, // BAHIA COMERCIAL
          cesado: false,
        },
      }),
      // Embarcación: tipoEmbarcacionId=2 (Pesca Consumo)
      prisma.embarcacion.findMany({
        where: {
          tipoEmbarcacionId: 2, // Pesca Consumo
        },
      }),
    ]);

    // Autocompletar solo si hay exactamente 1 registro
    const motoristaId = motorista.length === 1 ? motorista[0].id : null;
    const patronId = patron.length === 1 ? patron[0].id : null;
    const bahiaComercialId = bahiaComercial.length === 1 ? bahiaComercial[0].id : null;
    const embarcacionId = embarcacion.length === 1 ? embarcacion[0].id : null;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear FaenaPescaConsumo
      const faenaCreada = await tx.faenaPescaConsumo.create({
        data: {
          novedadPescaConsumoId: BigInt(novedadPescaConsumoId),
          bahiaId: bahiaComercialId ? BigInt(bahiaComercialId) : BigInt(novedad.BahiaId),
          motoristaId: motoristaId ? BigInt(motoristaId) : null,
          patronId: patronId ? BigInt(patronId) : null,
          descripcion: `Faena ${novedad.nombre || 'S/N'}`,
          fechaSalida: null,
          fechaDescarga: null,
          fechaHoraFondeo: null,
          puertoSalidaId: null,
          puertoDescargaId: null,
          puertoFondeoId: null,
          embarcacionId: embarcacionId ? BigInt(embarcacionId) : null,
          bolicheRedId: null,
          urlInformeFaena: null,
          estadoFaenaId: BigInt(estadoFaenaIniciada.id),
          toneladasCapturadasFaena: null,
          updatedAt: new Date(),
        },
      });

      // 2. Crear TripulanteFaenaConsumo
      const tripulantesPesca = await tx.personal.findMany({
        where: {
          empresaId: BigInt(novedad.empresaId),
          cesado: false,
          paraPescaConsumo: true,
          cargoId: {
            in: [21, 22, 14], // 21: TRIPULANTE, 22: PATRON, 14: MOTORISTA
          },
        },
      });

      const tripulantesData = tripulantesPesca.map((personal) => ({
        faenaPescaConsumoId: BigInt(faenaCreada.id),
        personalId: BigInt(personal.id),
        cargoId: BigInt(personal.cargoId),
        nombres: personal.nombres,
        apellidos: personal.apellidos,
        observaciones: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      let tripulantesCreados = [];
      if (tripulantesData.length > 0) {
        await tx.tripulanteFaenaConsumo.createMany({
          data: tripulantesData,
        });
        
        tripulantesCreados = await tx.tripulanteFaenaConsumo.findMany({
          where: { faenaPescaConsumoId: BigInt(faenaCreada.id) }
        });
      }

      // 3. Crear DetAccionesPreviasFaenaConsumo
      const accionesPrevias = await tx.accionesPreviasFaena.findMany({
        where: {
          paraPescaConsumo: true,
          activo: true,
        },
      });

      const fechaActual = new Date();

      // Buscar responsable (moduloSistemaId=3 "PESCA DE CONSUMO")
      const responsable = await tx.parametroAprobador.findFirst({
        where: {
          empresaId: BigInt(novedad.empresaId),
          embarcacionId: embarcacionId ? BigInt(embarcacionId) : undefined,
          moduloSistemaId: 3, // PESCA DE CONSUMO
          cesado: false,
          vigenteDesde: { lte: fechaActual },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaActual } }],
        },
      });

      if (!responsable) {
        throw new ValidationError('No se encontró al responsable PESCA DE CONSUMO');
      }

      // Buscar verificador (moduloSistemaId=12 "VERIFICADOR PESCA DE CONSUMO")
      const verificador = await tx.parametroAprobador.findFirst({
        where: {
          moduloSistemaId: 12, // VERIFICADOR PESCA DE CONSUMO
          cesado: false,
          vigenteDesde: { lte: fechaActual },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaActual } }],
        },
      });

      if (!verificador) {
        throw new ValidationError('No se encontró al Verificador Responsable para PESCA DE CONSUMO');
      }

      const detallesAccionesPrevias = accionesPrevias.map((accion) => ({
        faenaPescaConsumoId: BigInt(faenaCreada.id),
        accionPreviaId: BigInt(accion.id),
        responsableId: BigInt(responsable.personalRespId),
        verificadorId: BigInt(verificador.personalRespId),
        fechaVerificacion: null,
        cumplida: false,
        fechaCumplida: null,
        urlConfirmaAccionPdf: null,
        observaciones: null,
        verificado: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      let detAcciones = [];
      if (detallesAccionesPrevias.length > 0) {
        await tx.detAccionesPreviasFaenaConsumo.createMany({
          data: detallesAccionesPrevias,
        });
        
        detAcciones = await tx.detAccionesPreviasFaenaConsumo.findMany({
          where: { faenaPescaConsumoId: BigInt(faenaCreada.id) }
        });
      }

      // 4. Crear DetDocTripulantesFaenaConsumo
      const tripulantes = await tx.personal.findMany({
        where: {
          empresaId: BigInt(novedad.empresaId),
          cargoId: {
            in: [21, 22, 14],
          },
          cesado: false,
        },
      });

      const tripulantesIds = tripulantes.map((t) => BigInt(t.id));

      const documentacionPersonal = await tx.documentacionPersonal.findMany({
        where: {
          personalId: {
            in: tripulantesIds,
          },
          cesado: false,
        },
      });

      const detallesDocTripulantes = documentacionPersonal.map((doc) => {
        let docVencido = false;
        if (doc.fechaVencimiento) {
          const fechaActual = new Date();
          fechaActual.setHours(0, 0, 0, 0);
          const fechaVenc = new Date(doc.fechaVencimiento);
          fechaVenc.setHours(0, 0, 0, 0);
          docVencido = fechaVenc < fechaActual;
        }

        return {
          faenaPescaConsumoId: BigInt(faenaCreada.id),
          tripulanteId: BigInt(doc.personalId),
          documentoId: BigInt(doc.documentoPescaId),
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

      let detDocTripulantes = [];
      if (detallesDocTripulantes.length > 0) {
        await tx.detDocTripulantesFaenaConsumo.createMany({
          data: detallesDocTripulantes,
        });
        
        detDocTripulantes = await tx.detDocTripulantesFaenaConsumo.findMany({
          where: { faenaPescaConsumoId: BigInt(faenaCreada.id) }
        });
      }

      // 5. Crear DetDocEmbarcacionPescaConsumo
      let detDocEmbarcacion = [];
      
      if (embarcacionId) {
        const documentacionEmbarcacion = await tx.documentacionEmbarcacion.findMany({
          where: {
            embarcacionId: BigInt(embarcacionId),
            cesado: false,
          },
        });

        const detallesDocEmbarcacion = documentacionEmbarcacion.map((doc) => {
          let docVencido = false;
          if (doc.fechaVencimiento) {
            const fechaActual = new Date();
            fechaActual.setHours(0, 0, 0, 0);
            const fechaVenc = new Date(doc.fechaVencimiento);
            fechaVenc.setHours(0, 0, 0, 0);
            docVencido = fechaVenc < fechaActual;
          }

          return {
            faenaPescaConsumoId: BigInt(faenaCreada.id),
            documentoPescaId: BigInt(doc.documentoPescaId),
            numeroDocumento: doc.numeroDocumento || null,
            fechaEmision: doc.fechaEmision || null,
            fechaVencimiento: doc.fechaVencimiento || null,
            urlDocEmbarcacion: doc.urlDocPdf || null,
            observaciones: doc.observaciones || null,
            verificado: false,
            docVencido: docVencido,
            updatedAt: new Date(),
          };
        });

        if (detallesDocEmbarcacion.length > 0) {
          await tx.detDocEmbarcacionPescaConsumo.createMany({
            data: detallesDocEmbarcacion,
          });
          
          detDocEmbarcacion = await tx.detDocEmbarcacionPescaConsumo.findMany({
            where: { faenaPescaConsumoId: BigInt(faenaCreada.id) }
          });
        }
      }

      // Calcular estadísticas para el resumen
      const docTripulantesVencidos = detDocTripulantes.filter(d => d.docVencido).length;
      const docTripulantesVigentes = detDocTripulantes.length - docTripulantesVencidos;
      const docEmbarcacionVencidos = detDocEmbarcacion.filter(d => d.docVencido).length;
      const docEmbarcacionVigentes = detDocEmbarcacion.length - docEmbarcacionVencidos;
      
      // Contar tripulantes por cargo
      const tripulantesPorCargo = {
        tripulantes: tripulantesCreados.filter(t => Number(t.cargoId) === 21).length,
        patrones: tripulantesCreados.filter(t => Number(t.cargoId) === 22).length,
        motoristas: tripulantesCreados.filter(t => Number(t.cargoId) === 14).length
      };

      return {
        faenaCreada,
        tripulantesCreados,
        detAcciones,
        detDocTripulantes,
        detDocEmbarcacion,
        mensaje: 'Faena de pesca consumo creada exitosamente con todos sus registros asociados',
        // Resumen para el modal informativo
        resumen: {
          faenaId: faenaCreada.id,
          descripcion: faenaCreada.descripcion,
          novedadId: novedad.id,
          nombreNovedad: novedad.nombre,
          embarcacionNombre: embarcacionId && embarcacion.length === 1 ? embarcacion[0]?.nombre : null,
          patronNombre: patronId && patron.length === 1 ? patron[0]?.nombreCompleto : null,
          motoristaNombre: motoristaId && motorista.length === 1 ? motorista[0]?.nombreCompleto : null,
          bahiaNombre: bahiaComercialId && bahiaComercial.length === 1 ? bahiaComercial[0]?.nombreCompleto : null,
          tripulantesRegistrados: tripulantesCreados.length,
          tripulantesPorCargo,
          accionesPreviasAsignadas: detAcciones.length,
          docTripulantesTotal: detDocTripulantes.length,
          docTripulantesVigentes,
          docTripulantesVencidos,
          docEmbarcacionTotal: detDocEmbarcacion.length,
          docEmbarcacionVigentes,
          docEmbarcacionVencidos,
          tieneAdvertencias: (docTripulantesVencidos + docEmbarcacionVencidos) > 0,
          totalDocumentosVencidos: docTripulantesVencidos + docEmbarcacionVencidos
        }
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    console.error('Error en crearFaenaConsumoCompleta:', err);
    throw err;
  }
};

export default {
  crearFaenaConsumoCompleta
};
