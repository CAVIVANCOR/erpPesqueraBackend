import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoAfectacionIGV
 * Gestiona el Catálogo 07 de SUNAT - Tipo de Afectación del IGV.
 * Documentado en español.
 */

async function validarTipoAfectacionIGV(data) {
  if (data.codigo && data.codigo.trim().length === 0) {
    throw new ValidationError('El código no puede estar vacío.');
  }

  if (data.codigo && data.codigo.length > 2) {
    throw new ValidationError('El código no puede exceder 2 caracteres.');
  }

  if (data.nombre && data.nombre.trim().length === 0) {
    throw new ValidationError('El nombre no puede estar vacío.');
  }

  if (data.nombre && data.nombre.length > 150) {
    throw new ValidationError('El nombre no puede exceder 150 caracteres.');
  }

  if (data.descripcion && data.descripcion.length > 300) {
    throw new ValidationError('La descripción no puede exceder 300 caracteres.');
  }
}

const listar = async () => {
  try {
    return await prisma.tipoAfectacionIGV.findMany({
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarActivos = async () => {
  try {
    return await prisma.tipoAfectacionIGV.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoAfectacionIGV.findUnique({
      where: { id }
    });
    if (!tipo) throw new NotFoundError('Tipo de afectación IGV no encontrado');
    return tipo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.codigo) {
      throw new ValidationError('El código es obligatorio.');
    }

    if (!data.nombre) {
      throw new ValidationError('El nombre es obligatorio.');
    }

    if (!data.categoria) {
      throw new ValidationError('La categoría es obligatoria.');
    }

    await validarTipoAfectacionIGV(data);

    const tipoData = {
      codigo: data.codigo.trim(),
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      categoria: data.categoria,
      activo: data.activo !== undefined ? data.activo : true,
      permiteCreditoFiscal: data.permiteCreditoFiscal !== undefined ? data.permiteCreditoFiscal : false,
      calculaIGV: data.calculaIGV !== undefined ? data.calculaIGV : false
    };
    return await prisma.tipoAfectacionIGV.create({ data: tipoData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe un tipo de afectación IGV con ese código.');
      }
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoAfectacionIGV.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de afectación IGV no encontrado');

    await validarTipoAfectacionIGV(data);

    return await prisma.tipoAfectacionIGV.update({
      where: { id },
      data: data
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe un tipo de afectación IGV con ese código.');
      }
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoAfectacionIGV.findUnique({
      where: { id },
      include: {
        productos: true,
        ordenesCompra: true,
        preFacturas: true,
        detallesComprobante: true
      }
    });

    if (!existente) throw new NotFoundError('Tipo de afectación IGV no encontrado');

    const totalRelaciones = 
      (existente.productos?.length || 0) +
      (existente.ordenesCompra?.length || 0) +
      (existente.preFacturas?.length || 0) +
      (existente.detallesComprobante?.length || 0);

    if (totalRelaciones > 0) {
      throw new ConflictError('No se puede eliminar el tipo porque tiene registros asociados.');
    }

    await prisma.tipoAfectacionIGV.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarPorCategoria = async (categoria) => {
  try {
    return await prisma.tipoAfectacionIGV.findMany({
      where: { categoria, activo: true },
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  listarActivos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarPorCategoria
};