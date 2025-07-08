import prisma from '../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../utils/errors.js';

const incluirRelaciones = {
  cuentaCorrienteOrigen: true,
  cuentaCorrienteDestino: true,
  tipoReferencia: true,
  asientosContables: true
};

/**
 * Valida la existencia de todas las referencias necesarias antes de crear o actualizar un MovimientoCaja.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} data - Datos del movimiento a validar
 */
async function validarReferenciasMovimientoCaja(data) {
  const {
    cuentaCorrienteOrigenId,
    cuentaCorrienteDestinoId,
    empresaOrigenId,
    empresaDestinoId,
    tipoMovimientoId,
    monedaId,
    usuarioId,
    tipoReferenciaId
  } = data;

  // Valida existencia de cuenta corriente origen
  const cuentaOrigen = await prisma.cuentaCorriente.findUnique({ where: { id: cuentaCorrienteOrigenId } });
  if (!cuentaOrigen) throw new ValidationError('Cuenta corriente origen no existente');
  // Valida existencia de cuenta corriente destino
  const cuentaDestino = await prisma.cuentaCorriente.findUnique({ where: { id: cuentaCorrienteDestinoId } });
  if (!cuentaDestino) throw new ValidationError('Cuenta corriente destino no existente');

  // Valida existencia de empresa origen
  const empresaOrigen = await prisma.empresa.findUnique({ where: { id: empresaOrigenId } });
  if (!empresaOrigen) throw new ValidationError('Empresa origen no existente');
  // Valida existencia de empresa destino
  const empresaDestino = await prisma.empresa.findUnique({ where: { id: empresaDestinoId } });
  if (!empresaDestino) throw new ValidationError('Empresa destino no existente');

  // Valida existencia de tipo de movimiento
  const tipoMov = await prisma.tipoMovimientoCaja.findUnique({ where: { id: tipoMovimientoId } });
  if (!tipoMov) throw new ValidationError('Tipo de movimiento no existente');

  // Valida existencia de moneda
  const moneda = await prisma.moneda.findUnique({ where: { id: monedaId } });
  if (!moneda) throw new ValidationError('Moneda no existente');

  // Valida existencia de usuario si se provee
  if (usuarioId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ValidationError('Usuario no existente');
  }

  // Valida existencia de tipo de referencia si se provee
  if (tipoReferenciaId) {
    const tipoRef = await prisma.tipoReferenciaMovimientoCaja.findUnique({ where: { id: tipoReferenciaId } });
    if (!tipoRef) throw new ValidationError('Tipo de referencia no existente');
  }
}


const listar = async () => {
  return prisma.movimientoCaja.findMany({ include: incluirRelaciones });
};


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
    await validarReferenciasMovimientoCaja(data);
    return await prisma.movimientoCaja.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    await validarReferenciasMovimientoCaja(data);
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
    if (err.code === 'P2003') throw new ConflictError('No se puede eliminar el movimiento de caja porque está asociado a otros registros.');
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
