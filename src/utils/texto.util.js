/**
 * Normaliza un texto de catálogo: MAYÚSCULAS, sin acentos ni caracteres extraños, conservando la Ñ.
 * Solo quedan letras A-Z, Ñ, dígitos, espacios y la puntuación básica ( ) . , : ; / % & + - _ # =
 * Ej.: "Días de vacaciones por año" → "DIAS DE VACACIONES POR AÑO".
 */
export const normalizarTexto = (texto) =>
  String(texto)
    .trim()
    .toUpperCase()
    .replace(/Ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'Ñ')
    .replace(/[^A-Z0-9Ñ\s().,:;/%&+\-_#=]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
