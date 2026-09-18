/**
 * numeroALetras.js
 * 
 * Convierte un número a su representación en letras (español)
 * 
 * Ejemplo:
 * numeroALetras(3894.00, 'SOLES') => 'TRES MIL OCHOCIENTOS NOVENTA Y CUATRO Y 00/100 SOLES'
 * 
 * @author ERP Megui
 * @version 1.0.0
 */

const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertirGrupo(numero) {
  if (numero === 0) return '';
  if (numero === 100) return 'CIEN';
  
  let resultado = '';
  
  // Centenas
  const c = Math.floor(numero / 100);
  if (c > 0) {
    resultado += centenas[c];
  }
  
  // Decenas y unidades
  const du = numero % 100;
  
  if (du >= 10 && du < 20) {
    // Casos especiales (10-19)
    if (resultado) resultado += ' ';
    resultado += especiales[du - 10];
  } else {
    // Decenas
    const d = Math.floor(du / 10);
    if (d > 0) {
      if (resultado) resultado += ' ';
      resultado += decenas[d];
    }
    
    // Unidades
    const u = du % 10;
    if (u > 0) {
      if (d > 0 && d !== 1) {
        resultado += ' Y ';
      } else if (resultado) {
        resultado += ' ';
      }
      resultado += unidades[u];
    }
  }
  
  return resultado;
}

function convertirMiles(numero) {
  if (numero === 0) return '';
  if (numero === 1) return 'MIL';
  
  const grupo = convertirGrupo(numero);
  return grupo + ' MIL';
}

function convertirMillones(numero) {
  if (numero === 0) return '';
  if (numero === 1) return 'UN MILLÓN';
  
  const grupo = convertirGrupo(numero);
  return grupo + ' MILLONES';
}

/**
 * Convierte un número a letras
 * @param {number} numero - Número a convertir
 * @param {string} moneda - Nombre de la moneda (SOLES, DÓLARES, etc.)
 * @returns {string} - Número en letras
 */
export function numeroALetras(numero, moneda = 'SOLES') {
  if (numero === 0) return `CERO Y 00/100 ${moneda}`;
  
  // Separar parte entera y decimal
  const parteEntera = Math.floor(numero);
  const parteDecimal = Math.round((numero - parteEntera) * 100);
  
  let resultado = '';
  
  // Millones
  const millones = Math.floor(parteEntera / 1000000);
  if (millones > 0) {
    resultado += convertirMillones(millones);
  }
  
  // Miles
  const miles = Math.floor((parteEntera % 1000000) / 1000);
  if (miles > 0) {
    if (resultado) resultado += ' ';
    resultado += convertirMiles(miles);
  }
  
  // Unidades, decenas y centenas
  const resto = parteEntera % 1000;
  if (resto > 0) {
    if (resultado) resultado += ' ';
    resultado += convertirGrupo(resto);
  }
  
  // Agregar parte decimal y moneda
  const decimalStr = String(parteDecimal).padStart(2, '0');
  resultado += ` Y ${decimalStr}/100 ${moneda}`;
  
  return resultado;
}

export default {
  numeroALetras
};
