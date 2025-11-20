import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoProducto
 * Valida unicidad de nombre y previene borrado si tiene cotizaciones asociadas.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.tipoProducto.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un TipoProducto con ese nombre.');
}

const listar = async () => {
  try {
    return await prisma.tipoProducto.findMany({
      include: {
        subfamilia: true
      },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoProducto.findUnique({ 
      where: { id },
      include: {
        subfamilia: true
      }
    });
    if (!tipo) throw new NotFoundError('TipoProducto no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data, usuarioId) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarUnicidadNombre(data.nombre);
    
    const dataParaPrisma = {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      subfamiliaId: data.subfamiliaId ? BigInt(data.subfamiliaId) : null,
      activo: data.activo !== undefined ? data.activo : true,
      paraCompras: data.paraCompras !== undefined ? data.paraCompras : false,
      paraVentas: data.paraVentas !== undefined ? data.paraVentas : false,
      creadoPor: usuarioId ? BigInt(usuarioId) : null
    };
    
    return await prisma.tipoProducto.create({ 
      data: dataParaPrisma,
      include: {
        subfamilia: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data, usuarioId) => {
  try {
    const existente = await prisma.tipoProducto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoProducto no encontrado');
    if (data.nombre && data.nombre !== existente.nombre) {
      await validarUnicidadNombre(data.nombre, id);
    }
    
    const dataParaPrisma = {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      subfamiliaId: data.subfamiliaId ? BigInt(data.subfamiliaId) : null,
      activo: data.activo !== undefined ? data.activo : true,
      paraCompras: data.paraCompras !== undefined ? data.paraCompras : false,
      paraVentas: data.paraVentas !== undefined ? data.paraVentas : false,
      actualizadoPor: usuarioId ? BigInt(usuarioId) : null
    };
    
    return await prisma.tipoProducto.update({ 
      where: { id }, 
      data: dataParaPrisma,
      include: {
        subfamilia: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoProducto.findUnique({
      where: { id },
      include: { 
        cotizacionesVentas: true,
        requerimientosCompra: true 
      }
    });
    if (!existente) throw new NotFoundError('TipoProducto no encontrado');
    
    const totalRelaciones = (existente.cotizacionesVentas?.length || 0) + (existente.requerimientosCompra?.length || 0);
    if (totalRelaciones > 0) {
      throw new ConflictError('No se puede eliminar porque tiene cotizaciones o requerimientos asociados.');
    }
    
    await prisma.tipoProducto.delete({ where: { id } });
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