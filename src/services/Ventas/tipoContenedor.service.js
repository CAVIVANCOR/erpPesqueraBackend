import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoContenedor
 * Valida unicidad de código y previene borrado si tiene cotizaciones o pre-facturas asociadas.
 * Incluye manejo de campos de auditoría.
 * Documentado en español.
 */

async function validarUnicidadCodigo(codigo, id = null) {
  const where = id ? { codigo, NOT: { id } } : { codigo };
  const existe = await prisma.tipoContenedor.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un Tipo de Contenedor con ese código.');
}

const listar = async () => {
  try {
    return await prisma.tipoContenedor.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tipoContenedor = await prisma.tipoContenedor.findUnique({ where: { id } });
    if (!tipoContenedor) throw new NotFoundError('Tipo de Contenedor no encontrado');
    return tipoContenedor;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.codigo || !data.nombre) {
      throw new ValidationError('Los campos código y nombre son obligatorios.');
    }
    await validarUnicidadCodigo(data.codigo);
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.tipoContenedor.create({ data: datosConAuditoria });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoContenedor.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de Contenedor no encontrado');
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.tipoContenedor.update({ where: { id }, data: datosConAuditoria });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoContenedor.findUnique({
      where: { id },
      include: { 
        cotizaciones: true,
        preFacturas: true
      }
    });
    if (!existente) throw new NotFoundError('Tipo de Contenedor no encontrado');
    
    // Validar que no tenga registros asociados
    if (existente.cotizaciones && existente.cotizaciones.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene cotizaciones asociadas.');
    }
    if (existente.preFacturas && existente.preFacturas.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene pre-facturas asociadas.');
    }
    
    await prisma.tipoContenedor.delete({ where: { id } });
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