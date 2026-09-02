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

/**
 * Determina el tipo de cambio EFECTIVO con el que un documento (OrdenCompra / PreFactura)
 * debe convertirse a soles en los Registros de Compras y Ventas SUNAT.
 *
 * Regla de negocio:
 *   - Documento en PEN                → TC = 1 (no hay conversión).
 *   - Factura / Boleta (01, 03) en ME → TC propio del documento (obtenido con su fechaFacturacion).
 *   - Nota de Crédito / Débito (07, 08) en ME → TC del DOCUMENTO AFECTADO (dcmtoAfectoNCND.tipoCambio),
 *     porque la NC/ND ajusta un comprobante anterior y debe valorizarse al mismo TC de ese
 *     comprobante (fecha de emisión del afectado = fechaDcmtoAfectoNCND). Si el afectado es
 *     externo al sistema o no tiene TC, se usa el TC propio de la NC/ND como fallback (que la
 *     Regeneración Masiva FASE 0 y los formularios ya obtienen con fechaDcmtoAfectoNCND).
 *
 * El documento debe venir con las relaciones `moneda`, `tipoDocumentoFinal` y `dcmtoAfectoNCND`.
 *
 * @param {Object} doc - OrdenCompra o PreFactura con sus relaciones
 * @returns {{ tc: number, origen: 'PEN'|'PROPIO'|'DOC_AFECTADO'|'FALLBACK_NCND' }}
 */
export function obtenerTipoCambioEfectivo(doc) {
  // Misma semántica histórica del sistema: si no hay moneda o no es PEN, se trata como ME
  const esMonedaExtranjera = doc?.moneda?.codigoSunat !== "PEN";
  if (!esMonedaExtranjera) return { tc: 1, origen: "PEN" };

  const codigoSunat = doc?.tipoDocumentoFinal?.codigoSunat;
  const esNCND = codigoSunat === "07" || codigoSunat === "08";

  if (esNCND) {
    const tcAfectado = Number(doc?.dcmtoAfectoNCND?.tipoCambio || 0);
    if (tcAfectado > 0) return { tc: tcAfectado, origen: "DOC_AFECTADO" };
  }

  const tcPropio = Number(doc?.tipoCambio || 0);
  return {
    tc: tcPropio > 0 ? tcPropio : 1,
    origen: esNCND ? "FALLBACK_NCND" : "PROPIO",
  };
}