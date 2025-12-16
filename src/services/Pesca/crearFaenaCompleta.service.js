import prisma from '../../config/prismaClient.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para crear una faena completa con todos sus registros asociados
 * Replica la lógica de creación de faena del proceso "Iniciar Temporada"
 * 
 * Crea:
 * - 1 FaenaPesca (con autocompletado inteligente)
 * - N TripulanteFaena (todos los elegibles)
 * - M DetAccionesPreviasFaena (todas las acciones activas)
 * - X DetalleDocTripulantes (todos los docs de todos los tripulantes)
 * - Y DetalleDocEmbarcacion (todos los docs de la embarcación)
 * 
 * @author ERP Megui
 * @version 1.0.0
 */

/**
 * Crear una faena completa con todos sus registros asociados
 * @param {BigInt} temporadaId - ID de la temporada de pesca
 * @returns {Promise<Object>} Resultado con faena y todos los registros creados
 */
const crearFaenaCompleta = async (temporadaId) => {
  try {
    // Validar que la temporada existe
    const temporada = await prisma.temporadaPesca.findUnique({ 
      where: { id: BigInt(temporadaId) },
      include: {
        empresa: true
      }
    });
    
    if (!temporada) {
      throw new NotFoundError('Temporada de pesca no encontrada');
    }

    // Validar que la temporada está iniciada
    if (!temporada.temporadaPescaIniciada) {
      throw new ValidationError('La temporada debe estar iniciada para crear faenas');
    }

    // Buscar el estado "INICIADA" para faenas de pesca
    const estadoFaenaIniciada = await prisma.estadoMultiFuncion.findFirst({
      where: {
        tipoProvieneDeId: 5, // Faena Pesca
        descripcion: "INICIADA",
        cesado: false
      }
    });

    if (!estadoFaenaIniciada) {
      throw new ValidationError('No se encontró el estado "INICIADA" para faenas de pesca');
    }

    // Obtener acciones previas activas para pesca industrial
    const accionesPrevias = await prisma.accionesPreviasFaena.findMany({
      where: {
        paraPescaIndustrial: true,
        activo: true
      }
    });

    // Implementar lógica de autocompletado según especificaciones
    const [embarcaciones, motoristas, patrones, bahias] = await Promise.all([
      // 1. Filtrar embarcaciones por tipoEmbarcacionId=1
      prisma.embarcacion.findMany({
        where: { tipoEmbarcacionId: 1 }
      }),
      // 2. Filtrar motoristas por empresaId y cargoId=14 (MOTORISTA EMBARCACION)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 14,
          cesado: false
        }
      }),
      // 3. Filtrar patrones por empresaId y cargoId=22 (PATRON EMBARCACION)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 22,
          cesado: false
        }
      }),
      // 4. Filtrar bahías por empresaId y cargoId=10 (BAHIA COMERCIAL)
      prisma.personal.findMany({
        where: {
          empresaId: temporada.empresaId,
          cargoId: 10,
          cesado: false
        }
      }),
    ]);

    // Autocompletar solo si hay exactamente 1 registro
    const embarcacionId = embarcaciones.length === 1 ? embarcaciones[0].id : null;
    const motoristaId = motoristas.length === 1 ? motoristas[0].id : null;
    const patronId = patrones.length === 1 ? patrones[0].id : null;
    const bahiaId = bahias.length === 1 ? bahias[0].id : null;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear FaenaPesca con lógica de autocompletado específica
      const faenaPesca = await tx.faenaPesca.create({
        data: {
          temporadaId: BigInt(temporadaId),
          estadoFaenaId: BigInt(estadoFaenaIniciada.id),
          descripcion: "Temporal", // Descripción temporal que se actualizará
          // Campos autocompletados (solo si hay exactamente 1 registro)
          embarcacionId: embarcacionId ? BigInt(embarcacionId) : null,
          motoristaId: motoristaId ? BigInt(motoristaId) : null,
          patronId: patronId ? BigInt(patronId) : null,
          bahiaId: bahiaId ? BigInt(bahiaId) : null,
          // Campos que quedan null deliberadamente
          fechaSalida: null,
          fechaDescarga: null,
          fechaHoraFondeo: null,
          puertoSalidaId: null,
          puertoDescargaId: null,
          puertoFondeoId: null,
          bolicheRedId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Actualizar la descripción con el ID real de la faena
      const descripcionFaena = `Faena ${faenaPesca.id} Temporada ${temporada.numeroResolucion || 'S/N'}`;
      await tx.faenaPesca.update({
        where: { id: faenaPesca.id },
        data: { descripcion: descripcionFaena }
      });

      // 2. Crear TripulanteFaena para cada tripulante elegible
      const tripulantesElegibles = await tx.personal.findMany({
        where: {
          empresaId: BigInt(temporada.empresaId),
          cesado: false,
          paraTemporadaPesca: true,
          cargoId: {
            in: [21, 22, 14] // 21: Tripulante, 22: Patrón, 14: Motorista
          }
        }
      });

      const tripulantesFaenaData = tripulantesElegibles.map(personal => ({
        faenaPescaId: BigInt(faenaPesca.id),
        personalId: BigInt(personal.id),
        cargoId: BigInt(personal.cargoId),
        nombres: personal.nombres,
        apellidos: personal.apellidos,
        observaciones: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      let tripulantesFaena = [];
      if (tripulantesFaenaData.length > 0) {
        await tx.tripulanteFaena.createMany({
          data: tripulantesFaenaData
        });
        
        // Obtener los registros creados para incluir en el resultado
        tripulantesFaena = await tx.tripulanteFaena.findMany({
          where: { faenaPescaId: BigInt(faenaPesca.id) }
        });
      }

      // 3. Crear DetAccionesPreviasFaena para cada acción previa
      const detAcciones = [];
      for (const accion of accionesPrevias) {
        // Buscar responsable para PESCA INDUSTRIAL (moduloSistemaId=2)
        const responsable = await tx.parametroAprobador.findFirst({
          where: {
            empresaId: BigInt(temporada.empresaId),
            embarcacionId: embarcacionId ? BigInt(embarcacionId) : undefined,
            moduloSistemaId: 2, // PESCA INDUSTRIAL
            cesado: false,
            vigenteDesde: { lte: new Date() },
            OR: [
              { vigenteHasta: null },
              { vigenteHasta: { gte: new Date() } }
            ]
          }
        });

        if (!responsable) {
          throw new ValidationError('No se encontró al responsable PESCA INDUSTRIAL');
        }

        // Buscar verificador para VERIFICADOR PESCA INDUSTRIAL (moduloSistemaId=11)
        const verificador = await tx.parametroAprobador.findFirst({
          where: {
            moduloSistemaId: 11, // VERIFICADOR PESCA INDUSTRIAL
            cesado: false,
            vigenteDesde: { lte: new Date() },
            OR: [
              { vigenteHasta: null },
              { vigenteHasta: { gte: new Date() } }
            ]
          }
        });

        if (!verificador) {
          throw new ValidationError('No se encontró al Verificador Responsable para PESCA INDUSTRIAL');
        }

        const detAccion = await tx.detAccionesPreviasFaena.create({
          data: {
            faenaPescaId: BigInt(faenaPesca.id),
            accionPreviaId: BigInt(accion.id),
            responsableId: BigInt(responsable.personalRespId),
            verificadorId: BigInt(verificador.personalRespId),
            cumplida: false,
            verificado: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        detAcciones.push(detAccion);
      }

      // 4. Crear DetalleDocTripulantes para cada tripulante y sus documentos requeridos
      const detalleDocTripulantes = [];
      
      // Filtrar tripulantes por empresaId y cargos específicos (21, 22, 14) y no cesados
      const tripulantes = await tx.personal.findMany({
        where: {
          empresaId: BigInt(temporada.empresaId),
          cargoId: {
            in: [21, 22, 14] // TRIPULANTE EMBARCACION, PATRON EMBARCACION, MOTORISTA EMBARCACION
          },
          cesado: false
        }
      });

      // Para cada tripulante, obtener sus documentos requeridos
      for (const tripulante of tripulantes) {
        const documentosPersonal = await tx.documentacionPersonal.findMany({
          where: {
            personalId: BigInt(tripulante.id),
            cesado: false
          }
        });

        // Crear un registro DetalleDocTripulantes por cada documento del tripulante
        for (const docPersonal of documentosPersonal) {
          // Determinar si el documento está vencido
          const fechaActual = new Date();
          const docVencido = docPersonal.fechaVencimiento ? 
            new Date(docPersonal.fechaVencimiento) < fechaActual : false;

          const detalleDoc = await tx.detalleDocTripulantes.create({
            data: {
              faenaPescaId: BigInt(faenaPesca.id),
              tripulanteId: BigInt(docPersonal.personalId),
              documentoId: BigInt(docPersonal.documentoPescaId),
              numeroDocumento: docPersonal.numeroDocumento,
              fechaEmision: docPersonal.fechaEmision,
              fechaVencimiento: docPersonal.fechaVencimiento,
              urlDocTripulantePdf: docPersonal.urlDocPdf,
              docVencido: docVencido,
              verificado: false, // Por defecto no verificado
              observaciones: docPersonal.observaciones,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          detalleDocTripulantes.push(detalleDoc);
        }
      }

      // 5. Crear DetalleDocEmbarcacion para cada documento de la embarcación
      const detalleDocEmbarcacion = [];
      
      if (embarcacionId) {
        // Filtrar documentos de la embarcación por embarcacionId y no cesados
        const documentosEmbarcacion = await tx.documentacionEmbarcacion.findMany({
          where: {
            embarcacionId: BigInt(embarcacionId),
            cesado: false
          }
        });

        // Crear un registro DetalleDocEmbarcacion por cada documento de la embarcación
        for (const docEmbarcacion of documentosEmbarcacion) {
          // Determinar si el documento está vencido
          const fechaActual = new Date();
          const docVencido = docEmbarcacion.fechaVencimiento ? 
            new Date(docEmbarcacion.fechaVencimiento) < fechaActual : false;

          const detalleDocEmb = await tx.detalleDocEmbarcacion.create({
            data: {
              faenaPescaId: BigInt(faenaPesca.id),
              documentoPescaId: BigInt(docEmbarcacion.documentoPescaId),
              numeroDocumento: docEmbarcacion.numeroDocumento,
              fechaEmision: docEmbarcacion.fechaEmision,
              fechaVencimiento: docEmbarcacion.fechaVencimiento,
              observaciones: docEmbarcacion.observaciones,
              urlDocEmbarcacion: docEmbarcacion.urlDocPdf,
              docVencido: docVencido,
              verificado: false, // Por defecto no verificado
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          detalleDocEmbarcacion.push(detalleDocEmb);
        }
      }

      // Calcular estadísticas para el resumen
      const docTripulantesVencidos = detalleDocTripulantes.filter(d => d.docVencido).length;
      const docTripulantesVigentes = detalleDocTripulantes.length - docTripulantesVencidos;
      const docEmbarcacionVencidos = detalleDocEmbarcacion.filter(d => d.docVencido).length;
      const docEmbarcacionVigentes = detalleDocEmbarcacion.length - docEmbarcacionVencidos;
      
      // Contar tripulantes por cargo (convertir a Number para comparación)
      const tripulantesPorCargo = {
        tripulantes: tripulantesFaena.filter(t => Number(t.cargoId) === 21).length,
        patrones: tripulantesFaena.filter(t => Number(t.cargoId) === 22).length,
        motoristas: tripulantesFaena.filter(t => Number(t.cargoId) === 14).length
      };

      return {
        faenaPesca,
        tripulantesFaena,
        detAcciones,
        detalleDocTripulantes,
        detalleDocEmbarcacion,
        mensaje: 'Faena creada exitosamente con todos sus registros asociados',
        // Resumen para el modal informativo
        resumen: {
          faenaId: faenaPesca.id,
          descripcion: descripcionFaena,
          temporadaId: temporada.id,
          numeroResolucion: temporada.numeroResolucion,
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
          tieneAdvertencias: (docTripulantesVencidos + docEmbarcacionVencidos) > 0,
          totalDocumentosVencidos: docTripulantesVencidos + docEmbarcacionVencidos
        }
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    console.error('Error en crearFaenaCompleta:', err);
    throw err;
  }
};

export default {
  crearFaenaCompleta
};
