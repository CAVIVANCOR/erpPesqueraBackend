import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para DocumentoDinamico
 * Obtiene documentos dinámicamente según el modelo de Prisma
 */

const MODELOS_PERMITIDOS = [
  'TemporadaPesca',
  'NovedadPescaConsumo',
  'OrdenCompra',
  'PreFactura',
  'MovimientoAlmacen',
  'OTMantenimiento',
  'ContratoServicio',
  'RequerimientoCompra',
];

const MODELO_CONFIG = {
  TemporadaPesca: {
    moduloId: 2,
    moduloNombre: 'PESCA INDUSTRIAL',
    include: {
      empresa: true,
      estadoTemporada: true,
      faenas: {
        include: {
          calas: {
            include: {
              especiesPescadas: {
                include: {
                  especie: true,
                },
              },
            },
          },
          descargaFaena: {
            include: {
              especie: true,
            },
          },
        },
      },
    },
    campoId: 'id',
    campoNumero: 'nombre',
    campoFecha: 'fechaInicio',
    campoEntidad: 'empresa.razonSocial',
  },
  NovedadPescaConsumo: {
    moduloId: 3,
    moduloNombre: 'PESCA DE CONSUMO',
    include: null,
    campoId: 'id',
    campoNumero: 'nombre',
    campoFecha: 'fechaInicio',
    campoEntidad: null,
  },
  OrdenCompra: {
    moduloId: 4,
    moduloNombre: 'COMPRAS',
    include: { proveedor: true },
    campoId: 'id',
    campoNumero: 'numeroDocumento',
    campoFecha: 'fechaDocumento',
    campoEntidad: 'proveedor.razonSocial',
  },
  PreFactura: {
    moduloId: 5,
    moduloNombre: 'VENTAS',
    include: { cliente: true },
    campoId: 'id',
    campoNumero: 'numeroDocumento',
    campoFecha: 'fechaDocumento',
    campoEntidad: 'cliente.razonSocial',
  },
  MovimientoAlmacen: {
    moduloId: 6,
    moduloNombre: 'INVENTARIOS',
    include: { entidadComercial: true },
    campoId: 'id',
    campoNumero: 'numeroDocumento',
    campoFecha: 'fechaDocumento',
    campoEntidad: 'entidadComercial.razonSocial',
  },
  OTMantenimiento: {
    moduloId: 7,
    moduloNombre: 'MANTENIMIENTO',
    include: null,
    campoId: 'id',
    campoNumero: 'numeroCompleto',
    campoFecha: 'fechaDocumento',
    campoEntidad: null,
  },
  ContratoServicio: {
    moduloId: 8,
    moduloNombre: 'CONTRATOS',
    include: null,
    campoId: 'id',
    campoNumero: 'numeroContrato',
    campoFecha: 'fechaInicio',
    campoEntidad: null,
  },
  RequerimientoCompra: {
    moduloId: 4,
    moduloNombre: 'COMPRAS',
    include: null,
    campoId: 'id',
    campoNumero: 'numeroRequerimiento',
    campoFecha: 'fechaRequerimiento',
    campoEntidad: null,
  },
};

/**
 * Calcula estadísticas de faenas, calas y descargas para TemporadaPesca
 */
const calcularEstadisticasTemporada = (temporada) => {
  const nroFaenas = temporada.faenas?.length || 0;
  
  // Contar calas de todas las faenas
  let nroCalas = 0;
  const especiesCapturadas = {};
  
  temporada.faenas?.forEach(faena => {
    nroCalas += faena.calas?.length || 0;
    
    // Sumar especies capturadas de todas las calas
    faena.calas?.forEach(cala => {
      cala.especiesPescadas?.forEach(detalle => {
        const nombreEspecie = detalle.especie?.nombre || 'Sin nombre';
        const toneladas = Number(detalle.toneladas) || 0;
        const kilogramos = toneladas * 1000; // Convertir toneladas a kilogramos
        
        if (!especiesCapturadas[nombreEspecie]) {
          especiesCapturadas[nombreEspecie] = 0;
        }
        especiesCapturadas[nombreEspecie] += kilogramos;
      });
    });
  });
  
  // Contar descargas y especies descargadas
  let nroDescargas = 0;
  const especiesDescargadas = {};
  
  temporada.faenas?.forEach(faena => {
    if (faena.descargaFaena) {
      nroDescargas++;
      
      const nombreEspecie = faena.descargaFaena.especie?.nombre || 'Sin nombre';
      const toneladas = Number(faena.descargaFaena.toneladas) || 0;
      const kilogramos = toneladas * 1000; // Convertir toneladas a kilogramos
      
      if (!especiesDescargadas[nombreEspecie]) {
        especiesDescargadas[nombreEspecie] = 0;
      }
      especiesDescargadas[nombreEspecie] += kilogramos;
    }
  });
  
  // Convertir objetos a arrays para el frontend
  const especiesCapturasArray = Object.entries(especiesCapturadas).map(([especie, kilaje]) => ({
    especie,
    kilaje,
  }));
  
  const especiesDescargasArray = Object.entries(especiesDescargadas).map(([especie, kilaje]) => ({
    especie,
    kilaje,
  }));
  
  // Calcular totales
  const totalCapturado = especiesCapturasArray.reduce((sum, esp) => sum + esp.kilaje, 0);
  const totalDescargado = especiesDescargasArray.reduce((sum, esp) => sum + esp.kilaje, 0);
  
  return {
    nroFaenas,
    nroCalas,
    especiesCapturadas: especiesCapturasArray,
    totalCapturado,
    nroDescargas,
    especiesDescargadas: especiesDescargasArray,
    totalDescargado,
  };
};

const obtenerDocumentosPorModelo = async (modeloNombre) => {
  try {
    if (!MODELOS_PERMITIDOS.includes(modeloNombre)) {
      throw new ValidationError(`Modelo '${modeloNombre}' no está permitido para consulta dinámica.`);
    }

    const modeloPrisma = modeloNombre.charAt(0).toLowerCase() + modeloNombre.slice(1);

    if (!prisma[modeloPrisma]) {
      throw new NotFoundError(`Modelo '${modeloNombre}' no existe en Prisma.`);
    }

    const config = MODELO_CONFIG[modeloNombre];

    const queryOptions = {
      orderBy: { id: 'desc' },
      take: 1000,
    };

    if (config.include) {
      queryOptions.include = config.include;
    }

    let documentos = await prisma[modeloPrisma].findMany(queryOptions);

    // Si es TemporadaPesca, agregar estadísticas
    if (modeloNombre === 'TemporadaPesca') {
      documentos = documentos.map(temporada => {
        const estadisticas = calcularEstadisticasTemporada(temporada);
        
        // Eliminar las relaciones faenas del objeto para no enviar datos innecesarios al frontend
        const { faenas, ...temporadaSinFaenas } = temporada;
        
        return {
          ...temporadaSinFaenas,
          estadisticas,
        };
      });
    }

    return {
      modulo: {
        id: config.moduloId,
        nombre: config.moduloNombre,
      },
      config: {
        campoId: config.campoId,
        campoNumero: config.campoNumero,
        campoFecha: config.campoFecha,
        campoEntidad: config.campoEntidad,
      },
      documentos,
    };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) {
      throw err;
    }
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al obtener documentos', err.message);
    }
    throw err;
  }
};

export default {
  obtenerDocumentosPorModelo,
};