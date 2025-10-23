import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ModoDespachoRecepcion
 * Valida unicidad de nombre y previene borrado si tiene cotizaciones asociadas.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.modoDespachoRecepcion.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un ModoDespachoRecepcion con ese nombre.');
}

const listar = async () => {
  try {
    return await prisma.modoDespachoRecepcion.findMany({
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const modo = await prisma.modoDespachoRecepcion.findUnique({ where: { id } });
    if (!modo) throw new NotFoundError('ModoDespachoRecepcion no encontrado');
    return modo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarUnicidadNombre(data.nombre);
    
    // Adaptar datos del frontend al modelo
    const dataParaPrisma = {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      activo: data.cesado !== undefined ? !data.cesado : true // Invertir cesado a activo
    };
    
    return await prisma.modoDespachoRecepcion.create({ data: dataParaPrisma });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.modoDespachoRecepcion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ModoDespachoRecepcion no encontrado');
    if (data.nombre && data.nombre !== existente.nombre) {
      await validarUnicidadNombre(data.nombre, id);
    }
    
    // Adaptar datos del frontend al modelo
    const dataParaPrisma = {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      activo: data.cesado !== undefined ? !data.cesado : true // Invertir cesado a activo
    };
    
    return await prisma.modoDespachoRecepcion.update({ where: { id }, data: dataParaPrisma });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.modoDespachoRecepcion.findUnique({
      where: { id },
      include: { 
        cotizaciones: true,
        requerimientosCompra: true 
      }
    });
    if (!existente) throw new NotFoundError('ModoDespachoRecepcion no encontrado');
    
    const totalRelaciones = (existente.cotizaciones?.length || 0) + (existente.requerimientosCompra?.length || 0);
    if (totalRelaciones > 0) {
      throw new ConflictError('No se puede eliminar porque tiene cotizaciones o requerimientos asociados.');
    }
    
    await prisma.modoDespachoRecepcion.delete({ where: { id } });
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