import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoMovEntregaRendir
 * Previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */


async function tieneDependencias(id) {
  const tipo = await prisma.tipoMovEntregaRendir.findUnique({
    where: { id },
    include: {
      detMovsEntregaRendir: true,
      movimientosConsumo: true,
      movimientosVentas: true,
      movimientosCompras: true
    }
  });
  if (!tipo) throw new NotFoundError('TipoMovEntregaRendir no encontrado');
  return (
    (tipo.detMovsEntregaRendir && tipo.detMovsEntregaRendir.length > 0) ||
    (tipo.movimientosConsumo && tipo.movimientosConsumo.length > 0) ||
    (tipo.movimientosVentas && tipo.movimientosVentas.length > 0) ||
    (tipo.movimientosCompras && tipo.movimientosCompras.length > 0)
  );
}

const listar = async () => {
  try {
    return await prisma.tipoMovEntregaRendir.findMany({
      include: {
        categoria: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoMovEntregaRendir.findUnique({ 
      where: { id },
      include: {
        categoria: true
      }
    });
    if (!tipo) throw new NotFoundError('TipoMovEntregaRendir no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) throw new ValidationError('El campo nombre es obligatorio.');
    if (typeof data.esIngreso !== 'boolean') throw new ValidationError('El campo esIngreso es obligatorio y debe ser boolean.');
    return await prisma.tipoMovEntregaRendir.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoMovEntregaRendir.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoMovEntregaRendir no encontrado');
    return await prisma.tipoMovEntregaRendir.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDependencias(id)) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos asociados.');
    }
    await prisma.tipoMovEntregaRendir.delete({ where: { id } });
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
