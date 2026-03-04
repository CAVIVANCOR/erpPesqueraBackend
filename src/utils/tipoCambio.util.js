/**
 * Utilidad para consultar tipo de cambio de SUNAT
 * Reutilizable en todos los servicios del backend
 */

/**
 * Consulta el tipo de cambio de SUNAT para una fecha específica
 * @param {Date|string} fecha - Fecha para consultar el tipo de cambio
 * @returns {Promise<number|null>} - Tipo de cambio (sell_price) o null si falla
 */
export async function obtenerTipoCambioSunat(fecha) {
  try {
    const token = process.env.TOKEN_API_DECOLETA_SUNAT_RENIEC_TC;
    
    if (!token) {
      console.error('⚠️ Token de API SUNAT no configurado');
      return null;
    }

    // Convertir fecha a formato YYYY-MM-DD
    let fechaISO;
    if (fecha instanceof Date) {
      fechaISO = fecha.toISOString().split("T")[0];
    } else if (typeof fecha === 'string') {
      const fechaObj = new Date(fecha);
      fechaISO = fechaObj.toISOString().split("T")[0];
    } else {
      console.error("⚠️ Formato de fecha no válido:", fecha);
      return null;
    }


    // Construir URL con parámetros
    const params = new URLSearchParams();
    params.append('date', fechaISO);
    const url = `https://api.decolecta.com/v1/tipo-cambio/sunat?${params.toString()}`;

    // Consultar API externa de SUNAT
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 400) {
        console.warn('⚠️ Parámetros de fecha no válidos');
        return null;
      }
      console.warn(`⚠️ Error API SUNAT: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // La API retorna { buy_price, sell_price, base_currency, quote_currency, date }
    // Para COMPRAS usamos "sell_price" (precio de venta del dólar)
    if (data.sell_price) {
      return parseFloat(data.sell_price);
    }
    
    console.warn("⚠️ La respuesta no contiene el campo 'sell_price':", data);
    return null;
  } catch (error) {
    console.error('❌ Error al consultar tipo de cambio SUNAT:', error.message);
    return null;
  }
}

/**
 * Valida y obtiene tipo de cambio automáticamente si es necesario
 * @param {number|string|null} tipoCambio - Tipo de cambio actual
 * @param {Date|string} fechaDocumento - Fecha del documento
 * @returns {Promise<number|null>} - Tipo de cambio validado
 */
export async function validarTipoCambio(tipoCambio, fechaDocumento) {
  // Si tipoCambio es null, undefined, 0, string vacío o "0", consultar SUNAT
  const tipoCambioNumero = tipoCambio ? Number(tipoCambio) : 0;
  
  if (!tipoCambio || tipoCambioNumero === 0 || tipoCambio === "0") {
    const fecha = fechaDocumento || new Date();
    const tipoCambioSunat = await obtenerTipoCambioSunat(fecha);
    
    if (tipoCambioSunat) {
      return tipoCambioSunat;
    } else {
      console.warn(`⚠️ No se pudo obtener tipo de cambio de SUNAT para fecha: ${fecha}`);
      return null;
    }
  } else {
    return Number(tipoCambio);
  }
}