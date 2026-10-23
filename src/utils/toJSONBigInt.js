// Convierte todos los campos BigInt, Decimal y Date de un objeto (o array) a string/number recursivamente
// Esto garantiza compatibilidad profesional entre backend (Prisma/Node) y frontend (React),
// evitando problemas de serialización y visualización de fechas en formularios y reportes.
export default function toJSONBigInt(obj) {
  // Manejar null y undefined
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // BigInt suelto (p. ej. elementos de un arreglo de ids): JSON no lo serializa y lanzaba "Do not know how to serialize a BigInt"
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Manejar arrays
  if (Array.isArray(obj)) {
    return obj.map((elemento) => toJSONBigInt(elemento));
  }
  
  // Manejar objetos
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      const value = obj[key];
      
      // BigInt -> String
      if (typeof value === 'bigint') {
        newObj[key] = value.toString();
      }
      // Date -> ISO String
      else if (value instanceof Date) {
        newObj[key] = value.toISOString();
      }
      // Decimal de Prisma -> Number
      else if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Decimal') {
        newObj[key] = value.toNumber();
      }
      // null o undefined -> mantener como está
      else if (value === null || value === undefined) {
        newObj[key] = value;
      }
      // Recursivo para objetos y arrays anidados
      else if (typeof value === 'object') {
        newObj[key] = toJSONBigInt(value);
      }
      // Primitivos (string, number, boolean) -> mantener como están
      else {
        newObj[key] = value;
      }
    }
    return newObj;
  }
  
  // Primitivos (string, number, boolean)
  return obj;
}
