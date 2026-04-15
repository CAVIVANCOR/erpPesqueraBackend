import prisma from '../../config/prismaClient.js';
import * as turf from '@turf/turf';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio de Geolocalización para análisis de coordenadas de pesca
 * Utiliza datos reales de PuertoPesca, OpenStreetMap Nominatim y NOAA
 * 100% Open Source - Sin APIs de pago
 * Documentado en español
 */
// ========== CACHÉ DE DATOS GEOGRÁFICOS ==========

/**
 * Caché en memoria para datos geográficos
 * Se carga una sola vez al iniciar el servidor
 */
let centrosPobladosCache = null;

/**
 * Carga datos de centros poblados INEI en memoria
 * @returns {Object} GeoJSON de centros poblados
 */
const cargarCentrosPoblados = () => {
  if (centrosPobladosCache) {
    return centrosPobladosCache;
  }
  
  try {
    const geojsonPath = path.join(__dirname, '..', '..', '..', 'temp', 'centros_poblados.geojson');
    const geojsonData = fs.readFileSync(geojsonPath, 'utf-8');
    centrosPobladosCache = JSON.parse(geojsonData);
    console.log(`✅ Centros poblados INEI cargados en memoria: ${centrosPobladosCache.features.length} lugares`);
    return centrosPobladosCache;
  } catch (error) {
    console.error('❌ Error cargando centros poblados:', error);
    throw new DatabaseError('Error cargando datos geográficos', error.message);
  }
};

// ========== FUNCIONES AUXILIARES ==========

/**
 * Convierte kilómetros a millas náuticas
 * @param {number} km - Distancia en kilómetros
 * @returns {number} Distancia en millas náuticas
 */
const kmAMillasNauticas = (km) => km * 0.539957;

/**
 * Sanitiza texto para prevenir inyección CRLF
 * @param {string} texto - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
const sanitizarTexto = (texto) => {
  if (!texto) return '';
  return String(texto).replace(/[\r\n]/g, '');
};

// ========== FUNCIONES PRINCIPALES ==========

/**
 * 1. Encuentra el puerto más cercano usando datos REALES de la BD
 * @param {number} latitud - Latitud del punto
 * @param {number} longitud - Longitud del punto
 * @returns {Promise<Object>} Información del puerto más cercano
 */
