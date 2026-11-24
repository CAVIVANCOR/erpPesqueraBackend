import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError } from '../../utils/errors.js';

/**
 * Servicio de consulta de ResumenSunat: resúmenes diarios de boletas (RC) y comunicaciones de baja (RA).
 *
 * Estos documentos NO se crean ni se editan manualmente: los genera el proceso de facturación electrónica y su
 * estado lo actualiza la consulta del ticket en Smart PSE. Aquí solo se listan y consultan.
 */

const INCLUDE_LISTA = { empresa: { select: { id: true, razonSocial: true } } };

const errorDeBaseDeDatos = (err) => {
  if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
  throw err;
};

/**
 * Lista los resúmenes, del más reciente al más antiguo. Filtros opcionales: empresa y tipo (RC / RA).
 */
const listar = async ({ empresaId, tipo } = {}) => {
  try {
    return await prisma.resumenSunat.findMany({
      where: {
        ...(empresaId ? { empresaId: BigInt(empresaId) } : {}),
        ...(tipo ? { tipo: String(tipo).toUpperCase() } : {}),
      },
      include: { ...INCLUDE_LISTA, _count: { select: { detalles: true } } },
      orderBy: [{ fechaReferencia: 'desc' }, { id: 'desc' }],
    });
  } catch (err) {
    return errorDeBaseDeDatos(err);
  }
};

/**
 * Obtiene un resumen con los comprobantes que informa.
 */
const obtenerPorId = async (id) => {
  try {
    const resumen = await prisma.resumenSunat.findUnique({
      where: { id },
      include: {
        ...INCLUDE_LISTA,
        detalles: {
          orderBy: { numeroLinea: 'asc' },
          include: {
            comprobanteElectronico: {
              select: { id: true, numeroCompleto: true, totalComprobante: true, fechaEmision: true, razonSocialCliente: true },
            },
          },
        },
      },
    });
    if (!resumen) throw new NotFoundError('Resumen SUNAT no encontrado');
    return resumen;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    return errorDeBaseDeDatos(err);
  }
};

export default { listar, obtenerPorId };
