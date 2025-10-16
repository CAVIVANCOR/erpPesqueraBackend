/**
 * Utilidades para manejo de números
 * @module utils/numberUtils
 */

/**
 * Completa un número con ceros a la izquierda hasta alcanzar la cantidad de posiciones especificada
 * @param {number|string} numero - El número a formatear
 * @param {number} posiciones - Cantidad total de posiciones del string resultante
 * @returns {string} String con el número completado con ceros a la izquierda
 * @example
 * llenaNumerosIzquierda(20, 10) // returns "0000000020"
 * llenaNumerosIzquierda(5, 4) // returns "0005"
 * llenaNumerosIzquierda(12345, 3) // returns "12345" (no trunca si es mayor)
 */
const llenaNumerosIzquierda = (numero, posiciones) => {
  if (numero === null || numero === undefined) {
    throw new Error('El número no puede ser null o undefined');
  }
  
  if (!Number.isInteger(posiciones) || posiciones < 0) {
    throw new Error('Las posiciones deben ser un número entero positivo');
  }

  const numeroStr = String(numero);
  return numeroStr.padStart(posiciones, '0');
};

/**
 * Convierte un valor a número, manejando BigInt y strings
 * @param {*} valor - Valor a convertir
 * @returns {number} Número convertido
 */
const toNumber = (valor) => {
  if (typeof valor === 'bigint') {
    return Number(valor);
  }
  return Number(valor);
};

export {
  llenaNumerosIzquierda,
  toNumber,
};