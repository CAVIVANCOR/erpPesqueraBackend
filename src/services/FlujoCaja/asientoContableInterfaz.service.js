// Importa la instancia de Prisma Client para acceder a la base de datos
import prisma from '../../config/prismaClient.js';
// Importa los errores personalizados para manejo consistente de errores
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

// Define las relaciones que se incluirán al consultar asientos contables interfaz
const incluirRelaciones = {
  movimientoCaja: true,
  personalEnviador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    }
  }
};

/**
 * Valida que existan las referencias foráneas requeridas antes de crear o actualizar un asiento contable interfaz.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} param0 - Objeto con los IDs a validar
 */
async function validarReferencias({ movimientoCajaId, monedaId, empresaId, tipoReferenciaId }) {
  // Valida existencia de MovimientoCaja
  const mov = await prisma.movimientoCaja.findUnique({ where: { id: movimientoCajaId } });
  if (!mov) throw new ValidationError('Movimiento de caja no existente');
  // Valida existencia de Moneda
  const moneda = await prisma.moneda.findUnique({ where: { id: monedaId } });
  if (!moneda) throw new ValidationError('Moneda no existente');
  // Valida existencia de Empresa
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new ValidationError('Empresa no existente');
  // Valida existencia de TipoReferenciaMovimientoCaja (si se proporciona)
  if (tipoReferenciaId) {
    const tipo = await prisma.tipoReferenciaMovimientoCaja.findUnique({ where: { id: tipoReferenciaId } });
    if (!tipo) throw new ValidationError('Tipo de referencia de movimiento de caja no existente');
  }
}

/**
 * Obtiene todos los asientos contables interfaz, incluyendo relaciones principales.
 * @returns {Promise<Array>} - Lista de asientos contables interfaz
 */
const listar = async () => {
  try {
    return await prisma.asientoContableInterfaz.findMany({ include: incluirRelaciones });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const asiento = await prisma.asientoContableInterfaz.findUnique({ where: { id }, include: incluirRelaciones });
    if (!asiento) throw new NotFoundError('Asiento contable interfaz no encontrado');
    return asiento;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarReferencias(data);
    
    // Preparar datos con auditoría automática
    const datosConAuditoria = {
      ...data,
      creadoEn: new Date(),
    };
    
    return await prisma.asientoContableInterfaz.create({ data: datosConAuditoria });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un asiento contable interfaz existente, validando primero la existencia del ID.
 * Luego valida referencias antes de actualizar.
 * @param {BigInt|number} id - ID del asiento contable interfaz a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Asiento contable interfaz actualizado
 */
const actualizar = async (id, data) => {
  try {
    // Primero valida existencia del asiento contable interfaz
    const existente = await prisma.asientoContableInterfaz.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ID de AsientoContableInterfaz no existe');
    // Luego valida referencias
    await validarReferencias(data);
    // Realiza la actualización
    const actualizado = await prisma.asientoContableInterfaz.update({ where: { id }, data });
    return actualizado;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Asiento contable interfaz no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    await prisma.asientoContableInterfaz.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Asiento contable interfaz no encontrado');
    if (err.code === 'P2003') throw new ConflictError('No se puede eliminar el asiento contable interfaz porque está asociado a otros registros.');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Envía un asiento contable a contabilidad
 * @param {BigInt|number} id - ID del asiento
 * @param {BigInt|number} enviadoPorId - ID del personal que envía
 * @returns {Promise<Object>} - Asiento enviado
 */
const enviar = async (id, enviadoPorId) => {
  try {
    const asiento = await prisma.asientoContableInterfaz.findUnique({ where: { id } });
    if (!asiento) throw new NotFoundError('Asiento contable no encontrado');

    // Validar que no esté ya enviado
    if (asiento.estado === 'ENVIADO') {
      throw new ValidationError('El asiento ya fue enviado anteriormente');
    }

    const actualizado = await prisma.asientoContableInterfaz.update({
      where: { id },
      data: {
        estado: 'ENVIADO',
        fechaEnvio: new Date(),
        enviadoPorId,
      },
      include: incluirRelaciones,
    });

    return actualizado;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Asiento contable no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Registra un error en el envío de un asiento contable
 * @param {BigInt|number} id - ID del asiento
 * @param {string} mensajeError - Mensaje de error
 * @returns {Promise<Object>} - Asiento actualizado
 */
const registrarError = async (id, mensajeError) => {
  try {
    const asiento = await prisma.asientoContableInterfaz.findUnique({ where: { id } });
    if (!asiento) throw new NotFoundError('Asiento contable no encontrado');

    const actualizado = await prisma.asientoContableInterfaz.update({
      where: { id },
      data: {
        estado: 'ERROR',
        mensajeError: mensajeError.trim(),
      },
      include: incluirRelaciones,
    });

    return actualizado;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Asiento contable no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  enviar,
  registrarError,
};
