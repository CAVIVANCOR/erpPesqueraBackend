// Convierte todos los campos BigInt de un objeto (o array) a string recursivamente
export default function toJSONBigInt(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toJSONBigInt);
  } else if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] === 'bigint') {
        newObj[key] = obj[key].toString();
      } else {
        newObj[key] = toJSONBigInt(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}
