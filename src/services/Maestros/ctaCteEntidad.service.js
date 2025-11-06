import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CtaCteEntidad
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialId, bancoId y monedaId.
 * Lanza ValidationError según corresponda.
 * @param {Object} data - Datos de la cuenta corriente
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarCtaCteEntidad(data, excluirId = null) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
  }
  // Validar existencia de Banco
  if (data.bancoId) {
    const existeBanco = await prisma.banco.findUnique({ where: { id: data.bancoId } });
    if (!existeBanco) throw new ValidationError('Banco no existente.');
  }
  // Validar existencia de Moneda
  if (data.monedaId) {
    const existeMoneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!existeMoneda) throw new ValidationError('Moneda no existente.');
  }
}

/**
 * Lista todas las cuentas corrientes de entidades comerciales.
 */
const listar = async () => {
  try {
    return await prisma.ctaCteEntidad.findMany({
      include: {
        entidadComercial: true,
        banco: true,
        moneda: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una cuenta corriente por ID (incluyendo entidad comercial, banco y moneda asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const cuenta = await prisma.ctaCteEntidad.findUnique({
      where: { id },
      include: { 
        entidadComercial: true,
        banco: true,
        moneda: true
      }
    });
    if (!cuenta) throw new NotFoundError('Cuenta corriente no encontrada');
    return cuenta;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene todas las cuentas corrientes de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialId) => {
  try {
    const resultado = await prisma.ctaCteEntidad.findMany({
      where: { entidadComercialId },
      include: {
        entidadComercial: true,
        banco: true,
        moneda: true
      },
      orderBy: { id: 'desc' }
    });
    
    // Consultar manualmente los datos de personal para cada cuenta corriente
    const resultadoConPersonal = await Promise.all(
      resultado.map(async (cuenta) => {
        let personalCreador = null;
        let personalActualizador = null;
        
        // Consultar personal creador si existe
        if (cuenta.creadoPor) {
          personalCreador = await prisma.personal.findUnique({
            where: { id: cuenta.creadoPor },
            select: { id: true, nombres: true, apellidos: true }
          });
        }
        
        // Consultar personal actualizador si existe
        if (cuenta.actualizadoPor) {
          personalActualizador = await prisma.personal.findUnique({
            where: { id: cuenta.actualizadoPor },
            select: { id: true, nombres: true, apellidos: true }
          });
        }
        
        return {
          ...cuenta,
          personalCreador,
          personalActualizador
        };
      })
    );
    
    return resultadoConPersonal;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en obtenerPorEntidad:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una cuenta corriente validando referencias.
 */
const crear = async (data) => {
  try {
    await validarCtaCteEntidad(data);
    
    // Asegurar que las fechas de auditoría estén presentes
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.ctaCteEntidad.create({ data: datosConAuditoria });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una cuenta corriente existente, validando existencia y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.ctaCteEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cuenta corriente no encontrada');
    await validarCtaCteEntidad(data, id);
    
    // Asegurar que todos los campos de auditoría estén presentes
    const datosConAuditoria = {
      ...data,
      // Si fechaCreacion o creadoPor son null/vacíos en el registro existente, asignarlos ahora
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      // Siempre actualizar estos campos
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.ctaCteEntidad.update({ where: { id }, data: datosConAuditoria });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una cuenta corriente por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.ctaCteEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cuenta corriente no encontrada');
    await prisma.ctaCteEntidad.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorEntidad,
  crear,
  actualizar,
  eliminar
};