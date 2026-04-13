import prisma from '../../config/prismaClient.js';
import * as turf from '@turf/turf';
import { ValidationError, DatabaseError } from '../../utils/errors.js';

/**
 * Servicio de Geolocalización para análisis de coordenadas de pesca
 * Utiliza datos reales de PuertoPesca, OpenStreetMap Nominatim y NOAA
 * 100% Open Source - Sin APIs de pago
 * Documentado en español
 */

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
      ciudad: sanitizarTexto(data.address?.city || data.address?.town || data.address?.village) || 'N/A',
      distrito: sanitizarTexto(data.address?.suburb || data.address?.neighbourhood) || 'N/A',
      provincia: sanitizarTexto(data.address?.state || data.address?.province) || 'N/A',
      departamento: sanitizarTexto(data.address?.region) || 'N/A',
      pais: sanitizarTexto(data.address?.country) || 'Perú',
      cuerpoAgua: sanitizarTexto(data.address?.water || data.address?.bay || data.address?.sea) || 'Océano Pacífico',
      tipoLugar: sanitizarTexto(data.type) || 'N/A'
    };
  } catch (error) {
    console.error('Error en geocodificación inversa:', error);
    return {
      direccionCompleta: 'No disponible',
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

export default {
  obtenerInformacionGeograficaCompleta,
  encontrarPuertoMasCercano,
  calcularDistanciaACosta,
  obtenerUbicacionGeografica,
  determinarZonaPesca,
  calcularDistanciaDesdeOrigen,
  obtenerProfundidadMar
};
