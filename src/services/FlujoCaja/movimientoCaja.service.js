import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

const incluirRelaciones = {
  cuentaCorrienteOrigen: true,
  cuentaCorrienteDestino: true,
  tipoReferencia: true,
  asientosContables: true,
  entidadComercial: true
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
    tipoReferenciaId,
    centroCostoId,
    moduloOrigenMotivoOperacionId,
    usuarioMotivoOperacionId,
    entidadComercialId
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

  // Valida existencia de entidad comercial
  const entidadComercial = await prisma.entidadComercial.findUnique({ where: { id: entidadComercialId } });
  if (!entidadComercial) throw new ValidationError('Entidad comercial no existente');

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

  // Valida existencia de centro de costo si se provee
  if (centroCostoId) {
    const centroCosto = await prisma.centroCosto.findUnique({ where: { id: centroCostoId } });
    if (!centroCosto) throw new ValidationError('Centro de costo no existente');
  }

  // Valida existencia de módulo origen si se provee
  if (moduloOrigenMotivoOperacionId) {
    const moduloOrigen = await prisma.moduloSistema.findUnique({ where: { id: moduloOrigenMotivoOperacionId } });
    if (!moduloOrigen) throw new ValidationError('Módulo origen no existente');
  }

  // Valida existencia de usuario motivo operación si se provee
  if (usuarioMotivoOperacionId) {
    const usuarioMotivo = await prisma.personal.findUnique({ where: { id: usuarioMotivoOperacionId } });
    if (!usuarioMotivo) throw new ValidationError('Usuario motivo operación no existente');
  }
}

/**
 * Lista todos los movimientos de caja.
 * @returns {Promise<Array<Object>>} - Lista de movimientos de caja
 */
const listar = async () => {
  return prisma.movimientoCaja.findMany({ include: incluirRelaciones });
};

/**
 * Obtiene un movimiento de caja por ID.
 * @param {BigInt|number} id - ID del movimiento de caja
 * @returns {Promise<Object>} - Movimiento de caja
 */
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

/**
 * Crea un nuevo movimiento de caja.
 * @param {Object} data - Datos del movimiento de caja
 * @returns {Promise<Object>} - Movimiento de caja creado
 */
const crear = async (data) => {
  try {
    await validarReferenciasMovimientoCaja(data);
    return await prisma.movimientoCaja.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento de caja existente, validando primero la existencia del ID.
 * Luego valida referencias antes de actualizar.
 * @param {BigInt|number} id - ID del movimiento de caja a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Movimiento de caja actualizado
 */
const actualizar = async (id, data) => {
  try {
    // Primero valida existencia del movimiento de caja
    const existente = await prisma.movimientoCaja.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Movimiento de Caja No Encontrado');

    // Luego valida referencias
    await validarReferenciasMovimientoCaja(data);

    // Realiza la actualización
    const actualizado = await prisma.movimientoCaja.update({ where: { id }, data });
    return actualizado;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Movimiento de caja no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento de caja por ID.
 * @param {BigInt|number} id - ID del movimiento de caja
 * @returns {Promise<boolean>} - True si se eliminó correctamente
 */
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
