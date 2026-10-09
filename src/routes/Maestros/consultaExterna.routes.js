import { Router } from 'express';
const router = Router();

// Cache en memoria para tipos de cambio SUNAT (evita 429 por reconsultas repetidas)
const sunatTipoCambioCache = new Map();
const sunatTipoCambioErrorCache = new Map();
const pendingSunatRequests = new Map();
const SUNAT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const SUNAT_ERROR_CACHE_TTL_MS = 60 * 1000; // 1 minuto

/**
 * Consultar datos de persona por DNI en RENIEC
 * GET /api/maestros/consulta-externa/reniec/:dni
 */
router.get('/reniec/:dni', async (req, res) => {
  try {
    const { dni } = req.params;

    // Validar formato de DNI
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      return res.status(400).json({
        error: 'DNI debe tener exactamente 8 dígitos numéricos'
      });
    }

    const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;

    if (!token) {
      console.error('Token de API RENIEC no configurado');
      return res.status(500).json({
        error: 'Servicio de consulta RENIEC no disponible'
      });
    }

    // Consultar API externa de RENIEC
    const response = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${dni}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      if (response.status === 400) {
        return res.status(404).json({
          error: 'DNI no encontrado en RENIEC'
        });
      }
      throw new Error(`Error API RENIEC: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error consultando RENIEC:', error);
    res.status(500).json({
      error: 'Error interno del servidor al consultar RENIEC'
    });
  }
});

/**
 * Consultar RUC básico en SUNAT
 * POST /api/maestros/consulta-externa/sunat/ruc/:ruc
 */
router.post('/sunat/ruc/:ruc', async (req, res) => {
  try {
    const { ruc } = req.params;

    // Validar formato de RUC
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
      return res.status(400).json({
        error: 'RUC debe tener exactamente 11 dígitos numéricos'
      });
    }

    const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;

    if (!token) {
      console.error('Token de API SUNAT no configurado');
      return res.status(500).json({
        error: 'Servicio de consulta SUNAT no disponible'
      });
    }

    // Consultar API externa de SUNAT
    const response = await fetch(`https://api.decolecta.com/v1/sunat/ruc?numero=${ruc}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 422) {
        return res.status(404).json({
          error: 'RUC no encontrado en SUNAT'
        });
      }
      throw new Error(`Error API SUNAT: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Error consultando SUNAT RUC:', error);
    res.status(500).json({
      error: 'Error interno del servidor al consultar SUNAT'
    });
  }
});

/**
 * Consultar RUC avanzado en SUNAT
 * GET /api/maestros/consulta-externa/sunat/ruc-full/:ruc
 */
router.get('/sunat/ruc-full/:ruc', async (req, res) => {
  try {
    const { ruc } = req.params;

    // Validar formato de RUC
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
      return res.status(400).json({
        error: 'RUC debe tener exactamente 11 dígitos numéricos'
      });
    }

    const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;

    if (!token) {
      console.error('Token de API SUNAT no configurado');
      return res.status(500).json({
        error: 'Servicio de consulta SUNAT no disponible'
      });
    }

    // Consultar API externa de SUNAT
    const response = await fetch(`https://api.decolecta.com/v1/sunat/ruc/full?numero=${ruc}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 400) {
        return res.status(404).json({
          error: 'RUC no encontrado en SUNAT'
        });
      }
      throw new Error(`Error API SUNAT: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Error consultando SUNAT RUC avanzado:', error);
    res.status(500).json({
      error: 'Error interno del servidor al consultar SUNAT'
    });
  }
});

/**
 * Consultar tipo de cambio SUNAT
 * GET /api/maestros/consulta-externa/sunat/tipo-cambio
 * Query params opcionales: date (YYYY-MM-DD), month (1-12), year (YYYY)
 */
router.get('/sunat/tipo-cambio', async (req, res) => {
  try {
    const { date, month, year } = req.query;

    // Clave de cache: preferimos la fecha exacta, sino mes/año
    const cacheKey = date
      ? `date:${date.includes('T') ? date.split('T')[0] : date}`
      : `month:${month}-year:${year}`;

    const cached = sunatTipoCambioCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SUNAT_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const cachedError = sunatTipoCambioErrorCache.get(cacheKey);
    if (cachedError && Date.now() - cachedError.ts < SUNAT_ERROR_CACHE_TTL_MS) {
      return res.status(cachedError.status).json({ error: cachedError.message });
    }

    // Si ya hay una petición en curso para la misma clave, esperamos su resultado
    if (pendingSunatRequests.has(cacheKey)) {
      try {
        const data = await pendingSunatRequests.get(cacheKey);
        return res.json(data);
      } catch (err) {
        throw err;
      }
    }

    const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;

    if (!token) {
      console.error('Token de API SUNAT no configurado');
      return res.status(500).json({
        error: 'Servicio de consulta SUNAT no disponible'
      });
    }

    // Construir URL con parámetros
    let url = 'https://api.decolecta.com/v1/tipo-cambio/sunat';
    const params = new URLSearchParams();

    if (date) {
      // Si viene con hora (ISO string), extraer solo la fecha YYYY-MM-DD
      const fechaLimpia = date.includes('T') ? date.split('T')[0] : date;
      params.append('date', fechaLimpia);
    } else if (month && year) {
      params.append('month', month);
      params.append('year', year);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Petición única compartida para evitar múltiples llamadas simultáneas a SUNAT
    const consultarSunat = async () => {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const err = new Error();
        err.status = response.status;
        if (response.status === 400) {
          err.message = 'Parámetros de fecha no válidos';
        } else if (response.status === 401 || response.status === 403) {
          err.message = 'Token de API SUNAT vencido o inválido. Contacte al administrador del sistema para renovar el token.';
        } else if (response.status === 404 || response.status === 422) {
          err.message = 'Tipo de cambio no disponible para la fecha indicada';
        } else if (response.status === 429) {
          err.message = 'Demasiadas solicitudes a la API de SUNAT. Por favor, espere un momento e intente nuevamente.';
        } else {
          err.message = `Error API SUNAT: ${response.status}`;
        }
        throw err;
      }

      const data = await response.json();
      sunatTipoCambioCache.set(cacheKey, { data, ts: Date.now() });
      return data;
    };

    pendingSunatRequests.set(cacheKey, consultarSunat());
    try {
      const data = await pendingSunatRequests.get(cacheKey);
      return res.json(data);
    } catch (err) {
      pendingSunatRequests.delete(cacheKey);
      if (err.status) {
        sunatTipoCambioErrorCache.set(cacheKey, { status: err.status, message: err.message, ts: Date.now() });
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    } finally {
      pendingSunatRequests.delete(cacheKey);
    }

  } catch (error) {
    console.error('Error consultando tipo de cambio SUNAT:', error);
    res.status(500).json({
      error: 'Error interno del servidor al consultar tipo de cambio'
    });
  }
});

export default router;
