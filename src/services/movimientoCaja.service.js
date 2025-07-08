import prisma from '../config/prismaClient.js';

const incluirRelaciones = {
  cuentaCorrienteOrigen: true,
  cuentaCorrienteDestino: true,
  tipoReferencia: true,
  asientosContables: true
};

const listar = async () => {
  return prisma.movimientoCaja.findMany({ include: incluirRelaciones });
};

import { NotFoundError, DatabaseError } from '../utils/errors.js';

const obtenerPorId = async (id) => {
  try {
    const movimiento = await prisma.movimientoCaja.findUnique({ where: { id }, include: incluirRelaciones });
    if (!movimiento) throw new NotFoundError('Movimiento de caja no encontrado');
    return movimiento;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    return await prisma.movimientoCaja.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const actualizado = await prisma.movimientoCaja.update({ where: { id }, data });
    if (!actualizado) throw new NotFoundError('Movimiento de caja no encontrado');
    return actualizado;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Movimiento de caja no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    await prisma.movimientoCaja.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Movimiento de caja no encontrado');
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
