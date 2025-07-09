import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntregaARendirPVentas
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cotizacion, responsable, centroCosto] = await Promise.all([
    prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentasId } }),
    prisma.usuario ? prisma.usuario.findUnique({ where: { id: data.respEntregaRendirId } }) : Promise.resolve(true),
    prisma.centroCosto ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ]);
  if (!cotizacion) throw new ValidationError('El cotizacionVentasId no existe.');
  if (prisma.usuario && !responsable) throw new ValidationError('El respEntregaRendirId no existe.');
  if (prisma.centroCosto && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.entregaARendirPVentas.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendirPVentas.findUnique({ where: { id } });
    if (!entrega) throw new NotFoundError('EntregaARendirPVentas no encontrada');
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.cotizacionVentasId || !data.respEntregaRendirId || !data.centroCostoId) {
      throw new ValidationError('cotizacionVentasId, respEntregaRendirId y centroCostoId son obligatorios.');
    }
    await validarClavesForaneas(data);
    return await prisma.entregaARendirPVentas.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entregaARendirPVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EntregaARendirPVentas no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['cotizacionVentasId','respEntregaRendirId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.entregaARendirPVentas.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.entregaARendirPVentas.findUnique({
      where: { id },
      include: { movimientos: true }
    });
    if (!existente) throw new NotFoundError('EntregaARendirPVentas no encontrada');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos asociados.');
    }
    await prisma.entregaARendirPVentas.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
