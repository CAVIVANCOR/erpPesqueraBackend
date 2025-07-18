// Convierte todos los campos BigInt y Date de un objeto (o array) a string recursivamente
// Esto garantiza compatibilidad profesional entre backend (Prisma/Node) y frontend (React),
// evitando problemas de serialización y visualización de fechas en formularios y reportes.
export default function toJSONBigInt(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toJSONBigInt);
  } else if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] === 'bigint') {
        newObj[key] = obj[key].toString();
      } else if (obj[key] instanceof Date) {
        newObj[key] = obj[key].toISOString();
      } else {
        newObj[key] = toJSONBigInt(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}