const encontrarPuertoMasCercano = async (latitud, longitud) => {
  try {
    // Obtener TODOS los puertos activos con coordenadas de la BD
    const puertos = await prisma.puertoPesca.findMany({
      where: {
        activo: true,
        latitud: { not: null },
        longitud: { not: null }
      },
      select: {
        id: true,
        nombre: true,
        zona: true,
        provincia: true,
        departamento: true,
        latitud: true,
        longitud: true
      }
    });

    if (puertos.length === 0) {
      throw new ValidationError('No hay puertos activos con coordenadas en la base de datos');
    }

    // Convertir a GeoJSON
    const puntoDescarga = turf.point([longitud, latitud]);
    
    const puntosGeoJSON = turf.featureCollection(
      puertos.map(p => 
        turf.point(
          [Number(p.longitud), Number(p.latitud)],
          { 
            id: p.id,
            nombre: p.nombre,
            zona: p.zona,
            provincia: p.provincia,
            departamento: p.departamento
          }
        )
      )
    );

    // Encontrar el más cercano usando Turf.js
    const puertoMasCercano = turf.nearestPoint(puntoDescarga, puntosGeoJSON);

    const distanciaKm = turf.distance(puntoDescarga, puertoMasCercano, { units: 'kilometers' });
    const distanciaMN = turf.distance(puntoDescarga, puertoMasCercano, { units: 'nauticalmiles' });

    return {
      puertoId: puertoMasCercano.properties.id,
      nombrePuerto: sanitizarTexto(puertoMasCercano.properties.nombre),
      zona: sanitizarTexto(puertoMasCercano.properties.zona),
      provincia: sanitizarTexto(puertoMasCercano.properties.provincia),
      departamento: sanitizarTexto(puertoMasCercano.properties.departamento),
      distanciaKm: parseFloat(distanciaKm.toFixed(2)),
      distanciaMillasNauticas: parseFloat(distanciaMN.toFixed(2)),
      coordenadasPuerto: {
        latitud: puertoMasCercano.geometry.coordinates[1],
        longitud: puertoMasCercano.geometry.coordinates[0]
      }
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new DatabaseError('Error al buscar puerto más cercano', err.message);
  }
};

/**
 * 2. Calcula distancia a la costa (usando puerto más cercano como referencia)
 * @param {number} latitud - Latitud del punto
 * @param {number} longitud - Longitud del punto
 * @returns {Promise<Object>} Información de distancia a la costa
 */
const calcularDistanciaACosta = async (latitud, longitud) => {
  const puertoMasCercano = await encontrarPuertoMasCercano(latitud, longitud);
  
  return {
    distanciaKm: puertoMasCercano.distanciaKm,
    distanciaMillasNauticas: puertoMasCercano.distanciaMillasNauticas,
    puntoCosteroMasCercano: puertoMasCercano.nombrePuerto,
    coordenadasCosta: puertoMasCercano.coordenadasPuerto
  };
};

/**
 * 3. Obtiene ubicación geográfica usando OpenStreetMap Nominatim (GRATIS)
 * @param {number} latitud - Latitud del punto
 * @param {number} longitud - Longitud del punto
 * @returns {Promise<Object>} Información geográfica del punto
 */
const obtenerUbicacionGeografica = async (latitud, longitud) => {
  try {
    // PASO 1: Buscar centro poblado más cercano en GeoJSON
    const geojson = cargarCentrosPoblados();
    const puntoConsulta = turf.point([longitud, latitud]);
    
    let centroPobladoMasCercano = null;
    let distanciaMinima = Infinity;
    
    // Buscar en un radio de 50km
    for (const feature of geojson.features) {
      const puntoCentro = turf.point(feature.geometry.coordinates);
      const distancia = turf.distance(puntoConsulta, puntoCentro, { units: 'kilometers' });
      
      if (distancia < 50 && distancia < distanciaMinima) {
        distanciaMinima = distancia;
        centroPobladoMasCercano = feature;
      }
    }
    
    // PASO 2: Si encontró centro poblado con UBIGEO, consultar tabla Ubigeo
    if (centroPobladoMasCercano && centroPobladoMasCercano.properties.UBIGEO) {
      try {
        const ubigeoData = await prisma.ubigeo.findUnique({
          where: { codigo: centroPobladoMasCercano.properties.UBIGEO },
          include: {
            departamento: true,
            provincia: true,
            pais: true
          }
        });
        
        if (ubigeoData) {
          const props = centroPobladoMasCercano.properties;
          const nombreLugar = sanitizarTexto(props.DESCRIPCIO || props.NOMBDIST || 'N/A');
          
          return {
            direccionCompleta: `${nombreLugar}, ${ubigeoData.provincia.nombre}, ${ubigeoData.departamento.nombre}, ${ubigeoData.pais.nombre}`,
            lugar: nombreLugar,
            ciudad: nombreLugar,
            distrito: sanitizarTexto(ubigeoData.nombreDistrito) || nombreLugar,
            provincia: sanitizarTexto(ubigeoData.provincia.nombre),
            departamento: sanitizarTexto(ubigeoData.departamento.nombre),
            pais: sanitizarTexto(ubigeoData.pais.nombre),
            cuerpoAgua: 'Océano Pacífico',
            tipoLugar: 'poblado',
            ubigeo: ubigeoData.codigo
          };
        }
      } catch (error) {
        console.warn('Error consultando tabla Ubigeo:', error);
      }
    }
    
    // PASO 3: Fallback a Nominatim si no encontró en BD
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitud}&lon=${longitud}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'ERP-Megui-Pesquera/1.0 (contacto@megui.com)'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Nominatim API error: ${response.status}`);
      return {
        direccionCompleta: 'No disponible',
        lugar: 'N/A',
        ciudad: 'N/A',
        distrito: 'N/A',
        provincia: 'N/A',
        departamento: 'N/A',
        pais: 'Perú',
        cuerpoAgua: 'Océano Pacífico',
        tipoLugar: 'N/A'
      };
    }

    const data = await response.json();

    return {
      direccionCompleta: sanitizarTexto(data.display_name) || 'N/A',
      lugar: sanitizarTexto(data.address?.city || data.address?.town || data.address?.village) || 'N/A',
      ciudad: sanitizarTexto(data.address?.city || data.address?.town || data.address?.village) || 'N/A',
      distrito: sanitizarTexto(data.address?.city || data.address?.town || data.address?.village) || 'N/A',
      provincia: sanitizarTexto(data.address?.county) || 'N/A',
      departamento: sanitizarTexto(data.address?.state) || 'N/A',
      pais: sanitizarTexto(data.address?.country) || 'Perú',
      cuerpoAgua: sanitizarTexto(data.address?.water || data.address?.bay || data.address?.sea) || 'Océano Pacífico',
      tipoLugar: sanitizarTexto(data.type) || 'N/A'
    };
  } catch (error) {
    console.error('Error en geocodificación inversa:', error);
    return {
      direccionCompleta: 'No disponible',
      lugar: 'N/A',
      ciudad: 'N/A',
      distrito: 'N/A',
      provincia: 'N/A',
      departamento: 'N/A',
      pais: 'Perú',
      cuerpoAgua: 'Océano Pacífico',
      tipoLugar: 'N/A'
    };
  }
};

/**
 * 4. Determina zona de pesca según latitud
 * @param {number} latitud - Latitud del punto
 * @returns {Object} Zona y región de pesca
 */
const determinarZonaPesca = (latitud) => {
  let zona = '';
  let region = '';
  
  if (latitud >= -4.5) {
    zona = 'Zona Norte';
    region = 'Tumbes - Piura';
  } else if (latitud >= -9.0) {
    zona = 'Zona Norte-Centro';
    region = 'Lambayeque - La Libertad - Ancash';
  } else if (latitud >= -14.0) {
    zona = 'Zona Centro';
    region = 'Lima - Ica';
  } else if (latitud >= -18.5) {
    zona = 'Zona Sur';
    region = 'Arequipa - Moquegua - Tacna';
  } else {
    zona = 'Fuera de zona peruana';
    region = 'N/A';
  }
  
  return { zona, region };
};

/**
 * 5. Calcula distancia desde puerto de salida
 * @param {BigInt} puertoSalidaId - ID del puerto de salida
 * @param {number} latitudDestino - Latitud del destino
 * @param {number} longitudDestino - Longitud del destino
 * @returns {Promise<Object|null>} Información de distancia desde origen
 */
const calcularDistanciaDesdeOrigen = async (puertoSalidaId, latitudDestino, longitudDestino) => {
  try {
    const puertoSalida = await prisma.puertoPesca.findUnique({
      where: { id: BigInt(puertoSalidaId) },
      select: {
        nombre: true,
        latitud: true,
        longitud: true
      }
    });

    if (!puertoSalida || !puertoSalida.latitud || !puertoSalida.longitud) {
      return null;
    }

    const puntoOrigen = turf.point([Number(puertoSalida.longitud), Number(puertoSalida.latitud)]);
    const puntoDestino = turf.point([longitudDestino, latitudDestino]);

    const distanciaKm = turf.distance(puntoOrigen, puntoDestino, { units: 'kilometers' });
    const distanciaMN = turf.distance(puntoOrigen, puntoDestino, { units: 'nauticalmiles' });

    return {
      puertoSalida: sanitizarTexto(puertoSalida.nombre),
      distanciaKm: parseFloat(distanciaKm.toFixed(2)),
      distanciaMillasNauticas: parseFloat(distanciaMN.toFixed(2))
    };
  } catch (err) {
    console.error('Error al calcular distancia desde origen:', err);
    return null;
  }
};

/**
 * 6. Obtiene profundidad del mar usando NOAA ETOPO1 (GRATIS)
 * @param {number} latitud - Latitud del punto
 * @param {number} longitud - Longitud del punto
 * @returns {Promise<Object|null>} Información de profundidad
 */
const obtenerProfundidadMar = async (latitud, longitud) => {
  try {
    const response = await fetch(
      `https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_global_mosaic/ImageServer/identify?` +
      `geometry=${longitud},${latitud}&` +
      `geometryType=esriGeometryPoint&` +
      `returnGeometry=false&` +
      `f=json`,
      {
        headers: {
          'User-Agent': 'ERP-Megui-Pesquera/1.0'
        }
      }
    );

    if (!response.ok) {
      console.warn(`NOAA API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.value !== undefined && data.value !== null) {
      const profundidadMetros = Math.abs(parseFloat(data.value));
      
      return {
        profundidadMetros: parseFloat(profundidadMetros.toFixed(2)),
        profundidadBrazas: parseFloat((profundidadMetros * 0.546807).toFixed(2)),
        fuente: 'NOAA ETOPO1'
      };
    }

    return null;
  } catch (error) {
    console.error('Error al obtener profundidad del mar:', error);
    return null;
  }
};

/**
 * FUNCIÓN PRINCIPAL: Obtiene toda la información geográfica
 * @param {number} latitud - Latitud del punto
 * @param {number} longitud - Longitud del punto
 * @param {BigInt|null} puertoSalidaId - ID del puerto de salida (opcional)
 * @returns {Promise<Object>} Información geográfica completa
 */
const obtenerInformacionGeograficaCompleta = async (
  latitud,
  longitud,
  puertoSalidaId = null
) => {
  try {
    // Validar coordenadas
    if (!latitud || !longitud) {
      throw new ValidationError('Se requieren latitud y longitud');
    }

    if (latitud < -90 || latitud > 90) {
      throw new ValidationError('Latitud debe estar entre -90 y 90');
    }

    if (longitud < -180 || longitud > 180) {
      throw new ValidationError('Longitud debe estar entre -180 y 180');
    }

    // Ejecutar en paralelo para mayor velocidad
    const [ubicacion, puertoMasCercano, zonaPesca, profundidad] = await Promise.all([
      obtenerUbicacionGeografica(latitud, longitud),
      encontrarPuertoMasCercano(latitud, longitud),
      Promise.resolve(determinarZonaPesca(latitud)),
      obtenerProfundidadMar(latitud, longitud)
    ]);

    // Distancia a costa
    const distanciaCosta = {
      distanciaKm: puertoMasCercano.distanciaKm,
      distanciaMillasNauticas: puertoMasCercano.distanciaMillasNauticas,
      puntoCosteroMasCercano: puertoMasCercano.nombrePuerto
    };

    // Distancia desde puerto de salida
    let distanciaDesdeOrigen = null;
    if (puertoSalidaId) {
      distanciaDesdeOrigen = await calcularDistanciaDesdeOrigen(
        puertoSalidaId,
        latitud,
        longitud
      );
    }

    // Determinar clasificación de aguas
    const enAguasTerritoriales = distanciaCosta.distanciaMillasNauticas <= 12;
    const enZEE = distanciaCosta.distanciaMillasNauticas <= 200;

    return {
      // A) Geocodificación Inversa
      ubicacion: ubicacion,
      
      // B) Distancias
      distancias: {
        aCosta: distanciaCosta,
        desdePuertoSalida: distanciaDesdeOrigen,
        aPuertoMasCercano: {
          puertoId: puertoMasCercano.puertoId,
          nombrePuerto: puertoMasCercano.nombrePuerto,
          zona: puertoMasCercano.zona,
          provincia: puertoMasCercano.provincia,
          departamento: puertoMasCercano.departamento,
          km: puertoMasCercano.distanciaKm,
          millasNauticas: puertoMasCercano.distanciaMillasNauticas
        }
      },
      
      // C) Información Marítima
      informacionMaritima: {
        zonaPesca: zonaPesca.zona,
        region: zonaPesca.region,
        clasificacionAguas: enAguasTerritoriales 
          ? 'Aguas Territoriales (0-12 MN)' 
          : (enZEE ? 'Zona Económica Exclusiva (12-200 MN)' : 'Aguas Internacionales (>200 MN)'),
        enAguasTerritoriales,
        enZEE,
        profundidad: profundidad || {
          profundidadMetros: 0,
          profundidadBrazas: 0,
          fuente: 'No disponible'
        }
      },
      
      // Coordenadas originales
      coordenadas: {
        latitud: parseFloat(latitud.toFixed(6)),
        longitud: parseFloat(longitud.toFixed(6))
      }
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('Error al obtener información geográfica completa', error.message);
  }
};


/**
 * 7. Obtiene referencia costera para ubicaciones en alta mar
 * Usa proyección perpendicular hacia la costa con datos oficiales INEI
 * @param {number} latitud - Latitud del punto en el mar
 * @param {number} longitud - Longitud del punto en el mar
 * @returns {Promise<Object>} Información de referencia costera
 */
const obtenerReferenciaCosta = async (latitud, longitud) => {
  try {
       // Cargar GeoJSON de centros poblados INEI (desde caché)
    const geojson = cargarCentrosPoblados();
    
    // PASO 1: Filtrar por latitud similar (±0.15° aprox. 16.5 km)
    const toleranciaLat = 0.15;
    const candidatos = geojson.features.filter(feature => {
      const lat = feature.geometry.coordinates[1];
      return lat >= (latitud - toleranciaLat) && lat <= (latitud + toleranciaLat);
    });
    
    if (candidatos.length === 0) {
      throw new ValidationError('No se encontraron lugares costeros cercanos');
    }
    
    // PASO 2: Encontrar longitud más cercana (más al este, hacia tierra)
    let lonMasCercana = Infinity;
    
    for (const candidato of candidatos) {
      const lon = candidato.geometry.coordinates[0];
      
      // Solo considerar lugares al este (longitud mayor = más cerca de tierra)
      if (lon > longitud) {
        const diferencia = Math.abs(lon - longitud);
        
        if (diferencia < Math.abs(lonMasCercana - longitud)) {
          lonMasCercana = lon;
        }
      }
    }
    
    // Si no hay lugares al este, usar el más cercano en general
    if (lonMasCercana === Infinity) {
      for (const candidato of candidatos) {
        const lon = candidato.geometry.coordinates[0];
        const diferencia = Math.abs(lon - longitud);
        
        if (diferencia < Math.abs(lonMasCercana - longitud)) {
          lonMasCercana = lon;
        }
      }
    }
    
    // PASO 3: Crear punto proyectado en la costa
    const puntoProyectado = turf.point([lonMasCercana, latitud]);
    
    // PASO 4: Buscar lugar más cercano al punto proyectado
    let distanciaMinima = Infinity;
    let lugarMasCercano = null;
    
    for (const candidato of candidatos) {
      const puntoCandidato = turf.point(candidato.geometry.coordinates);
      const distancia = turf.distance(puntoProyectado, puntoCandidato, { units: 'kilometers' });
      
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        lugarMasCercano = candidato;
      }
    }
    
    if (!lugarMasCercano) {
      throw new ValidationError('No se pudo determinar ubicación costera de referencia');
    }
    
    // PASO 5: Calcular distancia desde barco a punto proyectado
    const puntoBarco = turf.point([Number(longitud), Number(latitud)]);
    const distanciaKm = turf.distance(puntoBarco, puntoProyectado, { units: 'kilometers' });
    const distanciaMN = turf.distance(puntoBarco, puntoProyectado, { units: 'nauticalmiles' });
    
    // PASO 6: Calcular bearing (rumbo hacia la costa)
    const bearing = turf.bearing(puntoBarco, puntoProyectado);
    const bearingNormalizado = bearing < 0 ? bearing + 360 : bearing;
    
    // Convertir bearing a dirección cardinal
    let direccion = '';
    if (bearingNormalizado >= 337.5 || bearingNormalizado < 22.5) {
      direccion = 'Norte';
    } else if (bearingNormalizado >= 22.5 && bearingNormalizado < 67.5) {
      direccion = 'Noreste';
    } else if (bearingNormalizado >= 67.5 && bearingNormalizado < 112.5) {
      direccion = 'Este';
    } else if (bearingNormalizado >= 112.5 && bearingNormalizado < 157.5) {
      direccion = 'Sureste';
    } else if (bearingNormalizado >= 157.5 && bearingNormalizado < 202.5) {
      direccion = 'Sur';
    } else if (bearingNormalizado >= 202.5 && bearingNormalizado < 247.5) {
      direccion = 'Suroeste';
    } else if (bearingNormalizado >= 247.5 && bearingNormalizado < 292.5) {
      direccion = 'Oeste';
    } else {
      direccion = 'Noroeste';
    }
    
    // Extraer datos del lugar encontrado
    const props = lugarMasCercano.properties;
    const nombre = sanitizarTexto(props.DESCRIPCIO || props.NOMBDIST || 'Costa peruana');
    const departamento = sanitizarTexto(props.DEPARTAMEN || 'N/A');
    const provincia = sanitizarTexto(props.PROVINCIA || 'N/A');
    const distrito = sanitizarTexto(props.DISTRITO || 'N/A');
    const ubigeo = props.UBIGEO || '';
    
    return {
      esReferenciaCalculada: true,
      distanciaACosta: {
        km: parseFloat(distanciaKm.toFixed(2)),
        millasNauticas: parseFloat(distanciaMN.toFixed(2))
      },
      puntoProyectado: {
        latitud: parseFloat(latitud.toFixed(6)),
        longitud: parseFloat(lonMasCercana.toFixed(6))
      },
      ubicacionCosta: {
        lugar: nombre,
        distrito: distrito,
        provincia: provincia,
        departamento: departamento,
        ubigeo: ubigeo,
        pais: 'Perú'
      },
      navegacion: {
        bearing: parseFloat(bearingNormalizado.toFixed(1)),
        direccion: direccion
      },
      descripcion: `A ${distanciaMN.toFixed(1)} millas náuticas mar adentro desde ${nombre}, ${provincia}, ${departamento}`,
      mensaje: 'Ubicación calculada mediante proyección perpendicular a la costa (datos oficiales INEI)'
    };
    
  } catch (err) {
    console.error('Error en obtenerReferenciaCosta:', err);
    if (err instanceof ValidationError) throw err;
    throw new DatabaseError('Error calculando referencia costera', err.message);
  }
};

export default {
  obtenerInformacionGeograficaCompleta,
  encontrarPuertoMasCercano,
  calcularDistanciaACosta,
  obtenerUbicacionGeografica,
  determinarZonaPesca,
  calcularDistanciaDesdeOrigen,
  obtenerProfundidadMar,
  obtenerReferenciaCosta
};
